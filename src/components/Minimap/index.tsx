import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline.store';
import { useBreakpoint } from '../../hooks/useBreakpoint';

/**
 * Minimap — barra de visão geral na parte inferior da tela.
 */

export function Minimap() {
  const nodes      = useTimelineStore(s => s.nodes);
  const cameraYear = useTimelineStore(s => s.cameraYear);
  const cameraZoom = useTimelineStore(s => s.cameraZoom);
  const { isMobile } = useBreakpoint();
  const [layoutVersion, setLayoutVersion] = React.useState(0);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  React.useEffect(() => {
    const updateLayout = () => setLayoutVersion(version => version + 1);

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('bm:layout-change', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('bm:layout-change', updateLayout);
    };
  }, []);

  const minYear = React.useMemo(() => Math.min(-7000, ...nodes.map(n => n.date_start)), [nodes]);
  const maxYear = React.useMemo(() => Math.max(3050, ...nodes.map(n => Math.max(n.date_start, n.date_end ?? n.date_start))), [nodes]);
  const worldSpan = maxYear - minYear;

  const toMinimapPct = React.useCallback((year: number) => {
    return ((year - minYear) / worldSpan) * 100;
  }, [minYear, worldSpan]);

  const detailPanelLeft = (() => {
    void layoutVersion;
    if (typeof window === 'undefined' || typeof document === 'undefined') return 1200;
    if (isMobile) return window.innerWidth;

    const raw = getComputedStyle(document.documentElement).getPropertyValue('--bm-detail-panel-left').trim();
    if (raw.endsWith('px')) {
      const value = Number.parseFloat(raw);
      if (Number.isFinite(value)) return value;
    }

    return window.innerWidth;
  })();
  const availableWidth = Math.max(320, detailPanelLeft);

  // Visible world span based on the available timeline width.
  const screenW    = availableWidth;
  const visSpan    = Math.max(1, screenW / Math.max(cameraZoom, 0.00001));
  const visLeft    = cameraYear - visSpan / 2;
  const visRight   = cameraYear + visSpan / 2;
  const vpLeft     = Math.max(0, Math.min(99, toMinimapPct(visLeft)));
  const vpWidth    = Math.max(1, Math.min(100 - vpLeft, toMinimapPct(visRight) - toMinimapPct(visLeft)));

  const navigateToYear = React.useCallback((year: number, zoom = cameraZoom) => {
    window.dispatchEvent(new CustomEvent('bm:navigate', {
      detail: {
        year: Math.max(minYear, Math.min(maxYear, year)),
        zoom,
      },
    }));
  }, [cameraZoom, maxYear, minYear]);

  const yearFromPointer = React.useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return cameraYear;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return minYear + pct * worldSpan;
  }, [cameraYear, minYear, worldSpan]);

  const onTrackPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    navigateToYear(yearFromPointer(event.clientX));
  }, [navigateToYear, yearFromPointer]);

  const onTrackPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    navigateToYear(yearFromPointer(event.clientX));
  }, [navigateToYear, yearFromPointer]);

  const onTrackPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onTrackClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    navigateToYear(yearFromPointer(event.clientX));
  }, [navigateToYear, yearFromPointer]);

  const panMinimap = React.useCallback((direction: -1 | 1) => {
    navigateToYear(cameraYear + direction * visSpan * 0.75);
  }, [cameraYear, navigateToYear, visSpan]);

  return (
    <div
      id="minimap"
      style={{
        position: 'absolute',
        bottom:   '12px',
        left:     isMobile ? '50%' : 'calc(var(--bm-detail-panel-left) / 2)',
        right:    isMobile ? 'auto' : 'auto',
        transform: isMobile ? 'translateX(-50%)' : 'translateX(-50%)',
        width:    isMobile ? 'calc(100% - 24px)' : 'min(900px, calc(var(--bm-detail-panel-left) - 24px))',
        maxWidth: '900px',
        height:   '46px',
        background: 'var(--bg-narrative)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-7)',
        borderRadius: '10px',
        boxShadow: '0 4px 20px var(--shadow-main)',
        zIndex: 18,
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <button
        id="minimap-prev"
        type="button"
        title="Voltar na linha do tempo"
        onClick={() => panMinimap(-1)}
        style={{ color: 'var(--text-dimmer)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
      >
        <ChevronLeft size={13} />
      </button>

      {/* Track */}
      <div
        id="minimap-track"
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerEnd}
        onPointerCancel={onTrackPointerEnd}
        onClick={onTrackClick}
        style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden', cursor: 'grab', touchAction: 'none' }}
      >

        {/* Horizontal axis rule */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: '50%', height: '1px',
          background: 'var(--border-5)',
        }} />

        {/* Year 0 (AD/BC divider) */}
        <div style={{
          position: 'absolute',
          left: `${toMinimapPct(0)}%`,
          top: '20%', bottom: '20%',
          width: '1px',
          background: 'rgba(251,191,36,0.25)',
        }} />

        {/* Node dots — only importance  8 for clarity */}
        {nodes.filter(n => n.importance >= 8).map(n => {
          const pct = toMinimapPct(n.date_start);
          if (pct < 0 || pct > 100) return null;
          return (
            <div
              key={n.id}
              title={n.title}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width:  n.importance === 10 ? '7px' : '4px',
                height: n.importance === 10 ? '7px' : '4px',
                borderRadius: '50%',
                background: n.importance === 10 ? '#fbbf24'
                  : n.type === 'event'     ? '#3b82f6'
                  : n.type === 'character' ? '#10b981'
                  : n.type === 'period'    ? '#6366f1'
                  : '#8b5cf6',
                opacity: 0.9,
                cursor: 'pointer',
                zIndex: 2,
              }}
              onPointerDown={event => {
                event.stopPropagation();
              }}
              onClick={() => {
                useTimelineStore.getState().selectNode(n.id);
                navigateToYear(n.date_start, Math.max(cameraZoom, 0.08));
              }}
            />
          );
        })}

        {/* Viewport indicator */}
        <div
          id="minimap-viewport"
          style={{
            position: 'absolute',
            left:   `${vpLeft}%`,
            width:  `${vpWidth}%`,
            top: '15%', bottom: '15%',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.35)',
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      </div>

      <button
        id="minimap-next"
        type="button"
        title="Avancar na linha do tempo"
        onClick={() => panMinimap(1)}
        style={{ color: 'var(--text-dimmer)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}