/**
 * @file __tests__/integration/pattern-generators.int.test.tsx
 *
 * Integration tests for app/compose-letter/utils/patternGenerators.
 * We render the returned React nodes into an <svg> and assert on
 * structure + critical attributes, without mocking the module internals.
 */

import React from "react";
import { render, cleanup } from "@testing-library/react";

// Adjust the import path if your repo structure differs:
import {
  generateStraightLines,
  generateWavePattern,
  generateZigzagPattern,
  generateArcPattern,
  generateDotsPattern,
  generateFloralPattern,
  generateSpiralPattern,
  generateSwirlGrid,
} from "../../app/compose-letter/utils/patternGenerators";

afterEach(() => {
  cleanup();
  // If any test stubs Math.random in the future, reset here:
  jest.restoreAllMocks();
});

function renderIntoSvg(node: React.ReactNode) {
  const utils = render(<svg data-testid="svg-root">{node}</svg>);
  const svg = utils.getByTestId("svg-root");
  return { ...utils, svg };
}

describe("patternGenerators (integration)", () => {
  test("generateStraightLines → respects count, stroke props, and rotation transform", () => {
    const params = {
      width: 200,
      height: 120,
      // keep deterministic: no jitter
      jitter: 0,
      slope: 0,
      intercept: 0,
      spacing: 20,
      count: 6,
      thickness: 2,
      color: "#123456",
      secondaryColor: "#abcdef",
      opacity: 0.75,
      rotation: 15,
      cx: 100,
      cy: 60,
    };

    const node = generateStraightLines(params as any);
    const { container } = renderIntoSvg(node);

    // All line segments are <path> (one per line)
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(params.count);

    // The returned <g> wrapper should include rotate(cx, cy)
    const group = container.querySelector("g");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("transform")).toMatch(/rotate\(15\s+100\s+60\)/);

    // Inspect a representative path for stroke, stroke-width, and opacity
    const any = paths[0]!;
    expect(any.getAttribute("stroke")).toBe("#123456");
    expect(any.getAttribute("stroke-width")).toBe(String(params.thickness));
    expect(any.getAttribute("opacity")).toBe(String(params.opacity));

    // Path data should start with an 'M' (moveto)
    expect(any.getAttribute("d") || "").toMatch(/^M/i);
  });

  test("generateWavePattern → creates multiple wave rows with valid 'd' attributes", () => {
    const params = {
      width: 240,
      height: 160,
      amplitude: 12,
      frequency: 0.04,
      phase: 0,
      verticalOffset: 0,
      spacing: 24,
      samples: 80,
      thickness: 1.5,
      color: "#222",
      opacity: 0.9,
      rotation: 0,
      cx: 120,
      cy: 80,
    };

    const node = generateWavePattern(params as any);
    const { container } = renderIntoSvg(node);

    const paths = container.querySelectorAll("path");
    // Expect at least height/spacing rows, sometimes +1 depending on math
    const minRows = Math.floor(params.height / params.spacing);
    expect(paths.length).toBeGreaterThanOrEqual(minRows);
    expect(paths.length).toBeLessThanOrEqual(minRows + 3);

    // All wave paths should have a valid "d" and correct stroke/opacity
    for (const p of Array.from(paths)) {
      expect(p.getAttribute("d") || "").toMatch(/^M/i);
      expect(p.getAttribute("stroke")).toBe("#222");
      expect(p.getAttribute("fill")).toBe("none");
      expect(Number(p.getAttribute("stroke-width"))).toBeCloseTo(1.5);
      expect(Number(p.getAttribute("opacity"))).toBeCloseTo(0.9);
    }
  });

  test("generateZigzagPattern → produces zigzag lines across width & rows across height", () => {
    const params = {
      width: 220,
      height: 140,
      amplitude: 10,
      wavelength: 30,
      spacing: 28,
      thickness: 1,
      color: "#555",
      opacity: 0.8,
      rotation: 0,
      cx: 110,
      cy: 70,
    };

    const node = generateZigzagPattern(params as any);
    const { container } = renderIntoSvg(node);

    const paths = container.querySelectorAll("path");
    // Like waves: number of rows ~= height/spacing
    const approxRows = Math.floor(params.height / params.spacing);
    expect(paths.length).toBeGreaterThanOrEqual(approxRows);
    expect(paths.length).toBeLessThanOrEqual(approxRows + 3);

    // Basic attribute checks
    const p0 = paths[0]!;
    expect(p0.getAttribute("stroke")).toBe("#555");
    expect(p0.getAttribute("fill")).toBe("none");
    expect(Number(p0.getAttribute("opacity"))).toBeCloseTo(0.8);
  });

  test("generateArcPattern → produces grid of arcs (multiple <path> elements with valid 'd')", () => {
    const params = {
      width: 240,
      height: 160,
      spacing: 40,
      // Use a not-too-large radius so we get multiple cells
      radius: 16,
      thickness: 1.25,
      color: "#0a0",
      opacity: 1,
      rotation: 0,
      cx: 120,
      cy: 80,
    };

    const node = generateArcPattern(params as any);
    const { container } = renderIntoSvg(node);

    const paths = container.querySelectorAll("path");
    // Should produce several arcs across the grid
    expect(paths.length).toBeGreaterThan(5);

    for (const p of Array.from(paths)) {
      expect(p.getAttribute("d") || "").toMatch(/^M/i);
      expect(p.getAttribute("stroke")).toBe("#0a0");
      expect(p.getAttribute("fill")).toBe("none");
    }
  });

  test("generateDotsPattern (rect grid, jitter=0) → produces circles with correct radius/stroke", () => {
    const params = {
      width: 200,
      height: 120,
      spacing: 20,
      thickness: 2,
      color: "#f00",
      opacity: 0.6,
      rotation: 0,
      cx: 100,
      cy: 60,
      gridType: "rect" as const,
      // determinism:
      jitter: 0,
    };

    const node = generateDotsPattern(params as any);
    const { container } = renderIntoSvg(node);

    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThan(20); // rough minimum for 200x120 @ 20px spacing

    const c0 = circles[0]!;
    // In this generator, radius commonly correlates with `thickness`
    expect(Number(c0.getAttribute("r"))).toBeGreaterThan(0);
    expect(c0.getAttribute("stroke")).toBe("#f00");
    expect(Number(c0.getAttribute("opacity"))).toBeCloseTo(0.6);
  });

  test("generateSwirlGrid → produces a composite of paths and circles within an overall rotated group", () => {
    const params = {
      width: 220,
      height: 160,
      spacing: 36,
      thickness: 1.2,
      color: "#333",
      secondaryColor: "#999",
      opacity: 0.85,
      rotation: 25,
      cx: 110,
      cy: 80,
    };

    const node = generateSwirlGrid(params as any);
    const { container } = renderIntoSvg(node);

    const group = container.querySelector("g");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("transform")).toMatch(/rotate\(25\s+110\s+80\)/);

    // Should produce a mix of paths and circles
    expect(container.querySelectorAll("path").length).toBeGreaterThan(5);
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(5);
  });

  test("generateFloralPattern → produces vine paths and decorative circles; honors color/opacity", () => {
    const params = {
      width: 260,
      height: 180,
      spacing: 24,
      thickness: 1.4,
      color: "#6b3f2a",
      secondaryColor: "#b9855e",
      opacity: 0.9,
      rotation: 0,
      cx: 130,
      cy: 90,
    };

    const node = generateFloralPattern(params as any);
    const { container } = renderIntoSvg(node);

    const paths = container.querySelectorAll("path");
    const circles = container.querySelectorAll("circle");
    expect(paths.length).toBeGreaterThan(8);
    expect(circles.length).toBeGreaterThan(8);

    // Check a couple of attributes on representative elements
    const p0 = paths[0]!;
    expect(p0.getAttribute("stroke")).toBe("#6b3f2a");
    expect(Number(p0.getAttribute("opacity"))).toBeCloseTo(0.9);

    const c0 = circles[0]!;
    expect(["#6b3f2a", "#b9855e"]).toContain(c0.getAttribute("stroke"));
    expect(Number(c0.getAttribute("opacity"))).toBeGreaterThan(0.5);
  });

  test("generateSpiralPattern → yields at least one path with expected styling", () => {
    const params = {
      width: 220,
      height: 180,
      spacing: 18,
      thickness: 1.1,
      color: "#444",
      secondaryColor: "#aaa",
      opacity: 0.8,
      rotation: 0,
      cx: 110,
      cy: 90,
    };

    const node = generateSpiralPattern(params as any);
    const { container } = renderIntoSvg(node);
    const paths = container.querySelectorAll("path");

    expect(paths.length).toBeGreaterThan(0);

    const p0 = paths[0]!;
    expect(p0.getAttribute("stroke")).toBe("#444");
    expect(p0.getAttribute("fill")).toBe("none");
    expect(Number(p0.getAttribute("opacity"))).toBeCloseTo(0.8);
  });
});
