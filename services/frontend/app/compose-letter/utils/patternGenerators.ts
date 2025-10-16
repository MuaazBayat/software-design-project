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
 * Draws an enhanced Archimedean spiral with decorative elements.
 * @param width Canvas width
 * @param height Canvas height
 * @param spacing Controls distance between successive loops
 * @param thickness Stroke width
 * @param color Primary stroke color
 * @param secondaryColor Optional secondary color for complementary spiral
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
  secondaryColor,
}: SpiralParams): React.ReactNode {
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2;
  
  // Adjust spiral characteristics based on spacing
  // Spacing affects both turns and growth rate
  const spacingFactor = Math.max(0.5, Math.min(2, 60 / spacing));
  const turns = Math.max(2, 8 * spacingFactor); // More responsive to spacing changes
  const growthFactor = Math.max(0.4, 0.6 / spacingFactor);
  const samples = Math.max(500, 700 * spacingFactor); // More points for smoother curves
  const elements: React.ReactNode[] = [];

  // Use d3 curve for smoother spiral - adjust tension
  const spiralLine = line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(curveCardinal.tension(0.2)); // Lower tension for smoother curves
  
  // Generate points for the main spiral with improved formula
  const spiralPoints: [number, number][] = [];
  const step = (turns * 2 * Math.PI) / samples;
  
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples;
    const theta = i * step;
    
    // Enhanced formula with non-linear growth
    const r = growthFactor * Math.pow(theta, 0.85) * (maxRadius / Math.pow(turns * 2 * Math.PI, 0.85));
    
    // Add subtle variation for more organic feel
    const variation = Math.sin(theta * 5) * (thickness / 4);
    
    const x = cx + r * Math.cos(theta) + variation * Math.cos(theta + Math.PI/2);
    const y = cy + r * Math.sin(theta) + variation * Math.sin(theta + Math.PI/2);
    
    spiralPoints.push([x, y]);
  }

  // Create the spiral path
  const spiralPath = spiralLine(spiralPoints);
  
  if (spiralPath) {
    elements.push(
      React.createElement('path', {
        key: 'main-spiral',
        d: spiralPath,
        stroke: color,
        strokeWidth: thickness,
        opacity,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      })
    );

    // Add secondary spiral if color provided
    if (secondaryColor) {
      // Create offset points for secondary spiral with different characteristics
      const secondaryPoints: [number, number][] = [];
      
      // Create a complementary spiral with different characteristics
      const secondaryTurns = turns * 0.8; // Slightly fewer turns
      const secondaryGrowth = growthFactor * 1.1; // Slightly different growth rate
      const secondaryStep = (secondaryTurns * 2 * Math.PI) / samples;
      
      for (let i = 0; i <= samples; i++) {
        const progress = i / samples;
        const theta = i * secondaryStep + Math.PI; // 180° phase shift
        
        // Slightly different formula for interesting contrast
        const r = maxRadius * 0.85 * secondaryGrowth * Math.pow(theta, 0.85) / Math.pow(secondaryTurns * 2 * Math.PI, 0.85);
        
        // Different variation pattern
        const variation = Math.sin(theta * 7) * (thickness / 5);
        
        const x = cx + r * Math.cos(theta) + variation * Math.cos(theta + Math.PI/2);
        const y = cy + r * Math.sin(theta) + variation * Math.sin(theta + Math.PI/2);
        
        secondaryPoints.push([x, y]);
      }

      const secondarySpiralPath = spiralLine(secondaryPoints);
      if (secondarySpiralPath) {
        elements.push(
          React.createElement('path', {
            key: 'secondary-spiral',
            d: secondarySpiralPath,
            stroke: secondaryColor,
            strokeWidth: thickness * 0.8,
            fill: 'none',
            opacity: opacity * 0.8,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })
        );
      }
      
      // Add small decorative elements at regular intervals along main spiral
      if (spacing < 30) { // Only add details when spacing is smaller
        for (let i = 0; i < spiralPoints.length; i += Math.max(5, Math.floor(samples / 20))) {
          const [x, y] = spiralPoints[i];
          
          // Small circle at point
          elements.push(
            React.createElement('circle', {
              key: `spiral-dot-${i}`,
              cx: x,
              cy: y,
              r: thickness * 0.7,
              fill: secondaryColor,
              opacity: opacity * 0.7
            })
          );
        }
      }
    } else {
      // If no secondary spiral, add small decorative elements to the main spiral
      for (let i = 10; i < spiralPoints.length; i += Math.max(10, Math.floor(samples / 15))) {
        const [x, y] = spiralPoints[i];
        const prevPoint = spiralPoints[Math.max(0, i-3)];
        
        // Calculate angle for consistent orientation
        const angle = Math.atan2(y - prevPoint[1], x - prevPoint[0]);
        const perpAngle = angle + Math.PI/2;
        
        // Small perpendicular line
        const lineLength = thickness * 2;
        const x1 = x + Math.cos(perpAngle) * lineLength;
        const y1 = y + Math.sin(perpAngle) * lineLength;
        const x2 = x - Math.cos(perpAngle) * lineLength;
        const y2 = y - Math.sin(perpAngle) * lineLength;
        
        elements.push(
          React.createElement('line', {
            key: `spiral-tick-${i}`,
            x1,
            y1,
            x2,
            y2,
            stroke: color,
            strokeWidth: thickness * 0.5,
            opacity: opacity * 0.7,
            strokeLinecap: 'round'
          })
        );
      }
    }
  }

  return React.createElement('g', { transform: `rotate(${rotation} ${cx} ${cy})` }, ...elements);
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
  const cx = width / 2;
  const cy = height / 2;
  const elements: React.ReactNode[] = [];

  // Create line generators for smooth curves with different tensions
  const vineLine = line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(curveCardinal.tension(0.5)); // Smoother curve for main vines

  // Create a more organic curve generator for leaves
  const leafLine = line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(curveBundle.beta(0.7)); // More compact curve for leaves

  // Adjust pattern complexity based on spacing
  const vineCount = Math.max(2, Math.min(7, Math.floor(120 / spacing) + 1));
  const vineLength = Math.min(width, height) * (0.35 + spacing/300); // Longer with more spacing

  // Generate main vine structure
  for (let v = 0; v < vineCount; v++) {
    const startAngle = (v * 2 * Math.PI) / vineCount;
    
    // Create main vine path points with enhanced variation
    const points: [number, number][] = [];
    const segments = Math.max(12, Math.min(24, Math.floor(60 / spacing) * 3)); // More detail with smaller spacing

    // Add center point
    points.push([cx, cy]);

    for (let s = 1; s <= segments; s++) {
      const progress = s / segments;
      // Create more natural spiral by varying the curl factor
      const curl = 1.5 + (spacing / 200); // Spacing affects curl
      const angle = startAngle + progress * Math.PI * curl;
      
      // Non-linear growth for more natural look
      const radius = vineLength * Math.pow(progress, 0.9);
      
      // Multi-layered variation for more organic feel
      const variation1 = Math.sin(progress * Math.PI * 4) * (spacing / 15);
      const variation2 = Math.cos(progress * Math.PI * 7) * (spacing / 30);
      
      points.push([
        cx + radius * Math.cos(angle) + variation1 * Math.cos(angle + Math.PI/2) + variation2,
        cy + radius * Math.sin(angle) + variation1 * Math.sin(angle + Math.PI/2) + variation2
      ]);
    }

    // Generate vine path
    const vinePath = vineLine(points);

    if (vinePath) {
      // Draw the main vine
      elements.push(
        React.createElement('path', {
          key: `vine-${v}`,
          d: vinePath,
          stroke: color,
          strokeWidth: thickness,
          opacity,
          fill: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })
      );

      // Add decorative elements along the vine
      const leafInterval = Math.max(2, Math.ceil(segments / (spacing < 20 ? 8 : 6))); // Fewer leaves with more spacing
      
      for (let l = leafInterval; l < points.length - 2; l += leafInterval) {
        const [x, y] = points[l];
        const prevPoint = points[l - 1];
        const nextPoint = points[l + 1];

        // Calculate direction for leaf orientation
        const dx = nextPoint[0] - prevPoint[0];
        const dy = nextPoint[1] - prevPoint[1];
        const angle = Math.atan2(dy, dx);

        // Leaf size based on spacing
        const leafSize = Math.max(4, spacing / 6);

        // Create complex leaf shape with multiple control points
        const leafPoints: [number, number][] = [];
        
        // Base of leaf
        leafPoints.push([0, 0]);
        
        // First side of leaf
        leafPoints.push([leafSize * 0.3, -leafSize * 0.3]);
        leafPoints.push([leafSize * 0.7, -leafSize * 0.4]);
        leafPoints.push([leafSize, -leafSize * 0.2]);
        
        // Tip of leaf
        leafPoints.push([leafSize * 1.2, 0]);
        
        // Second side of leaf
        leafPoints.push([leafSize, leafSize * 0.2]);
        leafPoints.push([leafSize * 0.7, leafSize * 0.4]);
        leafPoints.push([leafSize * 0.3, leafSize * 0.3]);
        
        // Back to base
        leafPoints.push([0, 0]);
        
        const leafPath = leafLine(leafPoints);
        
        if (leafPath) {
          elements.push(
            React.createElement('path', {
              key: `leaf-${v}-${l}`,
              d: leafPath,
              stroke: secondaryColor,
              strokeWidth: thickness * 0.7,
              opacity: opacity * 0.8,
              fill: 'none',
              transform: `translate(${x} ${y}) rotate(${angle * 180 / Math.PI})`
            })
          );
        }
        
        // Add flower buds at some leaf junctions for visual interest
        if (l % (leafInterval * 2) === 0) {
          // Add a small flower bud
          const budSize = leafSize / 3;
          
          // Create small petals around center
          for (let p = 0; p < 5; p++) {
            const petalAngle = (p * 2 * Math.PI) / 5;
            elements.push(
              React.createElement('circle', {
                key: `bud-petal-${v}-${l}-${p}`,
                cx: x + budSize * Math.cos(petalAngle),
                cy: y + budSize * Math.sin(petalAngle),
                r: budSize / 2,
                stroke: color,
                strokeWidth: thickness * 0.6,
                opacity: opacity * 0.9,
                fill: 'none'
              })
            );
          }
          
          // Add center of bud
          elements.push(
            React.createElement('circle', {
              key: `bud-center-${v}-${l}`,
              cx: x,
              cy: y,
              r: budSize / 3,
              stroke: secondaryColor,
              strokeWidth: thickness * 0.6,
              opacity: opacity * 0.9,
              fill: 'none'
            })
          );
        }
      }
    }
  }

  return React.createElement('g', { transform: `rotate(${rotation} ${cx} ${cy})` }, ...elements);
}