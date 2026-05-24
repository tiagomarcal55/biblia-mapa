import type { TimelineNode } from '../types';

export interface FilterOption {
  id: string;
  label: string;
  types: readonly string[];
}

export const TYPE_FILTER_OPTIONS: readonly FilterOption[] = [
  { id: 'all', label: 'Todos', types: [] },
  { id: 'event', label: 'Eventos', types: ['event'] },
  { id: 'character', label: 'Personagens', types: ['character'] },
  { id: 'place', label: 'Lugares', types: ['place'] },
  { id: 'period', label: 'Períodos', types: ['period'] },
  { id: 'narrative', label: 'Narrativas', types: ['narrative'] },
];

export function countNodesByTypes(nodes: readonly TimelineNode[], types: readonly string[]): number {
  if (types.length === 0) {
    return nodes.length;
  }
  return nodes.filter(node => types.includes(node.type)).length;
}