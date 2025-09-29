// __tests__/integration/pattern-generators.int.test.tsx
/**
 * Integration-style tests for the SVG pattern generators.
 * No network calls -> no MSW needed.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// <<< UPDATE THIS PATH >>> to your actual module location if needed.
import {
  generateWavePattern,
  generateZigzagPattern,
  generateArcPattern,
  generateDotsPattern,
  generateFlowerPattern,
  generateSpiralPattern,
  generateStraightLines,
} from '../../app/compose-letter/utils/patternGenerators';

// ---- Minimal d3-shape mock to avoid ESM transform issues in some Jest setups
jest.mock('d3-shape', () => {
  function line() {
    let getX = (d: any) => (Array.isArray(d) ? d[0] : d?.x ?? 0);
    let getY = (d: any) => (Array.isArray(d) ? d[1] : d?.y ?? 0);
    const generator = (points: any[]) => {
      if (!Array.isArray(points) || points.length === 0) return '';
      const segs = points.map((p) => `${getX(p)},${getY(p)}`).join(' L ');
      return `M ${segs}`;
    };
    (generator as any).x = (fn: any) => { getX = fn; return generator; };
    (generator as any).y = (fn: any) => { getY = fn; return generator; };
    (generator as any).curve = () => generator; // ignore curve details for DOM checks
    return generator;
  }
  const curveBundle = { beta: () => ({}) };
  const curveCardinal: any = { tension: () => ({}) };
  return { line, curveBundle, curveCardinal };
});

function SvgHarness({ children, width = 400, height = 300 }: { children: React.ReactNode; width?: number; height?: number }) {
  return (
    <svg role="img" aria-label="Pattern Canvas" width={width} height={height} data-testid="canvas">
      {children}
    </svg>
  );
}

describe('Pattern Generators (integration-style composition tests)', () => {
  test('Wave pattern: renders rotated group with styled paths and re-renders on color change', () => {
    const props = {
      width: 400,
      height: 200,
      amplitude: 20,
      frequency: 0.02,
      phase: 0,
      verticalOffset: 0,
      samples: 200,
      count: 3,
      spacing: 24,
      thickness: 2,
      color: '#123456',
      opacity: 0.7,
      rotation: 15,
    };

    const { container, rerender } = render(<SvgHarness>{generateWavePattern(props as any)}</SvgHarness>);
    const canvas = screen.getByTestId('canvas');
    expect(canvas).toBeInTheDocument();

    const group = container.querySelector('g[transform^="rotate("]');
    expect(group).toBeInTheDocument();
    expect(group?.getAttribute('transform')).toContain('15');

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    paths.forEach((p) => {
      expect(p).toHaveAttribute('stroke', '#123456');
      expect(p).toHaveAttribute('stroke-width', '2');
      expect(p).toHaveAttribute('opacity', '0.7');
      expect(p).toHaveAttribute('fill', 'none');
    });

    rerender(<SvgHarness>{generateWavePattern({ ...props, color: '#ff0055', rotation: 30 } as any)}</SvgHarness>);
    const group2 = container.querySelector('g[transform^="rotate("]');
    expect(group2?.getAttribute('transform')).toContain('30');
    const paths2 = container.querySelectorAll('path');
    expect(paths2.length).toBeGreaterThanOrEqual(2);
    paths2.forEach((p) => expect(p).toHaveAttribute('stroke', '#ff0055'));
  });

  test('Zigzag pattern: renders multiple paths with expected styling', () => {
    const props = {
      width: 360,
      height: 180,
      amplitude: 12,
      period: 24,
      phase: 0,
      samples: 180,
      count: 4,
      spacing: 18,
      thickness: 3,
      color: '#0a0',
      opacity: 0.5,
      rotation: 0,
    };

    const { container } = render(<SvgHarness>{generateZigzagPattern(props as any)}</SvgHarness>);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    paths.forEach((p) => {
      expect(p).toHaveAttribute('stroke', '#0a0');
      expect(p).toHaveAttribute('stroke-width', '3');
      expect(p).toHaveAttribute('opacity', '0.5');
    });
  });

  test('Arc pattern: full-circle inputs produce <circle> strokes', () => {
    const props = {
      centerX: 200,
      centerY: 150,
      radius: 30,
      startAngle: 0,
      endAngle: 2 * Math.PI,
      count: 3,
      spacing: 14,
      samples: 180,
      thickness: 2,
      color: '#111',
      opacity: 0.9,
      rotation: 0,
    };

    const { container } = render(<SvgHarness>{generateArcPattern(props as any)}</SvgHarness>);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
    circles.forEach((c) => {
      expect(c).toHaveAttribute('stroke', '#111');
      expect(c).toHaveAttribute('stroke-width', '2');
      expect(c).toHaveAttribute('fill', 'none');
      expect(c).toHaveAttribute('opacity', '0.9');
    });
  });

  test('Dots pattern (cartesian): produces filled circles with normalized=false', () => {
    const props = {
      width: 120,
      height: 80,
      originX: 0,
      originY: 0,
      spacing: 20,
      thickness: 2,
      jitter: 0,
      gridType: 'rect',
      color: '#2244ee',
      opacity: 0.8,
      rotation: 0,
      normalized: false,
    };

    const { container } = render(<SvgHarness>{generateDotsPattern(props as any)}</SvgHarness>);
    const dots = container.querySelectorAll('circle');
    expect(dots.length).toBeGreaterThan(0);
    dots.forEach((c) => {
      expect(c).toHaveAttribute('fill', '#2244ee');
      expect(c).toHaveAttribute('opacity', '0.8');
      expect(Number(c.getAttribute('cx'))).toBeGreaterThanOrEqual(-0.01);
      expect(Number(c.getAttribute('cy'))).toBeGreaterThanOrEqual(-0.01);
    });
  });

  test('Dots pattern (normalized): all positions and radius are in [0,1]', () => {
    const props = {
      width: 100,
      height: 100,
      spacing: 25,
      thickness: 2,
      jitter: 0,
      gridType: 'rect',
      color: '#999',
      opacity: 1,
      rotation: 0,
      normalized: true,
    };

    const { container } = render(<SvgHarness>{generateDotsPattern(props as any)}</SvgHarness>);
    const dots = container.querySelectorAll('circle');
    expect(dots.length).toBeGreaterThan(0);

    dots.forEach((c) => {
      const cx = Number(c.getAttribute('cx'));
      const cy = Number(c.getAttribute('cy'));
      const r = Number(c.getAttribute('r'));
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cx).toBeLessThanOrEqual(1);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThanOrEqual(1);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  test('Flower pattern: includes elements using both primary color and secondaryColor', () => {
    const props = {
      width: 300,
      height: 300,
      spacing: 24,
      thickness: 3,
      color: '#333333',
      secondaryColor: '#ff00ff',
      opacity: 0.9,
      rotation: 10,
    };

    const { container } = render(<SvgHarness>{generateFlowerPattern(props as any)}</SvgHarness>);
    const group = container.querySelector('g[transform^="rotate("]');
    expect(group).toBeInTheDocument();

    const primaryStroke = container.querySelector('[stroke="#333333"]');
    expect(primaryStroke).toBeTruthy();

    const secondaryUse = container.querySelector('[stroke="#ff00ff"], [fill="#ff00ff"]');
    expect(secondaryUse).toBeTruthy();
  });

  test('Spiral pattern: renders a mix of stroked elements; all opacities ≤ provided and one equals it', () => {
    const props = {
      width: 320,
      height: 240,
      spacing: 8,
      thickness: 2,
      color: '#0055aa',
      secondaryColor: '#ffaa00',
      opacity: 0.6,
      rotation: 0,
    };

    const { container } = render(<SvgHarness>{generateSpiralPattern(props as any)}</SvgHarness>);
    const stroked = container.querySelectorAll('[stroke="#0055aa"], [stroke="#ffaa00"]');
    expect(stroked.length).toBeGreaterThan(0);

    // Impl scales some decorative strokes (e.g., opacity * 0.8), so:
    let hasExact = false;
    stroked.forEach((el) => {
      const val = parseFloat(el.getAttribute('opacity') ?? '1');
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThanOrEqual(0.6);
      if (Math.abs(val - 0.6) < 1e-6) hasExact = true; // main spiral often uses raw opacity
    });
    expect(hasExact).toBe(true);
  });

  test('Straight lines: requires spacing or count; renders multiple stroked paths when provided', () => {
    const props = {
      width: 240,
      height: 160,
      slope: 0.2,
      intercept: 0,   // NOTE: single intercept (not "intercepts")
      spacing: 24,    // provide spacing so n is well-defined
      thickness: 1,
      color: '#000',
      opacity: 1,
      rotation: 0,
    };

    const { container } = render(<SvgHarness>{generateStraightLines(props as any)}</SvgHarness>);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    paths.forEach((p) => {
      expect(p).toHaveAttribute('stroke', '#000');
      expect(p).toHaveAttribute('stroke-width', '1');
      expect(p).toHaveAttribute('fill', 'none');
    });
  });

  test('Defensive inputs: still returns a rotated group without crashing', () => {
    const badProps = {
      width: NaN,
      height: undefined,
      amplitude: Number('nope'),
      frequency: Number('nope'),
      phase: Number('nope'),
      samples: Number('nope'),
      spacing: Number('nope'),
      thickness: Number('nope'),
      color: undefined,
      opacity: Number('nope'),
      rotation: Number('nope'),
    };

    const { container } = render(<SvgHarness>{generateWavePattern(badProps as any)}</SvgHarness>);
    // The generator may produce an empty <g>; just ensure we get a rotated group and no crash.
    expect(container.querySelector('g[transform^="rotate("]')).toBeInTheDocument();
  });
});
