export interface BackgroundConfig {
  color: string;
  filterKey: string;
  opacity?: number;
}

export type PatternType = 'none' | 'straight' | 'dotted' | 'wavy' | 'zigzag' | 'swirls' | 'arc' | 'spiral' | 'grid' | 'crosses' | 'stars' | 'hearts' | 'musical' | 'floral' | 'geometric' | 'mesh' | 'dashed' | 'double' | 'gradient';

export interface PatternConfig {
  type: PatternType;
  params: Record<string, any>;
}

export interface ComposeConfig {
  background: BackgroundConfig;
  pattern: PatternConfig;
  patternBlendMode: string;
  fontColor: string;
  fontOpacity?: number;
}

export interface Preset {
  id: string;
  name: string;
  config: ComposeConfig;
  thumbnailDataUrl: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'composeLetter.presets.v1';

/**
 * Service to manage presets in localStorage
 */
export class PresetService {
  static loadAll(): Preset[] {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  }

  static save(presets: Preset[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }

  static add(preset: Preset) {
    const presets = PresetService.loadAll();
    const existing = presets.find(p => p.id === preset.id);
    if (existing) {
      // overwrite
      const idx = presets.findIndex(p => p.id === preset.id);
      presets[idx] = { ...preset, updatedAt: Date.now() };
    } else {
      presets.unshift({ ...preset, createdAt: Date.now(), updatedAt: Date.now() });
    }
    PresetService.save(presets);
  }

  static delete(id: string) {
    const presets = PresetService.loadAll().filter(p => p.id !== id);
    PresetService.save(presets);
  }

  static update(preset: Preset) {
    const presets = PresetService.loadAll();
    const idx = presets.findIndex(p => p.id === preset.id);
    if (idx >= 0) {
      presets[idx] = { ...preset, updatedAt: Date.now() };
      PresetService.save(presets);
    }
  }

  static clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
