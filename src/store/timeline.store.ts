import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimelineStore, TimelineNode } from '../types';
import { normalizeTheme } from '../lib/themes';

type TimelineFilters = TimelineStore['activeFilters'];

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
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
      settings: { animationLevel: 'full', theme: 'mesh-dark' },
      performance: { fps: 0, renderedNodes: 0 },

      //  Sincronização GitHub
      githubToken: null,
      gistId: null,
      isSyncing: false,
      lastSyncAt: null,

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
        settings: {
          ...s.settings,
          ...newSettings,
          theme: normalizeTheme(newSettings.theme ?? s.settings.theme),
        },
      })),

      syncPerformance: (metrics) => set((s) => ({
        performance: { ...s.performance, ...metrics },
      })),

      // Sync Actions
      setGithubToken: (token) => set({ githubToken: token }),
      
      syncCloud: async () => {
        const { githubToken, gistId, nodes } = get();
        if (!githubToken) return;
        
        set({ isSyncing: true });
        try {
          // Identify local custom notes
          const localCustomNotes = nodes.filter(n => n._isUserEdited);
          let remoteNotes: TimelineNode[] = [];
          let currentGistId = gistId;

          // 1. Fetch remote notes if we have a Gist ID
          if (currentGistId) {
            const res = await fetch(`https://api.github.com/gists/${currentGistId}`, {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json'
              }
            });
            if (res.ok) {
              const gist = await res.json();
              if (gist.files && gist.files['biblia-mapa-sync.json']) {
                remoteNotes = JSON.parse(gist.files['biblia-mapa-sync.json'].content);
              }
            } else if (res.status === 404) {
              // Gist was deleted
              currentGistId = null;
              set({ gistId: null });
            } else {
              throw new Error('Falha ao ler o Gist remoto.');
            }
          }

          // 2. Merge logic
          // Create a map of remote notes
          const remoteMap = new Map(remoteNotes.map(n => [n.id, n]));
          const currentNodes = [...get().nodes];
          let stateChanged = false;
          let contentChanged = false;

          // Inject remote into local
          for (const rNode of remoteNotes) {
            const localIdx = currentNodes.findIndex(n => n.id === rNode.id);
            if (localIdx >= 0) {
              // If local exists, cloud wins for simplicity (sync is source of truth)
              if (JSON.stringify(currentNodes[localIdx]) !== JSON.stringify(rNode)) {
                currentNodes[localIdx] = rNode;
                stateChanged = true;
              }
            } else {
              currentNodes.push(rNode);
              stateChanged = true;
            }
          }

          // Merge local into remote mapping for saving back
          for (const lNode of localCustomNotes) {
            if (!remoteMap.has(lNode.id)) {
              remoteNotes.push(lNode);
              contentChanged = true;
            } else if (JSON.stringify(remoteMap.get(lNode.id)) !== JSON.stringify(lNode)) {
              // If local differs from remote, we need to push our local updates
              // (assuming local was updated after last sync. For robust sync we'd need timestamps, 
              // but for a single-user simple sync this works fine).
              const idx = remoteNotes.findIndex(n => n.id === lNode.id);
              remoteNotes[idx] = lNode;
              contentChanged = true;
            }
          }

          // 3. Save to GitHub if we don't have a gist or content changed
          if (!currentGistId) {
            // Create new Gist
            const res = await fetch('https://api.github.com/gists', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                description: 'Bíblia Mapa Sync',
                public: false,
                files: {
                  'biblia-mapa-sync.json': {
                    content: JSON.stringify(remoteNotes, null, 2)
                  }
                }
              })
            });
            if (!res.ok) throw new Error('Falha ao criar o Gist remoto.');
            const data = await res.json();
            set({ gistId: data.id });
          } else if (contentChanged) {
            // Update existing Gist
            const res = await fetch(`https://api.github.com/gists/${currentGistId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                files: {
                  'biblia-mapa-sync.json': {
                    content: JSON.stringify(remoteNotes, null, 2)
                  }
                }
              })
            });
            if (!res.ok) throw new Error('Falha ao atualizar o Gist remoto.');
          }

          // Update Zustand State
          if (stateChanged) {
            set((s) => ({ 
              nodes: currentNodes,
              filteredNodes: applyAllFilters(currentNodes, s.searchQuery, s.activeFilters)
            }));
          }
          
          set({ lastSyncAt: new Date().toISOString() });
        } catch (error) {
          console.error('Falha na sincronização:', error);
          alert('Erro na Sincronização. Verifique se o Token do GitHub é válido e possui a permissão "gist".');
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'biblia-mapa-v1',
      // Persist user data + settings + sync tokens
      partialize: (state) => ({
        nodes:            state.nodes,
        settings:         state.settings,
        importedPackages: state.importedPackages,
        activeLanes:      state.activeLanes,
        githubToken:      state.githubToken,
        gistId:           state.gistId,
      }),
      // After rehydration, sync filteredNodes from persisted nodes
      onRehydrateStorage: () => (rehydrated) => {
        if (rehydrated?.nodes) {
          rehydrated.filteredNodes = rehydrated.nodes;
        }
        if (rehydrated?.settings) {
          rehydrated.settings.theme = normalizeTheme(rehydrated.settings.theme);
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
