import type { CSSProperties } from 'react';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Canvas }          from './components/Canvas';
import { Toolbar }         from './components/Toolbar';
import { Minimap }         from './components/Minimap';
import { BottomNav }       from './components/BottomNav';

const Editor = lazy(() => import('./components/Editor').then(m => ({ default: m.Editor })));
const SidePanel = lazy(() => import('./components/SidePanel').then(m => ({ default: m.SidePanel })));
const DesktopToolbarPanel = lazy(() => import('./components/DesktopToolbarPanel').then(m => ({ default: m.DesktopToolbarPanel })));
const NarrativePlayer = lazy(() => import('./components/NarrativePlayer').then(m => ({ default: m.NarrativePlayer })));
import { useTimelineStore } from './store/timeline.store';
import { MOCK_BIBLICAL_NODES } from './data/mock-nodes';
import { loadTimelineIndex }   from './lib/data/parser';
import { TYPE_FILTER_OPTIONS, countNodesByTypes } from './lib/timeline-filters';
import { getThemeMode, normalizeTheme } from './lib/themes';
import { useBreakpoint }       from './hooks/useBreakpoint';
import { X, Search, Filter, Settings, Sun, Moon } from 'lucide-react';
import type { TimelineNode } from './types';

type AnimationLevel = 'full' | 'reduced' | 'none';
type DesktopPanel = 'filters' | 'settings' | 'library' | null;

export default function App() {
  const setNodes = useTimelineStore(s => s.setNodes);
  const theme = useTimelineStore(s => s.settings.theme);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', normalizeTheme(theme));
  }, [theme]);

  const [editorOpen,      setEditorOpen]      = useState(false);
  const [editingNode,     setEditingNode]      = useState<TimelineNode | null>(null);
  const [mobileTab,       setMobileTab]        = useState('timeline');
  const [desktopPanel,    setDesktopPanel]     = useState<DesktopPanel>(null);

  // Load data (smart merge to preserve user's custom created nodes and edited values)
  useEffect(() => {
    let cancelled = false;
    loadTimelineIndex(MOCK_BIBLICAL_NODES).then(defaultNodes => {
      if (cancelled) return;
      const currentNodes = useTimelineStore.getState().nodes;
      let finalNodes = defaultNodes;
      if (currentNodes.length === 0) {
        setNodes(defaultNodes);
      } else {
        const userNodesMap = new Map(currentNodes.map(n => [n.id, n]));
        const merged: typeof defaultNodes = [];

        // 1. Process default official nodes
        for (const dn of defaultNodes) {
          const userNode = userNodesMap.get(dn.id);
          if (userNode) {
            if (userNode._isUserEdited) {
              // Deep merge: keep all user fields, but inherit any new fields from official schema
              merged.push({ ...dn, ...userNode });
            } else {
              // User hasn't edited it, so official dataset fully wins (auto-upgrade)
              merged.push(dn);
            }
            userNodesMap.delete(dn.id);
          } else {
            // New official node not present in cache
            merged.push(dn);
          }
        }

        // 2. Add remaining custom nodes created by user (e.g., USR-xxx)
        for (const un of userNodesMap.values()) {
          merged.push(un);
        }

        setNodes(merged);
        finalNodes = merged;
      }

      // Check for shareable URL query param: ?node=ID
      const params = new URLSearchParams(window.location.search);
      const sharedNodeId = params.get('node');
      if (sharedNodeId) {
        const found = finalNodes.find(n => n.id === sharedNodeId);
        if (found) {
          useTimelineStore.getState().selectNode(sharedNodeId);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('bm:navigate', {
              detail: { year: found.date_start, zoom: 0.12 },
            }));
          }, 600); // Let PixiJS canvas initialize first
        }
      }
    });
    return () => { cancelled = true; };
  }, [setNodes]);

  // Custom event for editor
  useEffect(() => {
    const handler = (e: CustomEvent<TimelineNode | null>) => {
      setEditingNode(e.detail ?? null);
      setEditorOpen(true);
    };
    window.addEventListener('bm:open-editor', handler as EventListener);
    return () => window.removeEventListener('bm:open-editor', handler as EventListener);
  }, []);

  const openEditor = (node: TimelineNode | null = null) => {
    setEditingNode(node);
    setEditorOpen(true);
    setDesktopPanel(null);
  };

  const toggleDesktopPanel = (panel: Exclude<DesktopPanel, null>) => {
    setDesktopPanel(current => current === panel ? null : panel);
  };

  return (
    <div
      id="app-root"
      style={{
        width: '100vw',
        height: '100dvh',   // dvh = dynamic viewport height (respects mobile browser chrome)
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--app-background)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: 'var(--text-main)',
      }}
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      {/* Background is applied to app-root directly */}

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div
        id="canvas-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 'calc(100vw - var(--bm-detail-panel-left))',
          zIndex: 1,
        }}
      >
        <Canvas />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  DESKTOP LAYOUT                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <div
          id="ui-layer-desktop"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <Toolbar
            activePanel={desktopPanel}
            onTogglePanel={toggleDesktopPanel}
            onNewNote={() => openEditor(null)}
          />
          {desktopPanel && (
            <Suspense fallback={null}>
              <DesktopToolbarPanel
                activePanel={desktopPanel}
                onClose={() => setDesktopPanel(null)}
              />
            </Suspense>
          )}
          <div style={{ pointerEvents: 'auto' }}>
            <Suspense fallback={null}>
              <SidePanel onEditNode={(node) => openEditor(node)} />
            </Suspense>
          </div>
          <div style={{ pointerEvents: 'auto' }}>
            <Minimap />
          </div>
          <div style={{ pointerEvents: 'auto' }}>
            <Suspense fallback={null}>
              <NarrativePlayer />
            </Suspense>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  MOBILE LAYOUT                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Compact top bar removed */}

          {/* Minimap (compact for mobile) */}
          <div style={{ position: 'fixed', bottom: '70px', left: 0, right: 0, zIndex: 20, pointerEvents: 'auto' }}>
            <Minimap />
          </div>

          {/* SidePanel as bottom sheet */}
          <Suspense fallback={null}>
            <SidePanel onEditNode={(node) => openEditor(node)} />
          </Suspense>

          {/* Bottom navigation */}
          <BottomNav
            activeTab={mobileTab}
            onTab={setMobileTab}
            onNewNote={() => openEditor(null)}
          />

          {mobileTab !== 'timeline' && mobileTab !== 'new' && (
            <MobileTabSheet
              activeTab={mobileTab}
              onClose={() => setMobileTab('timeline')}
            />
          )}

        </>
      )}

      {/* ── Editor Modal (shared) ───────────────────────────────────────── */}
      {editorOpen && (
        <Suspense fallback={null}>
          <Editor
            node={editingNode}
            onClose={() => { setEditorOpen(false); setEditingNode(null); }}
          />
        </Suspense>
      )}

      {/* ── Global Styles ───────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        * { box-sizing: border-box; }
        input, button, select, textarea { font-family: inherit; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-10); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--border-20); }

        /* Mobile: canvas area accounts for bottom nav */
        @media (max-width: 767px) {
          #canvas-container {
            top: 0 !important;
            bottom: 64px !important;
            right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function MobileTabSheet({ activeTab, onClose }: { activeTab: string; onClose: () => void }) {
  const searchQuery    = useTimelineStore(s => s.searchQuery);
  const setSearchQuery = useTimelineStore(s => s.setSearchQuery);
  const filteredNodes  = useTimelineStore(s => s.filteredNodes);
  const nodes          = useTimelineStore(s => s.nodes);
  const selectNode     = useTimelineStore(s => s.selectNode);
  const setFilter      = useTimelineStore(s => s.setFilter);
  const settings       = useTimelineStore(s => s.settings);
  const updateSettings = useTimelineStore(s => s.updateSettings);

  const openNode = (node: TimelineNode) => {
    selectNode(node.id);
    window.dispatchEvent(new CustomEvent('bm:navigate', {
      detail: { year: node.date_start, zoom: 0.12 },
    }));
    onClose();
  };

  const applyTypeFilter = (types: string[]) => {
    setFilter('types', types);
    onClose();
  };

  const results = filteredNodes.slice(0, 12);

  return (
    <section
      id="mobile-tab-sheet"
      className="mobile-tab-sheet"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: '64px',
        zIndex: 42,
        background: 'var(--bg-panel-solid)',
        borderTop: '1px solid var(--border-10)',
        boxShadow: '0 -8px 40px var(--shadow-main)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUpFade 0.2s ease-out',
      }}
    >
      <div
        id="mobile-tab-header"
        className="mobile-tab-header"
        style={{
          padding: '13px 14px',
          borderBottom: '1px solid var(--border-6)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div style={{ color: '#fbbf24', display: 'flex' }}>
          {activeTab === 'search' && <Search size={17} />}
          {activeTab === 'filters' && <Filter size={17} />}
          {activeTab === 'settings' && <Settings size={17} />}
        </div>
        {activeTab === 'search' && (
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Busca
          </h2>
        )}
        {activeTab === 'filters' && (
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Filtros
          </h2>
        )}
        {activeTab === 'settings' && (
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Configuracoes
          </h2>
        )}
        <div style={{ flex: 1 }} />
        <button
          id="mobile-tab-close"
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--border-8)',
            background: 'var(--border-5)',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div
        id="mobile-tab-body"
        className="mobile-tab-body"
        style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {activeTab === 'search' && (
          <div id="mobile-search-panel" className="mobile-search-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              className="mobile-search-box"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-10)',
                background: 'var(--border-4)',
              }}
            >
              <Search size={15} color="#64748b" />
              <input
                id="mobile-search-input"
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Buscar eventos, pessoas, lugares..."
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div id="mobile-search-results" className="mobile-search-results" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map(node => (
                <MobileNodeButton
                  key={node.id}
                  node={node}
                  onSelect={() => openNode(node)}
                />
              ))}
              {results.length === 0 && (
                <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '13px' }}>
                  Nenhum resultado encontrado.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div id="mobile-filters-panel" className="mobile-filters-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {TYPE_FILTER_OPTIONS.map(option => (
              <MobileFilterButton
                key={option.id}
                label={option.label}
                count={countNodesByTypes(nodes, option.types)}
                onClick={() => applyTypeFilter([...option.types])}
              />
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div id="mobile-settings-panel" className="mobile-settings-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="mobile-setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-mut)' }}>Tema</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  id="mobile-theme-light"
                  onClick={() => updateSettings({ theme: 'mesh-light' })}
                  style={mobileIconButton(getThemeMode(settings.theme) === 'light')}
                >
                  <Sun size={14} />
                </button>
                <button
                  id="mobile-theme-dark"
                  onClick={() => updateSettings({ theme: 'mesh-dark' })}
                  style={mobileIconButton(getThemeMode(settings.theme) === 'dark')}
                >
                  <Moon size={14} />
                </button>
              </div>
            </div>

            <div className="mobile-setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-mut)' }}>Animacoes</span>
              <select
                id="mobile-animation-level"
                value={settings.animationLevel}
                onChange={event => updateSettings({ animationLevel: event.target.value as AnimationLevel })}
                style={{
                  background: 'var(--border-6)',
                  border: '1px solid var(--border-10)',
                  borderRadius: '8px',
                  color: 'var(--text-sec)',
                  fontSize: '12px',
                  padding: '7px 10px',
                }}
              >
                <option value="full">Completas</option>
                <option value="reduced">Simplificadas</option>
                <option value="none">Desativadas</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MobileNodeButton({ node, onSelect }: { node: TimelineNode; onSelect: () => void }) {
  return (
    <button
      className="mobile-node-button"
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid var(--border-7)',
        background: 'var(--border-4)',
        color: 'var(--text-main)',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 650 }}>{node.title}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{node.date_display}</span>
    </button>
  );
}

function MobileFilterButton({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button
      className="mobile-filter-button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid var(--border-7)',
        background: 'var(--border-4)',
        color: 'var(--text-main)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 650 }}>{label}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{count}</span>
    </button>
  );
}

function mobileIconButton(active: boolean): CSSProperties {
  return {
    width: '34px',
    height: '30px',
    borderRadius: '8px',
    border: active ? '1px solid var(--border-15)' : '1px solid var(--border-8)',
    background: active ? 'var(--border-10)' : 'var(--border-4)',
    color: active ? 'var(--text-main)' : 'var(--text-dim)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
