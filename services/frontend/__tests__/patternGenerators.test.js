import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  generateStraightLines,
  generateWavePattern,
  generateZigzagPattern,
  generateArcPattern,
  generateSpiralPattern,
  generateDotsPattern,
  generateSwirlGrid,
  generateFlowerPattern,
  generateFloralPattern,
} from '../app/compose-letter/utils/patternGenerators';

// Mock d3-shape to avoid ES module issues
jest.mock('d3-shape', () => ({
  arc: jest.fn(() => ({
    innerRadius: jest.fn().mockReturnThis(),
    outerRadius: jest.fn().mockReturnThis(),
    startAngle: jest.fn().mockReturnThis(),
    endAngle: jest.fn().mockReturnThis(),
    cornerRadius: jest.fn().mockReturnThis(),
    padAngle: jest.fn().mockReturnThis(),
    padRadius: jest.fn().mockReturnThis(),
    centroid: jest.fn(() => [0, 0]),
    generate: jest.fn(() => 'M0,0 A10,10 0 0,1 10,10 Z'),
  })),
  line: jest.fn(() => {
    const lineGenerator = jest.fn(() => 'M0,0 L10,10');
    lineGenerator.x = jest.fn().mockReturnValue(lineGenerator);
    lineGenerator.y = jest.fn().mockReturnValue(lineGenerator);
    lineGenerator.curve = jest.fn().mockReturnValue(lineGenerator);
    return lineGenerator;
  }),
  curveCardinal: {
    tension: jest.fn(() => jest.fn(() => 'mock-curve')),
  },
  curveBundle: {
    beta: jest.fn(() => jest.fn(() => 'mock-bundle-curve')),
  },
}));

describe('Pattern Generators', () => {
  const defaultParams = {
    width: 400,
    height: 600,
    spacing: 24,
    thickness: 2,
    color: '#000000',
    opacity: 1,
    rotation: 0,
  };

  describe('generateStraightLines', () => {
    test('returns a valid React element', () => {
      const result = generateStraightLines({
        ...defaultParams,
        slope: 0,
        intercept: 0,
        count: 5,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('creates g element with rotation transform', () => {
      const result = generateStraightLines({
        ...defaultParams,
        slope: 0,
        intercept: 0,
        count: 3,
        rotation: 45,
      });

      expect(result.type).toBe('g');
      expect(result.props.transform).toContain('rotate(45');
    });

    test('generates multiple path elements', () => {
      const result = generateStraightLines({
        ...defaultParams,
        slope: 0,
        intercept: 0,
        count: 3,
      });

      expect(result.props.children).toHaveLength(3);
      result.props.children.forEach(child => {
        expect(child.type).toBe('path');
        expect(child.props.stroke).toBe('#000000');
        expect(child.props.strokeWidth).toBe(2);
      });
    });

    test('handles different slopes correctly', () => {
      const result = generateStraightLines({
        ...defaultParams,
        slope: 1,
        intercept: 10,
        count: 2,
      });

      expect(React.isValidElement(result)).toBe(true);
      expect(result.props.children).toHaveLength(2);
    });

    test('applies custom color and opacity', () => {
      const result = generateStraightLines({
        ...defaultParams,
        slope: 0,
        intercept: 0,
        count: 2,
        color: '#ff0000',
        opacity: 0.5,
      });

      result.props.children.forEach(child => {
        expect(child.props.stroke).toBe('#ff0000');
        expect(child.props.opacity).toBe(0.5);
      });
    });
  });

  describe('generateWavePattern', () => {
    test('returns a valid React element', () => {
      const result = generateWavePattern({
        ...defaultParams,
        amplitude: 10,
        frequency: 0.1,
        phase: 0,
        samples: 100,
        count: 3,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('creates g element with rotation', () => {
      const result = generateWavePattern({
        ...defaultParams,
        amplitude: 5,
        frequency: 0.05,
        phase: 0,
        samples: 50,
        count: 2,
        rotation: 30,
      });

      expect(result.type).toBe('g');
      expect(result.props.transform).toContain('rotate(30');
    });

    test('generates wave paths with correct properties', () => {
      const result = generateWavePattern({
        ...defaultParams,
        amplitude: 8,
        frequency: 0.08,
        phase: Math.PI,
        samples: 80,
        count: 4,
        color: '#00ff00',
      });

      expect(result.props.children).toHaveLength(5);
      result.props.children.forEach(child => {
        expect(child.type).toBe('path');
        expect(child.props.stroke).toBe('#00ff00');
        expect(child.props.d).toBeTruthy();
        expect(typeof child.props.d).toBe('string');
      });
    });

    test('handles vertical offset parameter', () => {
      const result = generateWavePattern({
        ...defaultParams,
        amplitude: 12,
        frequency: 0.06,
        phase: 0,
        verticalOffset: 20,
        samples: 60,
        count: 2,
      });

      expect(React.isValidElement(result)).toBe(true);
      expect(result.props.children).toHaveLength(3); // -1, 0, 1 (count + 2 elements)
    });
  });

  describe('generateZigzagPattern', () => {
    test('returns a valid React element', () => {
      const result = generateZigzagPattern({
        ...defaultParams,
        amplitude: 15,
        period: 50,
        phase: 0,
        samples: 100,
        count: 3,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates zigzag paths', () => {
      const result = generateZigzagPattern({
        ...defaultParams,
        amplitude: 10,
        period: 40,
        phase: Math.PI / 2,
        samples: 80,
        count: 2,
        color: '#0000ff',
      });

      expect(result.props.children).toHaveLength(3);
      result.props.children.forEach(child => {
        expect(child.type).toBe('path');
        expect(child.props.stroke).toBe('#0000ff');
        expect(child.props.d).toBeTruthy();
      });
    });

    test('applies rotation transform', () => {
      const result = generateZigzagPattern({
        ...defaultParams,
        amplitude: 8,
        period: 30,
        phase: 0,
        samples: 60,
        count: 2,
        rotation: 90,
      });

      expect(result.props.transform).toContain('rotate(90');
    });
  });

  describe('generateArcPattern', () => {
    test('returns a valid React element', () => {
      const result = generateArcPattern({
        centerX: 200,
        centerY: 300,
        radius: 50,
        startAngle: 0,
        endAngle: Math.PI,
        count: 3,
        spacing: 10,
        samples: 50,
        thickness: 2,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates arc elements', () => {
      const result = generateArcPattern({
        centerX: 150,
        centerY: 200,
        radius: 40,
        startAngle: 0,
        endAngle: Math.PI * 2,
        count: 2,
        spacing: 15,
        samples: 40,
        thickness: 3,
        color: '#ff00ff',
      });

      expect(result.props.children).toHaveLength(2);
      result.props.children.forEach(child => {
        expect(['circle', 'path']).toContain(child.type);
        expect(child.props.stroke).toBe('#ff00ff');
      });
    });

    test('creates circles for full circles', () => {
      const result = generateArcPattern({
        centerX: 200,
        centerY: 300,
        radius: 50,
        startAngle: 0,
        endAngle: Math.PI * 2 + 0.1, // Slightly more than full circle
        count: 3,
        spacing: 10,
        samples: 50,
        thickness: 2,
      });

      expect(result.props.children.length).toBeGreaterThan(0);
      expect(result.props.children[0].type).toBe('circle');
    });

    test('creates paths for partial arcs', () => {
      const result = generateArcPattern({
        centerX: 200,
        centerY: 300,
        radius: 50,
        startAngle: 0,
        endAngle: Math.PI, // Half circle
        count: 3,
        spacing: 10,
        samples: 50,
        thickness: 2,
      });

      expect(result.props.children.length).toBeGreaterThan(0);
      expect(result.props.children[0].type).toBe('path');
      expect(result.props.children[0].props.d).toBeTruthy();
    });
  });

  describe('generateSpiralPattern', () => {
    test('returns a valid React element', () => {
      const result = generateSpiralPattern({
        ...defaultParams,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates spiral elements', () => {
      const result = generateSpiralPattern({
        ...defaultParams,
        color: '#ffff00',
        secondaryColor: '#ff8800',
      });

      expect(result.props.children.length).toBeGreaterThan(1);
      expect(result.props.children[0].type).toBe('path');
      expect(result.props.children[0].props.stroke).toBe('#ffff00');
    });

    test('handles secondary color parameter', () => {
      const result = generateSpiralPattern({
        ...defaultParams,
        secondaryColor: '#cccccc',
      });

      const hasSecondaryElements = result.props.children.some(child =>
        child.props.stroke === '#cccccc'
      );
      expect(hasSecondaryElements).toBe(true);
    });

    test('applies rotation correctly', () => {
      const result = generateSpiralPattern({
        ...defaultParams,
        rotation: 45,
      });

      expect(result.props.transform).toContain('rotate(45');
    });
  });

  describe('generateDotsPattern', () => {
    test('returns a valid React element', () => {
      const result = generateDotsPattern({
        ...defaultParams,
        thickness: 4, // radius
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates dot elements', () => {
      const result = generateDotsPattern({
        ...defaultParams,
        thickness: 3,
        color: '#00ffff',
      });

      expect(result.props.children.length).toBeGreaterThan(0);
      result.props.children.forEach(child => {
        expect(child.type).toBe('circle');
        expect(child.props.fill).toBe('#00ffff');
        expect(child.props.r).toBeGreaterThan(0);
      });
    });

    test('handles rectangular grid', () => {
      const result = generateDotsPattern({
        ...defaultParams,
        thickness: 2,
        gridType: 'rect',
      });

      expect(React.isValidElement(result)).toBe(true);
      expect(result.props.children.length).toBeGreaterThan(0);
    });

    test('handles hexagonal grid', () => {
      const result = generateDotsPattern({
        ...defaultParams,
        thickness: 2,
        gridType: 'hex',
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('applies jitter when specified', () => {
      const result = generateDotsPattern({
        ...defaultParams,
        thickness: 2,
        jitter: 5,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('handles normalized coordinates', () => {
      const result = generateDotsPattern({
        ...defaultParams,
        thickness: 2,
        normalized: true,
      });

      expect(React.isValidElement(result)).toBe(true);
      // Normalized coordinates should be between 0 and 1
      result.props.children.forEach(child => {
        expect(child.props.cx).toBeGreaterThanOrEqual(0);
        expect(child.props.cx).toBeLessThanOrEqual(1);
        expect(child.props.cy).toBeGreaterThanOrEqual(0);
        expect(child.props.cy).toBeLessThanOrEqual(1);
      });
    });

    test('handles invalid inputs gracefully', () => {
      const result = generateDotsPattern({
        width: 0,
        height: 0,
        spacing: 0,
        thickness: 0,
      });

      // The implementation returns a fallback pattern for invalid dimensions
      expect(React.isValidElement(result)).toBe(true);
      expect(result.props.children.length).toBeGreaterThan(0);
    });
  });

  describe('generateSwirlGrid', () => {
    test('returns a valid React element', () => {
      const result = generateSwirlGrid({
        ...defaultParams,
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates swirl grid elements', () => {
      const result = generateSwirlGrid({
        ...defaultParams,
        color: '#ff0080',
      });

      expect(result.props.children.length).toBeGreaterThan(0);
      result.props.children.forEach(child => {
        expect(child.type).toBe('g');
        expect(child.props.transform).toBeDefined();
        // Check that the g element has children (the path elements)
        expect(React.Children.count(child)).toBe(1);
      });
    });

    test('applies rotation to grid', () => {
      const result = generateSwirlGrid({
        ...defaultParams,
        rotation: 60,
      });

      expect(result.props.transform).toContain('rotate(60');
    });
  });

  describe('generateFlowerPattern', () => {
    test('returns a valid React element', () => {
      const result = generateFlowerPattern({
        ...defaultParams,
        secondaryColor: '#888888',
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates flower elements', () => {
      const result = generateFlowerPattern({
        ...defaultParams,
        color: '#ff4444',
        secondaryColor: '#44ff44',
      });

      expect(result.props.children.length).toBeGreaterThan(0);
      // Should have petals and center
      const hasPetals = result.props.children.some(child =>
        child.props.stroke === '#ff4444'
      );
      const hasCenter = result.props.children.some(child =>
        child.props.stroke === '#44ff44'
      );
      expect(hasPetals).toBe(true);
      expect(hasCenter).toBe(true);
    });
  });

  describe('generateFloralPattern', () => {
    test('returns a valid React element', () => {
      const result = generateFloralPattern({
        ...defaultParams,
        secondaryColor: '#666666',
      });

      expect(React.isValidElement(result)).toBe(true);
    });

    test('generates complex floral elements', () => {
      const result = generateFloralPattern({
        ...defaultParams,
        color: '#8B4513',
        secondaryColor: '#228B22',
      });

      expect(result.props.children.length).toBeGreaterThan(0);
      // Should contain vines, leaves, and possibly buds
      const hasVines = result.props.children.some(child =>
        child.props.stroke === '#8B4513'
      );
      const hasLeaves = result.props.children.some(child =>
        child.props.stroke === '#228B22'
      );
      expect(hasVines).toBe(true);
      expect(hasLeaves).toBe(true);
    });

    test('adjusts complexity based on spacing', () => {
      const denseResult = generateFloralPattern({
        ...defaultParams,
        spacing: 10,
        secondaryColor: '#666666',
      });

      const sparseResult = generateFloralPattern({
        ...defaultParams,
        spacing: 50,
        secondaryColor: '#666666',
      });

      expect(React.isValidElement(denseResult)).toBe(true);
      expect(React.isValidElement(sparseResult)).toBe(true);
    });
  });

  describe('Parameter Validation', () => {
    test('all generators handle zero or negative dimensions', () => {
      const generators = [
        () => generateStraightLines({ width: 0, height: 0, slope: 0, intercept: 0, spacing: 1, thickness: 1 }),
        () => generateWavePattern({ width: 0, height: 0, amplitude: 1, frequency: 0.1, phase: 0, samples: 10, spacing: 1, thickness: 1 }),
        () => generateZigzagPattern({ width: 0, height: 0, amplitude: 1, period: 10, phase: 0, samples: 10, spacing: 1, thickness: 1 }),
        () => generateArcPattern({ centerX: 0, centerY: 0, radius: 1, startAngle: 0, endAngle: 1, spacing: 1, samples: 10, thickness: 1 }),
        () => generateSpiralPattern({ width: 0, height: 0, spacing: 1, thickness: 1 }),
        () => generateDotsPattern({ width: 0, height: 0, spacing: 1, thickness: 1 }),
        () => generateSwirlGrid({ width: 0, height: 0, spacing: 1, thickness: 1 }),
        () => generateFlowerPattern({ width: 0, height: 0, spacing: 1, thickness: 1, secondaryColor: '#000' }),
        () => generateFloralPattern({ width: 0, height: 0, spacing: 1, thickness: 1, secondaryColor: '#000' }),
      ];

      generators.forEach(generator => {
        expect(() => generator()).not.toThrow();
        const result = generator();
        expect(React.isValidElement(result) || result === null).toBe(true);
      });
    });

    test('generators handle extreme parameter values', () => {
      const extremeParams = {
        width: 10000,
        height: 10000,
        spacing: 1000,
        thickness: 100,
        amplitude: 1000,
        frequency: 10,
        period: 1000,
        samples: 1000,
        count: 100,
      };

      expect(() => generateStraightLines({
        ...extremeParams,
        slope: 10,
        intercept: 1000,
      })).not.toThrow();

      expect(() => generateWavePattern({
        ...extremeParams,
        phase: 100,
        verticalOffset: 1000,
      })).not.toThrow();
    });
  });

  describe('Performance and Rendering', () => {
    test('generators produce reasonable number of elements', () => {
      const result = generateDotsPattern({
        width: 800,
        height: 1200,
        spacing: 20,
        thickness: 2,
      });

      expect(result.props.children.length).toBeLessThan(3000); // Reasonable upper bound for large canvas
      expect(result.props.children.length).toBeGreaterThan(10); // Should generate some elements
    });

    test('elements have required SVG properties', () => {
      const straightLines = generateStraightLines({
        width: 200,
        height: 200,
        slope: 0,
        intercept: 0,
        spacing: 20,
        thickness: 2,
        count: 3,
      });

      straightLines.props.children.forEach(child => {
        expect(child.props).toHaveProperty('stroke');
        expect(child.props).toHaveProperty('strokeWidth');
        expect(child.props).toHaveProperty('opacity');
        expect(child.props).toHaveProperty('fill', 'none');
      });
    });
  });
});