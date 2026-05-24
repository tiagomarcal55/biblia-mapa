import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimelineStore, TimelineNode } from '../types';

type TimelineFilters = TimelineStore['activeFilters'];

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set) => ({
      //  Dados 
      nodes:         [],
      narratives:    [],
      isLoading:     false,
      filteredNodes: [],

      //  Câmera 
      cameraYear: 0,
      cameraZoom: 1,

      //  Seleção 
      selectedNodeId: null,
      detailPanelOpen: false,

      //  Modo Narrativa 
      narrativeMode:         false,
      activeNarrativeId:     null,
      narrativeCurrentIndex: 0,

      //  Lanes 
      activeLanes: [],

      //  Filtros 
      activeFilters: {
        types: [], tags: [], importanceMin: 1, sourceFilter: 'all',
      },
      searchQuery: '',

      //  Pacotes 
      importedPackages: [],

      //  Settings 
      settings: { animationLevel: 'full', theme: 'dark' },
      performance: { fps: 0, renderedNodes: 0 },

      //  Actions 

      setNodes: (nodes: TimelineNode[]) =>
        set((s) => ({ nodes, filteredNodes: applyAllFilters(nodes, s.searchQuery, s.activeFilters) })),

      selectNode: (id) => set({ selectedNodeId: id, detailPanelOpen: !!id }),

      syncCamera: (year, zoom) => set({ cameraYear: year, cameraZoom: zoom }),

      startNarrative: (id) => set({
        narrativeMode: true, activeNarrativeId: id,
        narrativeCurrentIndex: 0, detailPanelOpen: true,
      }),

      exitNarrative: () => set({
        narrativeMode: false, activeNarrativeId: null, narrativeCurrentIndex: 0,
      }),

      toggleLane: (id) => set((s) => ({
        activeLanes: s.activeLanes.includes(id)
          ? s.activeLanes.filter(l => l !== id)
          : [...s.activeLanes, id],
      })),

      clearLanes: () => set({ activeLanes: [] }),

      setFilter: (key, value) => set((s) => {
        const nextFilters = { ...s.activeFilters, [key]: value };
        return {
          activeFilters: nextFilters,
          filteredNodes: applyAllFilters(s.nodes, s.searchQuery, nextFilters)
        };
      }),

      setSearchQuery: (q: string) => set((s) => ({
        searchQuery: q,
        filteredNodes: applyAllFilters(s.nodes, q, s.activeFilters)
      })),

      updateSettings: (newSettings) => set((s) => ({
        settings: { ...s.settings, ...newSettings },
      })),

      syncPerformance: (metrics) => set((s) => ({
        performance: { ...s.performance, ...metrics },
      })),
    }),
    {
      name: 'biblia-mapa-v1',
      // Persist only user data + settings; exclude UI/derived state
      partialize: (state) => ({
        nodes:            state.nodes,
        settings:         state.settings,
        importedPackages: state.importedPackages,
        activeLanes:      state.activeLanes,
      }),
      // After rehydration, sync filteredNodes from persisted nodes
      onRehydrateStorage: () => (rehydrated) => {
        if (rehydrated?.nodes) {
          rehydrated.filteredNodes = rehydrated.nodes;
        }
      },
    },
  ),
);

function applyAllFilters(nodes: TimelineNode[], searchQuery: string, filters: TimelineFilters) {
  const query = searchQuery.toLowerCase().trim();
  return nodes.filter(n => {
    if (query) {
      const hay = `${n.title} ${(n.tags ?? []).join(' ')} ${(n.scripture_refs ?? []).join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (filters.types?.length > 0 && !filters.types.includes(n.type)) return false;
    if (filters.tags?.length > 0 && !n.tags?.some((t: string) => filters.tags.includes(t))) return false;
    if (n.importance < filters.importanceMin) return false;
    if (filters.sourceFilter === 'mine' && (n.source_package || n.imported_at)) return false;
    if (filters.sourceFilter === 'imported' && !n.source_package && !n.imported_at) return false;
    return true;
  });
}