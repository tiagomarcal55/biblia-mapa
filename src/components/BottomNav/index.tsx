import type React from 'react';
import { Filter, LayoutDashboard, Search, Plus, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab:  string;
  onTab:      (tab: string) => void;
  onNewNote:  () => void;
}

interface BottomTab {
  id: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  isAction?: boolean;
}

const TABS: BottomTab[] = [
  { id: 'timeline',   icon: LayoutDashboard, label: 'Linha do Tempo' },
  { id: 'search',     icon: Search,          label: 'Busca' },
  { id: 'new',        icon: Plus,            label: 'Nova Nota',  isAction: true },
  { id: 'filters',    icon: Filter,          label: 'Filtros' },
  { id: 'settings',   icon: Settings,        label: 'Config.' },
];

export function BottomNav({ activeTab, onTab, onNewNote }: BottomNavProps) {
  return (
    <nav
      id="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '64px',
        background: 'rgba(6,6,16,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(tab => {
        const Icon    = tab.icon;
        const isActive = activeTab === tab.id;
        const isAction = tab.isAction === true;

        if (isAction) {
          return (
            <button
              key={tab.id}
              id="btn-mobile-new"
              onClick={onNewNote}
              style={{
                width: '50px', height: '50px',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(251,191,36,0.2)',
              }}
            >
              <Icon size={22} color="#fbbf24" />
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            id={`bottom-nav-${tab.id}`}
            onClick={() => onTab(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '6px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? '#fbbf24' : 'var(--text-dimmer)',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: '9px', letterSpacing: '0.03em' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
