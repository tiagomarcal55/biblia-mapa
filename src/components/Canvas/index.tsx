import { useEffect, useRef } from 'react';
import { TimelineEngine } from '../../engine/TimelineEngine';

export function Canvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<TimelineEngine | null>(null);
  const initStarted = useRef(false);

  useEffect(() => {
    if (initStarted.current || !canvasRef.current) return;
    initStarted.current = true;

    const canvas = canvasRef.current;
    const engine = new TimelineEngine(canvas);
    engineRef.current = engine;

    engine.init().catch(err => {
      console.error('[TimelineEngine] init failed:', err);
    });

    // ResizeObserver keeps camera in sync with the canvas element's actual size
    // (critical for mobile where the canvas is smaller than window)
    const ro = new ResizeObserver(() => {
      engineRef.current?.handleResize();
    });
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
    } else {
      ro.observe(canvas);
    }

    return () => {
      initStarted.current = false;
      ro.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', background: 'transparent' }}
    />
  );
}
