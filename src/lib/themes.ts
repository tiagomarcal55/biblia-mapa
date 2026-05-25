import { Map, Moon, Palette, ScrollText, Sun } from 'lucide-react';
import type { ThemeId } from '../types';

export const THEME_OPTIONS: Array<{
  id: ThemeId;
  family: 'mesh' | 'cartography' | 'papyrus';
  mode: 'dark' | 'light';
  title: string;
  description: string;
  Icon: typeof Palette;
  ModeIcon: typeof Moon;
}> = [
  {
    id: 'mesh-dark',
    family: 'mesh',
    mode: 'dark',
    title: 'Mesh Noturno',
    description: 'Gradientes profundos em malha',
    Icon: Palette,
    ModeIcon: Moon,
  },
  {
    id: 'mesh-light',
    family: 'mesh',
    mode: 'light',
    title: 'Mesh Claro',
    description: 'Gradientes suaves e limpos',
    Icon: Palette,
    ModeIcon: Sun,
  },
  {
    id: 'cartography-dark',
    family: 'cartography',
    mode: 'dark',
    title: 'Cartografia Noturna',
    description: 'Mapa topografico com glass',
    Icon: Map,
    ModeIcon: Moon,
  },
  {
    id: 'cartography-light',
    family: 'cartography',
    mode: 'light',
    title: 'Cartografia Clara',
    description: 'Mapa discreto e painel translucido',
    Icon: Map,
    ModeIcon: Sun,
  },
  {
    id: 'papyrus-dark',
    family: 'papyrus',
    mode: 'dark',
    title: 'Papiro Escuro',
    description: 'Textura antiga em baixo contraste',
    Icon: ScrollText,
    ModeIcon: Moon,
  },
  {
    id: 'papyrus-light',
    family: 'papyrus',
    mode: 'light',
    title: 'Papiro Claro',
    description: 'Documento tatil e quente',
    Icon: ScrollText,
    ModeIcon: Sun,
  },
];

export function normalizeTheme(theme: string | null | undefined): ThemeId {
  if (theme === 'dark') return 'mesh-dark';
  if (theme === 'light') return 'mesh-light';
  if (THEME_OPTIONS.some(option => option.id === theme)) return theme as ThemeId;
  return 'mesh-dark';
}

export function getThemeMode(theme: string | null | undefined): 'dark' | 'light' {
  return normalizeTheme(theme).endsWith('-light') ? 'light' : 'dark';
}
