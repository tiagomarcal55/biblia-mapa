import type React from 'react';
import { useState } from 'react';
import { useTimelineStore } from '../../store/timeline.store';
import { X, Save, ChevronDown, ChevronUp, Star, BookMarked, Link2, AlertCircle, Zap, User, MapPin, Calendar, BookOpen } from 'lucide-react';
import type { TimelineNode, NodeType } from '../../types';
import { SingleDatePicker, RangeDatePicker, makeDateValue, type DateValue } from './DatePicker';
import { RelationSearch, type Relation } from './RelationSearch';

// ─── Type configuration ────────────────────────────────────────────────────────

interface TypeConfig {
  label:       string;
  emoji?:      string;
  color:       string;
  hasDates:    boolean;
  hasRange:    boolean;   // date_start + date_end
  dateLabel?:  string;
  dateLabel2?: string;    // for character birth/death
  coreFields:  string[];  // fields shown in core form
}

const TYPE_CONFIG: Record<NodeType, TypeConfig> = {
  event: {
    label: 'Evento', color: '#3b82f6',
    hasDates: true, hasRange: false,
    dateLabel: 'Quando aconteceu?',
    coreFields: ['title', 'date', 'importance', 'relations'],
  },
  character: {
    label: 'Pessoa', color: '#10b981',
    hasDates: true, hasRange: true,
    dateLabel: 'Nascimento', dateLabel2: 'Morte',
    coreFields: ['title', 'dates', 'importance', 'relations'],
  },
  place: {
    label: 'Lugar', color: '#8b5cf6',
    hasDates: false, hasRange: true,
    dateLabel: 'Período ativo', dateLabel2: 'Até',
    coreFields: ['title', 'importance', 'relations'],
  },
  period: {
    label: 'Período', color: '#6366f1',
    hasDates: true, hasRange: true,
    dateLabel: 'Início do período', dateLabel2: 'Fim do período',
    coreFields: ['title', 'dateRange', 'importance', 'relations'],
  },
  narrative: {
    label: 'Narrativa', color: '#f59e0b',
    hasDates: false, hasRange: false,
    coreFields: ['title', 'importance', 'relations'],
  },
};

const TYPE_ICONS: Record<NodeType, React.ComponentType<{ size?: number; color?: string }>> = {
  event: Zap,
  character: User,
  place: MapPin,
  period: Calendar,
  narrative: BookOpen,
};

const TYPE_ORDER: NodeType[] = ['event', 'character', 'place', 'period', 'narrative'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditorProps {
  node?:    TimelineNode | null;
  onClose:  () => void;
}

// ─── Default date values ──────────────────────────────────────────────────────

const defaultDate = (): DateValue => makeDateValue('ac', 1, 'year');

function toNodeDatePrecision(precision: string): TimelineNode['date_precision'] {
  if (precision === 'approx') return 'approximate';
  if (precision === 'none') return 'approximate';
  return precision as TimelineNode['date_precision'];
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function Editor({ node, onClose }: EditorProps) {
  const setNodes = useTimelineStore(s => s.setNodes);
  const nodes    = useTimelineStore(s => s.nodes);
  const isNew    = !node;

  // ── Core state ──────────────────────────────────────────────────────────────
  const [type,        setType]        = useState<NodeType>(node?.type ?? 'event');
  const [title,       setTitle]       = useState(node?.title ?? '');
  const [importance,  setImportance]  = useState(node?.importance ?? 5);
  const [showMore]                    = useState(true);
  const [showAdvDate, setShowAdvDate] = useState(false);
  const [error,       setError]       = useState('');

  const cfg = TYPE_CONFIG[type];

  // ── Date state ──────────────────────────────────────────────────────────────
  const parseExisting = (): DateValue => {
    if (!node) return defaultDate();
    const abs = Math.abs(node.date_start);
    const era = node.date_start < 0 ? 'ac' : 'dc';
    const yr  = Math.floor(abs);
    const frac = abs - yr;
    const month = frac > 0.01 ? Math.round(frac * 12) + 1 : undefined;
    return makeDateValue(era, yr, month ? 'month' : 'year', month);
  };

  const [dateStart, setDateStart] = useState<DateValue>(parseExisting);
  const [dateEnd,   setDateEnd]   = useState<DateValue>(() => {
    if (!node || !node.date_end || node.date_end === node.date_start) return defaultDate();
    const abs = Math.abs(node.date_end);
    const era = node.date_end < 0 ? 'ac' : 'dc';
    const yr  = Math.floor(abs);
    return makeDateValue(era, yr, 'year');
  });

  // ── Relations state (merge tags + related_ids) ──────────────────────────────
  const [relations, setRelations] = useState<Relation[]>(() => {
    const result: Relation[] = [];
    // Tags → free
    for (const tag of node?.tags ?? []) {
      result.push({ kind: 'tag', id: tag, label: tag });
    }
    // Related IDs → node links
    for (const rid of node?.related_ids ?? []) {
      const linked = nodes.find(n => n.id === rid);
      if (linked) result.push({ kind: 'node', id: rid, label: linked.title, type: linked.type });
    }
    return result;
  });

  // ── Advanced fields ─────────────────────────────────────────────────────────
  const [scriptureStr, setScriptureStr] = useState((node?.scripture_refs ?? []).join('\n'));
  const [newUrl, setNewUrl]             = useState('');
  const [imageList, setImageList]       = useState<string[]>(() => {
    if (!node?.cover_image) return [];
    return node.cover_image.split(/[\n,]+/).map(img => img.trim()).filter(Boolean);
  });
  const [links,        setLinks]        = useState((node?.links ?? []).join('\n'));
  const [description,  setDescription]  = useState(node?.description ?? '');
  const [sourceAuthor, setSourceAuthor] = useState(node?.source_author ?? '');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setImageList(prev => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddUrl = () => {
    if (newUrl.trim()) {
      setImageList(prev => [...prev, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageList(prev => prev.filter((_, i) => i !== index));
  };

  const handleMakePrimary = (index: number) => {
    setImageList(prev => {
      const item = prev[index];
      const filtered = prev.filter((_, i) => i !== index);
      return [item, ...filtered];
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) { setError('O título é obrigatório.'); return; }

    const tags       = relations.filter(r => r.kind === 'tag').map(r => r.id);
    const relatedIds = relations.filter(r => r.kind === 'node').map(r => r.id);
    const refs       = scriptureStr.split('\n').map(s => s.trim()).filter(Boolean);

    const dStart = cfg.hasDates || cfg.hasRange ? dateStart.decimalYear : 0;
    const dEnd   = cfg.hasRange ? dateEnd.decimalYear : dStart;
    const display = cfg.hasDates || cfg.hasRange
      ? (cfg.hasRange ? `${dateStart.display}–${dateEnd.display}` : dateStart.display)
      : '—';

    const saved: TimelineNode = {
      id:                isNew ? `USR-${Date.now()}` : node!.id,
      type, title: title.trim(),
      slug:              title.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
      date_start:        dStart,
      date_end:          dEnd,
      date_precision:    toNodeDatePrecision(dateStart.precision),
      date_display:      display,
      uncertainty_years: dateStart.uncertainty,
      importance,
      tags,
      related_ids:       relatedIds.length > 0 ? relatedIds : undefined,
      scripture_refs:    refs.length > 0 ? refs : undefined,
      cover_image:       imageList.length > 0 ? imageList.join('\n') : undefined,
      source_author:     sourceAuthor.trim() || undefined,
      description:       description.trim() || undefined,
      links:             links.split('\n').map(l => l.trim()).filter(Boolean).length > 0
                           ? links.split('\n').map(l => l.trim()).filter(Boolean)
                           : undefined,
    };

    setNodes(isNew ? [...nodes, saved] : nodes.map(n => n.id === saved.id ? saved : n));

    // Desloca o mapa/camera para focar no evento salvo/criado
    window.dispatchEvent(new CustomEvent('bm:navigate', {
      detail: { year: saved.date_start, zoom: 0.1 }
    }));

    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      id="editor-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'var(--bg-overlay-9)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        id="editor-modal"
        style={{
          width: '540px', maxHeight: '92vh',
          background: 'var(--bg-panel-solid)',
          border: '1px solid var(--border-10)',
          borderRadius: '18px',
          boxShadow: '0 24px 70px var(--shadow-main)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--border-6)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            {isNew ? 'Nova Nota' : `Editar nota`}
          </h2>
          <button
            id="editor-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '7px', color: '#f87171', fontSize: '12px',
            }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* ── Type selector ────────────────────────────────────────────── */}
          <div>
            <FieldLabel>Tipo de nota</FieldLabel>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TYPE_ORDER.map(t => {
                const c = TYPE_CONFIG[t];
                const active = type === t;
                const IconComponent = TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    id={`editor-type-${t}`}
                    onClick={() => setType(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      border: active ? `1px solid ${c.color}` : '1px solid var(--border-8)',
                      background: active ? `${c.color}18` : 'var(--border-4)',
                      color: active ? c.color : 'var(--text-dim)',
                      fontSize: '12px', cursor: 'pointer',
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    <IconComponent size={13} color={active ? c.color : 'var(--text-dim)'} />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Title ────────────────────────────────────────────────────── */}
          <div>
            <FieldLabel>
              {type === 'character' ? 'Nome completo' :
               type === 'place'     ? 'Nome do lugar' :
               type === 'period'    ? 'Nome do período' :
               type === 'narrative' ? 'Título da narrativa' : 'Título do evento'} *
            </FieldLabel>
            <input
              id="editor-title"
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder={
                type === 'character' ? 'Ex: Moisés, Apóstolo Paulo...' :
                type === 'place'     ? 'Ex: Jerusalém, Monte Sinai...' :
                type === 'period'    ? 'Ex: Ministério de Jesus...' :
                type === 'narrative' ? 'Ex: Da Criação ao Dilúvio...' :
                'Ex: Crucificação de Jesus, Êxodo...'
              }
              autoFocus
              style={TEXT_INPUT}
            />
          </div>

          {/* ── Descrição ────────────────────────────────────────────────── */}
          <div>
            <FieldLabel>Descrição / Resumo</FieldLabel>
            <textarea
              id="editor-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Resumo ou descrição principal da nota (visível diretamente no painel lateral)..."
              rows={3}
              style={TEXTAREA}
            />
          </div>

          {/* ── Date fields (type-dependent) ─────────────────────────────── */}
          {(cfg.hasDates && !cfg.hasRange) && (
            <SingleDatePicker
              label={cfg.dateLabel!}
              value={dateStart}
              onChange={setDateStart}
              showAdvanced={showAdvDate}
            />
          )}

          {cfg.hasRange && (
            <RangeDatePicker
              value={{ start: dateStart, end: dateEnd, isRange: true }}
              onChange={({ start, end }) => { setDateStart(start); setDateEnd(end); }}
              showAdvanced={showAdvDate}
            />
          )}

          {/* ── Importance ───────────────────────────────────────────────── */}
          <div>
            <FieldLabel>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={11} /> Importância: <strong style={{ color: '#fbbf24' }}>{importance}</strong>/10
              </span>
            </FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                id="editor-importance"
                type="range" min={1} max={10} value={importance}
                onChange={e => setImportance(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#fbbf24', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: i < importance ? '#fbbf24' : '#1e293b',
                    transition: 'background 0.1s',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginTop: '4px' }}>
              {importance >= 9 ? '🌟 Marco histórico — exibido em todos os níveis de zoom' :
               importance >= 7 ? '⭐ Evento importante — visível na maioria dos zooms' :
               importance >= 5 ? '● Evento relevante' :
               '○ Detalhe de apoio — visível apenas no zoom máximo'}
            </div>
          </div>

          {/* ── Relations (tags + node links) ─────────────────────────────── */}
          <div>
            <FieldLabel>Relacionamentos e tags</FieldLabel>
            <RelationSearch
              value={relations}
              onChange={setRelations}
              excludeId={node?.id}
            />
          </div>

          {/* ── Scripture refs (events show this in core) ─────────────────── */}
          {(type === 'event' || showMore) && (
            <div>
              <FieldLabel>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BookMarked size={11} /> Referências Bíblicas
                </span>
              </FieldLabel>
              <textarea
                id="editor-scripture"
                value={scriptureStr}
                onChange={e => setScriptureStr(e.target.value)}
                placeholder={'Mateus 27:32-56\nJoão 19:17-37\nAtos 2:1-4'}
                rows={3}
                style={TEXTAREA}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-dimmer)', marginTop: '4px' }}>
                Uma referência por linha. Links automáticos para JW.ORG serão gerados.
              </div>
            </div>
          )}

          {/* ── Expand/collapse advanced toggle removed to show all fields by default ── */}

          {/* ── Advanced fields (collapsible) ────────────────────────────── */}
          {showMore && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Date advanced toggle */}
              {(cfg.hasDates || cfg.hasRange) && (
                <div>
                  <button
                    onClick={() => setShowAdvDate(a => !a)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: 'none', border: 'none',
                      color: 'var(--text-dimmer)', fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    {showAdvDate ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    Opções avançadas de data (incerteza, precisão adicional)
                  </button>
                </div>
              )}

              {/* Image Gallery Manager */}
              <div>
                <FieldLabel>Galeria de Imagens da Nota</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Inputs for URL and Upload */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      placeholder="Adicionar imagem por URL (http://...)"
                      style={{ ...TEXT_INPUT, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      className="bm-soft-button"
                      style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}
                    >
                      + URL
                    </button>
                    <label
                      className="bm-soft-button"
                      style={{
                        padding: '9px 14px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        margin: 0
                      }}
                    >
                      + Upload
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {/* Grid of thumbnails */}
                  {imageList.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: '8px',
                      background: 'var(--border-2)',
                      border: '1px solid var(--border-6)',
                      borderRadius: '10px',
                      padding: '10px'
                    }}>
                      {imageList.map((img, index) => {
                        const isPrimary = index === 0;
                        return (
                          <div
                            key={index}
                            style={{
                              position: 'relative',
                              aspectRatio: '1',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: isPrimary ? '2px solid #fbbf24' : '1px solid var(--border-10)',
                              background: 'var(--bg-black)'
                            }}
                          >
                            <img
                              src={img}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* Overlay Controls */}
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,0.6)',
                              opacity: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                              transition: 'opacity 0.15s',
                              cursor: 'default'
                            }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                            >
                              <button
                                type="button"
                                onClick={() => handleMakePrimary(index)}
                                title={isPrimary ? "Imagem principal" : "Definir como principal"}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: isPrimary ? '#fbbf24' : 'white', display: 'flex'
                                }}
                              >
                                <Star size={14} fill={isPrimary ? '#fbbf24' : 'none'} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                title="Remover"
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#ef4444', display: 'flex'
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                            {isPrimary && (
                              <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: '#fbbf24', color: 'black', fontSize: '8px',
                                fontWeight: 800, textAlign: 'center', padding: '1px 0'
                              }}>
                                PRINCIPAL
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Links */}
              <div>
                <FieldLabel>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link2 size={11} /> Links externos (um por linha)
                  </span>
                </FieldLabel>
                <textarea
                  id="editor-links"
                  value={links}
                  onChange={e => setLinks(e.target.value)}
                  placeholder={'https://www.jw.org/...\nhttps://wol.jw.org/...'}
                  rows={2}
                  style={TEXTAREA}
                />
              </div>


              {/* Source author */}
              <div>
                <FieldLabel>Autor / Fonte</FieldLabel>
                <input
                  id="editor-source"
                  type="text"
                  value={sourceAuthor}
                  onChange={e => setSourceAuthor(e.target.value)}
                  placeholder="jw.org, publicação, conferência..."
                  style={TEXT_INPUT}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-6)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dimmer)' }}>
            {isNew
              ? 'A nota será salva localmente.'
              : `ID: ${node!.id}`}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="editor-cancel"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                background: 'var(--border-5)',
                border: '1px solid var(--border-10)',
                borderRadius: '8px', color: 'var(--text-mut)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              id="editor-save"
              onClick={handleSave}
              style={{
                padding: '8px 22px',
                background: `${TYPE_CONFIG[type].color}18`,
                border: `1px solid ${TYPE_CONFIG[type].color}45`,
                borderRadius: '8px', color: TYPE_CONFIG[type].color,
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Save size={13} />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
      color: 'var(--text-dimmer)', textTransform: 'uppercase', marginBottom: '7px',
    }}>
      {children}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const TEXT_INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--border-4)',
  border: '1px solid var(--border-10)',
  borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none',
};

const TEXTAREA: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--border-4)',
  border: '1px solid var(--border-10)',
  borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px',
  outline: 'none', resize: 'vertical', lineHeight: '1.6',
}