import type React from 'react';
import { useState, useEffect } from 'react';
import { BookOpen, Clock, Cloud, Database, Filter, LayoutDashboard, MapPin, Settings, Users, X, Download, Upload } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline.store';
import { countNodesByTypes, TYPE_FILTER_OPTIONS } from '../../lib/timeline-filters';
import { normalizeTheme, THEME_OPTIONS } from '../../lib/themes';
import type { ThemeId } from '../../types';

type DesktopPanel = 'filters' | 'settings' | 'library';
type AnimationLevel = 'full' | 'reduced' | 'none';

const TYPE_ICONS = {
  all: LayoutDashboard,
  event: Filter,
  character: Users,
  place: MapPin,
  period: Clock,
  narrative: BookOpen,
};

export function DesktopToolbarPanel({
  activePanel,
  onClose,
}: {
  activePanel: DesktopPanel;
  onClose: () => void;
}) {
  const nodes          = useTimelineStore(s => s.nodes);
  const filteredNodes  = useTimelineStore(s => s.filteredNodes);
  const activeFilters = useTimelineStore(s => s.activeFilters);
  const activeLanes    = useTimelineStore(s => s.activeLanes);
  const clearLanes     = useTimelineStore(s => s.clearLanes);
  const setFilter      = useTimelineStore(s => s.setFilter);
  const setSearchQuery = useTimelineStore(s => s.setSearchQuery);
  const settings       = useTimelineStore(s => s.settings);
  const updateSettings = useTimelineStore(s => s.updateSettings);
  const githubToken = useTimelineStore(s => s.githubToken);
  const setGithubToken = useTimelineStore(s => s.setGithubToken);
  const syncCloud = useTimelineStore(s => s.syncCloud);
  const isSyncing = useTimelineStore(s => s.isSyncing);
  const lastSyncAt = useTimelineStore(s => s.lastSyncAt);
  const importedPackages = useTimelineStore(s => s.importedPackages);

  const [panelLeft, setPanelLeft] = useState<string>(() => {
    let buttonId = '';
    if (activePanel === 'filters') buttonId = 'btn-filtros';
    else if (activePanel === 'settings') buttonId = 'btn-settings';
    else if (activePanel === 'library') buttonId = 'user-avatar';

    const btn = typeof document !== 'undefined' ? document.getElementById(buttonId) : null;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const left = Math.max(16, rect.left + rect.width / 2 - 160);
      const maxLeft = typeof window !== 'undefined' ? window.innerWidth - 320 - 16 : 1000;
      return `${Math.min(maxLeft, left)}px`;
    }
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return `${winWidth / 2 - 160}px`;
  });

  useEffect(() => {
    let buttonId = '';
    if (activePanel === 'filters') buttonId = 'btn-filtros';
    else if (activePanel === 'settings') buttonId = 'btn-settings';
    else if (activePanel === 'library') buttonId = 'user-avatar';

    if (!buttonId) return;

    const updatePosition = () => {
      const btn = document.getElementById(buttonId);
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const left = Math.max(16, rect.left + rect.width / 2 - 160);
        const maxLeft = window.innerWidth - 320 - 16;
        setPanelLeft(`${Math.min(maxLeft, left)}px`);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('bm:layout-change', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('bm:layout-change', updatePosition);
    };
  }, [activePanel]);

  const handleExport = () => {
    const data = {
      nodes: useTimelineStore.getState().nodes,
      settings: useTimelineStore.getState().settings,
      importedPackages: useTimelineStore.getState().importedPackages,
      activeLanes: useTimelineStore.getState().activeLanes,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `biblia-mapa-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && Array.isArray(data.nodes)) {
          const currentNodes = [...useTimelineStore.getState().nodes];
          const currentIds = new Set(currentNodes.map(n => n.id));
          
          let mergedCount = 0;
          let addedCount = 0;
          
          for (const node of data.nodes) {
            if (currentIds.has(node.id)) {
              const idx = currentNodes.findIndex(n => n.id === node.id);
              if (idx !== -1) {
                currentNodes[idx] = node;
                mergedCount++;
              }
            } else {
              currentNodes.push(node);
              addedCount++;
            }
          }
          
          useTimelineStore.getState().setNodes(currentNodes);
          if (data.settings) {
            useTimelineStore.getState().updateSettings(data.settings);
          }
          
          alert(`Importacao concluida com sucesso!\n${addedCount} novas notas adicionadas.\n${mergedCount} notas existentes atualizadas.`);
        } else {
          alert('Arquivo invalido. Formato de backup nao reconhecido.');
        }
      } catch {
        alert('Erro ao processar o arquivo. Verifique se e um arquivo JSON de backup valido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isActiveType = (types: readonly string[]) => {
    if (types.length === 0) return activeFilters.types.length === 0;
    return types.length === activeFilters.types.length
      && types.every(type => activeFilters.types.includes(type));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilter('types', []);
    setFilter('tags', []);
    setFilter('importanceMin', 1);
    setFilter('sourceFilter', 'all');
    clearLanes();
  };

  const localStorageBytes = new Blob([localStorage.getItem('biblia-mapa-v1') ?? '']).size;

  return (
    <aside
      id="desktop-toolbar-panel"
      className="bm-panel"
      data-panel={activePanel}
      style={{
        position: 'absolute',
        top: '64px',
        left: panelLeft,
        width: '320px',
        zIndex: 24,
        overflow: 'hidden',
        pointerEvents: 'auto',
        animation: 'slideUpFade 0.16s ease-out',
        transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1), top 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <header
        id="desktop-toolbar-panel-header"
        className="bm-panel-section"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 12px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activePanel === 'filters' && <Filter size={15} color="var(--text-sec)" />}
          {activePanel === 'settings' && <Settings size={15} color="var(--text-sec)" />}
          {activePanel === 'library' && <Database size={15} color="var(--text-sec)" />}
          <span className="bm-section-title">
            {activePanel === 'filters' && 'Filtros'}
            {activePanel === 'settings' && 'Configuracoes'}
            {activePanel === 'library' && 'Biblioteca Local'}
          </span>
        </div>
        <button
          id="desktop-toolbar-panel-close"
          className="bm-icon-button"
          onClick={onClose}
          title="Fechar painel"
          type="button"
        >
          <X size={14} />
        </button>
      </header>

      {activePanel === 'filters' && (
        <section
          id="desktop-filters-panel"
          className="bm-panel-section"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div
            id="desktop-filter-summary"
            className="bm-body-text"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <span>Resultados</span>
            <strong style={{ color: 'var(--text-sec)' }}>
              {filteredNodes.length} / {nodes.length}
            </strong>
          </div>

          <div id="desktop-type-filter-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {TYPE_FILTER_OPTIONS.map(item => {
              const Icon = TYPE_ICONS[item.id as keyof typeof TYPE_ICONS] ?? Filter;
              const active = isActiveType(item.types);

              return (
                <button
                  key={item.id}
                  id={`desktop-filter-${item.id}`}
                  className="bm-nav-button"
                  data-active={active}
                  onClick={() => setFilter('types', [...item.types])}
                  type="button"
                  style={{
                    marginBottom: 0,
                    padding: '6px 8px',
                    justifyContent: 'space-between',
                  }}
                  title={item.label}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.label}</span>
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                    {countNodesByTypes(nodes, item.types)}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id="desktop-advanced-filters"
            style={{
              borderTop: '1px solid var(--border-6)',
              paddingTop: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="bm-body-text" style={{ fontSize: '11px' }}>Importância</span>
              <select
                id="desktop-importance-filter"
                className="bm-control"
                value={activeFilters.importanceMin}
                onChange={event => setFilter('importanceMin', Number(event.target.value))}
                style={{ padding: '4px 6px', fontSize: '11px', cursor: 'pointer' }}
              >
                <option value={1}>Todas</option>
                <option value={5}>5+</option>
                <option value={7}>7+</option>
                <option value={9}>9+</option>
                <option value={10}>10</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="bm-body-text" style={{ fontSize: '11px' }}>Origem</span>
              <select
                id="desktop-source-filter"
                className="bm-control"
                value={activeFilters.sourceFilter}
                onChange={event => setFilter('sourceFilter', event.target.value as 'all' | 'mine' | 'imported')}
                style={{ padding: '4px 6px', fontSize: '11px', cursor: 'pointer' }}
              >
                <option value="all">Todas</option>
                <option value="mine">Minhas</option>
                <option value="imported">Importadas</option>
              </select>
            </div>
          </div>

          <div
            id="desktop-lane-filter-summary"
            style={{
              borderTop: '1px solid var(--border-6)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span className="bm-section-title">Lanes ativas</span>
              <button
                className="bm-icon-button"
                onClick={clearAllFilters}
                title="Limpar filtros"
                type="button"
                style={{ minHeight: '24px', minWidth: '24px', padding: '3px' }}
              >
                <X size={12} />
              </button>
            </div>
            {activeLanes.length === 0 && (
              <p className="bm-body-text" style={{ margin: 0, color: 'var(--text-dimmer)', fontStyle: 'italic' }}>
                Nenhuma lane ativa.
              </p>
            )}
            {activeLanes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeLanes.map(tag => (
                  <span key={tag} className="bm-chip">
                    #{tag.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activePanel === 'settings' && (
        <section
          id="desktop-settings-panel"
          className="bm-panel-section"
          style={{ borderBottom: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="bm-section-title">Tema visual</span>
            <div
              id="desktop-theme-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '8px',
                paddingTop: '4px',
                paddingBottom: '8px',
              }}
            >
              {THEME_OPTIONS.map(option => (
                <ThemeCard
                  key={option.id}
                  option={option}
                  active={normalizeTheme(settings.theme) === option.id}
                  onSelect={() => updateSettings({ theme: option.id })}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-6)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="bm-body-text" style={{ fontSize: '11px' }}>Animações</span>
              <select
                id="desktop-animation-level"
                className="bm-control"
                value={settings.animationLevel}
                onChange={event => updateSettings({ animationLevel: event.target.value as AnimationLevel })}
                style={{ padding: '4px 6px', fontSize: '11px', cursor: 'pointer' }}
              >
                <option value="full">Completas</option>
                <option value="reduced">Simples</option>
                <option value="none">Nenhuma</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="bm-body-text" style={{ fontSize: '11px' }}>Partículas e Efeitos</span>
              <button
                id="desktop-effects-toggle"
                className="panel-toggle"
                onClick={() => updateSettings({
                  animationLevel: settings.animationLevel === 'none' ? 'full' : 'none',
                })}
                type="button"
                aria-pressed={settings.animationLevel !== 'none'}
                style={{
                  width: '38px',
                  height: '22px',
                  borderRadius: '999px',
                  background: settings.animationLevel !== 'none' ? 'var(--accent-primary)' : 'var(--border-10)',
                  border: '1px solid var(--border-15)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginTop: '2px',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: settings.animationLevel !== 'none' ? '20px' : '3px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'var(--text-white)',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
          </div>

        </section>
      )}

      {activePanel === 'library' && (
        <section
          id="desktop-library-panel"
          className="bm-panel-section"
          style={{ borderBottom: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div
            id="desktop-library-summary"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <LibraryMetric label="Notas" value={String(nodes.length)} />
            <LibraryMetric label="Filtradas" value={String(filteredNodes.length)} />
            <LibraryMetric label="Pacotes" value={String(importedPackages.length)} />
            <LibraryMetric label="Local" value={`${Math.max(1, Math.ceil(localStorageBytes / 1024))} KB`} />
          </div>

          <div
            id="desktop-library-type-summary"
            style={{
              borderTop: '1px solid var(--border-6)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
            }}
          >
            {TYPE_FILTER_OPTIONS.filter(item => item.id !== 'all').map(item => (
              <div
                key={item.id}
                className="bm-body-text"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <span>{item.label}</span>
                <strong style={{ color: 'var(--text-sec)' }}>
                  {countNodesByTypes(nodes, item.types)}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-6)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span className="bm-section-title">Meus Eventos Customizados</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
              {nodes.filter(n => n._isUserEdited).length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Nenhum evento modificado.</span>
              )}
              {nodes.filter(n => n._isUserEdited).map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    useTimelineStore.getState().selectNode(n.id);
                    window.dispatchEvent(new CustomEvent('bm:navigate', { detail: { year: n.date_start, zoom: 0.12 } }));
                    onClose();
                  }}
                  className="bm-nav-button"
                  type="button"
                  style={{ justifyContent: 'space-between', padding: '8px 10px', marginBottom: 0 }}
                >
                  <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  <span className="bm-chip" style={{ color: 'var(--accent-primary)' }}>Editar</span>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-6)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span className="bm-section-title">Dados e Backup</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                id="btn-export-backup"
                className="bm-soft-button"
                onClick={handleExport}
                type="button"
                title="Exportar JSON local"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 8px',
                }}
              >
                <Download size={15} />
              </button>
              <label
                id="lbl-import-backup"
                className="bm-soft-button"
                title="Importar JSON local"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  margin: 0,
                }}
              >
                <Upload size={15} />
                <input
                  id="import-backup-file"
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <span className="bm-section-title" style={{ fontSize: '10px' }}>Sincronização em Nuvem (Gist)</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  placeholder="GitHub PAT Token"
                  value={githubToken || ''}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="bm-control"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '11px', minWidth: 0 }}
                />
                <button
                  id="btn-cloud-sync"
                  className="bm-primary-button"
                  onClick={() => syncCloud()}
                  disabled={!githubToken || isSyncing}
                  type="button"
                  title="Sincronizar Nuvem"
                  style={{ opacity: (!githubToken || isSyncing) ? 0.55 : 1, padding: '0 10px', width: 'auto' }}
                >
                  <Cloud size={14} />
                </button>
              </div>
              {lastSyncAt && (
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center' }}>
                  Última vez: {new Date(lastSyncAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <button
            id="desktop-library-clear-filters"
            className="bm-soft-button"
            onClick={clearAllFilters}
            type="button"
            style={{ padding: '9px 10px', width: '100%', marginTop: '4px' }}
          >
            <X size={13} />
            <span>Limpar filtros ativos</span>
          </button>
        </section>
      )}
    </aside>
  );
}

function LibraryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="bm-control"
      style={{
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span className="bm-section-title" style={{ fontSize: '9px' }}>{label}</span>
      <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{value}</strong>
    </div>
  );
}



function ThemeCard({
  option,
  active,
  onSelect,
}: {
  option: (typeof THEME_OPTIONS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const preview = getThemePreview(option.id);
  const ModeIcon = option.ModeIcon;

  return (
    <button
      id={`desktop-theme-${option.id}`}
      data-active={active}
      onClick={onSelect}
      title={`${option.title} - ${option.description}`}
      type="button"
      style={{
        position: 'relative',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: preview,
        boxShadow: active ? '0 0 0 3px var(--bg-panel), 0 0 0 5px var(--accent-primary)' : '0 2px 5px var(--shadow-light)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: '0 auto',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        background: 'var(--bg-overlay-6)',
        borderRadius: '50%',
        padding: '5px',
        display: 'flex',
        color: '#ffffff',
        backdropFilter: 'blur(2px)'
      }}>
        <ModeIcon size={13} />
      </div>
    </button>
  );
}

function getThemePreview(theme: ThemeId) {
  const previews: Record<ThemeId, string> = {
    'mesh-dark': 'radial-gradient(circle at 24% 80%, #1d4ed8 0%, transparent 42%), radial-gradient(circle at 82% 18%, #92400e 0%, transparent 40%), #030712',
    'mesh-light': 'radial-gradient(circle at 24% 80%, #93c5fd 0%, transparent 42%), radial-gradient(circle at 82% 18%, #fcd34d 0%, transparent 40%), #f3f4f6',
    'cartography-dark': 'repeating-radial-gradient(circle at 70% 35%, rgba(125,160,138,.28) 0 1px, transparent 1px 9px), linear-gradient(135deg, #071016, #10251d)',
    'cartography-light': 'repeating-radial-gradient(circle at 68% 38%, rgba(84,107,89,.28) 0 1px, transparent 1px 9px), linear-gradient(135deg, #eef3ea, #dbe8d5)',
    'papyrus-dark': 'radial-gradient(circle at 22% 80%, rgba(216,160,61,.32), transparent 44%), linear-gradient(135deg, #120d08, #2b1d0f)',
    'papyrus-light': 'radial-gradient(circle at 20% 78%, rgba(161,98,7,.22), transparent 44%), linear-gradient(135deg, #eadbbd, #fff7e5)',
  };
  return previews[theme];
}
