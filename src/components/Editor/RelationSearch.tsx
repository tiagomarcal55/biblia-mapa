import React, { useState, useRef, useEffect } from 'react';
import { X, Tag, Link2, Plus } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline.store';
import type { NodeType } from '../../types';

export interface Relation {
  kind: 'tag' | 'node';
  id: string;
  label: string;
  type?: NodeType;
}

interface RelationSearchProps {
  value: Relation[];
  onChange: (val: Relation[]) => void;
  excludeId?: string;
}

export function RelationSearch({ value, onChange, excludeId }: RelationSearchProps) {
  const nodes = useTimelineStore(s => s.nodes);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleRemove = (id: string, kind: 'tag' | 'node') => {
    onChange(value.filter(r => !(r.id === id && r.kind === kind)));
  };

  const handleAddRelation = (rel: Relation) => {
    // Avoid duplicates
    if (value.some(r => r.id === rel.id && r.kind === rel.kind)) {
      setQuery('');
      setIsOpen(false);
      return;
    }
    onChange([...value, rel]);
    setQuery('');
    setIsOpen(false);
  };

  // Filter suggestion nodes
  const addedIds = value.filter(r => r.kind === 'node').map(r => r.id);
  const suggestedNodes = query.trim()
    ? nodes.filter(n => 
        n.id !== excludeId &&
        !addedIds.includes(n.id) &&
        n.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const showAddTag = query.trim().length > 0 && !value.some(r => r.kind === 'tag' && r.id.toLowerCase() === query.trim().toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} ref={dropdownRef}>
      {/* Pills Container */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {value.map(rel => {
          const isTag = rel.kind === 'tag';
          return (
            <div
              key={`${rel.kind}-${rel.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 500,
                background: isTag ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
                border: isTag ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(59,130,246,0.2)',
                color: isTag ? '#10b981' : '#3b82f6',
              }}
            >
              {isTag ? <Tag size={10} /> : <Link2 size={10} />}
              <span>{rel.label}</span>
              <button
                type="button"
                className="bm-icon-button"
                onClick={() => handleRemove(rel.id, rel.kind)}
                style={{
                  width: '18px',
                  height: '18px',
                  minWidth: '18px',
                  minHeight: '18px',
                  background: 'var(--border-4)',
                  border: '1px solid var(--border-8)',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  opacity: 0.75
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Input container */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Digite para buscar notas para vincular ou criar tags..."
          style={INPUT_STYLE}
        />

        {/* Suggestion Dropdown */}
        {isOpen && (suggestedNodes.length > 0 || showAddTag) && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 110,
              background: 'var(--bg-panel-solid)',
              border: '1px solid var(--border-10)',
              borderRadius: '8px',
              boxShadow: '0 8px 30px var(--shadow-main)',
              maxHeight: '180px',
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {/* suggestions list */}
            {suggestedNodes.map(node => (
              <button
                key={node.id}
                type="button"
                onClick={() => handleAddRelation({
                  kind: 'node',
                  id: node.id,
                  label: node.title,
                  type: node.type
                })}
                style={ITEM_STYLE}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-4)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Link2 size={12} color="#3b82f6" />
                <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>{node.title}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-dimmer)', padding: '2px 6px', background: 'var(--border-5)', borderRadius: '4px' }}>
                  {node.type.toUpperCase()}
                </span>
              </button>
            ))}

            {showAddTag && (
              <button
                type="button"
                onClick={() => handleAddRelation({
                  kind: 'tag',
                  id: query.trim(),
                  label: query.trim()
                })}
                style={ITEM_STYLE}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-4)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={12} color="#10b981" />
                <span style={{ flex: 1, textAlign: 'left', color: '#10b981' }}>
                  Adicionar tag "<strong>{query.trim()}</strong>"
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--border-4)',
  border: '1px solid var(--border-10)',
  borderRadius: '8px',
  color: 'var(--text-main)',
  fontSize: '12px',
  outline: 'none',
};

const ITEM_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  color: 'var(--text-main)',
  fontSize: '11px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
};
