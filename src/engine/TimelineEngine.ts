import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { Camera } from './Camera';
import { useTimelineStore } from '../store/timeline.store';
import { getThemeMode } from '../lib/themes';
import type { TimelineNode } from '../types';

//  Constants 

const NODE_COLORS: Record<string, number> = {
  event: 0x3b82f6, character: 0x10b981, place: 0x8b5cf6,
  period: 0x6366f1, narrative: 0xf59e0b,
};
const HIGH_COLOR  = 0xfbbf24;
const LOD: Record<number, number> = {
  10: 0.0001, 9: 0.005, 8: 0.05, 7: 0.2, 6: 1,
  5: 5, 4: 20, 3: 80, 2: 300, 1: 1000,
};
const MIN_GAP     = 90;
const MAX_CHARS   = 15;
const PX_PER_CHAR = 7;
const LANE_STEP   = 100;
const NODE_TITLE_GAP = 14;
const NODE_DATE_GAP  = 12;
const TICK_LABEL_GAP = 46;

const THEME_COLORS = {
  dark: {
    bg: 0x050510, axisMain: 0x334155, axisTag: 0x3730a3, laneLblMain: 0x334155, tickLbl: 0x64748b,
    nodeTitle: 0xe2e8f0, nodeTitleHi: 0xfde68a, nodeDate: 0x94a3b8, ring: 0xffffff,
  },
  light: {
    bg: 0xf8fafc, axisMain: 0x94a3b8, axisTag: 0x6366f1, laneLblMain: 0x64748b, tickLbl: 0x475569,
    nodeTitle: 0x334155, nodeTitleHi: 0xb45309, nodeDate: 0x64748b, ring: 0x000000,
  }
};

//  Typed sprite 

interface NodeSprite extends Container {
  __title:  string;
  __radius: number;
  __titleT: Text;
  __dateT:  Text;
  __ring:   Graphics;
}

//  Text pool 

class TextPool {
  private pool:   Text[] = [];
  private active: Text[] = [];
  private parent: Container;

  constructor(parent: Container) {
    this.parent = parent;
  }

  get(text: string, x: number, y: number, style: Partial<TextStyle>): Text {
    let t = this.pool.pop();
    if (!t) {
      t = new Text({ text: '', style: new TextStyle(style as TextStyle) });
    } else {
      Object.assign(t.style, style);
    }
    t.text = text;
    t.x = x; t.y = y;
    t.visible = true;
    this.parent.addChild(t);
    this.active.push(t);
    return t;
  }

  flush() {
    for (const t of this.active) {
      t.visible = false;
      if (t.parent === this.parent) this.parent.removeChild(t);
      this.pool.push(t);
    }
    this.active.length = 0;
  }
}

function trunc(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + '';
}

//  Engine 

export class TimelineEngine {
  private app!:       Application;
  readonly camera:    Camera;
  private canvas:     HTMLCanvasElement;
  private destroyed   = false;
  private initialized = false;
  private unsubStore?: () => void;

  // Layers
  private bgLayer!:    Graphics;
  private axisLayer!:  Graphics;
  private nodesLayer!: Container;
  private labelLayer!: Container;

  // Pools
  private tickPool!:   TextPool;
  private lanePool!:   TextPool;
  private nodePool:    Map<string, NodeSprite> = new Map();

  // Input – mouse
  private dragging = false;
  private lastX = 0;

  // Input – touch
  private lastPinchDist = 0;

  private frameTick = 0;
  private fpsFrames = 0;
  private fpsLastSample = performance.now();
  private lastRenderedNodes = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new Camera();
  }

  //  LIFECYCLE 

  async init() {
    if (this.destroyed) return;

    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth  : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;

    const theme = getThemeMode(useTimelineStore.getState().settings.theme);
    
    this.app = new Application();
    await this.app.init({
      canvas:          this.canvas,
      width:           w,
      height:          h,
      backgroundColor: THEME_COLORS[theme].bg,
      backgroundAlpha: 0,
      resolution:      Math.min(window.devicePixelRatio || 1, 2),
      autoDensity:     true,
      antialias:       true,
      preference:      'webgl',
    });
    this.setRendererThemeBackground();

    if (this.destroyed) { try { this.app.destroy(false); } catch { /* Ignore destroy errors during teardown. */ } return; }

    this.camera.screenW = w;
    this.camera.screenH = h;
    
    // Initial bounds based on current nodes
    const nodes = useTimelineStore.getState().nodes;
    let min = -7000;
    let max = 3050;
    for (const n of nodes) {
      if (n.date_start < min) min = n.date_start;
      if (n.date_end && n.date_end > max) max = n.date_end;
      else if (n.date_start > max) max = n.date_start;
    }
    this.camera.setBounds(min, max);
    this.camera.jumpTo(0, 0.05);

    this.bgLayer    = new Graphics();
    this.axisLayer  = new Graphics();
    this.nodesLayer = new Container();
    this.labelLayer = new Container();

    this.app.stage.addChild(this.bgLayer);
    this.app.stage.addChild(this.axisLayer);
    this.app.stage.addChild(this.nodesLayer);
    this.app.stage.addChild(this.labelLayer);

    this.tickPool = new TextPool(this.labelLayer);
    this.lanePool = new TextPool(this.labelLayer);

    // Mouse events
    window.addEventListener('pointerdown',   this.onPointerDown);
    window.addEventListener('pointermove',   this.onPointerMove);
    window.addEventListener('pointerup',     this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('wheel',         this.onWheel, { passive: false });

    // Touch events (mobile pinch-to-zoom)
    this.canvas.addEventListener('touchstart',  this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove',   this.onTouchMove,  { passive: false });
    this.canvas.addEventListener('touchend',    this.onTouchEnd,   { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd,   { passive: false });

    // Custom events
    window.addEventListener('bm:navigate', this.onNavigate as EventListener);
    window.addEventListener('resize',      this.onResize);

    this.app.ticker.add(this.onTick);
    this.unsubStore = useTimelineStore.subscribe((state, prevState) => {
      if (state.settings.theme !== prevState.settings.theme) {
        this.setRendererThemeBackground();
        // Destroy cached nodes so they rebuild with new text/colors
        this.nodePool.forEach(sp => sp.destroy());
        this.nodePool.clear();
      }
      if (state.nodes !== prevState.nodes) {
        let min = -7000;
        let max = 3050;
        for (const n of state.nodes) {
          if (n.date_start < min) min = n.date_start;
          if (n.date_end && n.date_end > max) max = n.date_end;
          else if (n.date_start > max) max = n.date_start;
        }
        this.camera.setBounds(min, max);
      }
    });

    this.initialized = true;
  }

  private setRendererThemeBackground() {
    if (this.app?.renderer?.background) {
      (this.app.renderer.background as any).alpha = 0;
    }
    this.canvas.style.background = 'transparent';
  }

  /** Called by Canvas component's ResizeObserver */
  handleResize() {
    if (!this.app?.renderer) return;
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    if (!w || !h) return;
    this.app.renderer.resize(w, h);
    this.camera.screenW = w;
    this.camera.screenH = h;
  }

  destroy() {
    this.destroyed = true;
    if (this.unsubStore) this.unsubStore();
    try { window.removeEventListener('pointerdown',   this.onPointerDown); } catch { /* Ignore cleanup errors. */ }
    try { window.removeEventListener('pointermove',   this.onPointerMove); } catch { /* Ignore cleanup errors. */ }
    try { window.removeEventListener('pointerup',     this.onPointerUp); } catch { /* Ignore cleanup errors. */ }
    try { window.removeEventListener('pointercancel', this.onPointerUp); } catch { /* Ignore cleanup errors. */ }
    try { window.removeEventListener('wheel',           this.onWheel); } catch { /* Ignore cleanup errors. */ }
    try { this.canvas.removeEventListener('touchstart', this.onTouchStart); } catch { /* Ignore cleanup errors. */ }
    try { this.canvas.removeEventListener('touchmove',  this.onTouchMove); } catch { /* Ignore cleanup errors. */ }
    try { this.canvas.removeEventListener('touchend',   this.onTouchEnd); } catch { /* Ignore cleanup errors. */ }
    try { this.canvas.removeEventListener('touchcancel',this.onTouchEnd); } catch { /* Ignore cleanup errors. */ }
    try { window.removeEventListener('bm:navigate', this.onNavigate as EventListener); } catch { /* Ignore cleanup errors. */ }
    try { window.removeEventListener('resize',       this.onResize); } catch { /* Ignore cleanup errors. */ }
    if (this.app) {
      try { this.app.ticker.remove(this.onTick); } catch { /* Ignore cleanup errors. */ }
      try { this.app.destroy(false); } catch { /* Ignore cleanup errors. */ }
    }
  }

  //  MOUSE INPUT 

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || !this.isTimelineInputEvent(e)) return;
    e.preventDefault();
    this.dragging = true;
    this.lastX = e.clientX;
    this.camera.startDrag();
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.camera.pan(e.clientX - this.lastX, 0);
    this.lastX = e.clientX;
  };
  private onPointerUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.camera.endDrag();
  };
  private onWheel = (e: WheelEvent) => {
    if (!this.isTimelineInputEvent(e)) return;
    e.preventDefault();
    this.camera.zoomAt(e.clientX, e.deltaY < 0 ? 1.12 : 0.9);
  };

  //  TOUCH INPUT (mobile pinch + pan) 

  private isTimelineInputEvent(e: PointerEvent | WheelEvent) {
    if (this.isInteractiveTarget(e.target)) return false;

    const parentRect = this.canvas.parentElement?.getBoundingClientRect() ?? this.canvas.getBoundingClientRect();
    const left = this.timelineViewportLeft();
    const right = this.timelineViewportRight();

    return e.clientX >= left
      && e.clientX <= right
      && e.clientY >= parentRect.top
      && e.clientY <= parentRect.bottom;
  }

  private isInteractiveTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;

    return !!target.closest(
      [
        'a',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '#side-panel',
        '#side-panel-mobile',
        '#toolbar',
        '#minimap',
        '#narrative-player',
        '#bottom-nav',
        '#editor-overlay',
      ].join(','),
    );
  }

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.dragging    = true;
      this.lastX       = e.touches[0].clientX;
      this.lastPinchDist = 0;
      this.camera.startDrag();
    } else if (e.touches.length === 2) {
      this.dragging = false;
      this.camera.endDrag();
      this.lastPinchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && this.dragging) {
      const dx = e.touches[0].clientX - this.lastX;
      this.camera.pan(dx, 0);
      this.lastX = e.touches[0].clientX;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      if (this.lastPinchDist > 0) {
        const factor = dist / this.lastPinchDist;
        this.camera.zoomAt(midX, factor);
      }
      this.lastPinchDist = dist;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.dragging      = false;
    this.lastPinchDist = 0;
    this.camera.endDrag();
  };

  //  NAVIGATE EVENT 

  private onNavigate = (e: CustomEvent) => {
    const { year, zoom } = e.detail as { year: number; zoom: number };
    this.camera.jumpTo(year, Math.max(zoom ?? 2, this.camera.scale));
  };

  //  RESIZE 

  private onResize = () => { this.handleResize(); };

  //  TICK 

  private onTick = () => {
    if (!this.initialized || this.destroyed) return;
    try {
      this.camera.update();
      const renderedNodes = this.render();
      this.updatePerformance(renderedNodes);
      this.frameTick++;
      if (this.frameTick >= 6) {
        this.frameTick = 0;
        useTimelineStore.getState().syncCamera(this.camera.centerYear, this.camera.scale);
      }
    } catch (err) {
      console.error('[Engine] render error:', err);
    }
  };

  //  RENDER 

  private updatePerformance(renderedNodes: number) {
    this.fpsFrames++;
    this.lastRenderedNodes = renderedNodes;

    const now = performance.now();
    const elapsed = now - this.fpsLastSample;
    if (elapsed < 500) return;

    const fps = Math.round((this.fpsFrames * 1000) / elapsed);
    this.fpsFrames = 0;
    this.fpsLastSample = now;
    useTimelineStore.getState().syncPerformance({
      fps,
      renderedNodes: this.lastRenderedNodes,
    });
  }

  private render() {
    const { filteredNodes: nodes, activeLanes, settings, selectedNodeId } = useTimelineStore.getState();
    const scale    = this.camera.scale;
    const sw       = this.camera.screenW;
    const visLeft  = this.camera.visibleWorldLeft;
    const visRight = this.camera.visibleWorldRight;
    const buffer   = (visRight - visLeft) * 0.15;
    
    const isMobile = window.innerWidth <= 768;
    const rightEdge = isMobile ? sw : this.timelineViewportRight();

    const lanes: { y: number; tag: string | null }[] = [
      { y: this.laneY, tag: null },
      ...activeLanes.map((tag, i) => ({ y: this.laneY - (i + 1) * LANE_STEP, tag })),
    ];

    this.bgLayer.clear();
    this.axisLayer.clear();
    this.nodesLayer.removeChildren();
    this.tickPool.flush();
    this.lanePool.flush();

    for (const { y, tag } of lanes) {
      this.drawLaneBg(y, tag, rightEdge);
      this.drawPeriodBars(y, tag, nodes, scale, visLeft, visRight, buffer);
      this.drawAxisLine(y, rightEdge, tag);
      this.drawLaneLabel(y, tag);
    }

    this.drawTicks(this.laneY, rightEdge, visLeft, visRight);

    let renderedNodes = 0;
    for (const { y, tag } of lanes) {
      renderedNodes += this.drawNodes(y, tag, nodes, scale, visLeft, visRight, buffer, selectedNodeId, settings.animationLevel);
    }

    return renderedNodes;
  }

  //  LANE BACKGROUND 

  private drawLaneBg(y: number, tag: string | null, sw: number) {
    if (!tag) return;
    const g = this.bgLayer;
    const sbw = this.timelineAxisLeft;
    g.rect(sbw, y - 42, sw - sbw, 84);
    g.fill({ color: 0x1e1b4b, alpha: 0.15 });
    g.moveTo(sbw, y - 42); g.lineTo(sw, y - 42);
    g.stroke({ color: 0x312e81, width: 1, alpha: 0.3 });
  }

  //  PERIOD BARS 

  private drawPeriodBars(
    laneY: number, tag: string | null, nodes: TimelineNode[],
    scale: number, visLeft: number, visRight: number, buffer: number,
  ) {
    const g = this.bgLayer;
    const periods = nodes.filter(n => {
      if (n.type !== 'period') return false;
      if (scale < (LOD[n.importance] ?? 9999)) return false;
      if (tag && !(n.tags ?? []).includes(tag)) return false;
      return n.date_end >= visLeft - buffer && n.date_start <= visRight + buffer;
    });

    const t = getThemeMode(useTimelineStore.getState().settings.theme);
    const labelColor = THEME_COLORS[t].nodeTitle;

    for (const p of periods) {
      const x1   = this.camera.worldToScreenX(p.date_start);
      const x2   = this.camera.worldToScreenX(p.date_end);
      const barW = Math.max(4, x2 - x1);
      const col  = NODE_COLORS[p.type] ?? 0x6366f1;

      g.rect(x1, laneY - 4, barW, 8);
      g.fill({ color: col, alpha: 0.3 });
      g.rect(x1, laneY - 4, barW, 8);
      g.stroke({ color: col, width: 2, alpha: 0.8 });

      if (barW > 70 && scale >= 0.1) {
        this.lanePool.get(trunc(p.title, Math.floor(barW / PX_PER_CHAR)), x1 + 5, laneY - 7, {
          fontSize: 9, fill: labelColor, fontFamily: 'Inter, sans-serif',
        });
      }
    }
  }

  //  AXIS LINE 

  private drawAxisLine(y: number, sw: number, tag: string | null) {
    const t = getThemeMode(useTimelineStore.getState().settings.theme);
    const col = tag ? THEME_COLORS[t].axisTag : THEME_COLORS[t].axisMain;
    this.axisLayer.moveTo(this.timelineAxisLeft, y);
    this.axisLayer.lineTo(sw, y);
    this.axisLayer.stroke({ color: col, width: 1 });
  }

  //  LANE LABEL 

  private drawLaneLabel(y: number, tag: string | null) {
    const text  = tag ? tag.replace(/-/g, ' ').toUpperCase() : 'LINHA DO TEMPO';
    const t = getThemeMode(useTimelineStore.getState().settings.theme);
    const color = tag ? 0x6366f1 : THEME_COLORS[t].laneLblMain;
    this.lanePool.get(text, this.timelineAxisLeft + 4, y - 56, {
      fontSize: 9, fontWeight: 'bold', fill: color,
      fontFamily: 'Inter, sans-serif', letterSpacing: 1,
    });
  }

  //  TICK MARKS 

  private drawTicks(laneY: number, sw: number, visLeft: number, visRight: number) {
    const g        = this.axisLayer;
    const visWidth = visRight - visLeft;
    let interval   = 1000;
    if (visWidth < 5000) interval = 500;
    if (visWidth < 1000) interval = 100;
    if (visWidth < 100)  interval = 10;
    if (visWidth < 10)   interval = 1;
    if (visWidth < 1)    interval = 0.1;

    const start = Math.floor(visLeft / interval) * interval;
    const steps = Math.ceil(visWidth / interval) + 2;
    if (steps > 300) return;

    let lastLX = -9999;
    for (let i = 0; i <= steps; i++) {
      const yr = start + i * interval;
      const sx = this.camera.worldToScreenX(yr);
      if (sx < this.timelineAxisLeft || sx > sw + 1) continue;
      
      const t = getThemeMode(useTimelineStore.getState().settings.theme);
      g.moveTo(sx, laneY - 4); g.lineTo(sx, laneY + 12);
      g.stroke({ color: THEME_COLORS[t].axisMain, width: 1 });

      if (sx - lastLX >= 60) {
        lastLX = sx;
        const round = Math.round(yr * 10) / 10;
        const txt   = yr === 0 ? '0' : yr < 0 ? `${Math.abs(round)} a.C.` : `${round} d.C.`;
        const lbl   = this.tickPool.get(txt, 0, laneY + TICK_LABEL_GAP, {
          fontSize: 10, fill: THEME_COLORS[t].tickLbl, fontFamily: 'Inter, sans-serif',
        });
        lbl.x = sx - lbl.width / 2;
      }
    }
  }

  //  NODES 

  private drawNodes(
    laneY: number, tag: string | null, allNodes: TimelineNode[],
    scale: number, visLeft: number, visRight: number, buffer: number,
    selectedNodeId: string | null, animLevel: string,
  ) {
    const candidates = allNodes.filter(n => {
      if (n.type === 'period') return false;
      if (scale < (LOD[n.importance] ?? 9999)) return false;
      if (n.date_start < visLeft - buffer || n.date_start > visRight + buffer) return false;
      if (tag && !(n.tags ?? []).includes(tag)) return false;
      return true;
    });

    candidates.sort((a, b) => b.importance - a.importance);

    const placed: number[] = [];
    const visible: TimelineNode[] = [];
    const tryPlace = (n: TimelineNode) => {
      const sx = this.camera.worldToScreenX(n.date_start);
      if (placed.some(px => Math.abs(sx - px) < MIN_GAP)) return;
      placed.push(sx); visible.push(n);
    };

    const sel = selectedNodeId ? candidates.find(n => n.id === selectedNodeId) : null;
    if (sel) tryPlace(sel);
    for (const n of candidates) { if (n.id !== selectedNodeId) tryPlace(n); }

    for (const node of visible) {
      const poolKey = `${node.id}:${tag ?? 'main'}`;
      let sp = this.nodePool.get(poolKey);
      if (!sp) {
        sp = this.buildSprite(node, animLevel);
        this.nodePool.set(poolKey, sp);
      }
      sp.x = this.camera.worldToScreenX(node.date_start);
      sp.y = laneY;
      this.updateLabels(sp, node, scale, node.id === selectedNodeId, placed);
      this.nodesLayer.addChild(sp);
    }

    return visible.length;
  }

  //  BUILD SPRITE 

  private buildSprite(node: TimelineNode, animLevel: string): NodeSprite {
    const c      = new Container() as NodeSprite;
    const isHigh = node.importance >= 9;
    const color  = isHigh ? HIGH_COLOR : (NODE_COLORS[node.type] ?? 0x3b82f6);
    const r      = Math.max(4, 3 + node.importance * 0.7);

    c.__title  = node.title;
    c.__radius = r;

    const g = new Graphics();
    if (isHigh && animLevel === 'full') {
      g.circle(0, 0, r + 8); g.fill({ color, alpha: 0.12 });
      g.circle(0, 0, r + 4); g.fill({ color, alpha: 0.20 });
    }
    g.circle(0, 0, r); g.fill(color);
    c.addChild(g);

    const ring = new Graphics();
    ring.circle(0, 0, r + 5);
    const t = getThemeMode(useTimelineStore.getState().settings.theme);
    ring.stroke({ color: THEME_COLORS[t].ring, width: 1.5, alpha: 0.8 });
    ring.visible = false;
    c.addChild(ring);
    c.__ring = ring;

    const titleT = new Text({
      text:  trunc(node.title, MAX_CHARS),
      style: new TextStyle({
        fontSize:   Math.min(12, 9 + node.importance * 0.3),
        fill:       isHigh ? THEME_COLORS[t].nodeTitleHi : THEME_COLORS[t].nodeTitle,
        fontFamily: 'Inter, sans-serif',
        fontWeight: isHigh ? 'bold' : 'normal',
      }),
    });
    titleT.anchor.set(0.5, 1);
    titleT.y = -(r + NODE_TITLE_GAP);
    titleT.visible = false;
    c.addChild(titleT);
    c.__titleT = titleT;

    const dateT = new Text({
      text:  node.date_display,
      style: new TextStyle({ fontSize: 9, fill: THEME_COLORS[t].nodeDate, fontFamily: 'Inter, sans-serif' }),
    });
    dateT.anchor.set(0.5, 0);
    dateT.y = r + NODE_DATE_GAP;
    dateT.visible = false;
    c.addChild(dateT);
    c.__dateT = dateT;

    c.eventMode = 'static';
    c.cursor    = 'pointer';
    const hr = Math.max(r + 12, 22);
    c.hitArea = { contains: (px: number, py: number) => px * px + py * py <= hr * hr };
    c.on('pointerdown', (e) => {
      e.stopPropagation();
      useTimelineStore.getState().selectNode(node.id);
    });

    return c;
  }

  //  UPDATE LABELS 

  private updateLabels(
    sp: NodeSprite, node: TimelineNode, scale: number,
    isSel: boolean, placed: number[],
  ) {
    sp.__ring.visible  = isSel;
    const show = scale >= 0.05 && node.importance >= 5;
    if (!show) { sp.__titleT.visible = false; sp.__dateT.visible = false; return; }

    sp.__titleT.visible = true;
    sp.__dateT.visible  = isSel || scale >= 0.1;

    const sx  = this.camera.worldToScreenX(node.date_start);
    let gap   = Infinity;
    for (const px of placed) { const d = Math.abs(px - sx); if (d > 1) gap = Math.min(gap, d); }
    const fit = Math.floor((gap === Infinity ? 999 : gap) / PX_PER_CHAR);
    const txt = (isSel || fit >= sp.__title.length) ? sp.__title : trunc(sp.__title, Math.max(5, fit));
    if (sp.__titleT.text !== txt) sp.__titleT.text = txt;
    sp.__titleT.y = -(sp.__radius + NODE_TITLE_GAP);
  }

  //  SIDEBAR WIDTH 

  private get timelineAxisLeft() {
    if (window.innerWidth < 768) return 12;

    const axisLeft = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--bm-axis-left'),
    );

    return Number.isFinite(axisLeft) ? axisLeft : 24;
  }

  private timelineViewportLeft() {
    return this.canvas.getBoundingClientRect().left;
  }

  private timelineViewportRight() {
    const canvasRect = this.canvas.getBoundingClientRect();

    if (window.innerWidth < 768) return canvasRect.right;

    const sidePanel = document.getElementById('side-panel');
    const panelRect = sidePanel?.getBoundingClientRect();

    return panelRect && panelRect.width > 0 ? panelRect.left : canvasRect.right;
  }

//  LANE Y 

  private get laneY() {
    // Leave space for minimap + bottom margin above it
    return window.innerWidth < 768
      ? this.camera.screenH - 200
      : this.camera.screenH - 120;
  }
}
