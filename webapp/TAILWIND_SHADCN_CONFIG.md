# Tailwind CSS & shadcn/ui Configuration

**Task 1.2 Complete** - Tailwind CSS and shadcn/ui configured with Papa Bolotas branding

## Overview

This document describes the Tailwind CSS and shadcn/ui configuration for the Papa Bolotas webapp, including theme customization, responsive breakpoints, and component library setup.

## ⚠️ Important: Tailwind CSS v4

This project uses **Tailwind CSS v4**, which has significant configuration changes from v3:

- Uses `@import "tailwindcss"` instead of `@tailwind` directives
- Uses `@theme` for design tokens instead of `@layer base`
- Requires `@tailwindcss/postcss` plugin instead of direct `tailwindcss` plugin
- CSS variables must be prefixed (e.g., `--color-*` instead of `--*`)

## Configuration Files

### 1. Tailwind Configuration (`tailwind.config.js`)

The Tailwind configuration includes:

- **Custom breakpoints** matching requirements 2.1-2.4:
  - `mobile`: 320px (mobile devices)
  - `tablet`: 768px (tablet devices)
  - `desktop`: 1025px (desktop devices)

- **Papa Bolotas brand colors** (Requirement 2.3):
  - `brand-primary`: #FF6B35 (Warm orange/red)
  - `brand-secondary`: #004E89 (Deep blue)
  - `brand-accent`: #F7931E (Golden orange)
  - `brand-dark`: #1A1A1A (Dark gray)
  - `brand-light`: #F5F5F5 (Light gray)

- **shadcn/ui color system**: Full integration with CSS variables for theming
- **Custom animations**: Accordion animations for interactive components
- **Typography**: Inter font family as default

### 2. PostCSS Configuration (`postcss.config.js`)

PostCSS setup for Tailwind CSS v4:
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // Tailwind v4 requires this specific plugin
    autoprefixer: {},
  },
}
```

### 3. Global Styles (`src/index.css`)

Tailwind v4 uses the new `@import` and `@theme` syntax:

```css
@import "tailwindcss";

@theme {
  --color-background: 0 0% 100%;
  --color-foreground: 0 0% 10%;
  /* ... other CSS variables with --color- prefix */
}
```

CSS custom properties (CSS variables) for shadcn/ui theming:
- Background, foreground, and surface colors
- Primary, secondary, accent, and destructive color schemes
- Border, input, and ring colors
- Border radius variables

### 4. shadcn/ui Configuration (`components.json`)

shadcn/ui setup with:
- Component style: `default`
- TypeScript: Enabled
- CSS variables: Enabled
- Path aliases:
  - `@/components` → `src/components`
  - `@/lib/utils` → `src/lib/utils`
  - `@/components/ui` → `src/components/ui`

## Installed Dependencies

### Production Dependencies

```json
{
  "@radix-ui/react-label": "^2.1.17",
  "@radix-ui/react-select": "^2.4.1",
  "@radix-ui/react-slot": "^1.5.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^1.74.0",
  "tailwind-merge": "^3.7.0"
}
```

### Development Dependencies

```json
{
  "@tailwindcss/postcss": "^4.0.x",
  "@types/node": "^22.x.x",
  "autoprefixer": "^10.6.2",
  "postcss": "^8.5.33",
  "tailwindcss": "^4.3.5",
  "tailwindcss-animate": "^1.0.7"
}
```

## Installed shadcn/ui Components

The following components are available in `src/components/ui/`:

1. **alert.tsx** - Alert notifications
2. **button.tsx** - Button with variants (default, secondary, destructive, outline, ghost, link)
3. **card.tsx** - Card container component
4. **input.tsx** - Text input field
5. **label.tsx** - Form label
6. **select.tsx** - Select dropdown
7. **textarea.tsx** - Multi-line text input

## Responsive Design

### Breakpoints

The configuration implements the required responsive breakpoints:

```css
/* Mobile: 320px - 767px */
mobile:p-2  /* Padding on mobile */

/* Tablet: 768px - 1024px */
tablet:p-6  /* Padding on tablet */

/* Desktop: 1025px+ */
desktop:p-8 /* Padding on desktop */
```

### Usage Examples

```tsx
// Single column on mobile, two columns on tablet, three on desktop
<div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
  {/* Content */}
</div>

// Responsive text sizes
<h1 className="text-2xl mobile:text-xl tablet:text-3xl desktop:text-4xl">
  Responsive Heading
</h1>

// Conditional display
<span className="mobile:inline tablet:hidden desktop:hidden">Mobile only</span>
<span className="mobile:hidden tablet:inline desktop:hidden">Tablet only</span>
<span className="mobile:hidden tablet:hidden desktop:inline">Desktop only</span>
```

### Touch Targets (Requirement 2.6)

All interactive elements meet the 44x44px minimum touch target size:

```tsx
<Button size="icon" className="min-h-[44px] min-w-[44px]">
  Icon
</Button>
```

## Theme Customization

### Using Brand Colors

```tsx
// Primary brand color
<div className="bg-brand-primary text-white">Papa Bolotas Orange</div>

// Secondary brand color
<div className="bg-brand-secondary text-white">Deep Blue</div>

// Accent color
<div className="bg-brand-accent text-white">Golden Orange</div>
```

### Using shadcn/ui Theme Colors

```tsx
// Primary action
<Button variant="default">Primary Action</Button>

// Secondary action
<Button variant="secondary">Secondary Action</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Subtle actions
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
```

## Utility Function

The `cn()` utility combines `clsx` and `tailwind-merge` for intelligent class name merging:

```tsx
import { cn } from "@/lib/utils"

// Merge classes intelligently
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  "override-classes"
)}>
  Content
</div>
```

## TypeScript Configuration

Path aliases configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

And in `vite.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

## Testing Configuration

The configuration test component is available at:
`src/components/ui/ConfigurationTest.tsx`

This component demonstrates:
- Responsive breakpoints
- Brand colors
- Theme colors
- Button variants and sizes
- Form components
- Alert components
- Touch targets
- Responsive typography

## Verification

To verify the configuration:

1. **Type checking**:
   ```bash
   npm run type-check
   ```

2. **Build verification**:
   ```bash
   npm run build
   ```

3. **Development server**:
   ```bash
   npm run dev
   ```

## Requirements Mapping

This configuration fulfills the following requirements:

- **Requirement 2.1**: Renders correctly on 320px to 2560px screen widths
- **Requirement 2.2**: Single-column layout on mobile (320px-767px)
- **Requirement 2.3**: Two-column layout on tablets (768px-1024px)
- **Requirement 2.4**: Full multi-column layout on desktop (1025px+)
- **Requirement 2.5**: Responsive typography that scales appropriately
- **Requirement 2.6**: Minimum 44x44px touch targets on touch devices
- **Requirement 2.7**: Supports portrait and landscape orientations

## Next Steps

With Tailwind CSS and shadcn/ui configured, you can now:

1. Build responsive layouts using the configured breakpoints
2. Use brand colors for consistent Papa Bolotas styling
3. Leverage shadcn/ui components for accessible, customizable UI
4. Create new shadcn/ui components as needed using the CLI
5. Extend the theme in `tailwind.config.js` as requirements evolve

## Adding More Components

To add additional shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add dropdown-menu
```

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Class Variance Authority](https://cva.style/docs)
