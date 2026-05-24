import type React from 'react';
import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useTimelineStore } from '../../store/timeline.store';
import {
  X, Star, Calendar, BookMarked, BookOpen, Link2, Edit3, Share2,
  ChevronLeft, ChevronRight, ExternalLink, Hash, User, MapPin,
  Maximize2, Minimize2,
} from 'lucide-react';
import type { TimelineNode } from '../../types';
import { buildJWStudyBibleUrl } from '../../lib/bible-urls';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const ArticleReader = lazy(() => import('../ArticleReader').then(m => ({ default: m.ArticleReader })));

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  event: 'EVENTO', character: 'PESSOA', place: 'LUGAR',
  period: 'PERÍODO', narrative: 'NARRATIVA',
};
const TYPE_COLORS: Record<string, string> = {
  event: '#3b82f6', character: '#10b981', place: '#8b5cf6',
  period: '#6366f1', narrative: '#f59e0b',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  character: <User size={11} />,
  place:     <MapPin size={11} />,
  event:     <Calendar size={11} />,
};

const MIN_WIDTH     = 260;
const DEFAULT_WIDTH = 320;
const MAX_WIDTH     = 700;

function setDetailPanelLeft(value: string) {
  document.documentElement.style.setProperty('--bm-detail-panel-left', value);
  window.dispatchEvent(new CustomEvent('bm:layout-change'));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidePanelProps {
  onEditNode: (node: TimelineNode) => void;
}

const getInitialWidth = () => {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  // Se for PC/Tablet com aspecto horizontal largo (aspect ratio > 1.2)
  if (window.innerWidth > 768 && window.innerWidth / window.innerHeight > 1.2) {
    return Math.max(DEFAULT_WIDTH, Math.floor(window.innerWidth * 0.3));
  }
  return DEFAULT_WIDTH;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SidePanel({ onEditNode }: SidePanelProps) {
  const selectedNodeId = useTimelineStore(s => s.selectedNodeId);
  const detailPanelOpen = useTimelineStore(s => s.detailPanelOpen);
  const nodes          = useTimelineStore(s => s.nodes);
  const selectNode     = useTimelineStore(s => s.selectNode);
  const toggleLane     = useTimelineStore(s => s.toggleLane);
  const activeLanes    = useTimelineStore(s => s.activeLanes);

  const { isMobile } = useBreakpoint();
  const node = nodes.find(n => n.id === selectedNodeId) ?? null;

  // ── Panel width (desktop) ────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(getInitialWidth);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(panelWidth);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current  = true;
    dragStartX.current  = e.clientX;
    dragStartW.current  = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx      = dragStartX.current - ev.clientX; // left = wider
      const newW    = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartW.current + dx));
      setPanelWidth(newW);
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (isMobile || !detailPanelOpen || !node) {
      setDetailPanelLeft('100vw');
      return;
    }

    const updateLayoutVars = () => {
      const width = maximized ? window.innerWidth - 32 : panelWidth;
      const left = Math.max(16, window.innerWidth - 16 - width);
      setDetailPanelLeft(`${left}px`);
    };

    updateLayoutVars();
    window.addEventListener('resize', updateLayoutVars);

    return () => {
      window.removeEventListener('resize', updateLayoutVars);
    };
  }, [detailPanelOpen, isMobile, maximized, node, panelWidth]);

  useEffect(() => {
    return () => {
      setDetailPanelLeft('100vw');
    };
  }, []);

  // ── Mobile bottom sheet swipe ────────────────────────────────────────────
  const [sheetY,    setSheetY]    = useState(0);
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setSheetY(dy);
  };
  const onTouchEnd = () => {
    if (sheetY > 120) selectNode(null);
    setSheetY(0);
  };

  if (!detailPanelOpen || !node) return null;

  const color        = TYPE_COLORS[node.type] ?? 'var(--text-dim)';
  const images: string[] = node.cover_image
    ? node.cover_image.split(/[\n,]+/).map(img => img.trim()).filter(Boolean)
    : [];
  const relatedNodes = (node.related_ids ?? [])
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean) as TimelineNode[];

  // ── Desktop layout ───────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <aside
        id="side-panel"
        className="bm-panel"
        style={{
          position: 'absolute',
          right: maximized ? '1rem' : '1rem', 
          top: '1rem', bottom: '1rem',
          width: maximized ? 'calc(100vw - 2rem)' : `${panelWidth}px`,
          maxWidth: maximized ? 'calc(100vw - 2rem)' : MAX_WIDTH,
          display: 'flex', flexDirection: 'column',
          zIndex: 20, overflow: 'hidden',
          animation: 'slideInRight 0.2s ease-out',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Resize handle (hide when maximized) ─────────────────────────── */}
        {!maximized && (
          <div
            id="side-panel-resize"
            onMouseDown={onDragStart}
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
              cursor: 'col-resize', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: '3px', height: '40px', borderRadius: '3px',
              background: 'var(--border-8)',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-20)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--border-8)')}
            />
          </div>
        )}

        {/* ── Floating Action Bar ─────────────────────────────────────────── */}
        <div
          id="side-panel-window-actions"
          style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 100,
          display: 'flex', gap: '6px',
          background: 'var(--bg-panel-solid)',
          border: '1px solid var(--border-10)',
          boxShadow: '0 8px 24px var(--shadow-light)',
          padding: '5px', borderRadius: '10px', backdropFilter: 'blur(16px)'
        }}
        >
          <IconBtn id="btn-panel-max" icon={maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />} onClick={() => setMaximized(!maximized)} title={maximized ? "Restaurar" : "Expandir painel"} />
          <IconBtn id="btn-panel-close" icon={<X size={14} />}     onClick={() => selectNode(null)} title="Fechar" />
        </div>

        {/* ── Content Wrapper ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <PanelContent
            node={node}
            color={color}
            images={images}
            relatedNodes={relatedNodes}
            panelWidth={maximized ? window.innerWidth : panelWidth}
            activeLanes={activeLanes}
            toggleLane={toggleLane}
            selectNode={selectNode}
            onEditNode={onEditNode}
          />
        </div>
      </aside>
    );
  }

  // ── Mobile bottom sheet ──────────────────────────────────────────────────
  return (
    <div
      id="side-panel-mobile"
      className="bm-panel"
      style={{
        position: 'fixed',
        top: 0, bottom: 64, left: 0, right: 0,
        transform: `translateY(${sheetY}px)`,
        transition: sheetY === 0 ? 'transform 0.3s cubic-bezier(0.16,1,0.3,1)' : 'none',
        borderTop: '1px solid var(--border-10)',
        borderRadius: '18px 18px 0 0',
        zIndex: 40,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUpFade 0.3s ease-out',
      }}
    >
      {/* Drag handle pill */}
      <div 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', touchAction: 'none' }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-15)' }} />
      </div>

      {/* ── Floating Action Bar ─────────────────────────────────────────── */}
      <div
        id="side-panel-window-actions-mobile"
        style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 100,
        display: 'flex', gap: '6px',
        background: 'var(--bg-panel-solid)',
        border: '1px solid var(--border-10)',
        boxShadow: '0 8px 24px var(--shadow-light)',
        padding: '5px', borderRadius: '10px', backdropFilter: 'blur(16px)'
      }}
      >
        <IconBtn id="btn-panel-close" icon={<X size={14} />}     onClick={() => selectNode(null)} title="Fechar" />
      </div>

      {/* ── Content Wrapper ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <PanelContent
          node={node}
          color={color}
          images={images}
          relatedNodes={relatedNodes}
          panelWidth={window.innerWidth}
          activeLanes={activeLanes}
          toggleLane={toggleLane}
          selectNode={selectNode}
          onEditNode={onEditNode}
        />
      </div>
    </div>
  );
}

// ─── Panel Content (shared desktop + mobile) ──────────────────────────────────

interface PanelContentProps {
  node:         TimelineNode;
  color:        string;
  images:       string[];
  relatedNodes: TimelineNode[];
  panelWidth:   number;
  activeLanes:  string[];
  toggleLane:   (id: string) => void;
  selectNode:   (id: string | null) => void;
  onEditNode:   (node: TimelineNode) => void;
}

function PanelContent({
  node, color, images, relatedNodes, panelWidth,
  activeLanes, toggleLane, selectNode, onEditNode,
}: PanelContentProps) {
  // Detect if wide enough to show 2-column layout
  const wide = panelWidth >= 480;

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}?node=${node.id}`;
    const shareText = `*${node.title}*\n${node.date_display}\n\n${node.description ?? ''}\n\nVeja na Bíblia Mapa interativa: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: node.title,
        text: node.description ?? `Confira a nota "${node.title}" na Bíblia Mapa!`,
        url: shareUrl,
      }).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        navigator.clipboard.writeText(shareText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      {/* Image carousel */}
      {images.length > 0 && <ImageCarousel images={images} />}

      {/* Header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border-5)', marginTop: images.length > 0 ? 0 : '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
            color, background: `${color}15`, border: `1px solid ${color}35`,
            borderRadius: '4px', padding: '2px 7px',
          }}>
            {TYPE_LABELS[node.type] ?? node.type.toUpperCase()}
          </span>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
          {node.title}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {node.date_display && node.date_display !== '—' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={10} color="#64748b" />
              <span style={{ fontSize: '11px', color: 'var(--text-mut)' }}>{node.date_display}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Star key={i} size={7}
                color={i < node.importance ? '#fbbf24' : '#1e293b'}
                fill={i < node.importance  ? '#fbbf24' : '#1e293b'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Scripture references with inline article reader */}
        {(node.scripture_refs ?? []).length > 0 && (
          <Section id="sec-scriptures" title="Referências Bíblicas" icon={<BookMarked size={11} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {node.scripture_refs!.map(ref => (
                <ScriptureBlock key={ref} ref_str={ref} />
              ))}
            </div>
          </Section>
        )}

        {/* External Links */}
        {(node.links ?? []).length > 0 && (
          <Section id="sec-links" title="Links e Artigos" icon={<Link2 size={11} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {node.links!.map(lnk => (
                <ExternalLinkBlock key={lnk} url={lnk} />
              ))}
            </div>
          </Section>
        )}

        {/* Description */}
        <Section id="sec-summary" title="Descrição" icon={null}>
          <p style={{ fontSize: '13px', color: 'var(--text-mut)', lineHeight: '1.75', margin: 0, whiteSpace: 'pre-line' }}>
            {node.description ?? getSummary(node)}
          </p>
        </Section>

        {/* Related nodes */}
        {relatedNodes.length > 0 && (
          <Section id="sec-related" title="Notas Relacionadas" icon={<Link2 size={11} />}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: wide ? '1fr 1fr' : '1fr',
              gap: '4px',
            }}>
              {relatedNodes.map(r => (
                <RelatedChip key={r.id} node={r} onSelect={() => selectNode(r.id)} />
              ))}
            </div>
          </Section>
        )}

        {/* Tags */}
        {(node.tags ?? []).length > 0 && (
          <Section id="sec-tags" title="Tags / Lanes" icon={<Hash size={11} />}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {node.tags!.map(tag => {
                const isLane = activeLanes.includes(tag);
                return (
                  <button
                    key={tag}
                    id={`tag-chip-${tag}`}
                    onClick={() => toggleLane(tag)}
                    title={isLane ? 'Desativar lane' : 'Ativar lane paralela'}
                    style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                      background: isLane ? 'rgba(99,102,241,0.18)' : 'var(--border-5)',
                      border: isLane ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border-7)',
                      color: isLane ? '#818cf8' : 'var(--text-mut)',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: '10px', color: '#334155', margin: '6px 0 0', fontStyle: 'italic' }}>
              Clique em uma tag para criar uma lane paralela na linha do tempo.
            </p>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border-5)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-dimmer)' }}>ID: {node.id}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="btn-panel-share"
            className="bm-soft-button"
            onClick={handleShare}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px',
              background: copied ? 'rgba(16,185,129,0.12)' : 'var(--border-5)',
              borderColor: copied ? 'rgba(16,185,129,0.35)' : 'var(--border-8)',
              color: copied ? '#10b981' : 'var(--text-mut)',
            }}
          >
            <Share2 size={11} />
            {copied ? 'Copiado!' : 'Compartilhar'}
          </button>
          <button
            id="btn-panel-edit-footer"
            className="bm-soft-button"
            onClick={() => onEditNode(node)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px',
            }}
          >
            <Edit3 size={11} />
            Editar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Scripture block with article reader ──────────────────────────────────────

function ScriptureBlock({ ref_str }: { ref_str: string }) {
  const url = buildJWStudyBibleUrl(ref_str);
  const [readerOpen, setReaderOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Reference link + read button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '6px', color: '#60a5fa', fontSize: '11px', textDecoration: 'none',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.16)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
        >
          {ref_str}
          <ExternalLink size={9} />
        </a>

        <button
          id={`btn-read-${ref_str.replace(/\s+/g, '-')}`}
          onClick={() => setReaderOpen(r => !r)}
          className="bm-icon-button"
          title={readerOpen ? 'Recolher passagem' : 'Ler passagem'}
          style={{
            background: readerOpen ? 'var(--accent-primary-soft)' : 'var(--border-5)',
            borderColor: readerOpen ? 'var(--accent-primary-border)' : 'var(--border-8)',
            color: readerOpen ? 'var(--accent-primary)' : 'var(--text-dim)',
          }}
        >
          <BookOpen size={13} />
        </button>
      </div>

      {/* Inline article reader */}
      {readerOpen && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--border-2)',
          border: '1px solid var(--border-6)',
          borderRadius: '8px',
        }}>
          <Suspense fallback={null}>
            <ArticleReader url={url} label={ref_str} onClose={() => setReaderOpen(false)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

function ExternalLinkBlock({ url }: { url: string }) {
  const [readerOpen, setReaderOpen] = useState(false);
  const isJw = url.toLowerCase().includes('jw.org');
  const label = url.replace(/^https?:\/\/(www\.)?/, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            background: isJw ? 'rgba(16,185,129,0.08)' : 'var(--border-4)',
            border: isJw ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--border-8)',
            borderRadius: '6px', color: isJw ? '#34d399' : 'var(--text-mut)', fontSize: '11px', textDecoration: 'none',
            transition: 'background 0.1s',
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = isJw ? 'rgba(16,185,129,0.16)' : 'var(--border-8)')}
          onMouseLeave={e => (e.currentTarget.style.background = isJw ? 'rgba(16,185,129,0.08)' : 'var(--border-4)')}
        >
          {label}
          <ExternalLink size={9} />
        </a>

        {isJw && (
          <button
            id={`btn-read-link-${label.replace(/[^a-zA-Z0-9]/g, '-')}`}
            onClick={() => setReaderOpen(r => !r)}
            className="bm-icon-button"
            title={readerOpen ? 'Recolher artigo' : 'Ler artigo'}
            style={{
              background: readerOpen ? 'var(--accent-primary-soft)' : 'var(--border-5)',
              borderColor: readerOpen ? 'var(--accent-primary-border)' : 'var(--border-8)',
              color: readerOpen ? 'var(--accent-primary)' : 'var(--text-dim)',
            }}
          >
            <BookOpen size={13} />
          </button>
        )}
      </div>

      {readerOpen && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--border-2)',
          border: '1px solid var(--border-6)',
          borderRadius: '8px',
        }}>
          <Suspense fallback={null}>
            <ArticleReader url={url} label="Artigo" onClose={() => setReaderOpen(false)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ─── Image Carousel ───────────────────────────────────────────────────────────

function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx]         = useState(0);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ position: 'relative', background: 'var(--bg-black)', borderBottom: '1px solid var(--border-6)' }}>
      <img
        src={images[idx]} alt=""
        onClick={() => setExpanded(true)}
        style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block', cursor: 'zoom-in', opacity: 0.85 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
      />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)} style={carouselBtn('left')}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setIdx(i => (i + 1) % images.length)} style={carouselBtn('right')}>
            <ChevronRight size={14} />
          </button>
          <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
            {images.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: i === idx ? '16px' : '6px', height: '6px', borderRadius: '3px',
                background: i === idx ? 'var(--text-white)' : 'var(--border-40)', cursor: 'pointer', transition: 'all 0.2s',
              }} />
            ))}
          </div>
        </>
      )}
      {expanded && (
        <ZoomableImage images={images} initialIdx={idx} onClose={() => setExpanded(false)} />
      )}
    </div>
  );
}

function carouselBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: '6px', width: '26px', height: '26px', borderRadius: '50%',
    background: 'var(--bg-overlay-6)', border: '1px solid var(--border-20)',
    color: 'var(--text-white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function ZoomableImage({ images, initialIdx, onClose }: { images: string[]; initialIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIdx);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [draggingImage, setDraggingImage] = useState(false);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastDist = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    if (scale === 1 && (pos.x !== 0 || pos.y !== 0)) {
      timer = window.setTimeout(() => {
        setPos({ x: 0, y: 0 });
      }, 0);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [scale, pos.x, pos.y]);

  const resetZoom = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const nextImage = () => {
    setIdx(i => (i + 1) % images.length);
    resetZoom();
  };

  const prevImage = () => {
    setIdx(i => (i - 1 + images.length) % images.length);
    resetZoom();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      lastDist.current = d;
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      setDraggingImage(true);
      startPos.current = { x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y };
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const factor = d / lastDist.current;
      lastDist.current = d;
      setScale(s => Math.max(1, Math.min(s * factor, 10)));
    } else if (e.touches.length === 1 && isDragging.current) {
      setPos({
        x: e.touches[0].clientX - startPos.current.x,
        y: e.touches[0].clientY - startPos.current.y
      });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    isDragging.current = false;
    setDraggingImage(false);
    lastDist.current = null;

    if (scale === 1 && touchStartX.current !== null && e.changedTouches.length > 0) {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (deltaX > 80) {
        prevImage();
      } else if (deltaX < -80) {
        nextImage();
      }
    }
    touchStartX.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(1, Math.min(s * zoomAmount, 10)));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    setDraggingImage(true);
    startPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPos({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
  };
  
  const onMouseUp = () => {
    isDragging.current = false;
    setDraggingImage(false);
  };

  return (
    <div 
      style={{
        position: 'absolute', inset: 0, zIndex: 300, background: 'var(--bg-overlay-9)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none'
      }}
      onWheel={onWheel}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    >
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 301 }}>
        <button onClick={onClose} style={{ background: 'var(--bg-overlay)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-white)', display: 'flex' }}>
          <X size={20} />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); prevImage(); }} 
            style={{ ...carouselBtn('left'), zIndex: 301, width: '40px', height: '40px', fontSize: '18px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextImage(); }} 
            style={{ ...carouselBtn('right'), zIndex: 301, width: '40px', height: '40px', fontSize: '18px' }}
          >
            <ChevronRight size={20} />
          </button>
          
          <div style={{
            position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-overlay)', color: 'white', padding: '6px 14px', borderRadius: '20px',
            fontSize: '12px', fontWeight: 600, zIndex: 301
          }}>
            {idx + 1} / {images.length}
          </div>
        </>
      )}

      <img 
        src={images[idx]} alt="" draggable={false}
        style={{ 
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', 
          cursor: draggingImage ? 'grabbing' : 'grab',
          transition: draggingImage || scale !== 1 ? 'none' : 'transform 0.1s ease-out'
        }} 
      />
    </div>
  );
}

// ─── Related chip ─────────────────────────────────────────────────────────────

function RelatedChip({ node, onSelect }: { node: TimelineNode; onSelect: () => void }) {
  const color = TYPE_COLORS[node.type] ?? 'var(--text-dim)';
  const icon  = TYPE_ICONS[node.type];
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '6px 9px',
        background: `${color}0d`, border: `1px solid ${color}22`,
        borderRadius: '8px', color: 'var(--text-sec)', fontSize: '12px',
        cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}1a`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}0d`)}
    >
      <span style={{ color, flexShrink: 0 }}>{icon ?? <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block' }} />}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="bm-panel-section" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
        {icon && <span style={{ color: 'var(--text-dimmer)' }}>{icon}</span>}
        <span className="bm-section-title">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Icon button ──────────────────────────────────────────────────────────────

function IconBtn({ id, icon, onClick, title }: { id: string; icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      id={id}
      className="bm-icon-button"
      onClick={onClick}
      title={title}
      type="button"
      style={{
        background: 'var(--border-5)',
        borderColor: 'var(--border-8)',
      }}
    >
      {icon}
    </button>
  );
}

// ─── Summary placeholder ──────────────────────────────────────────────────────

function getSummary(node: TimelineNode): string {
  const map: Record<string, string> = {
    'EVT-0001': 'Deus cria os céus e a terra em seis dias. Adão e Eva são criados como o ápice da criação, com o dom do livre-arbítrio.',
    'EVT-0005': 'Após dez pragas devastadoras sobre o Egito, Moisés lidera os israelitas para fora da escravidão.',
    'EVT-0022': 'Jesus morre no madeiro de tortura como resgate pelos pecados da humanidade, cumprindo as profecias messiânicas.',
    'EVT-0023': 'No terceiro dia após sua morte, Jesus ressuscita — garantia da ressurreição futura para toda a humanidade.',
  };
  return map[node.id] ?? `${node.type === 'character' ? 'Personagem bíblico' : 'Nota'} datado(a) de ${node.date_display}. Clique em Editar para adicionar uma descrição.`;
}