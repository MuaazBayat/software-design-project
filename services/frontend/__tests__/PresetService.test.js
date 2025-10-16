import { PresetService } from '../app/compose-letter/utils/PresetService';

const mockPreset = {
  id: 'test-preset',
  name: 'Test Preset',
  config: {
    background: { color: '#fff', filterKey: 'none' },
    pattern: { type: 'none', params: {} },
    patternBlendMode: 'normal',
    fontColor: '#000'
  },
  thumbnailDataUrl: 'data:image/png;base64,test',
  isFavorite: false,
  createdAt: 0,
  updatedAt: 0
};

describe('PresetService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('loadAll returns empty array when no presets', () => {
    const presets = PresetService.loadAll();
    expect(presets).toEqual([]);
  });

  test('save and loadAll work together', () => {
    const presets = [mockPreset];
    PresetService.save(presets);
    const loaded = PresetService.loadAll();
    expect(loaded).toEqual(presets);
  });

  test('add new preset', () => {
    PresetService.add(mockPreset);
    const presets = PresetService.loadAll();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('test-preset');
    expect(presets[0].createdAt).toBeGreaterThan(0);
    expect(presets[0].updatedAt).toBeGreaterThan(0);
  });

  test('add existing preset updates it', () => {
    PresetService.add(mockPreset);
    const updatedPreset = { ...mockPreset, name: 'Updated Name' };
    PresetService.add(updatedPreset);
    const presets = PresetService.loadAll();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Updated Name');
    expect(presets[0].updatedAt).toBeGreaterThan(presets[0].createdAt);
  });

  test('delete preset', () => {
    PresetService.add(mockPreset);
    PresetService.delete('test-preset');
    const presets = PresetService.loadAll();
    expect(presets).toEqual([]);
  });

  test('update preset', () => {
    PresetService.add(mockPreset);
    const updated = { ...mockPreset, name: 'Updated' };
    PresetService.update(updated);
    const presets = PresetService.loadAll();
    expect(presets[0].name).toBe('Updated');
    expect(presets[0].updatedAt).toBeGreaterThan(presets[0].createdAt);
  });

  test('clear all presets', () => {
    PresetService.add(mockPreset);
    PresetService.clear();
    const presets = PresetService.loadAll();
    expect(presets).toEqual([]);
  });
});