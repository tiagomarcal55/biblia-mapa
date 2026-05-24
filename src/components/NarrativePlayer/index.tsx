import { useEffect, useState, useRef } from 'react';
import { useTimelineStore } from '../../store/timeline.store';
import { Play, Pause, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import type { NarrativeNode } from '../../types';

export function NarrativePlayer() {
  const narrativeMode = useTimelineStore(s => s.narrativeMode);
  const activeNarrativeId = useTimelineStore(s => s.activeNarrativeId);
  const narrativeCurrentIndex = useTimelineStore(s => s.narrativeCurrentIndex);
  const nodes = useTimelineStore(s => s.nodes);
  const selectNode = useTimelineStore(s => s.selectNode);
  const exitNarrative = useTimelineStore(s => s.exitNarrative);

  const [isPlaying, setIsPlaying] = useState(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find the active narrative node
  const activeNarrative = nodes.find(
    n => n.id === activeNarrativeId && n.type === 'narrative'
  ) as NarrativeNode | undefined;

  const sequence = activeNarrative?.narrative_sequence || [];
  const totalSteps = sequence.length;
  const goToStep = (index: number) => {
    useTimelineStore.setState({ narrativeCurrentIndex: index });
  };

  // Handle auto-advancing when playing
  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }

    if (isPlaying && totalSteps > 0) {
      const interval = activeNarrative?.autoplay_interval_ms || 6000;
      autoplayTimerRef.current = setInterval(() => {
        const nextIndex = (narrativeCurrentIndex + 1) % totalSteps;
        // If we reached the end, stop autoplaying
        if (nextIndex === 0 && narrativeCurrentIndex === totalSteps - 1) {
          setIsPlaying(false);
        } else {
          goToStep(nextIndex);
        }
      }, interval);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPlaying, narrativeCurrentIndex, totalSteps, activeNarrative]);

  // Navigate the camera and select the node when the current step changes
  useEffect(() => {
    if (!narrativeMode || totalSteps === 0) return;
    
    const currentNodeId = sequence[narrativeCurrentIndex];
    if (!currentNodeId) return;

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (currentNode) {
      // Select the node in the detail panel
      selectNode(currentNodeId);

      // Focus camera on node's start year with appropriate zoom
      window.dispatchEvent(
        new CustomEvent('bm:navigate', {
          detail: { year: currentNode.date_start, zoom: 0.12 },
        })
      );
    }
  }, [narrativeCurrentIndex, narrativeMode, totalSteps, sequence, nodes, selectNode]);

  if (!narrativeMode || !activeNarrative || totalSteps === 0) {
    return null;
  }

  const currentNodeId = sequence[narrativeCurrentIndex];
  const currentNode = nodes.find(n => n.id === currentNodeId);

  const handlePrev = () => {
    setIsPlaying(false);
    const prevIndex = (narrativeCurrentIndex - 1 + totalSteps) % totalSteps;
    goToStep(prevIndex);
  };

  const handleNext = () => {
    setIsPlaying(false);
    const nextIndex = (narrativeCurrentIndex + 1) % totalSteps;
    goToStep(nextIndex);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    setIsPlaying(false);
    exitNarrative();
  };

  const progressPercent = ((narrativeCurrentIndex + 1) / totalSteps) * 100;

  return (
    <div
      id="narrative-player-container"
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '460px',
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--border-15)',
        borderRadius: '16px',
        boxShadow: '0 12px 40px var(--shadow-main)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 200,
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header with Title and Close Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(251, 191, 36, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
            }}
          >
            <Sparkles size={14} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 650, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Guia de Narrativa
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {activeNarrative.title}
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px solid var(--border-10)',
            background: 'var(--border-5)',
            color: 'var(--text-sec)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--border-5)';
            e.currentTarget.style.color = 'var(--text-sec)';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ position: 'relative', width: '100%', height: '4px', background: 'var(--border-8)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* Step Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-mut)', fontWeight: 600 }}>
            Passo {narrativeCurrentIndex + 1} de {totalSteps}
          </span>
          <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
            {currentNode?.date_display}
          </span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 650, color: 'var(--text-main)', marginTop: '2px' }}>
          {currentNode?.title}
        </div>
        {currentNode?.description && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-sec)',
              lineHeight: '1.4',
              maxHeight: '48px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {currentNode.description}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '4px' }}>
        <button
          onClick={handlePrev}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid var(--border-10)',
            background: 'var(--border-4)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-8)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--border-4)')}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={handleTogglePlay}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            color: '#1e1b4b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.3)';
          }}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
        </button>

        <button
          onClick={handleNext}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid var(--border-10)',
            background: 'var(--border-4)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-8)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--border-4)')}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}