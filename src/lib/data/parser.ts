import type { TimelineNode } from '../../types';

export interface TimelineIndex {
  version:   string;
  generated: string;
  count:     number;
  nodes:     TimelineNode[];
}

/**
 * Carrega o índice pré-compilado de /public/timeline-index.json.
 * Se o arquivo não existir (primeiro uso sem build), retorna os nós de fallback.
 */
export async function loadTimelineIndex(
  fallback: TimelineNode[],
): Promise<TimelineNode[]> {
  try {
    const res = await fetch('/timeline-index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index: TimelineIndex = await res.json();
    if (!index.nodes || !Array.isArray(index.nodes)) throw new Error('invalid index');
    const merged = mergeWithFallback(index.nodes as TimelineNode[], fallback);
    console.log(`[parser] Carregados ${merged.length} nós (${index.nodes.length} do índice, ${fallback.length} fallback).`);
    return merged;
  } catch (e) {
    console.warn('[parser] timeline-index.json não encontrado — usando dados de exemplo.', e);
    return fallback;
  }
}

function mergeWithFallback(indexNodes: TimelineNode[], fallback: TimelineNode[]) {
  const byId = new Map<string, TimelineNode>();

  for (const node of fallback) {
    byId.set(node.id, node);
  }
  for (const node of indexNodes) {
    byId.set(node.id, node);
  }

  return [...byId.values()].sort((a, b) => a.date_start - b.date_start);
}

/**
 * Carrega o corpo completo de um arquivo .md pelo fetch da API.
 * Em desenvolvimento: usa /api/get-file (Edge Function futura).
 * Por ora, tenta /content/{slug}.md diretamente (só funciona em produção com vite public).
 */
export async function loadNodeBody(id: string): Promise<string | null> {
  try {
    const res = await fetch('/timeline-index.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const index: TimelineIndex = await res.json();
    const node = index.nodes.find(item => item.id === id);
    return node?.description ?? null;
  } catch {
    return null;
  }
}
