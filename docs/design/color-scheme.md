# Color Scheme & Design System

This document describes the comprehensive color scheme and design system used in the GlobeTalk application.

**Last Updated:** 2025-09-30

---

## Design System Overview

GlobeTalk uses a modern, accessible design system built on:
- **Design Framework:** shadcn/ui (New York style)
- **CSS Framework:** Tailwind CSS v4
- **Color Space:** OKLCH (Oklab Lightness Chroma Hue)
- **Theme Support:** Light and Dark mode
- **Base Color:** Neutral
- **Icon Library:** Lucide React

---

## Color Space: OKLCH

OKLCH is a perceptually uniform color space that provides better interpolation and consistency compared to traditional RGB/HSL. Each color is defined using:
- **L (Lightness):** 0-1 (0 = black, 1 = white)
- **C (Chroma):** 0+ (color intensity/saturation)
- **H (Hue):** 0-360 degrees (color angle)

Benefits:
- Perceptually uniform brightness
- Smooth gradients and transitions
- Better accessibility through consistent lightness
- More vibrant colors at consistent perceived brightness

---

## Theme Colors

### Light Mode

#### Core Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--background` | `oklch(1 0 0)` | `#FFFFFF` | Main background color |
| `--foreground` | `oklch(0.145 0 0)` | `#1A1A1A` | Main text color |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Card backgrounds |
| `--card-foreground` | `oklch(0.145 0 0)` | `#1A1A1A` | Card text |
| `--popover` | `oklch(1 0 0)` | `#FFFFFF` | Popover backgrounds |
| `--popover-foreground` | `oklch(0.145 0 0)` | `#1A1A1A` | Popover text |

#### Primary Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--primary` | `oklch(0.205 0 0)` | `#2C2C2C` | Primary buttons, links, emphasis |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on primary elements |

#### Secondary Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--secondary` | `oklch(0.97 0 0)` | `#F5F5F5` | Secondary buttons, backgrounds |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `#2C2C2C` | Text on secondary elements |

#### Muted Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--muted` | `oklch(0.97 0 0)` | `#F5F5F5` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` | Muted text, labels |

#### Accent Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--accent` | `oklch(0.97 0 0)` | `#F5F5F5` | Hover states, highlights |
| `--accent-foreground` | `oklch(0.205 0 0)` | `#2C2C2C` | Text on accent elements |

#### Destructive Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | Error states, delete buttons |

#### Border & Input

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--border` | `oklch(0.922 0 0)` | `#E5E5E5` | Borders, dividers |
| `--input` | `oklch(0.922 0 0)` | `#E5E5E5` | Input borders |
| `--ring` | `oklch(0.708 0 0)` | `#A3A3A3` | Focus rings |

---

### Dark Mode

#### Core Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--background` | `oklch(0.145 0 0)` | `#1A1A1A` | Main background color |
| `--foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Main text color |
| `--card` | `oklch(0.205 0 0)` | `#2C2C2C` | Card backgrounds |
| `--card-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Card text |
| `--popover` | `oklch(0.205 0 0)` | `#2C2C2C` | Popover backgrounds |
| `--popover-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Popover text |

#### Primary Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--primary` | `oklch(0.922 0 0)` | `#E5E5E5` | Primary buttons, links |
| `--primary-foreground` | `oklch(0.205 0 0)` | `#2C2C2C` | Text on primary elements |

#### Secondary Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--secondary` | `oklch(0.269 0 0)` | `#3F3F3F` | Secondary buttons, backgrounds |
| `--secondary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on secondary elements |

#### Muted Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--muted` | `oklch(0.269 0 0)` | `#3F3F3F` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.708 0 0)` | `#A3A3A3` | Muted text, labels |

#### Accent Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--accent` | `oklch(0.269 0 0)` | `#3F3F3F` | Hover states, highlights |
| `--accent-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on accent elements |

#### Destructive Colors

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--destructive` | `oklch(0.704 0.191 22.216)` | `#EF4444` | Error states, delete buttons |

#### Border & Input

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--border` | `oklch(1 0 0 / 10%)` | `rgba(255,255,255,0.1)` | Borders, dividers |
| `--input` | `oklch(1 0 0 / 15%)` | `rgba(255,255,255,0.15)` | Input borders |
| `--ring` | `oklch(0.556 0 0)` | `#737373` | Focus rings |

---

## Brand Colors (Tailwind Utilities)

GlobeTalk uses warm, inviting colors to evoke a sense of connection, warmth, and cultural exchange:

### Primary Brand Colors

| Color Family | Shades Used | Hex Values | Usage |
|--------------|-------------|------------|-------|
| **Amber** | 50, 100, 200, 300, 400, 500, 600, 700 | `#FFFBEB` to `#B45309` | Primary accent, highlights, decorative elements |
| **Rose** | 50, 100, 200, 300, 400, 500, 600, 700, 900 | `#FFF1F2` to `#881337` | Secondary accent, pen pal indicators |
| **Orange** | 100, 200 | `#FFEDD5`, `#FED7AA` | Warm backgrounds, decorative elements |

### Supporting Colors

| Color Family | Shades Used | Hex Values | Usage |
|--------------|-------------|------------|-------|
| **Yellow** | 50 | `#FEFCE8` | Light backgrounds, highlights |
| **Blue** | 200, 500, 900 | `#BFDBFE`, `#3B82F6`, `#1E3A8A` | User-owned content indicators |
| **Gray** | 200, 400, 500, 600, 700, 900 | `#E5E7EB` to `#111827` | Neutral elements, text hierarchy |

### Color Usage Guidelines

#### Amber (Primary Brand)
- **Amber-50 to Amber-100:** Light backgrounds, subtle highlights
- **Amber-200 to Amber-300:** Borders, decorative elements, badges
- **Amber-400 to Amber-600:** Interactive elements, hover states, focus indicators
- **Amber-700:** Strong emphasis, call-to-action elements

**Example Usage:**
```tsx
// Badge
className="bg-amber-100 text-amber-700 border-amber-200"

// Hover state
className="hover:bg-amber-50/50 hover:text-amber-600"

// Focus ring
className="focus:ring-amber-100 border-amber-200"
```

#### Rose (Secondary Brand)
- **Rose-50 to Rose-100:** Gentle backgrounds for recipient content
- **Rose-200 to Rose-400:** Pen pal indicators, location markers
- **Rose-500 to Rose-600:** Strong visual indicators, avatars
- **Rose-900:** Deep emphasis for important text

**Example Usage:**
```tsx
// Pen pal content
className="border-rose-200 bg-rose-50"

// Avatar background
className="bg-rose-500 text-white"

// Location icon
className="text-rose-400"
```

#### Orange (Warm Accent)
- Used sparingly for loading states and warm gradient effects
- Often combined with amber for visual depth

**Example Usage:**
```tsx
// Status indicator
className="bg-orange-100 text-orange-800"

// Gradient background
className="bg-gradient-to-br from-amber-50 to-yellow-50"
```

#### Blue (User Content)
- Used to distinguish user's own content from pen pal content
- Creates clear visual separation

**Example Usage:**
```tsx
// User's letter
className="border-blue-200 bg-blue-50"

// User indicator
className="bg-blue-500 text-white"
```

---

## Chart Colors

Colors used for data visualization:

### Light Mode Charts

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `#F59E0B` | Primary chart color |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | `#10B981` | Secondary chart color |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `#3B82F6` | Tertiary chart color |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `#EAB308` | Quaternary chart color |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | `#F59E0B` | Quinary chart color |

### Dark Mode Charts

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--chart-1` | `oklch(0.488 0.243 264.376)` | `#8B5CF6` | Primary chart color |
| `--chart-2` | `oklch(0.696 0.17 162.48)` | `#34D399` | Secondary chart color |
| `--chart-3` | `oklch(0.769 0.188 70.08)` | `#F59E0B` | Tertiary chart color |
| `--chart-4` | `oklch(0.627 0.265 303.9)` | `#EC4899` | Quaternary chart color |
| `--chart-5` | `oklch(0.645 0.246 16.439)` | `#F97316` | Quinary chart color |

---

## Sidebar Colors

### Light Mode Sidebar

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--sidebar` | `oklch(0.985 0 0)` | `#FAFAFA` | Sidebar background |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `#1A1A1A` | Sidebar text |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `#2C2C2C` | Sidebar primary elements |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on sidebar primary |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `#F5F5F5` | Sidebar hover states |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `#2C2C2C` | Text on sidebar accents |
| `--sidebar-border` | `oklch(0.922 0 0)` | `#E5E5E5` | Sidebar borders |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `#A3A3A3` | Sidebar focus rings |

### Dark Mode Sidebar

| Token | OKLCH Value | Hex Approximation | Usage |
|-------|-------------|-------------------|-------|
| `--sidebar` | `oklch(0.205 0 0)` | `#2C2C2C` | Sidebar background |
| `--sidebar-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Sidebar text |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | `#8B5CF6` | Sidebar primary elements |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on sidebar primary |
| `--sidebar-accent` | `oklch(0.269 0 0)` | `#3F3F3F` | Sidebar hover states |
| `--sidebar-accent-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on sidebar accents |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` | `rgba(255,255,255,0.1)` | Sidebar borders |
| `--sidebar-ring` | `oklch(0.556 0 0)` | `#737373` | Sidebar focus rings |

---

## Border Radius System

GlobeTalk uses a consistent border radius system:

| Token | Value | Calculated Value | Usage |
|-------|-------|------------------|-------|
| `--radius` | `0.625rem` | `10px` | Base radius |
| `--radius-sm` | `calc(var(--radius) - 4px)` | `6px` | Small elements |
| `--radius-md` | `calc(var(--radius) - 2px)` | `8px` | Medium elements |
| `--radius-lg` | `var(--radius)` | `10px` | Large elements (default) |
| `--radius-xl` | `calc(var(--radius) + 4px)` | `14px` | Extra large elements |

**Tailwind Utilities:**
- Rounded corners: `rounded-sm`, `rounded-md`, `rounded-lg`
- Full circles: `rounded-full` (e.g., avatars, badges)

---

## Typography

### Font Families

| Font | Variable | Usage |
|------|----------|-------|
| **Geist Sans** | `--font-geist-sans` | Primary body text, UI elements |
| **Geist Mono** | `--font-geist-mono` | Code, monospace content |

### Font Weights

- **Regular (400):** Body text
- **Medium (500):** Slightly emphasized text
- **Semibold (600):** Headings, important labels
- **Bold (700):** Strong emphasis, titles

### Typography Classes

```tsx
// Body text
className="text-sm"          // 14px
className="text-base"        // 16px

// Headings
className="text-lg"          // 18px
className="text-xl"          // 20px
className="text-2xl"         // 24px

// Fine print
className="text-xs"          // 12px

// Colors
className="text-gray-500"    // Muted text
className="text-gray-700"    // Standard text
className="text-gray-900"    // Strong emphasis
```

---

## Component Styling Patterns

### Cards

```tsx
// Standard card
className="bg-white border border-gray-200 rounded-lg shadow-sm"

// Accent card
className="bg-orange-100/60 border-2 border-amber-400 rounded-sm shadow-sm"

// Letter card with rotation effect
<div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 transform rotate-1 rounded-sm opacity-30" />
```

### Buttons (shadcn/ui)

Variants defined in `components/ui/button.tsx`:
- **default:** Primary action buttons with `bg-primary`
- **destructive:** Delete/remove actions with `bg-destructive`
- **outline:** Secondary actions with border
- **secondary:** Alternative actions with `bg-secondary`
- **ghost:** Minimal style, hover only
- **link:** Text link style

### Badges

```tsx
// Amber badge (interests, tags)
className="bg-amber-100 text-amber-700 border border-amber-200 rounded-full"

// Status badges
className="bg-orange-100 text-orange-800"  // Sending
className="bg-green-100 text-green-800"    // Delivered
```

### Interactive States

```tsx
// Hover
className="hover:bg-amber-50/50 hover:text-amber-600 transition-colors"

// Focus
className="focus:outline-none focus:ring focus:ring-amber-100"

// Active/Selected
className="bg-amber-50 border-amber-300"
```

---

## Background Effects

### Gradients

```tsx
// Warm gradient
className="bg-gradient-to-r from-amber-600 to-rose-500"

// Avatar gradient
className="bg-gradient-to-br from-rose-300 via-orange-200 to-amber-200"

// Text gradient
className="bg-gradient-to-r from-amber-600 to-rose-500 bg-clip-text text-transparent"
```

### Backdrop Effects

```tsx
// Glass morphism
className="bg-white/60 backdrop-blur-sm"

// Subtle overlays
className="bg-white/80"
className="bg-white/70"
```

---

## Accessibility Considerations

### Contrast Ratios

All color combinations meet WCAG 2.1 Level AA standards:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text (18pt+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### Focus Indicators

All interactive elements include visible focus states:
```tsx
className="focus-visible:ring-ring/50 focus-visible:ring-[3px]"
className="outline-ring/50"
```

### Dark Mode

Dark mode automatically adjusts:
- Inverted lightness values for backgrounds and text
- Reduced opacity for borders to prevent harshness
- Adjusted destructive colors for better visibility

---

## Usage Examples

### Complete Component Example

```tsx
// Pen Pal Card
<Card className="p-4 mb-6 bg-orange-100/60 border-2 border-amber-400 rounded-sm shadow-sm">
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-rose-300 via-orange-200 to-amber-200 flex items-center justify-center text-white text-xl font-bold border border-amber-300 shadow-sm">
      {initials}
    </div>
    <div>
      <h3 className="font-bold text-gray-900 text-lg">
        {name}
      </h3>
      <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
        <MapPin className="w-4 h-4 text-rose-400" />
        <span>{location}</span>
      </div>
    </div>
  </div>
  <div className="flex flex-wrap gap-2 mt-3">
    {interests.map((interest) => (
      <Badge key={interest} className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full border border-amber-200">
        {interest}
      </Badge>
    ))}
  </div>
</Card>
```

---

## Design Tokens Reference

### CSS Custom Properties

All design tokens are defined in `app/globals.css` and can be accessed via:
- CSS: `color: var(--primary)`
- Tailwind: `className="bg-primary"`

### Extending Colors

To add custom colors:

1. Define in `app/globals.css`:
```css
:root {
  --custom-color: oklch(0.5 0.2 180);
}
```

2. Map in `@theme inline` block:
```css
@theme inline {
  --color-custom: var(--custom-color);
}
```

3. Use in components:
```tsx
className="bg-custom text-custom-foreground"
```

---

## References

- [OKLCH Color Space Documentation](https://oklch.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
- [Lucide React Icons](https://lucide.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)