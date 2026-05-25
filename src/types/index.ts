export type NodeType = 'event' | 'character' | 'place' | 'narrative' | 'period';
export type DatePrecision = 'day' | 'month' | 'year' | 'decade' | 'century' | 'approximate';
export type ThemeId =
  | 'mesh-dark'
  | 'mesh-light'
  | 'cartography-dark'
  | 'cartography-light'
  | 'papyrus-dark'
  | 'papyrus-light';

export interface TimelineNode {
  id: string;
  type: NodeType;
  title: string;
  slug: string;
  date_start: number; // decimal years
  date_end: number;
  date_precision: DatePrecision;
  date_display: string;
  uncertainty_years: number;
  importance: number; // 1-10
  y_lane?: number; // legacy/base lane
  related_ids?: string[];
  tags?: string[];
  narratives?: string[];
  scripture_refs?: string[];
  cover_image?: string;
  source_author?: string;
  source_package?: string;
  imported_at?: string;
  description?: string;
  links?: string[];
  _isUserEdited?: boolean;
}

export interface NarrativeNode extends TimelineNode {
  type: 'narrative';
  narrative_sequence: string[];
  camera_start_year: number;
  camera_start_zoom: number;
  autoplay_interval_ms: number;
}

export interface TimelineStore {
  // Dados
  nodes: TimelineNode[];
  narratives: NarrativeNode[];
  isLoading: boolean;

  // Câmera
  cameraYear: number;
  cameraZoom: number; // pixelsPerYear

  // Seleção
  selectedNodeId: string | null;
  detailPanelOpen: boolean;

  // Modo Narrativa
  narrativeMode: boolean;
  activeNarrativeId: string | null;
  narrativeCurrentIndex: number;

  // Lanes ativas
  activeLanes: string[];

  // Filtros
  activeFilters: {
    types: string[];
    tags: string[];
    importanceMin: number;
    sourceFilter: 'all' | 'mine' | 'imported';
  };
  searchQuery: string;

  // Pacotes
  importedPackages: unknown[];

  // Configs
  settings: {
    animationLevel: 'full' | 'reduced' | 'none';
    theme: ThemeId;
  };

  // Performance
  performance: {
    fps: number;
    renderedNodes: number;
  };

  // Sincronização GitHub
  githubToken: string | null;
  gistId: string | null;
  isSyncing: boolean;
  lastSyncAt: string | null;

  // Actions
  setNodes: (nodes: TimelineNode[]) => void;
  selectNode: (id: string | null) => void;
  syncCamera: (year: number, zoom: number) => void;
  startNarrative: (id: string) => void;
  exitNarrative: () => void;
  toggleLane: (id: string) => void;
  clearLanes: () => void;
  setFilter: <K extends keyof TimelineStore['activeFilters']>(
    key: K,
    value: TimelineStore['activeFilters'][K],
  ) => void;
  setSearchQuery: (q: string) => void;
  updateSettings: (settings: Partial<TimelineStore['settings']>) => void;
  syncPerformance: (metrics: Partial<TimelineStore['performance']>) => void;

  // Sync Actions
  setGithubToken: (token: string | null) => void;
  syncCloud: () => Promise<void>;

  // Computed
  filteredNodes: TimelineNode[];
}
