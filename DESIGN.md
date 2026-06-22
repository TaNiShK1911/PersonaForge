---
name: Kinetic Intelligence
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#424655'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0054d8'
  primary: '#004bc3'
  on-primary: '#ffffff'
  primary-container: '#1d63ed'
  on-primary-container: '#eeefff'
  inverse-primary: '#b3c5ff'
  secondary: '#875200'
  on-secondary: '#ffffff'
  secondary-container: '#fd9e00'
  on-secondary-container: '#653c00'
  tertiary: '#405388'
  on-tertiary: '#ffffff'
  tertiary-container: '#586ca2'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#00184a'
  on-primary-fixed-variant: '#003fa5'
  secondary-fixed: '#ffddba'
  secondary-fixed-dim: '#ffb866'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#673d00'
  tertiary-fixed: '#dae2ff'
  tertiary-fixed-dim: '#b2c5ff'
  on-tertiary-fixed: '#001848'
  on-tertiary-fixed-variant: '#314578'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 32px
  margin-desktop: 64px
  margin-mobile: 20px
  section-padding: 120px
---

## Brand & Style

The design system is built on a foundation of "Kinetic Intelligence"—a blend of high-tech data capabilities and human-centric marketing. The visual style is **Corporate / Modern**, characterized by exceptional clarity, high-impact typography, and a "People-First" photographic direction. 

The aesthetic leverages expansive whitespace to create a premium, authoritative feel, while utilizing vibrant primary blues to signal technological strength. Key identifiers include rounded-corner image treatments, purposeful use of bold headlines, and a sophisticated layering of information that feels both enterprise-ready and accessible.

## Colors

The palette is anchored by a signature "Electric Blue" that represents the energy of data and cloud connectivity. 

- **Primary Blue:** Used for brand accents, primary buttons, and hero backgrounds.
- **Secondary Amber:** An intentional highlight color used sparingly for underlines, status indicators, or small callouts to draw the eye.
- **Deep Navy:** Used for text-on-light backgrounds and "Dark Mode" containers to provide high-contrast legibility.
- **Neutral Off-White:** A warm neutral background that prevents the interface from feeling "stark," providing a softer canvas for complex data.

## Typography

This design system uses a dual-font approach to balance personality with utility. **Plus Jakarta Sans** provides a modern, geometric feel for headlines, using heavy weights (Bold/ExtraBold) to establish a clear hierarchy. **Source Sans 3** is utilized for body copy and UI labels, offering superior legibility in dense data environments.

Hero sections should utilize the `display-xl` scale with tight line-height to create a "wall of text" impact. Secondary labels and breadcrumbs must always use `label-caps` to distinguish meta-information from primary content.

## Layout & Spacing

The system follows a **Fixed Grid** model for marketing content and a **Fluid Grid** for platform interfaces. 

- **Desktop:** A 12-column grid with 32px gutters. Content is typically centered within a 1280px max-width container.
- **Mobile:** A 4-column grid with 16px gutters and 20px side margins.
- **Rhythm:** Spacing follows an 8px base unit. Section vertical padding is generous (120px+) to ensure the "COREai" and "PeopleCloud" messaging feels breathable and premium. 

Elements like cards and image blocks should utilize consistent internal padding of 32px to maintain a substantial, professional presence.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** rather than heavy shadows. 

1. **Base:** Neutral Off-White (`#F9F9F7`) for the main canvas.
2. **Surface:** Pure white surfaces for cards and content containers.
3. **Ghost Borders:** Cards and interactive elements use a subtle 1px border (`#E5E5E1`) instead of shadows to maintain a clean, flat aesthetic.
4. **Active Elevation:** Only the most critical interactive elements (like hovering over a resource card) should trigger a soft, highly diffused ambient shadow to indicate interactivity.

## Shapes

The shape language is defined by **Rounded** geometry. 

- **Images:** Photography must always be housed in containers with a minimum of 16px (1rem) corner radius. For specific "PeopleCloud" features, circular crops or "organic" pill shapes can be used to emphasize the human element.
- **UI Components:** Buttons and input fields follow a 0.5rem (8px) radius to maintain a professional yet approachable feel.
- **Background Accents:** Use large-scale organic blobs or circular pattern overlays behind content to break the grid and add visual interest.

## Components

### Buttons
- **Primary:** Solid Blue (`#1D63ED`) with white text. 16px horizontal padding, 8px vertical. Bold weight.
- **Secondary/Ghost:** White background with Blue text and a Blue 1px border.
- **Tertiary:** Text-only with a "Learn more" arrow icon, using the Primary Blue.

### Resource Cards
Cards are white with a 1px neutral border. They feature a top-aligned image with a 16px radius, a category label in `label-caps`, and a bold headline. The bottom of the card contains a clear "Learn more" text link.

### Content Chips
Small, dark navy or semi-transparent overlays used on images to denote content type (e.g., "Blog Post"). These should have sharp or slightly rounded corners (4px) to contrast with the softer container shapes.

### Input Fields
Clean, white backgrounds with 1px light gray borders. Focused states utilize a 2px Primary Blue border. Labels sit above the field in `body-md` bold.

### Hero Banners
Hero sections should alternate between pure Primary Blue backgrounds with white text and Off-White backgrounds with Deep Navy text. Use the Secondary Amber for subtle underlines on key words within headlines.