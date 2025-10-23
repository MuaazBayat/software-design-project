import React from 'react';
import { line, curveBundle, curveCardinal } from 'd3-shape';

// -------------------- Utils --------------------
function getRotatedBounds(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  const rotatedWidth = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
  const rotatedHeight = Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad));
  return { rotatedWidth, rotatedHeight };
}

// Fixed Wavy Path Generator
function generateWavyPath(
  width: number,
  height: number,
  frequency: number,
  amplitude: number,
  phase: number,
  rotation: number,
  step: number
): string {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Oversize the area (draw beyond canvas)
  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin);
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos);

  const extendedWidth = rotatedWidth * 2; // extend left + right
  const y0 = rotatedHeight / 2;

  let d = '';
  for (let x = -extendedWidth; x <= extendedWidth * 2; x += step) {
    const y = y0 + amplitude * Math.sin(2 * Math.PI * frequency * x + phase);
    const px = x - rotatedWidth / 2 + width / 2;
    const py = y - rotatedHeight / 2 + height / 2;
    d += x === -extendedWidth ? `M ${px} ${py}` : ` L ${px} ${py}`;
  }

  return d;
}

// Fixed Zigzag Path Generator
function generateZigzagPath(
  width: number,
  height: number,
  amplitude: number,
  period: number,
  phase: number,
  rotation: number,
  step: number
): string {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin);
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos);

  const extendedWidth = rotatedWidth * 2; // draw beyond canvas
  const y0 = rotatedHeight / 2;

  let d = '';
  for (let x = -extendedWidth; x <= extendedWidth * 2; x += step) {
    const t = ((x + phase) % period) / period;
    const y = y0 + (t < 0.5 ? 2 * amplitude * t - amplitude : 2 * amplitude * (1 - t) - amplitude);
    const px = x - rotatedWidth / 2 + width / 2;
    const py = y - rotatedHeight / 2 + height / 2;
    d += x === -extendedWidth ? `M ${px} ${py}` : ` L ${px} ${py}`;
  }

  return d;
}

// -------------------- Straight Lines --------------------
export interface StraightLinesParams {
  width: number;
  height: number;
  slope: number;
  intercept?: number;
  spacing: number;
  count?: number;
  thickness: number;
  color?: string;
  opacity?: number;
  rotation?: number;
}

export function generateStraightLines({
  width,
  height,
  slope,
  intercept = 0,
  spacing,
  count,
  thickness,
  color = '#000',
  opacity = 1,
  rotation = 0,
}: StraightLinesParams): React.ReactNode {
  const { rotatedWidth, rotatedHeight } = getRotatedBounds(width, height, rotation);
  const invNorm = 1 / Math.sqrt(1 + slope * slope);
  const diag = Math.sqrt(rotatedWidth ** 2 + rotatedHeight ** 2);
  const n = count ?? Math.ceil(diag / spacing) + 2;

  const lines: React.ReactNode[] = [];
  for (let k = -Math.floor(n / 2); k < Math.ceil(n / 2); k++) {
    const c_k = intercept + k * spacing * invNorm;
    let d = '';
    for (let x = -rotatedWidth / 2; x <= rotatedWidth / 2; x++) {
      const y = slope * x + c_k;
      d += x === -rotatedWidth / 2 ? `M ${x + width / 2} ${y + height / 2}` : ` L ${x + width / 2} ${y + height / 2}`;
    }
    lines.push(
      React.createElement('path', {
        key: `line-${k}`,
        d,
        stroke: color,
        strokeWidth: thickness,
        opacity,
        fill: 'none',
      })
    );
  }
  return React.createElement('g', { transform: `rotate(${rotation} ${width / 2} ${height / 2})` }, ...lines);
}

// -------------------- Wavy Lines --------------------
export interface WaveParams {
  width: number;
  height: number;
  amplitude: number;
  frequency: number;
  phase: number;
  verticalOffset?: number;
  samples: number;
  count?: number;
  spacing: number;
  thickness: number;
  color?: string;
  opacity?: number;
  rotation?: number;
}

export function generateWavePattern({
  width,
  height,
  amplitude,
  frequency,
  phase,
  verticalOffset = 0,
  samples,
  count,
  spacing,
  thickness,
  color = '#000',
  opacity = 1,
  rotation = 0,
}: WaveParams): React.ReactNode {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Use infinite bounds calculation
  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin);
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos);
  
  // Extend for infinite look
  const extendedWidth = rotatedWidth * 2;
  const step = Math.max(1, Math.floor(rotatedWidth / samples));
  const lines: React.ReactNode[] = [];
  const neededCount = count ?? Math.ceil(rotatedHeight / spacing) + 2;

  for (let j = -1; j < neededCount; j++) {
    const lineY0 = rotatedHeight / 2 + verticalOffset + j * spacing;
    let d = '';
    
    // Generate infinite path
    for (let x = -extendedWidth; x <= extendedWidth * 2; x += step) {
      const y = lineY0 + amplitude * Math.sin(2 * Math.PI * frequency * x + phase);
      const px = x - rotatedWidth / 2 + width / 2;
      const py = y - rotatedHeight / 2 + height / 2;
      d += x === -extendedWidth ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }

    lines.push(
      React.createElement('path', {
        key: `wave-${j}`,
        d,
        stroke: color,
        strokeWidth: thickness,
        opacity,
        fill: 'none',
      })
    );
  }

  return React.createElement('g', { transform: `rotate(${rotation} ${width / 2} ${height / 2})` }, ...lines);
}

// -------------------- Zigzag Lines --------------------
export interface ZigzagParams {
  width: number;
  height: number;
  amplitude: number;
  period: number;
  phase: number;
  samples: number;
  count?: number;
  spacing: number;
  thickness: number;
  color?: string;
  opacity?: number;
  rotation?: number;
}

export function generateZigzagPattern({
  width,
  height,
  amplitude,
  period,
  phase,
  samples,
  count,
  spacing,
  thickness,
  color = '#000',
  opacity = 1,
  rotation = 0,
}: ZigzagParams): React.ReactNode {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Use infinite bounds calculation
  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin);
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos);
  
  // Extend for infinite look
  const extendedWidth = rotatedWidth * 2;
  const step = Math.max(1, Math.floor(rotatedWidth / samples));
  const lines: React.ReactNode[] = [];
  const neededCount = count ?? Math.ceil(rotatedHeight / spacing) + 2;

  for (let j = -1; j < neededCount; j++) {
    const lineY0 = rotatedHeight / 2 + j * spacing;
    let d = '';
    
    // Generate infinite path
    for (let x = -extendedWidth; x <= extendedWidth * 2; x += step) {
      const t = ((x + phase) % period) / period;
      const y = lineY0 + (t < 0.5 ? 2 * amplitude * t - amplitude : 2 * amplitude * (1 - t) - amplitude);
      const px = x - rotatedWidth / 2 + width / 2;
      const py = y - rotatedHeight / 2 + height / 2;
      d += x === -extendedWidth ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }

    lines.push(
      React.createElement('path', {
        key: `zigzag-${j}`,
        d,
        stroke: color,
        strokeWidth: thickness,
        opacity,
        fill: 'none',
      })
    );
  }

  return React.createElement('g', { transform: `rotate(${rotation} ${width / 2} ${height / 2})` }, ...lines);
}

// -------------------- Circular Arcs --------------------
export interface ArcParams {
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  count?: number;
  spacing: number;
  samples: number;
  thickness: number;
  color?: string;
  opacity?: number;
  rotation?: number;
}

export function generateArcPattern({
  centerX,
  centerY,
  radius,
  startAngle,
  endAngle,
  count,
  spacing,
  samples,
  thickness,
  color = '#000',
  opacity = 1,
  rotation = 0,
}: ArcParams): React.ReactNode {
  const { rotatedWidth, rotatedHeight } = getRotatedBounds(centerX * 2, centerY * 2, rotation);
  const maxCount = count ?? Math.ceil((rotatedWidth + rotatedHeight) / 2 / spacing);
  const arcs: React.ReactNode[] = [];

 for (let k = 0; k < maxCount; k++) {
  const r = radius + k * spacing;

  // If full circle, use circle element instead of path
  if (Math.abs(endAngle - startAngle) >= 2 * Math.PI) {
    arcs.push(
      React.createElement('circle', {
        key: `arc-${k}`,
        cx: centerX,
        cy: centerY,
        r,
        stroke: color,
        strokeWidth: thickness,
        opacity,
        fill: 'none',
      })
    );
    continue;
  }

  // Otherwise, build arc path
  const step = (endAngle - startAngle) / samples;
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const theta = startAngle + i * step;
    const x = centerX + r * Math.cos(theta);
    const y = centerY + r * Math.sin(theta);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  arcs.push(
    React.createElement('path', {
      key: `arc-${k}`,
      d,
      stroke: color,
      strokeWidth: thickness,
      opacity,
      fill: 'none',
    })
  );
}

 

  return React.createElement('g', { transform: `rotate(${rotation} ${centerX} ${centerY})` }, ...arcs);
}

// -------------------- Flower Pattern --------------------
export interface FlowerParams {
  width: number;
  height: number;
  spacing: number;
  thickness: number;
  color?: string;
  secondaryColor?: string;
  opacity?: number;
  rotation?: number;
}

export function generateFlowerPattern({
  width,
  height,
  spacing,
  thickness,
  color = '#000',
  secondaryColor = '#666',
  opacity = 1,
  rotation = 0,
}: FlowerParams): React.ReactNode {
  const cx = width / 2;
  const cy = height / 2;
  const elements: React.ReactNode[] = [];
  
  // Use d3-shape's curve for smooth petals
  const curveLine = line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(curveCardinal.tension(0.8));
  
  // Number of petals based on spacing (larger spacing = bigger petals)
  const petalCount = 8;
  const baseRadius = Math.min(width, height) / 8;
  const petalRadius = baseRadius + (spacing / 2); // Spacing grows petals outward
  
  for (let i = 0; i < petalCount; i++) {
    const angle = (i * 2 * Math.PI) / petalCount;
    
    // Create control points for each petal
    const points: [number, number][] = [];
    
    // Center point
    points.push([cx, cy]);
    
    // Control points to create a nice curve
    const midAngle1 = angle + Math.PI/16;
    const midAngle2 = angle + Math.PI/8;
    const midRadius = petalRadius * 0.6;
    
    points.push([
      cx + midRadius * Math.cos(midAngle1), 
      cy + midRadius * Math.sin(midAngle1)
    ]);
    
    // Tip of petal
    points.push([
      cx + petalRadius * Math.cos(angle), 
      cy + petalRadius * Math.sin(angle)
    ]);
    
    // Control points on the way back
    points.push([
      cx + midRadius * Math.cos(midAngle2), 
      cy + midRadius * Math.sin(midAngle2)
    ]);
    
    // Back to center
    points.push([cx, cy]);
    
    // Generate smooth petal path
    const petalPath = curveLine(points);
    
    if (petalPath) {
      elements.push(
        React.createElement('path', {
          key: `petal-${i}`,
          d: petalPath,
          stroke: color,
          strokeWidth: thickness,
          opacity,
          fill: 'none',
          strokeLinejoin: 'round'
        })
      );
    }
  }
  
  // Add center of flower with secondary color
  elements.push(
    React.createElement('circle', {
      key: 'flower-center',
      cx,
      cy,
      r: Math.max(3, spacing / 10),
      stroke: secondaryColor,
      strokeWidth: thickness * 0.8,
      opacity,
      fill: 'none'
    })
  );

  return React.createElement('g', { transform: `rotate(${rotation} ${cx} ${cy})` }, ...elements);
}

// -------------------- Spiral --------------------
/**
 * Draws a clean Archimedean spiral.
 * @param width Canvas width
 * @param height Canvas height
 * @param spacing Controls distance between successive loops
 * @param thickness Stroke width
 * @param color Primary stroke color
 * @param opacity Stroke opacity
 * @param rotation Rotation to apply around center
 */
export interface SpiralParams {
  width: number;
  height: number;
  spacing: number;
  thickness: number;
  color?: string;
  opacity?: number;
  rotation?: number;
  secondaryColor?: string;
}

export function generateSpiralPattern({
  width,
  height,
  spacing,
  thickness,
  color = '#000',
  opacity = 1,
  rotation = 0,
}: SpiralParams): React.ReactNode {
  // Adjust center point to better fill rectangular space
  // Move center slightly toward the center of mass for better space utilization
  const cx = width / 2;
  const cy = height / 2;

  // Use distance to farthest corner for better space filling
  const cornerDistances = [
    Math.sqrt(cx * cx + cy * cy), // top-left
    Math.sqrt((width - cx) * (width - cx) + cy * cy), // top-right
    Math.sqrt(cx * cx + (height - cy) * (height - cy)), // bottom-left
    Math.sqrt((width - cx) * (width - cx) + (height - cy) * (height - cy)) // bottom-right
  ];
  const maxRadius = Math.max(...cornerDistances) * 0.85; // Fill 85% of the space to corners

  // Calculate spiral parameters based on spacing
  const spacingFactor = Math.max(0.3, Math.min(3, 50 / spacing));
  const turns = Math.max(3, 12 * spacingFactor);
  const samples = Math.max(200, 400 * spacingFactor);

  // Use d3 curve for smooth spiral
  const spiralLine = line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(curveCardinal.tension(0.1));

  // Generate points for a clean Archimedean spiral
  const spiralPoints: [number, number][] = [];
  const maxTheta = turns * 2 * Math.PI;

  // Adjust parameters to better fill the available space
  const startRadius = Math.max(1, spacing / 6); // Even smaller starting point
  const growthRate = (maxRadius - startRadius) / maxTheta;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = t * maxTheta;

    // Archimedean spiral: r = a + b * theta, ensuring it fills the space
    const r = startRadius + growthRate * theta;

    // Allow it to go slightly beyond maxRadius to ensure full coverage
    if (r > maxRadius * 1.05) break;

    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);

    spiralPoints.push([x, y]);
  }

  // Create the spiral path
  const spiralPath = spiralLine(spiralPoints);

  if (spiralPath) {
    return React.createElement('g', {
      transform: `rotate(${rotation} ${cx} ${cy})`
    },
      React.createElement('path', {
        key: 'spiral',
        d: spiralPath,
        stroke: color,
        strokeWidth: thickness,
        opacity,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      })
    );
  }

  return null;
}

// -------------------- Swirl Grid --------------------
export interface SwirlGridParams {
  width: number;
  height: number;
  spacing: number;
  thickness: number;
  color?: string;
  opacity?: number;
  rotation?: number;
}

export function generateSwirlGrid({
  width,
  height,
  spacing,
  thickness,
  color = '#000',
  opacity = 1,
  rotation = 0,
}: SwirlGridParams): React.ReactNode {
  // Create a grid of simple spiral patterns with ~10 per row
  const { rotatedWidth, rotatedHeight } = getRotatedBounds(width, height, rotation);
  const swirls: React.ReactNode[] = [];
  
  // Calculate spacing to get approximately 10 spirals per row
  const desiredColumns = 10; // Target ~10 swirls per row
  const adjustedSpacing = Math.max(spacing * 3, rotatedWidth / desiredColumns);
  
  // Put rows closer together but still with enough space
  const rowSpacing = adjustedSpacing * 0.8;
  
  // Loop positions across viewport with medium-density grid
  for (let y = rowSpacing/2; y <= rotatedHeight; y += rowSpacing) {
    // Alternate row offset for more natural pattern
    const rowOffset = (Math.floor(y / rowSpacing) % 2) * (adjustedSpacing / 2);
    
    for (let x = adjustedSpacing/2 + rowOffset; x <= rotatedWidth; x += adjustedSpacing) {
      
      // Create a simple spiral with exactly 2 turns
      const spiralPoints: [number, number][] = [];
      const turns = 2; // Exactly two turns as requested
      const samples = 24; // Fewer samples for better performance
      const spiralSize = Math.min(adjustedSpacing * 0.4, 40); // Cap the size for consistency
      
      // Generate points for a simple Archimedean spiral
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const theta = t * turns * 2 * Math.PI;
        // Simple spiral equation: r = a * theta
        const r = spiralSize * (t * 0.9); // Linear growth with theta
        
        spiralPoints.push([
          r * Math.cos(theta),
          r * Math.sin(theta)
        ]);
      }
      
      // Create the spiral path
      const spiralPath = line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(curveCardinal.tension(0.3))(spiralPoints);
      
      if (spiralPath) {
        // Position the spiral at grid point
        const tx = x - rotatedWidth / 2 + width / 2;
        const ty = y - rotatedHeight / 2 + height / 2;
        
        // Simple alternating orientation for visual interest but no randomness
        const row = Math.floor(y / adjustedSpacing);
        const col = Math.floor(x / adjustedSpacing);
        const patternRotation = ((row + col) % 2) * 180; // Either 0 or 180 degrees
        
        swirls.push(
          React.createElement('g', { 
            key: `swirl-${x}-${y}`, 
            transform: `translate(${tx} ${ty}) rotate(${patternRotation})` 
          }, 
          React.createElement('path', {
            key: 'spiral',
            d: spiralPath,
            stroke: color,
            strokeWidth: thickness,
            opacity: opacity,
            fill: 'none',
            strokeLinecap: 'round'
          })
          )
        );
      }
    }
  }
  
  // Wrap all and apply overall rotation
  return React.createElement('g', { transform: `rotate(${rotation} ${width / 2} ${height / 2})` }, ...swirls);
}
// -------------------- Dots Grid --------------------
export interface DotsParams {
  width: number;
  height: number;
  originX?: number;
  originY?: number;
  spacing: number;
  thickness: number; // Used as radius for the circles
  jitter?: number;
  gridType?: 'rect' | 'hex';
  color?: string;
  opacity?: number;
  rotation?: number;
  normalized?: boolean;
}

export function generateDotsPattern({
  width,
  height,
  originX = 0,
  originY = 0,
  spacing,
  thickness, // Used as radius for filled circles
  jitter = 0,
  gridType = 'rect',
  color = '#000',
  opacity = 1,
  rotation = 0,
  normalized = false,
}: DotsParams): React.ReactNode {
  // Validate inputs to prevent NaN values
  const validWidth = Number(width) || 400;
  const validHeight = Number(height) || 600;
  if (validWidth <= 0 || validHeight <= 0) return null;

  const dots: React.ReactNode[] = [];
  const validSpacing = Number(spacing) || 24;
  const validThickness = Number(thickness) || 4;
  const validOpacity = Number(opacity) || 1;
  const validRotation = Number(rotation) || 0;
  const validOriginX = Number(originX) || 0;
  const validOriginY = Number(originY) || 0;
  const validJitter = Number(jitter) || 0;
  
  // Calculate dot radius based on thickness parameter with proper validation
  // Use thickness directly as radius for more responsive control
  const dotRadius = Math.max(1, validThickness);
  
  // Ensure we have a valid radius (fallback to thickness if calculation fails)
  const actualRadius = Number.isFinite(dotRadius) ? dotRadius : Math.max(1, validThickness || 2);
  
  // Use the spacing directly, but ensure minimum spacing between dots to prevent overlap
  // When dots get bigger (higher thickness), we need more space between them
  const minSpacing = actualRadius * 2.5; // Minimum space to prevent overlap
  const adjustedSpacing = Math.max(validSpacing, minSpacing);
  
  // Calculate number of dots in each direction with validation
  const cols = Math.max(1, Math.floor(validWidth / adjustedSpacing) + 1);
  const rows = Math.max(1, Math.floor(validHeight / adjustedSpacing) + 1);
  
  // Center the grid
  const startX = (validWidth - (cols - 1) * adjustedSpacing) / 2 + validOriginX;
  const startY = (validHeight - (rows - 1) * adjustedSpacing) / 2 + validOriginY;
  
  // Validate startX and startY
  const validStartX = Number.isFinite(startX) ? startX : 0;
  const validStartY = Number.isFinite(startY) ? startY : 0;
  
  // Generate dots in a simple grid pattern
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = validStartX + col * adjustedSpacing;
      let y = validStartY + row * adjustedSpacing;
      
      // Add hexagonal offset for hex grid
      if (gridType === 'hex' && row % 2 === 1) {
        x += adjustedSpacing / 2;
      }
      
      // Add jitter if requested
      if (validJitter > 0) {
        x += (Math.random() - 0.5) * validJitter * adjustedSpacing;
        y += (Math.random() - 0.5) * validJitter * adjustedSpacing;
      }
      
      // Validate final coordinates
      const finalX = Number.isFinite(x) ? x : col * 20;
      const finalY = Number.isFinite(y) ? y : row * 20;
      
      // Only add dots that are within bounds
      if (finalX >= -actualRadius && finalX <= validWidth + actualRadius && 
          finalY >= -actualRadius && finalY <= validHeight + actualRadius) {
        if (normalized) {
          const cx = finalX / validWidth;
          const cy = finalY / validHeight;
          const r = actualRadius / Math.min(validWidth, validHeight);
          dots.push(
            React.createElement('circle', {
              key: `dot-${row}-${col}`,
              cx: cx,
              cy: cy,
              r: r,
              fill: color || '#000000',
              opacity: validOpacity,
            })
          );
        } else {
          dots.push(
            React.createElement('circle', {
              key: `dot-${row}-${col}`,
              cx: finalX,
              cy: finalY,
              r: actualRadius, // Guaranteed to be a valid number
              fill: color || '#000000',
              opacity: validOpacity,
            })
          );
        }
      }
    }
  }
  
  // Fallback: if no dots were generated, create a simple centered pattern
  if (dots.length === 0) {
    console.warn('No dots generated, creating fallback pattern');
    // Create a minimal 3x3 grid in the center as fallback
    const centerX = validWidth / 2;
    const centerY = validHeight / 2;
    const fallbackSpacing = Math.max(actualRadius * 3, validSpacing / 2);
    const fallbackRadius = actualRadius; // Use the same radius as calculated above
    
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const fallbackX = centerX + i * fallbackSpacing;
        const fallbackY = centerY + j * fallbackSpacing;
        
        // Validate fallback coordinates
        if (Number.isFinite(fallbackX) && Number.isFinite(fallbackY) && Number.isFinite(fallbackRadius)) {
          if (normalized) {
            const cx = fallbackX / validWidth;
            const cy = fallbackY / validHeight;
            const r = fallbackRadius / Math.min(validWidth, validHeight);
            dots.push(
              React.createElement('circle', {
                key: `fallback-dot-${i}-${j}`,
                cx: cx,
                cy: cy,
                r: r,
                fill: color || '#000000',
                opacity: validOpacity,
              })
            );
          } else {
            dots.push(
              React.createElement('circle', {
                key: `fallback-dot-${i}-${j}`,
                cx: fallbackX,
                cy: fallbackY,
                r: fallbackRadius,
                fill: color || '#000000',
                opacity: validOpacity,
              })
            );
          }
        }
      }
    }
  }
  
  return React.createElement('g', { 
    transform: normalized ? `rotate(${validRotation} 0.5 0.5)` : `rotate(${validRotation} ${validWidth / 2} ${validHeight / 2})` 
  }, ...dots);
}

// -------------------- Floral/Vine Pattern --------------------
export interface FloralParams {
  width: number;
  height: number;
  spacing: number;
  thickness: number;
  color?: string;
  secondaryColor?: string;
  opacity?: number;
  rotation?: number;
}

export function generateFloralPattern({
  width,
  height,
  spacing,
  thickness,
  color = '#000',
  secondaryColor = '#666',
  opacity = 1,
  rotation = 0,
}: FloralParams): React.ReactNode {
  const elements: React.ReactNode[] = [];
  // simple color helpers (moved here so both main loop and fallback can use them)
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };
  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const shade = (hex: string, pct: number) => {
    try {
      const [r, g, b] = hexToRgb(hex);
      const nr = Math.max(0, Math.min(255, Math.round(r * (1 + pct))));
      const ng = Math.max(0, Math.min(255, Math.round(g * (1 + pct))));
      const nb = Math.max(0, Math.min(255, Math.round(b * (1 + pct))));
      return rgbToHex(nr, ng, nb);
    } catch (e) {
      return hex;
    }
  };
  // Use the same rotated-bounds approach for consistent behavior with swirl grid
  // Expand the rotated bounds slightly so the generated block is larger and fills corners
  const bounds = getRotatedBounds(width, height, rotation);
  const marginFactor = 0.18; // 18% extra coverage around rotated bounds
  const rotatedWidth = bounds.rotatedWidth * (1 + marginFactor);
  const rotatedHeight = bounds.rotatedHeight * (1 + marginFactor);

  // Map user spacing (0..600) to 0..1
  const maxParam = 600;
  const p = Math.max(0, Math.min(spacing, maxParam)) / maxParam;

  // Make desired columns responsive: more columns (denser) when user spacing is small
  const minColumns = 6;
  const maxColumns = 36; // allow up to 36 columns for higher density
  const desiredColumns = Math.max(1, Math.round(minColumns + (1 - p) * (maxColumns - minColumns)));

  // Base cell derived from rotated width and desired columns
  const defaultCell = Math.max(6, rotatedWidth / Math.max(1, desiredColumns));

  // Spacing multipliers (user can push spacing up to make fewer per row)
  const multiplierMin = 0.45;
  const multiplierMax = 2.8;
  let adjustedSpacing = defaultCell * (multiplierMin + p * (multiplierMax - multiplierMin));

  // Thickness should both increase flower size and increase spacing to avoid overlap
  // Make thickness more influential but clamped to a reasonable range
  const thicknessInfluence = 1 + Math.max(0, thickness - 6) * 0.08; // e.g. thickness 16 => ~1.8
  adjustedSpacing *= thicknessInfluence;

  // Flower size bounds
  const minFlowerSize = 5;
  const maxFlowerSize = Math.min(Math.max(18, defaultCell * 0.9), Math.min(width, height) * 0.38);

  // Preliminary flower size derived from spacing and thickness
  let flowerSize = Math.max(minFlowerSize, Math.min(adjustedSpacing * 0.36, maxFlowerSize));

  // Enforce minimum spacing relative to flowerSize to avoid overlap
  const overlapFactor = 2.0; // spacing must be >= flowerSize * overlapFactor
  adjustedSpacing = Math.max(adjustedSpacing, flowerSize * overlapFactor);

  // Prevent pathological cases (spacing=0 and thickness=0) from creating huge grids.
  // Enforce a safe minimum spacing and a hard cap on total SVG elements.
  const safeMinSpacing = Math.max(10, Math.min(width, height) / 24); // reasonable minimum cell size
  adjustedSpacing = Math.max(adjustedSpacing, safeMinSpacing);

  // Cap rules to avoid freezing the UI
  const MAX_CELLS = 44; // relax per-dimension cap to allow denser layouts
  const MAX_ELEMENTS = 800; // increase total cap so more flowers can be shown while still being safe

  // Estimate required elements and increase spacing until the estimate is below MAX_ELEMENTS
  let cols = Math.max(1, Math.min(MAX_CELLS, Math.floor(rotatedWidth / adjustedSpacing) + 1));
  let rows = Math.max(1, Math.min(MAX_CELLS, Math.floor(rotatedHeight / adjustedSpacing) + 1));

  // Average petals per flower estimate (will be clamped later)
  const avgPetalsGuess = 3.5; // assume fewer petals so we allow more centers
  let estimated = cols * rows * (1 + avgPetalsGuess);
  let safetyIter = 0;
  while (estimated > MAX_ELEMENTS && safetyIter < 8) {
    // increase spacing to reduce density but be conservative so we don't kill the pattern
    adjustedSpacing *= 1.22;
    adjustedSpacing = Math.max(adjustedSpacing, safeMinSpacing);
    cols = Math.max(1, Math.min(MAX_CELLS, Math.floor(rotatedWidth / adjustedSpacing) + 1));
    rows = Math.max(1, Math.min(MAX_CELLS, Math.floor(rotatedHeight / adjustedSpacing) + 1));
    estimated = cols * rows * (1 + avgPetalsGuess);
    safetyIter++;
  }

  // Recompute final spacing to evenly distribute across rotated bounds
  const finalSpacingX = rotatedWidth / cols;
  const finalSpacingY = rotatedHeight / rows;

  // Ensure final spacings respect minimum spacing and thickness influence
  const minSpacing = flowerSize * overlapFactor;
  const spacingX = Math.max(finalSpacingX, minSpacing);
  const spacingY = Math.max(finalSpacingY, minSpacing);

  // Recalculate flowerSize relative to final spacing (keeps flowers proportional and safe)
  flowerSize = Math.max(minFlowerSize, Math.min(flowerSize, spacingX * 0.44));

  // Slightly reduce jitter and bound it as a small fraction of spacing so it can't cause overlap
  const jitterCap = Math.min(8, spacingX * 0.07);

  // Loop using the derived spacing and ensure full-area coverage
  const rowSpacing = spacingY;
  for (let row = 0; row < rows; row++) {
    const y = row * rowSpacing + rowSpacing / 2;
    const rowOffset = (row % 2) * (spacingX / 2);

    for (let col = 0; col < cols; col++) {
      const x = col * spacingX + spacingX / 2 + rowOffset;

      // Map rotated grid position back into canvas coordinates
      const tx = x - rotatedWidth / 2 + width / 2;
      const ty = y - rotatedHeight / 2 + height / 2;

      // More realistic flower: two rings of petals (outer then inner) and a filled center
      const seed = (row * 73856093) ^ (col * 19349663);
      const rand = (n: number) => {
        let x = (seed + n) | 0;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return Math.abs(x) / 0x7fffffff;
      };

      // Bounded jitter for organic look (using seeded random for consistency)
      const jitterX = (rand(6) - 0.5) * jitterCap;
      const jitterY = (rand(7) - 0.5) * jitterCap;

      const centerX = tx + jitterX;
      const centerY = ty + jitterY;

      // Petal counts for rings
      const outerCount = 6 + Math.floor(rand(1) * 3); // 6..8
      const innerCount = Math.max(4, Math.floor(outerCount * (0.6 + rand(2) * 0.3))); // smaller inner ring

      // Sizes
      const outerLength = flowerSize * (0.9 + Math.min(0.6, thickness / 28));
      const innerLength = outerLength * (0.52 + rand(3) * 0.12);
      const outerWidth = flowerSize * (1.0 + rand(4) * 0.6);
      const innerWidth = flowerSize * (0.6 + rand(5) * 0.4);

      // simple color helpers
      const hexToRgb = (hex: string) => {
        const h = hex.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r,g,b];
      };
      const rgbToHex = (r:number,g:number,b:number) => '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
      const shade = (hex: string, pct: number) => {
        try{
          const [r,g,b] = hexToRgb(hex);
          const nr = Math.max(0, Math.min(255, Math.round(r * (1 + pct))));
          const ng = Math.max(0, Math.min(255, Math.round(g * (1 + pct))));
          const nb = Math.max(0, Math.min(255, Math.round(b * (1 + pct))));
          return rgbToHex(nr,ng,nb);
        } catch(e){
          return hex;
        }
      };

      const petalStroke = shade(color, -0.25);
      const petalFillColor = color;
      const petalInnerFill = secondaryColor || shade(color, 0.25);

      // Replace abstract Bezier petals with two concentric rings of filled, rounded ellipses
      // Helper: create a Lissajous-perturbed ellipse path
      // We perturb a base ellipse (rx,ry) by adding small sinusoidal offsets controlled by
      // amplitudes A/B and frequencies alpha/beta. Relationship: alpha = 2*pi*freqHz
      const createLissajousPetalPath = (
        cx0: number,
        cy0: number,
        ang0: number,
        rx0: number,
        ry0: number,
        A: number,
        freqAlphaHz: number,
        B: number,
        freqBetaHz: number,
        samples = 34
      ) => {
        const alpha = 2 * Math.PI * Math.max(0, freqAlphaHz);
        const beta = 2 * Math.PI * Math.max(0, freqBetaHz);
        let d = '';

        // small deterministic phase offsets for per-petal variety
        const ph1 = rand(71) * Math.PI * 2;
        const ph2 = rand(72) * Math.PI * 2;

        for (let s = 0; s <= samples; s++) {
          const t = (s / samples) * 2 * Math.PI;

          // base ellipse coords with mild harmonic modulation so shape isn't perfectly circular
          let ex = rx0 * Math.cos(t) * (1 + 0.22 * Math.sin(2 * t + ph1));
          let ey = ry0 * Math.sin(t) * (1 + 0.16 * Math.cos(3 * t + ph2));

          // radial bias to elongate the forward-facing tip (when cos(t) is positive)
          const tipBias = 1 + 0.9 * Math.pow(Math.max(0, Math.cos(t)), 8);
          ex *= 1 + 0.35 * (tipBias - 1);
          ey *= 1 + 0.18 * (tipBias - 1);

          // Lissajous perturbations
          ex += A * Math.sin(alpha * t + 0.3 + rand(73));
          ey += B * Math.cos(beta * t + 0.7 + rand(74));

          // subtle skew to avoid perfect symmetry
          const skew = 0.14 * Math.sin(t * 1.3 + rand(75));
          ex += rx0 * skew;

          // rotate by ang0 and translate
          const rx = ex * Math.cos(ang0) - ey * Math.sin(ang0) + cx0;
          const ry = ex * Math.sin(ang0) + ey * Math.cos(ang0) + cy0;

          // Add points with a smooth polyline (samples high enough to appear smooth)
          d += s === 0 ? `M ${rx} ${ry}` : ` L ${rx} ${ry}`;
        }

        d += ' Z';
        return d;
      };

      // create per-flower radial gradients for depth
      const outerGradId = `flower-grad-outer-${row}-${col}`;
      const innerGradId = `flower-grad-inner-${row}-${col}`;
      elements.push(
        React.createElement('defs', { key: `defs-${row}-${col}` },
          React.createElement('radialGradient', { id: outerGradId, cx: '50%', cy: '45%', r: '60%' },
            React.createElement('stop', { key: `s1-${row}-${col}`, offset: '0%', stopColor: shade(petalFillColor, 0.28), stopOpacity: 1 }),
            React.createElement('stop', { key: `s2-${row}-${col}`, offset: '65%', stopColor: petalFillColor, stopOpacity: 0.96 }),
            React.createElement('stop', { key: `s3-${row}-${col}`, offset: '100%', stopColor: shade(petalFillColor, -0.18), stopOpacity: 1 })
          ),
          React.createElement('radialGradient', { id: innerGradId, cx: '50%', cy: '50%', r: '60%' },
            React.createElement('stop', { key: `is1-${row}-${col}`, offset: '0%', stopColor: shade(petalInnerFill, 0.28), stopOpacity: 1 }),
            React.createElement('stop', { key: `is2-${row}-${col}`, offset: '68%', stopColor: petalInnerFill, stopOpacity: 0.94 }),
            React.createElement('stop', { key: `is3-${row}-${col}`, offset: '100%', stopColor: shade(petalInnerFill, -0.12), stopOpacity: 1 })
          )
        )
      );

      // Outer ring: use perturbed ellipse petals for more organic shapes
      for (let i = 0; i < outerCount; i++) {
        const ang = (i / outerCount) * Math.PI * 2 + rand(i + 10) * 0.06;
        const petalLen = outerLength * (0.9 + rand(i + 11) * 0.24);
        const petalWid = outerWidth * (0.7 + rand(i + 12) * 0.45);

        const petalCX = centerX + Math.cos(ang) * (petalLen * 0.6);
        const petalCY = centerY + Math.sin(ang) * (petalLen * 0.6);

        const rx = Math.max(1, petalWid * 0.46);
        const ry = Math.max(1, petalLen * 0.7);

        // Perturbation amplitudes and frequencies scaled to size so effect is visible but not extreme
        const A = Math.min(rx * 0.42, 8) * (0.6 + rand(i + 50) * 0.8);
        const B = Math.min(ry * 0.32, 6) * (0.5 + rand(i + 51) * 0.9);
        const freqAlphaHz = 0.9 + rand(i + 52) * 1.6; // 0.9..2.5 Hz
        const freqBetaHz = 0.8 + rand(i + 53) * 1.4; // 0.8..2.2 Hz

        const d = createLissajousPetalPath(petalCX, petalCY, ang, rx, ry, A, freqAlphaHz, B, freqBetaHz, 36);

        elements.push(
          React.createElement('path', {
            key: `flower-outer-${row}-${col}-${i}`,
            d,
            fill: `url(#${outerGradId})`,
            stroke: '#000',
            strokeWidth: Math.max(0.6, Math.min(2, thickness * 0.12)),
            strokeOpacity: 0.96 * opacity,
            opacity: Math.min(0.98, 0.72 + thickness * 0.009 + rand(i + 30) * 0.2) * opacity,
          })
        );
      }

      // Inner ring: slightly tighter, higher-frequency perturbations for detail
      for (let i = 0; i < innerCount; i++) {
        const ang = (i / innerCount) * Math.PI * 2 + rand(i + 20) * 0.06 + 0.35;
        const petalLen = innerLength * (0.78 + rand(i + 21) * 0.2);
        const petalWid = innerWidth * (0.65 + rand(i + 22) * 0.36);

        const petalCX = centerX + Math.cos(ang) * (petalLen * 0.45);
        const petalCY = centerY + Math.sin(ang) * (petalLen * 0.45);

        const rx = Math.max(1, petalWid * 0.42);
        const ry = Math.max(1, petalLen * 0.6);

        const A = Math.min(rx * 0.36, 6) * (0.5 + rand(i + 60) * 0.9);
        const B = Math.min(ry * 0.28, 5) * (0.45 + rand(i + 61) * 0.95);
        const freqAlphaHz = 1.4 + rand(i + 62) * 2.2; // higher frequency for inner details
        const freqBetaHz = 1.0 + rand(i + 63) * 1.8;

        const d = createLissajousPetalPath(petalCX, petalCY, ang, rx, ry, A, freqAlphaHz, B, freqBetaHz, 32);

        elements.push(
          React.createElement('path', {
            key: `flower-inner-${row}-${col}-${i}`,
            d,
            fill: `url(#${innerGradId})`,
            stroke: '#000',
            strokeWidth: Math.max(0.5, Math.min(1.6, thickness * 0.1)),
            strokeOpacity: 0.9 * opacity,
            opacity: Math.min(0.96, 0.62 + thickness * 0.006 + rand(i + 40) * 0.2) * opacity,
          })
        );
      }

      // Center disk on top (filled) — use the primary color so centers aren't gray
      const centerFill = color || '#FFD54F';
      elements.push(
        React.createElement('circle', {
          key: `flower-core-${row}-${col}`,
          cx: centerX,
          cy: centerY,
          r: Math.max(2, flowerSize * 0.22),
          fill: centerFill,
          stroke: shade(centerFill, -0.25),
          strokeWidth: Math.max(0.6, Math.min(6, thickness * 0.6)),
          opacity,
        })
      );
    }
  }

  // Guarantee something is drawn: if parameter combos filtered out all centers, draw a small 3x3 fallback
  if (elements.length === 0) {
    const fallbackSize = Math.max(minFlowerSize, Math.min(24, Math.min(width, height) * 0.12));
    const centerX = width / 2;
    const centerY = height / 2;
    const fallbackSpacing = fallbackSize * 2.6;
    // create 3x3 fallback flowers using the same style as the main flowers
    for (let rx = -1; rx <= 1; rx++) {
      for (let ry = -1; ry <= 1; ry++) {
        const fx = centerX + rx * fallbackSpacing;
        const fy = centerY + ry * fallbackSpacing;

        // per-fallback gradients
        const outerGradId = `fallback-grad-outer-${rx + 1}-${ry + 1}`;
        const innerGradId = `fallback-grad-inner-${rx + 1}-${ry + 1}`;
        elements.push(
          React.createElement('defs', { key: `fallback-defs-${rx}-${ry}` },
            React.createElement('radialGradient', { id: outerGradId, cx: '50%', cy: '45%', r: '60%' },
              React.createElement('stop', { key: `fs1-${rx}-${ry}`, offset: '0%', stopColor: shade(color, 0.28), stopOpacity: 1 }),
              React.createElement('stop', { key: `fs2-${rx}-${ry}`, offset: '65%', stopColor: color, stopOpacity: 0.96 }),
              React.createElement('stop', { key: `fs3-${rx}-${ry}`, offset: '100%', stopColor: shade(color, -0.18), stopOpacity: 1 })
            ),
            React.createElement('radialGradient', { id: innerGradId, cx: '50%', cy: '50%', r: '60%' },
              React.createElement('stop', { key: `fis1-${rx}-${ry}`, offset: '0%', stopColor: shade(secondaryColor || color, 0.28), stopOpacity: 1 }),
              React.createElement('stop', { key: `fis2-${rx}-${ry}`, offset: '68%', stopColor: secondaryColor || color, stopOpacity: 0.94 }),
              React.createElement('stop', { key: `fis3-${rx}-${ry}`, offset: '100%', stopColor: shade(secondaryColor || color, -0.12), stopOpacity: 1 })
            )
          )
        );

        // small helper to create a perturbed petal path (fallback-local)
        const createFallbackPetal = (cx0: number, cy0: number, ang0: number, rx0: number, ry0: number, A: number, B: number, samples = 20) => {
          let d = '';
          for (let s = 0; s <= samples; s++) {
            const t = (s / samples) * 2 * Math.PI;
            let ex = rx0 * Math.cos(t) * (1 + 0.16 * Math.sin(2 * t));
            let ey = ry0 * Math.sin(t) * (1 + 0.12 * Math.cos(3 * t));
            ex += A * Math.sin(2.2 * t + 0.2);
            ey += B * Math.cos(1.9 * t + 0.4);
            const rxp = ex * Math.cos(ang0) - ey * Math.sin(ang0) + cx0;
            const ryp = ex * Math.sin(ang0) + ey * Math.cos(ang0) + cy0;
            d += s === 0 ? `M ${rxp} ${ryp}` : ` L ${rxp} ${ryp}`;
          }
          d += ' Z';
          return d;
        };

        const petalCount = 6;
        const outerLen = fallbackSize * 0.9;
        const innerLen = fallbackSize * 0.52;
        const outerWid = fallbackSize * 0.95;
        const innerWid = fallbackSize * 0.56;

        for (let pidx = 0; pidx < petalCount; pidx++) {
          const angle = (pidx * 2 * Math.PI) / petalCount + (pidx % 2 === 0 ? 0.02 : -0.02);
          const petalCX = fx + Math.cos(angle) * (outerLen * 0.55);
          const petalCY = fy + Math.sin(angle) * (outerLen * 0.55);
          const rxp = Math.max(1, outerWid * 0.46);
          const ryp = Math.max(1, outerLen * 0.68);
          const A = Math.min(rxp * 0.4, 6);
          const B = Math.min(ryp * 0.3, 5);
          const d = createFallbackPetal(petalCX, petalCY, angle, rxp, ryp, A, B, 20);

          elements.push(
            React.createElement('path', {
              key: `fallback-outer-${rx}-${ry}-${pidx}`,
              d,
              fill: `url(#${outerGradId})`,
              stroke: '#000',
              strokeWidth: Math.max(0.6, Math.min(1.6, thickness * 0.12)),
              opacity: 0.9 * opacity,
            })
          );
        }

        // inner ring
        for (let pidx = 0; pidx < Math.max(4, Math.floor(petalCount * 0.7)); pidx++) {
          const angle = (pidx * 2 * Math.PI) / Math.max(4, Math.floor(petalCount * 0.7)) + 0.3;
          const petalCX = fx + Math.cos(angle) * (innerLen * 0.45);
          const petalCY = fy + Math.sin(angle) * (innerLen * 0.45);
          const rxp = Math.max(1, innerWid * 0.42);
          const ryp = Math.max(1, innerLen * 0.62);
          const A = Math.min(rxp * 0.34, 5);
          const B = Math.min(ryp * 0.26, 4.5);
          const d = createFallbackPetal(petalCX, petalCY, angle, rxp, ryp, A, B, 18);

          elements.push(
            React.createElement('path', {
              key: `fallback-inner-${rx}-${ry}-${pidx}`,
              d,
              fill: `url(#${innerGradId})`,
              stroke: '#000',
              strokeWidth: Math.max(0.5, Math.min(1.2, thickness * 0.09)),
              opacity: 0.82 * opacity,
            })
          );
        }

        // center disk
        elements.push(
          React.createElement('circle', {
            key: `fallback-center-${rx}-${ry}`,
            cx: fx,
            cy: fy,
            r: Math.max(2, fallbackSize * 0.22),
            fill: color,
            stroke: shade(color, -0.25),
            strokeWidth: Math.max(0.6, Math.min(6, thickness * 0.6)),
            opacity,
          })
        );
      }
    }
  }

  return React.createElement('g', { transform: `rotate(${rotation} ${width / 2} ${height / 2})` }, ...elements);
}