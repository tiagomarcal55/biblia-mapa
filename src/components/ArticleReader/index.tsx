import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ExternalLink, BookOpen, Loader2, AlertCircle, X, Minus, Plus } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline.store';

// ─── Component ────────────────────────────────────────────────────────────────

interface ArticleReaderProps {
  url:     string;        // Full JW.org URL
  label?:  string;        // Display label
  autoLoad?: boolean;     // Whether to load immediately on mount
  onClose?: () => void;
}

export function ArticleReader({ url, label, autoLoad = true, onClose }: ArticleReaderProps) {
  const theme = useTimelineStore(s => s.settings.theme) || 'dark';
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(autoLoad ? 'loading' : 'idle');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState('');
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('bm_reader_font_size');
    return saved ? parseInt(saved, 10) : 14;
  });
  
  useEffect(() => {
    localStorage.setItem('bm_reader_font_size', fontSize.toString());
  }, [fontSize]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update font size dynamically in the iframe without reloading
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const root = iframeRef.current.contentWindow.document.documentElement;
        root.style.setProperty('--reader-font-size', `${fontSize}px`);
        root.style.setProperty('--reader-text', theme === 'light' ? '#44403c' : '#cbd5e1');
        root.style.setProperty('--reader-title', theme === 'light' ? '#292524' : '#f3f4f6');
        root.style.setProperty('--reader-verse', theme === 'light' ? '#b45309' : '#fbbf24');
        root.style.setProperty('--reader-link', theme === 'light' ? '#0284c7' : '#60a5fa');
        root.style.setProperty('--reader-player-bg', theme === 'light' ? '#f1f5f9' : '#1e293b');
        root.style.setProperty('--reader-player-text', theme === 'light' ? '#1e293b' : '#cbd5e1');
        root.style.setProperty('--reader-player-btn-bg', theme === 'light' ? '#e2e8f0' : '#334155');
        root.style.setProperty('--reader-player-btn-text', theme === 'light' ? '#0f172a' : '#f8fafc');
        root.style.setProperty('--reader-border', theme === 'light' ? '#cbd5e1' : '#334155');
      } catch {
        // Cross-origin iframe access can fail while the reader is still usable.
      }
    }
  }, [fontSize, theme]);

  const load = useCallback(async (targetUrl: string) => {
    setState('loading');
    setError('');
    try {
      const urlObj = new URL(targetUrl);
      
      let proxyPath = targetUrl;
      if (urlObj.hostname === 'www.jw.org' || urlObj.hostname === 'jw.org') {
        proxyPath = `/jw-api${urlObj.pathname}${urlObj.search}`;
      } else if (urlObj.hostname === 'wol.jw.org') {
        proxyPath = `/wol-api${urlObj.pathname}${urlObj.search}`;
      }

      const cacheKey = proxyPath;
      const cache = await caches.open('bm-article-cache-v1');
      const cachedResponse = await cache.match(cacheKey);
      
      let html = '';
      if (cachedResponse) {
        html = await cachedResponse.text();
      } else {
        const res = await fetch(proxyPath, { headers: { 'Accept': 'text/html' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
        
        // Asynchronously save to cache
        void cache.put(cacheKey, new Response(html, { headers: { 'Content-Type': 'text/html' } }));
      }

      const injection = `
        <base href="${urlObj.origin}/">
        <style>
          /* Bloquear apenas banners de cookies, privacidade e popups obstrutivos da lnc */
          [id*="cookie" i], [class*="cookie" i], [id*="privacy" i], [class*="privacy" i],
          .lnc-banner, .lnc-firstRunPopup, [class*="lnc-" i] { 
            display: none !important; 
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
          
          /* Ajustar rolagem geral para caber perfeitamente no iframe */
          html, body {
            overflow-x: hidden !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          /* Suporte a ajuste do tamanho de fonte pelo usuario */
          body, p, span, li, td {
            font-size: var(--reader-font-size, inherit) !important;
          }
        </style>
        <script>
          // Forcar todos os links externos a abrirem em nova aba, exceto textos citados (classes b, xt ou bibleref)
          window.addEventListener('load', function() {
            document.querySelectorAll('a').forEach(a => {
              const isBibleRef = a.classList.contains('b') || a.classList.contains('xt') || a.hasAttribute('data-bibleref');
              const href = a.getAttribute('href');
              if (!isBibleRef && href && !href.startsWith('#')) {
                a.setAttribute('target', '_blank');
              }
            });
            
            // Tentar rolar ate o hash (ex: versiculo selecionado)
            const hash = "${urlObj.hash}";
            if (hash) {
              setTimeout(() => {
                const el = document.querySelector(hash);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.style.backgroundColor = 'rgba(251,191,36,0.2)';
                  el.style.borderRadius = '4px';
                  el.style.padding = '2px 4px';
                }
              }, 600);
            }
          });
        </script>
      `;

      // Injeta <base>, estilos e scripts no head da pagina original completa
      html = html.replace(/<head[^>]*>/i, `$&${injection}`);
      
      setHtmlContent(html);
      setState('done');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao carregar o artigo.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!autoLoad || state !== 'loading' || htmlContent || error) return;
    const timer = window.setTimeout(() => {
      void load(url);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoLoad, load, url, state, htmlContent, error]);

  // ── Idle state ─────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={() => load(url)} style={iconBtnText}>
          <BookOpen size={12} /> Ler artigo
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          <ExternalLink size={10} /> jw.org
        </a>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        Carregando modo leitura...
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '12px' }}>
          <AlertCircle size={13} />
          {error}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setState('idle')} style={smallBtn}>Tentar novamente</button>
          <a href={url} target="_blank" rel="noopener noreferrer" style={smallBtn}>
            Abrir no navegador <ExternalLink size={10} />
          </a>
        </div>
      </div>
    );
  }

  // ── Article view (Iframe Embedded) ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 0 10px',
        borderBottom: '1px solid var(--border-6)',
        marginBottom: '10px',
      }}>
        <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label || 'Leitor'}
        </span>
        
        {/* Controles de zoom da fonte */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--border-5)', borderRadius: '6px', overflow: 'hidden' }}>
          <button onClick={() => setFontSize(f => Math.max(10, f - 1))} style={zoomBtn} title="Diminuir fonte">
            <Minus size={11} />
          </button>
          <span style={{ fontSize: '10px', color: 'var(--text-mut)', padding: '0 4px', width: '24px', textAlign: 'center' }}>
            {fontSize}
          </span>
          <button onClick={() => setFontSize(f => Math.min(24, f + 1))} style={zoomBtn} title="Aumentar fonte">
            <Plus size={11} />
          </button>
        </div>

        <a href={url} target="_blank" rel="noopener noreferrer" style={iconBtn} title="Abrir no JW.ORG">
          <ExternalLink size={13} />
        </a>
        <button onClick={() => { if(onClose) onClose(); else setState('idle'); }} style={iconBtn} title="Fechar leitor">
          <X size={13} />
        </button>
      </div>

      {/* Embedded Webview */}
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        allowFullScreen
        onLoad={(e) => {
          try {
            const root = e.currentTarget.contentWindow?.document.documentElement;
            if (root) {
              root.style.setProperty('--reader-font-size', `${fontSize}px`);
              root.style.setProperty('--reader-text', theme === 'light' ? '#44403c' : '#cbd5e1');
              root.style.setProperty('--reader-title', theme === 'light' ? '#292524' : '#f3f4f6');
              root.style.setProperty('--reader-verse', theme === 'light' ? '#b45309' : '#fbbf24');
              root.style.setProperty('--reader-link', theme === 'light' ? '#0284c7' : '#60a5fa');
              root.style.setProperty('--reader-player-bg', theme === 'light' ? '#f1f5f9' : '#1e293b');
              root.style.setProperty('--reader-player-text', theme === 'light' ? '#1e293b' : '#cbd5e1');
              root.style.setProperty('--reader-player-btn-bg', theme === 'light' ? '#e2e8f0' : '#334155');
              root.style.setProperty('--reader-player-btn-text', theme === 'light' ? '#0f172a' : '#f8fafc');
              root.style.setProperty('--reader-border', theme === 'light' ? '#cbd5e1' : '#334155');
            }
          } catch {
            // Cross-origin iframe access can fail while the reader is still usable.
          }
        }}
        style={{
          width: '100%',
          height: '65vh',
          border: 'none',
          background: 'transparent',
          borderRadius: '4px',
        }}
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const smallBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 10px', borderRadius: '6px',
  background: 'var(--border-5)', border: '1px solid var(--border-10)',
  color: 'var(--text-mut)', fontSize: '11px', cursor: 'pointer', textDecoration: 'none',
};

const iconBtnText: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '5px 12px',
  background: 'rgba(16,185,129,0.08)',
  border: '1px solid rgba(16,185,129,0.25)',
  borderRadius: '7px',
  color: '#34d399', fontSize: '11px', cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '26px', height: '26px', borderRadius: '6px',
  background: 'none', border: 'none',
  color: 'var(--text-dimmer)', cursor: 'pointer', textDecoration: 'none',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--text-dimmer)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px'
};

const zoomBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '22px', height: '22px',
  background: 'none', border: 'none',
  color: 'var(--text-sec)', cursor: 'pointer',
}