import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Import the fonts utility
const { DEFAULT_FONT_ID, FONT_PRESETS, inter, lora, ebGaramond, patrickHand, specialElite, caveat, robotoMono, merriweather, openSans, sourceSans3, kalam, dancingScript, satisfy, notoSans, notoSerif, courierPrime } = require('../app/compose-letter/fonts')

// jsdom does not implement ResizeObserver; some UI hooks depend on it
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Tests for fonts.ts utility functions
test('exports DEFAULT_FONT_ID', () => {
  expect(DEFAULT_FONT_ID).toBeDefined()
})

describe('Font Presets', () => {
  test('FONT_PRESETS is an array with expected length', () => {
    expect(Array.isArray(FONT_PRESETS)).toBe(true)
    expect(FONT_PRESETS.length).toBe(31)
  })

  test('each font preset has required properties', () => {
    FONT_PRESETS.forEach(preset => {
      expect(preset).toHaveProperty('id')
      expect(preset).toHaveProperty('label')
      expect(preset).toHaveProperty('className')
      expect(preset).toHaveProperty('category')
      expect(typeof preset.id).toBe('string')
      expect(typeof preset.label).toBe('string')
      expect(typeof preset.className).toBe('string')
      expect(['sans', 'serif', 'mono', 'handwritten', 'display']).toContain(preset.category)
    })
  })

  test('DEFAULT_FONT_ID exists in FONT_PRESETS', () => {
    const defaultPreset = FONT_PRESETS.find(preset => preset.id === DEFAULT_FONT_ID)
    expect(defaultPreset).toBeDefined()
    expect(defaultPreset.id).toBe('modern')
    expect(defaultPreset.label).toBe('Modern (Inter)')
  })

  test('font presets have valid categories', () => {
    const categories = FONT_PRESETS.map(preset => preset.category)
    const uniqueCategories = [...new Set(categories)]
    expect(uniqueCategories).toEqual(['sans', 'serif', 'handwritten', 'mono', 'display'])
  })

  test('sans-serif fonts are properly configured', () => {
    const sansFonts = FONT_PRESETS.filter(preset => preset.category === 'sans')
    expect(sansFonts.length).toBe(7)
  })

  test('serif fonts are properly configured', () => {
    const serifFonts = FONT_PRESETS.filter(preset => preset.category === 'serif')
    expect(serifFonts.length).toBe(6)
  })

  test('handwritten fonts are properly configured', () => {
    const handwrittenFonts = FONT_PRESETS.filter(preset => preset.category === 'handwritten')
    expect(handwrittenFonts.length).toBe(6)
  })

  test('mono fonts are properly configured', () => {
    const monoFonts = FONT_PRESETS.filter(preset => preset.category === 'mono')
    expect(monoFonts.length).toBe(5)
  })

  test('font presets have unique IDs', () => {
    const ids = FONT_PRESETS.map(preset => preset.id)
    const uniqueIds = [...new Set(ids)]
    expect(uniqueIds.length).toBe(FONT_PRESETS.length)
  })

  test('font presets have unique labels', () => {
    const labels = FONT_PRESETS.map(preset => preset.label)
    const uniqueLabels = [...new Set(labels)]
    expect(uniqueLabels.length).toBe(FONT_PRESETS.length)
  })

  test('handwritten fonts have letter spacing adjustments', () => {
    const handwrittenFonts = FONT_PRESETS.filter(preset => preset.category === 'handwritten')
    handwrittenFonts.forEach(font => {
      expect(font).toHaveProperty('letterSpacing')
      expect(typeof font.letterSpacing).toBe('string')
    })
  })

  test('mono fonts have appropriate line height', () => {
    const monoFonts = FONT_PRESETS.filter(preset => preset.category === 'mono')
    monoFonts.forEach(font => {
      expect(font).toHaveProperty('lineHeight')
      expect(typeof font.lineHeight).toBe('string')
    })
  })
})

describe('Individual Font Objects', () => {
  test('inter font object has expected properties', () => {
    expect(inter).toHaveProperty('className')
    expect(inter).toHaveProperty('variable')
    expect(typeof inter.className).toBe('string')
    expect(typeof inter.variable).toBe('string')
  })

  test('lora font object has expected properties', () => {
    expect(lora).toHaveProperty('className')
    expect(lora).toHaveProperty('variable')
    expect(typeof lora.className).toBe('string')
    expect(typeof lora.variable).toBe('string')
  })

  test('ebGaramond font object has expected properties', () => {
    expect(ebGaramond).toHaveProperty('className')
    expect(ebGaramond).toHaveProperty('variable')
    expect(typeof ebGaramond.className).toBe('string')
    expect(typeof ebGaramond.variable).toBe('string')
  })

  test('patrickHand font object has expected properties', () => {
    expect(patrickHand).toHaveProperty('className')
    expect(patrickHand).toHaveProperty('variable')
    expect(typeof patrickHand.className).toBe('string')
    expect(typeof patrickHand.variable).toBe('string')
  })

  test('specialElite font object has expected properties', () => {
    expect(specialElite).toHaveProperty('className')
    expect(specialElite).toHaveProperty('variable')
    expect(typeof specialElite.className).toBe('string')
    expect(typeof specialElite.variable).toBe('string')
  })

  test('caveat font object has expected properties', () => {
    expect(caveat).toHaveProperty('className')
    expect(caveat).toHaveProperty('variable')
    expect(typeof caveat.className).toBe('string')
    expect(typeof caveat.variable).toBe('string')
  })

  test('robotoMono font object has expected properties', () => {
    expect(robotoMono).toHaveProperty('className')
    expect(robotoMono).toHaveProperty('variable')
    expect(typeof robotoMono.className).toBe('string')
    expect(typeof robotoMono.variable).toBe('string')
  })

  test('merriweather font object has expected properties', () => {
    expect(merriweather).toHaveProperty('className')
    expect(merriweather).toHaveProperty('variable')
    expect(typeof merriweather.className).toBe('string')
    expect(typeof merriweather.variable).toBe('string')
  })

  test('openSans font object has expected properties', () => {
    expect(openSans).toHaveProperty('className')
    expect(openSans).toHaveProperty('variable')
    expect(typeof openSans.className).toBe('string')
    expect(typeof openSans.variable).toBe('string')
  })

  test('sourceSans3 font object has expected properties', () => {
    expect(sourceSans3).toHaveProperty('className')
    expect(sourceSans3).toHaveProperty('variable')
    expect(typeof sourceSans3.className).toBe('string')
    expect(typeof sourceSans3.variable).toBe('string')
  })

  test('kalam font object has expected properties', () => {
    expect(kalam).toHaveProperty('className')
    expect(kalam).toHaveProperty('variable')
    expect(typeof kalam.className).toBe('string')
    expect(typeof kalam.variable).toBe('string')
  })

  test('dancingScript font object has expected properties', () => {
    expect(dancingScript).toHaveProperty('className')
    expect(dancingScript).toHaveProperty('variable')
    expect(typeof dancingScript.className).toBe('string')
    expect(typeof dancingScript.variable).toBe('string')
  })

  test('satisfy font object has expected properties', () => {
    expect(satisfy).toHaveProperty('className')
    expect(satisfy).toHaveProperty('variable')
    expect(typeof satisfy.className).toBe('string')
    expect(typeof satisfy.variable).toBe('string')
  })

  test('notoSans font object has expected properties', () => {
    expect(notoSans).toHaveProperty('className')
    expect(notoSans).toHaveProperty('variable')
    expect(typeof notoSans.className).toBe('string')
    expect(typeof notoSans.variable).toBe('string')
  })

  test('notoSerif font object has expected properties', () => {
    expect(notoSerif).toHaveProperty('className')
    expect(notoSerif).toHaveProperty('variable')
    expect(typeof notoSerif.className).toBe('string')
    expect(typeof notoSerif.variable).toBe('string')
  })

  test('courierPrime font object has expected properties', () => {
    expect(courierPrime).toHaveProperty('className')
    expect(courierPrime).toHaveProperty('variable')
    expect(typeof courierPrime.className).toBe('string')
    expect(typeof courierPrime.variable).toBe('string')
  })
})
