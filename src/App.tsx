
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
import { TYPE_FILTER_OPTIONS } from './lib/timeline-filters';
import { normalizeTheme, THEME_OPTIONS } from './lib/themes';
import { useBreakpoint }       from './hooks/useBreakpoint';
import { X, Search, Settings, Database, Cloud, Upload, Download } from 'lucide-react';
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
        <div
          id="timeline-gradient-overlay"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '260px',
            background: 'var(--timeline-gradient)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
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
  const selectNode     = useTimelineStore(s => s.selectNode);
  const setFilter      = useTimelineStore(s => s.setFilter);
  const settings       = useTimelineStore(s => s.settings);
  const updateSettings = useTimelineStore(s => s.updateSettings);
  const activeFilters  = useTimelineStore(s => s.activeFilters);
  const githubToken = useTimelineStore(s => s.githubToken);
  const setGithubToken = useTimelineStore(s => s.setGithubToken);
  const syncCloud = useTimelineStore(s => s.syncCloud);
  const isSyncing = useTimelineStore(s => s.isSyncing);

  const openNode = (node: TimelineNode) => {
    selectNode(node.id);
    window.dispatchEvent(new CustomEvent('bm:navigate', {
      detail: { year: node.date_start, zoom: 0.12 },
    }));
    onClose();
  };

  const applyTypeFilter = (types: string[]) => {
    setFilter('types', types);
  };

  const isActiveType = (types: readonly string[]) => {
    if (types.length === 0) return activeFilters.types.length === 0;
    return types.length === activeFilters.types.length
      && types.every(type => activeFilters.types.includes(type));
  };

  const getThemePreview = (themeId: string) => {
    const previews: Record<string, string> = {
      'mesh-dark': 'radial-gradient(circle at 24% 80%, #1d4ed8 0%, transparent 42%), radial-gradient(circle at 82% 18%, #92400e 0%, transparent 40%), #030712',
      'mesh-light': 'radial-gradient(circle at 24% 80%, #93c5fd 0%, transparent 42%), radial-gradient(circle at 82% 18%, #fcd34d 0%, transparent 40%), #f3f4f6',
      'cartography-dark': 'repeating-radial-gradient(circle at 70% 35%, rgba(125,160,138,.28) 0 1px, transparent 1px 9px), linear-gradient(135deg, #071016, #10251d)',
      'cartography-light': 'repeating-radial-gradient(circle at 68% 38%, rgba(84,107,89,.28) 0 1px, transparent 1px 9px), linear-gradient(135deg, #eef3ea, #dbe8d5)',
      'papyrus-dark': 'radial-gradient(circle at 22% 80%, rgba(216,160,61,.32), transparent 44%), linear-gradient(135deg, #120d08, #2b1d0f)',
      'papyrus-light': 'radial-gradient(circle at 20% 78%, rgba(161,98,7,.22), transparent 44%), linear-gradient(135deg, #eadbbd, #fff7e5)',
    };
    return previews[themeId];
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
        top: activeTab === 'search' ? 0 : 'auto',
        maxHeight: activeTab === 'search' ? 'none' : '70vh',
        bottom: '64px',
        zIndex: 42,
        background: 'var(--bg-panel-solid)',
        borderTop: '1px solid var(--border-10)',
        borderTopLeftRadius: activeTab === 'search' ? 0 : '16px',
        borderTopRightRadius: activeTab === 'search' ? 0 : '16px',
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
          {activeTab === 'settings' && <Settings size={17} />}
          {activeTab === 'library' && <Database size={17} />}
        </div>
        {activeTab === 'search' && (
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Busca e Filtros
          </h2>
        )}
        {activeTab === 'settings' && (
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Configurações
          </h2>
        )}
        {activeTab === 'library' && (
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            Biblioteca
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
            <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
              {TYPE_FILTER_OPTIONS.map(option => {
                const active = isActiveType(option.types);
                return (
                  <button
                    key={option.id}
                    onClick={() => applyTypeFilter([...option.types])}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      whiteSpace: 'nowrap',
                      background: active ? 'var(--accent-primary)' : 'var(--border-6)',
                      color: active ? '#fff' : 'var(--text-sec)',
                      border: '1px solid',
                      borderColor: active ? 'var(--accent-primary)' : 'var(--border-10)',
                      fontSize: '12px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

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
                placeholder="Buscar eventos, pessoas..."
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
                  Nenhum resultado.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div id="mobile-library-panel" className="mobile-library-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                className="bm-soft-button"
                onClick={() => { /* Not implemented in mobile view */ }}
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                }}
              >
                <Download size={15} />
                <span>Exportar</span>
              </button>
              <label
                className="bm-soft-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  cursor: 'pointer',
                  margin: 0,
                }}
              >
                <Upload size={15} />
                <span>Importar</span>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="bm-section-title" style={{ fontSize: '11px' }}>Sincronização em Nuvem (Gist)</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="GitHub PAT Token"
                  value={githubToken || ''}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="bm-control"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '13px', minWidth: 0 }}
                />
                <button
                  className="bm-primary-button"
                  onClick={() => syncCloud()}
                  disabled={!githubToken || isSyncing}
                  type="button"
                  title="Sincronizar Nuvem"
                  style={{ opacity: (!githubToken || isSyncing) ? 0.55 : 1, padding: '0 12px', width: 'auto' }}
                >
                  <Cloud size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div id="mobile-settings-panel" className="mobile-settings-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="bm-section-title">Tema Visual</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                {THEME_OPTIONS.map(option => {
                  const active = normalizeTheme(settings.theme) === option.id;
                  const ModeIcon = option.ModeIcon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => updateSettings({ theme: option.id })}
                      type="button"
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        background: getThemePreview(option.id),
                        boxShadow: active ? '0 0 0 2px var(--bg-panel), 0 0 0 4px var(--accent-primary)' : '0 2px 5px var(--shadow-light)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        background: 'var(--bg-overlay-6)',
                        borderRadius: '50%',
                        padding: '4px',
                        display: 'flex',
                        color: '#ffffff',
                        backdropFilter: 'blur(2px)'
                      }}>
                        <ModeIcon size={12} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', borderTop: '1px solid var(--border-6)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="bm-body-text" style={{ fontSize: '13px' }}>Animações</span>
                <select
                  className="bm-control"
                  value={settings.animationLevel}
                  onChange={event => updateSettings({ animationLevel: event.target.value as AnimationLevel })}
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                >
                  <option value="full">Completas</option>
                  <option value="reduced">Simples</option>
                  <option value="none">Nenhuma</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="bm-body-text" style={{ fontSize: '13px' }}>Partículas e Efeitos</span>
                <button
                  className="panel-toggle"
                  onClick={() => updateSettings({
                    animationLevel: settings.animationLevel === 'none' ? 'full' : 'none',
                  })}
                  type="button"
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '999px',
                    background: settings.animationLevel !== 'none' ? 'var(--accent-primary)' : 'var(--border-10)',
                    border: '1px solid var(--border-15)',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: settings.animationLevel !== 'none' ? '22px' : '3px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--text-white)',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
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
