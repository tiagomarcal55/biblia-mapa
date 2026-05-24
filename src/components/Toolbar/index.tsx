import React from 'react';
import { Search, Plus, Filter, Settings, User } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline.store';

type DesktopPanel = 'filters' | 'settings' | 'library' | null;

export function Toolbar({
  activePanel,
  onTogglePanel,
  onNewNote,
}: {
  activePanel: DesktopPanel;
  onTogglePanel: (panel: Exclude<DesktopPanel, null>) => void;
  onNewNote: () => void;
}) {
  const searchQuery = useTimelineStore(s => s.searchQuery);

  return (
    <header
      id="toolbar"
      className="absolute z-20 pointer-events-none flex items-center justify-center gap-4"
      style={{
        left: 0,
        width: 'var(--bm-detail-panel-left)',
        top: '1rem',
        padding: '0 1rem',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        id="search-bar"
        className="pointer-events-auto"
        style={{
          width: '360px',
          background: 'var(--bg-toolbar)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-8)',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          boxShadow: '0 4px 24px var(--shadow-main)',
        }}
      >
        <Search size={14} color="#64748b" />
        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={event => useTimelineStore.getState().setSearchQuery(event.target.value)}
          placeholder="Buscar eventos, personagens, lugares..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-main)',
            fontSize: '13px',
            width: '100%',
          }}
        />
        <kbd
          style={{
            fontSize: '10px',
            background: 'var(--border-6)',
            border: '1px solid var(--border-10)',
            borderRadius: '4px',
            padding: '2px 6px',
            color: 'var(--text-dim)',
            whiteSpace: 'nowrap',
          }}
        >
          Ctrl K
        </kbd>
      </div>

      <div id="toolbar-actions" className="flex items-center gap-2 pointer-events-auto">
        <ToolbarButton
          id="btn-toolbar-new-note"
          icon={<Plus size={14} />}
          label="Nova Nota"
          active={false}
          onClick={onNewNote}
        />
        <ToolbarButton
          id="btn-filtros"
          icon={<Filter size={14} />}
          label="Filtros"
          active={activePanel === 'filters'}
          onClick={() => onTogglePanel('filters')}
        />
        <ToolbarButton
          id="btn-settings"
          icon={<Settings size={14} />}
          label="Configuracoes"
          active={activePanel === 'settings'}
          onClick={() => onTogglePanel('settings')}
        />

        <button
          id="user-avatar"
          onClick={() => onTogglePanel('library')}
          aria-pressed={activePanel === 'library'}
          title="Biblioteca local"
          type="button"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            border: '2px solid var(--border-15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <User size={14} color="white" />
        </button>
      </div>
    </header>
  );
}

function ToolbarButton({
  id,
  icon,
  label,
  active,
  onClick,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-pressed={active}
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 13px',
        background: active ? 'var(--border-10)' : 'var(--bg-toolbar)',
        backdropFilter: 'blur(12px)',
        border: active ? '1px solid var(--border-15)' : '1px solid var(--border-8)',
        borderRadius: '8px',
        color: active ? 'var(--text-main)' : 'var(--text-sec)',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 2px 12px var(--shadow-light)',
      }}
      onMouseEnter={event => (event.currentTarget.style.background = 'var(--border-8)')}
      onMouseLeave={event => (event.currentTarget.style.background = active ? 'var(--border-10)' : 'var(--bg-toolbar)')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}