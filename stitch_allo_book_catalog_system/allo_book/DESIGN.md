---
name: Allo Book
colors:
  surface: '#faf9f7'
  surface-dim: '#dadad8'
  surface-bright: '#faf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeec'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#414847'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#717977'
  outline-variant: '#c1c8c6'
  surface-tint: '#46645f'
  primary: '#001915'
  on-primary: '#ffffff'
  primary-container: '#0f2e2a'
  on-primary-container: '#779691'
  inverse-primary: '#adcdc7'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#260e07'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e2219'
  on-tertiary-container: '#b1877a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8e9e3'
  primary-fixed-dim: '#adcdc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#2e4c48'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ebbcae'
  on-tertiary-fixed: '#2e150c'
  on-tertiary-fixed-variant: '#603f34'
  background: '#faf9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e3e2e0'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is rooted in the "New Editorial" movement—a blend of classical publishing aesthetics and high-performance e-commerce utility. It targets a sophisticated audience that values knowledge and discovery, positioning the bookstore as a curated authority rather than a warehouse.

The visual identity is defined by:
- **Minimalism:** Aggressive use of whitespace to let high-quality book cover art serve as the primary visual driver.
- **Modern Professionalism:** A structured, grid-based layout that feels reliable and organized.
- **Tactile Digitalism:** Subtle depth and refined transitions that mimic the premium feel of high-end stationery.

The emotional response should be one of "quiet confidence"—a calm, focused environment that encourages browsing and deep immersion.

## Colors

This design system utilizes a palette centered on "Oxford Emerald" (#0F2E2A), a deep, sophisticated green that evokes traditional library aesthetics while maintaining a modern edge. 

- **Primary:** Oxford Emerald is used for key actions, navigation headers, and primary branding.
- **Surface:** The background uses a warm "Paper" neutral (#F9F8F6) instead of pure white to reduce eye strain and reinforce the editorial theme.
- **Accents:** A muted gold is used sparingly for highlights like "Staff Picks" or loyalty statuses.
- **System Colors:** High-chroma but grounded tones are used for functional feedback, ensuring they stand out without breaking the minimalist harmony.

## Typography

The typographic strategy pairs a high-contrast serif for narrative elements with a precision-engineered sans-serif for functional elements.

- **Libre Caslon Text** is reserved for headlines, quotes, and book titles. It provides the "editorial soul" of the design system.
- **Hanken Grotesk** handles all interface work, metadata, and body copy. Its contemporary geometry ensures legibility at small sizes during the checkout process.
- **Optical Sizing:** Display styles use tighter letter spacing and aggressive line heights to create a "locked-in" magazine look. Labels are set in uppercase with slight tracking to improve scannability in navigation and filters.

## Layout & Spacing

The design system employs a **Fixed Grid** model for desktop to maintain the integrity of white space, and a **Fluid Grid** for mobile.

- **Desktop (1440px+):** 12-column grid with a 1280px max-width container. Large 64px margins create a "framed" gallery feel.
- **Tablet (768px - 1024px):** 8-column grid with 32px margins. 
- **Mobile (<768px):** 4-column grid with 20px margins.

Spacing follows an 8px base unit. Section-level vertical spacing is intentionally generous (stack-lg) to prevent the "cluttered shop" feel and maintain a premium, curated atmosphere.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than heavy shadows.

- **Level 0 (Base):** The Paper neutral (#F9F8F6) background.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) surfaces with a 1px "Ghost Border" (#E5E5E1). This creates a crisp, flat distinction.
- **Floating Elements:** Only primary call-to-actions and modals use a "Soft Ambient Shadow" (0px 4px 20px rgba(15, 46, 42, 0.08)). The shadow is tinted with the primary emerald to keep the depth feeling organic to the brand palette.
- **Image Treatment:** Book covers should have a very slight 1px inner stroke to prevent light covers from bleeding into the background.

## Shapes

The shape language is "Soft Professional." 

- **Standard Radius:** 4px (0.25rem) is used for buttons, inputs, and small cards. This keeps the interface feeling sharp and architectural.
- **Large Radius:** 8px (0.5rem) is used for featured promotional banners and large modal containers.
- **Strict Square:** Book cover images should retain their natural sharp corners to mimic the physical form of a book, contrasting against the slightly softened UI elements.

## Components

- **Buttons:** Primary buttons use the Oxford Emerald background with White text. Secondary buttons use a 1px Oxford Emerald border with no fill. Padding is 12px vertical / 24px horizontal.
- **Inputs:** Text fields use a 1px border (#D1D1CB) that thickens to 2px Oxford Emerald on focus. Labels are always `label-md` and positioned above the field.
- **Book Cards:** The core component. The cover image occupies the top 70% of the card. Below the image, the title is `headline-sm` and the author is `body-md` in a 60% opacity secondary color.
- **Chips/Tags:** Used for genres. These are pill-shaped with a light grey background (#EFEFEA) and `label-sm` text. No borders.
- **Lists:** Editorial lists (like "Top 10") use a large serif numeral (Libre Caslon) to the left of the text to establish a clear rhythm.
- **Progress Indicators:** Simple, thin 2px lines for checkout flows, using Oxford Emerald for completed states and the Paper neutral for upcoming states.