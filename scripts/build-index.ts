#!/usr/bin/env node
/**
 * build-index.ts — Gera /public/timeline-index.json a partir dos .md em /content/
 *
 * Execução: npm run build-index
 * Saída alvo: < 100KB para 1000+ eventos (apenas metadados, sem o corpo .md)
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = join(process.cwd(), 'content');
const OUTPUT_FILE = join(process.cwd(), 'public', 'timeline-index.json');

interface TimelineIndexEntry {
  id:               string;
  type:             string;
  title:            string;
  slug:             string;
  date_start:       number;
  date_end:         number;
  date_precision:   string;
  date_display:     string;
  uncertainty_years: number;
  importance:       number;
  y_lane?:          number;
  tags?:            string[];
  narratives?:      string[];
  scripture_refs?:  string[];
  related_ids?:     string[];
  cover_image?:     string;
  source_author?:   string;
  source_package?:  string;
  imported_at?:     string;
  description?:     string;
  // Narrative-specific
  narrative_sequence?:   string[];
  camera_start_year?:    number;
  camera_start_zoom?:    number;
  autoplay_interval_ms?: number;
}

type Frontmatter = Record<string, unknown>;

async function buildIndex() {
  let files: string[];

  try {
    files = await readdir(CONTENT_DIR);
  } catch {
    console.warn(`[build-index] /content/ não encontrado — criando índice vazio.`);
    files = [];
  }

  const mdFiles = files.filter(f => extname(f) === '.md');
  const entries: TimelineIndexEntry[] = [];
  const errors: string[] = [];

  for (const file of mdFiles) {
    try {
      const raw  = await readFile(join(CONTENT_DIR, file), 'utf-8');
      const parsed = matter(raw);
      const fm = parsed.data as Frontmatter;

      // Validate required fields
      if (!fm.id || !fm.type || !fm.title || fm.date_start === undefined) {
        errors.push(`${file}: missing required fields (id, type, title, date_start)`);
        continue;
      }

      const entry: TimelineIndexEntry = {
        id:               String(fm.id),
        type:             String(fm.type),
        title:            String(fm.title),
        slug:             String(fm.slug ?? fm.id),
        date_start:       Number(fm.date_start),
        date_end:         fm.date_end !== undefined ? Number(fm.date_end) : Number(fm.date_start),
        date_precision:   String(fm.date_precision ?? 'year'),
        date_display:     String(fm.date_display ?? fm.date_start),
        uncertainty_years: Number(fm.uncertainty_years ?? 0),
        importance:       Math.min(10, Math.max(1, Number(fm.importance ?? 5))),
      };

      // Optional fields
      if (fm.y_lane       !== undefined) entry.y_lane       = Number(fm.y_lane);
      if (fm.tags)                       entry.tags         = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
      if (fm.narratives)                 entry.narratives   = fm.narratives;
      if (fm.scripture_refs)             entry.scripture_refs = fm.scripture_refs;
      if (fm.related_ids)                entry.related_ids  = fm.related_ids;
      if (fm.cover_image)                entry.cover_image  = fm.cover_image;
      if (fm.source_author)              entry.source_author = fm.source_author;
      if (fm.source_package)             entry.source_package = fm.source_package;
      if (fm.imported_at)                entry.imported_at  = fm.imported_at;
      if (fm.description)                entry.description = String(fm.description);
      else if (parsed.content.trim())    entry.description = parsed.content.trim();

      // Narrative type extras
      if (fm.narrative_sequence)   entry.narrative_sequence   = fm.narrative_sequence;
      if (fm.camera_start_year !== undefined) entry.camera_start_year = Number(fm.camera_start_year);
      if (fm.camera_start_zoom !== undefined) entry.camera_start_zoom = Number(fm.camera_start_zoom);
      if (fm.autoplay_interval_ms) entry.autoplay_interval_ms = Number(fm.autoplay_interval_ms);

      entries.push(entry);
    } catch (e) {
      errors.push(`${file}: ${e}`);
    }
  }

  // Sort by date_start for easier binary search later
  entries.sort((a, b) => a.date_start - b.date_start);

  const index = {
    version:    '1.0',
    generated:  new Date().toISOString(),
    count:      entries.length,
    nodes:      entries,
  };

  // Ensure public/ exists
  await mkdir(join(process.cwd(), 'public'), { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');

  console.log(`[build-index] ✅ ${entries.length} nós gerados → public/timeline-index.json`);
  if (errors.length > 0) {
    console.warn(`[build-index] ⚠️  ${errors.length} erros:`);
    errors.forEach(e => console.warn('  -', e));
  }

  // Stats
  const raw = JSON.stringify(index);
  console.log(`[build-index] 📦 Tamanho: ${(raw.length / 1024).toFixed(1)} KB`);
}

buildIndex().catch(err => {
  console.error('[build-index] FATAL:', err);
  process.exit(1);
});