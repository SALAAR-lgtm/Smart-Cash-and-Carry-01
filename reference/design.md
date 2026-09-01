# GrocerApp.pk — Design System (design.md)

> Design specification extracted from the live source of [grocerapp.pk](https://grocerapp.pk)
> (React + Material-UI PWA). Extracted directly from the production JS bundles (`main.*.chunk.js`,
> `defaultVendors~main.*.chunk.js`) and `css/custom.css` on the date of capture.

---

## 1. Overview

GrocerApp is a Pakistani online grocery delivery store (serving Lahore, Islamabad, Rawalpindi
and Faisalabad) that sells fresh produce, packaged groceries, dairy, household and personal-care
items with home delivery.

**Design language:** friendly, bright and commerce-optimised grocery UI. A vivid orange primary
drove by the brand, a fresh green secondary, clean white surfaces and an 8px grid. The look is
mobile-first, card-based and product-carousel-heavy with strong discount/price signalling.

**Tech stack that shapes the design:**

| Layer | Technology |
|---|---|
| Framework | React (create-react-app PWA) |
| UI kit | Material-UI (MUI v4/v5, JSS `makeStyles`) |
| Typography | Sora (Google Fonts, weights 100–800) |
| Carousels | Slick slider (React-Slick) |
| Feedback | Notistack snackbars |
| Skeleton loading | react-loading-skeleton |

---

## 2. Brand

- **Name:** GrocerApp
- **Homepage title/tagline:** "GrocerApp: Online Grocery Delivery up to 50% OFF"
- **Personality:** fresh, local, deal-driven, trustworthy
- **Logo:** horizontal lock-up on a white header; also used as an app icon. Round-cropped on
  small surfaces (`border-radius: 32px`).

---

## 3. Color System

### 3.1 Brand palette

| Swatch | Token | HEX | Usage |
|---|---|---|---|
| ██ | `primary.main` | `#EE7E25` | Buttons, search icon, cart badge, active accents |
| ██ | `primary.light` | `#F49953` | Hover/lighter orange states |
| ██ | `primary.dark` | `#A9591C` | Pressed / darker orange |
| ██ | `secondary.main` | `#51AA1A` | Green accents, freshness, check icons |
| ██ | `secondary.light` | `#F2FEF2` | Tinted green backgrounds |
| ██ | `secondary.dark` | `#387612` | Dark green states |
| ██ | `error.main` | `#F44336` | Errors, remove actions |

### 3.2 Neutral & surface palette

| Swatch | Token | HEX | Usage |
|---|---|---|---|
| ██ | `common.black` | `#1C2223` | Headings, icons, primary text on light |
| ██ | `common.white` | `#FFFFFF` | Cards, header, surfaces |
| ██ | `common.offWhite` | `#EEEEEE` | Hairline surfaces |
| ██ | `common.lightOffWhite` | `#F8F8F8` | Subtle bands, borders |
| ██ | `common.grey` | `#CCCCCC` | Disabled / secondary borders |
| ██ | `common.green` | `#51AA1A` | Success, order-status green |
| ██ | `common.red` | `#F34343` | Deal badges, alerts |
| ██ | `common.yellow` | `#FFFBC7` | Highlight chip background |
| ██ | `background.default` | `#F9F9F9` | Page background |
| ██ | `background.paper` | `#FFFFFF` | Elevated surfaces |

### 3.3 Text, borders & UI accents

| Token | Value | Usage |
|---|---|---|
| `text.primary` | `rgba(0,0,0,0.87)` | Body copy |
| `text.secondary` | `rgba(0,0,0,0.54)` | Secondary copy, captions |
| `text.disabled/hint` | `rgba(0,0,0,0.38)` | Disabled input |
| `divider` | `rgba(0,0,0,0.12)` | Dividers |
| — | `#FFE9D0` | Scroll-to-top button background |
| — | `#F5F5F5` | Custom scrollbar track |
| — | `#999` / `#666` | Muted helper text (`caption2` / `body3`) |

**Usage guidance:** Orange is reserved for primary actions and price/CTA emphasis; green signals
freshness, success and order status; red is reserved for deals/discounts and destructive states.

---

## 4. Typography

- **Font family:** `Sora, sans-serif` (Google Fonts, weights 100–800)
- **Base size:** 14px
- **Weights:** light 300, regular 400, medium 500, semibold 600, bold 700

| Style | Size | Weight | Color | Notes |
|---|---|---|---|---|
| Page title | 1.25rem (20px) | 500 | `text.primary` | e.g. category/product name, line-height 1.6 |
| Section heading `captionH5` | 1.5rem (24px) | 700 | `rgba(0,0,0,0.60)` | Home section titles, line-height 1.354 |
| Card title `h4` | 1rem (16px) | 600 | `rgba(0,0,0,0.87)` | Block titles |
| Body `body1` | 0.875rem | 400 | `rgba(0,0,0,0.87)` | Default text |
| Secondary `body2` | 0.875rem | 400 | `rgba(0,0,0,0.54)` | Meta information |
| Muted `body3` | 0.9rem | 400 | `#666` | Long helper text, letter-spacing 0.00938em, line-height 1.35 |
| Caption | 0.75rem | 400 | `rgba(0,0,0,0.54)` | Prices-original, small labels |
| Caption `caption2` | 13px | 400 | `#999` | Tiny helper |
| Button | 0.875rem | 500 | `rgba(0,0,0,0.87)` | **Uppercase** |
| Badge `smallBoldWhite` | 12px | 600 | `#FFFFFF` | Deal chips on orange/red |
| Badge `smallBoldBlack` | 12px | 600 | `#51AA1A` | Deal chips on green |

**Naming convention:** prices render as `Rs.` prefix + amount; original (pre-discount) price is
rendered with line-through.

---

## 5. Spacing & Layout

- **Grid base:** 8px (Material-UI `spacing(n)`, e.g. `spacing(1)=8px`, `spacing(2)=16px`,
  `spacing(4)=32px`, `spacing(12)=96px`).
- **Section rhythm:** card padding `24px`, section vertical padding `16px`, breadcrumbs `16px`.
- **Layout:** fluid full-width app shell; content sections stacked vertically on the home page:
  header → hero banners → categories → Top Deals → Featured → Brand Stores → footer.
- **Horizontal scrollers:** category and product rails scroll horizontally (`overflow-x: scroll`,
  `scroll-snap`-style via Slick); custom thin scrollbars (`8px` track, radius `20px`, track `#F5F5F5`).

---

## 6. Borders & Radius

- **Base radius:** `3px` (`shape.borderRadius`) — inputs, buttons, cards.
- **Pill radius:** `20px` — cart count badge, deal chips, active category chip.

### Border line presets (mixins)

| Token | Value |
|---|---|
| `borderLine1` | `1px solid #F8F8F8` |
| `borderLine2` | `1px solid #EEEEEE` |
| `borderLine3` | `1px solid #DBDBDB` |
| `borderLine4` | `1px solid #CCCCCC` |
| `borderLine5` | `1px solid #51AA1B` |
| `borderLine6` | `1px solid #EE7E25` |

Category cards use top/bottom `borderLine2` with no box-shadow for a clean hairline look.

---

## 7. Shadows & Elevation

- **Cards (default MUI card override):**
  `0 1px 1px rgba(0,0,0,0.15), -1px 0 0 rgba(0,0,0,0.03), 1px 0 0 rgba(0,0,0,0.03), 0 1px 0 rgba(0,0,0,0.12)`
- **AppBar:** no shadow (flat white).
- **Paper (default):** no shadow; padding 24px.
- **Floating / dropdown:** `shadows[4]` for search suggestions popover; floating carousel
  arrows use soft offset shadows (`-5px 0 7px -2px #888`).

---

## 8. Iconography & Imagery

- **Icons:** Material-UI icon set (cart, search, location pin, chevrons, close).
- **Product imagery:** white-background product photos served from `pictures.grocerapps.com`
  in `original`, `lgthumb` and `small` sizes.
- **Category thumbnails:** circular cards ~100px; category grid images are 1:1.
- **Hero banners:** full-width Slick carousel with swipe arrows and dot indicators.
- **Out-of-stock:** dimmed product image with a centered 150–300px overlay graphic and reduced
  opacity (`0.85`).

---

## 9. Key Components

### 9.1 Header (AppBar)
- White background, **no shadow**, `z-index: 11`, full width, `padding: 0 0 6px 0`.
- **Logo:** ~96×48px, `border-radius: 32px`.
- **Delivery location:** bold black text with a location-pin icon and a dropdown popper
  (`min-width: 300px`, `max-width: 520px`, top 60px).
- **Cart:** black cart icon; count badge on top-right — orange (`primary.main`) pill,
  `border-radius: 20`, `min-width: 24px`, white count text.

### 9.2 Search
- White input, height `40px`, radius `3px`, subtle border (`borderLine6` on edges).
- Search submit is a `48px` square orange button with white search icon.
- **Suggestions dropdown:** absolute, full width, `max-height: 300px`, `box-shadow: shadows[4]`,
  list items 8×16px padding, hover `action.hover`.

### 9.3 Category navigation
- Horizontally scrollable row of circular category cards (image + label).
- Active/highlight chip uses `common.yellow` (`#FFFBC7`) background with base radius.
- Also presented as an expandable sidebar list with chevron expand/collapse.

### 9.4 Product card
- White card with the card shadow described in §7; image on top (square, min 130px).
- **Name:** 20px / 500 / primary text, `line-height: 1.6`.
- **Variant/size:** caption-size secondary text.
- **Price:** sale price in `subtitle2` (500 weight) prefixed `Rs.`; original price shown
  struck-through in caption.
- **Deal flash chip:** red pill, uppercase, `border-radius: 20`, padding 4px 8px, sits at
  top-left over the image.
- **CTA:** compact add-to-cart with a quantity stepper (`+`/`−`), buttons `padding 4px 8px`.

### 9.5 Buttons
- Primary: orange (`primary.main`) background, white text, uppercase, 500 weight.
- Hover darkens to `primary.dark`; focus states use the standard MUI ripple/focus ring.
- Full-width CTA variant uses `8px 16px` padding, `font-weight: 600`.

### 9.6 Horizontal product rails
- Section header (`captionH5`, 24px/700) with optional "View all" link.
- Slick carousel with floating left/right arrows that appear on hover (white bg, offset shadow,
  vertically centered, ~100px tall, `z-index: 10`).

### 9.7 Scroll-to-top
- Fixed bottom-right (`right: 30px`), 50×50px circle, background `#FFE9D0`, orange icon (28px),
  `transition: all 0.3s`.

### 9.8 Footer
- Multi-column link grid (6/12 on mobile, 3/12 on desktop); includes **Brand Stores**,
  Privacy Policy and other text links with `no-decoration`; hover underlines.

### 9.9 Feedback / states
- **Toast notifications:** Notistack snackbars tinted with `primary.main` background and
  white contrast text.
- **Loading:** skeleton shimmer placeholders (`#EBEBEB` base → `#F5F5F5` highlight, 1.5s loop).
- **Error / shake:** form errors shake horizontally (`translate ±10px`, 200ms × 2).

---

## 10. Interaction States

| State | Treatment |
|---|---|
| Hover (list item / suggestion) | `rgba(0,0,0,0.08)` background |
| Selected (suggestion) | `rgba(0,0,0,0.14)` background |
| Hover (nav link) | Animated underline — 2px, orange, grows from center to 80% width |
| Hover (carousel arrows) | Background flips to white |
| Active (deal card) | Orange border (`borderLine6`) highlight |

---

## 11. Responsive & Breakpoints

Material-UI defaults plus app-specific overrides:

| Breakpoint | Value |
|---|---|
| `xs` | 0px |
| `sm` | 600px |
| `md` | 960px |
| `lg` | 1280px |
| `xl` | 1920px |
| app custom | 365px, 1000px (carousel/grid adjustments) |

- **Toolbar height:** 56px mobile, 64px desktop, 48px in landscape.
- Category rail max-heights scale down as viewport grows (1300 → 1000 → 800px).
- Product detail image: `width: 100%`, `height: 45vh`, capped at 600px.

---

## 12. Motion & Animation

| Token | Value |
|---|---|
| `duration.standard` | 300ms |
| `duration.short` | 250ms |
| `duration.enteringScreen` | 225ms |
| `duration.leavingScreen` | 195ms |
| `duration.shorter` | 200ms |
| `duration.shortest` | 150ms |
| `duration.complex` | 375ms |

**Easing:** standard MUI curve `cubic-bezier(0.4, 0, 0.2, 1)`; popovers use
`cubic-bezier(0.0, 0, 0.2, 1)` (out).

**Micro-interactions:** hover underline growth (0.3s), rotate icon transitions for expand/collapse
(0.3s), shake error animation (200ms × 2 linear), skeleton shimmer (1.5s infinite), Slick carousel
slide/dot transitions.

---

## 13. Accessibility & Guidelines

- `contrastThreshold: 3`; white text on orange achieves WCAG-friendly contrast for CTAs.
- Semantic HTML (headers, `aria-label`s on icon buttons and carousels).
- Text selection/typing supports mobile `text-size-adjust: none` to prevent iOS auto-zoom.
- Uppercase button labels rely on CSS `text-transform`, keeping screen-reader text natural.
- Tap targets: cart button ≥ 48×56px, search 40px with 48px icon target.

---

## 14. Recipe: re-creating the theme in MUI

```js
import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  palette: {
    primary: { main: '#EE7E25', light: '#F49953', dark: '#A9591C', contrastText: '#FFFFFF' },
    secondary: { main: '#51AA1A', light: '#F2FEF2', dark: '#387612', contrastText: '#000000' },
    error: { main: '#F44336' },
    background: { paper: '#FFFFFF', default: '#F9F9F9' },
    common: {
      black: '#1C2223', white: '#FFFFFF', green: '#51AA1A', yellow: '#FFFBC7',
      offWhite: '#EEEEEE', lightOffWhite: '#F8F8F8', red: '#F34343', grey: '#CCCCCC',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  typography: {
    fontFamily: 'Sora, sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    h4: { fontSize: '1rem', fontWeight: 600 },
    body1: { color: 'rgba(0, 0, 0, 0.87)' },
    body2: { color: 'rgba(0, 0, 0, 0.54)' },
    caption: { color: 'rgba(0, 0, 0, 0.54)' },
    button: { textTransform: 'uppercase', fontWeight: 500, fontFamily: 'Sora, sans-serif' },
  },
  shape: { borderRadius: 3 },
  overrides: {
    MuiAppBar: { root: { boxShadow: 'none' } },
    MuiPaper: { root: { boxShadow: 'none', padding: 24 } },
    MuiCard: {
      root: {
        boxShadow:
          '0 1px 1px rgba(0,0,0,.15), -1px 0 0 rgba(0,0,0,.03), ' +
          '1px 0 0 rgba(0,0,0,.03), 0 1px 0 rgba(0,0,0,.12)',
      },
    },
  },
});
```

---

## 15. Source of truth

| File | Purpose |
|---|---|
| `https://grocerapp.pk/static/js/main.*.chunk.js` | Theme object ("GrocerApp Theme"), mixins, all component styles |
| `https://grocerapp.pk/static/js/defaultVendors~main.*.chunk.js` | MUI base theme utilities |
| `https://grocerapp.pk/css/custom.css` | Skeleton loader, shake keyframes, Slick slider CSS |
| `https://fonts.googleapis.com/css2?family=Sora:wght@100..800` | Font loading |

*Extraction date: 2026-08-17. Bundle hashes may change as GrocerApp ships new builds; re-run the
analysis on the latest `main.*.chunk.js` to refresh tokens.*
