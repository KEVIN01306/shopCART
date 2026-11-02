# Ecom Marketplace — Design System Reference (ShopCart GT)
> Modern electronics & multi-category e-commerce marketplace inspired by Ecom

**Theme:** light

ShopCart adopts the **Ecom Marketplace** visual language: crisp white product cards (`#FFFFFF`) framed by clean hairline borders (`1px solid #D5DFE4`), deep Navy Slate (`#425A8B`) typography for product titles, prices, and structural navigation, and vibrant Ecom Orange (`#FD9636`) for discount badges (`-17%`), 5-star ratings (`★★★★★`), price range sliders, active filter checkboxes, and selected product variant borders (`Color`, `Style`, `Size`).

---

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Primary Navy | `#425A8B` | `--color-navy-primary` | Product titles, headings, main prices, `Add To Cart` button borders & text, active links |
| Deep Navy | `#2B3E66` | `--color-navy-dark` | Hover states on primary navy buttons, deep headings |
| Slate Secondary | `#66789C` | `--color-slate-secondary` | Body text, specification bullets, secondary labels |
| Muted Blue-Gray | `#8C9EC5` | `--color-muted-blue` | Category labels above product titles, strikethrough old prices, review counts `(65)` |
| Accent Orange | `#FD9636` | `--color-orange-accent` | Discount badges (`-17%`), 5-star ratings, price range slider, active checkboxes, active variant border |
| Deep Orange | `#E07B1B` | `--color-orange-dark` | Hover state for orange accents and promotional CTAs |
| Soft Orange Wash | `#FFF3E6` | `--color-orange-light` | Subtle background wash for active variant pills or promotional callouts |
| Storefront Canvas | `#F8FAFC` | `--color-canvas` | Clean background for the application shell |
| Pure White | `#FFFFFF` | `--color-pure-white` | Product cards, filter sidebars, header, detail containers |
| Soft Wash / Breadcrumb | `#F0F3F8` | `--color-soft-wash` | Breadcrumb bar background, category count badges (`09`, `12`, `34`) |
| Card Border | `#D5DFE4` | `--color-card-border` | Structural border on product cards, sidebar boxes, thumbnails, variant buttons |
| Hairline Divider | `#E5E9F2` | `--color-divider` | Internal dividers inside cards and product detail sections |
| Hero Sky Gradient | `linear-gradient(135deg, #DCEEFF 0%, #EAF4FF 100%)` | `--gradient-hero-banner` | Promotional catalog banner background |

---

## Typography

- **Primary Font Family**: `'Plus Jakarta Sans', 'DM Sans', 'Inter', system-ui, -apple-system, sans-serif`
- **Product Card Title**: `15px`, `fontWeight: 700`, `lineHeight: 1.35`, color `#425A8B` (hover `#FD9636`).
- **Product Card Price**: Main price `20px`, `fontWeight: 800`, color `#425A8B`; Old reference price `14px`, `fontWeight: 500`, `textDecoration: 'line-through'`, color `#8C9EC5`.
- **Product Detail Title (PDP)**: `28px–32px`, `fontWeight: 700`, `lineHeight: 1.25`, color `#425A8B`.
- **Product Detail Price (PDP)**: `32px`, `fontWeight: 800`, color `#425A8B` + strikethrough price `20px` in `#8C9EC5`.
- **Specification Bullets**: `12px–13px`, `lineHeight: 1.6`, color `#425A8B` / `#66789C`.

---

## Key Ecom Components

### 1. Product Card (`ProductCard.component.tsx`)
- White card (`#FFFFFF`), `1px solid #D5DFE4` border, `8px` border-radius, `16px–20px` padding.
- Hover elevation: border `#425A8B` and shadow `0 10px 25px rgba(66, 90, 139, 0.08)`.
- Top-left pill badge in `#FD9636` (`-17%`, white text `11px` bold).
- Centered product image (`height: 190px`, `objectFit: 'contain'`).
- Category name in `#8C9EC5` (`12px`), clickable product title in `#425A8B` (`15px` bold, 2-line clamp).
- 5 orange stars (`#FD9636`) + review/variant count `(65)` in `#8C9EC5`.
- Price row in GTQ (`Q2,856.30`) + strikethrough reference price.
- Full-width `Add To Cart` outlined button (`1px solid #425A8B`, color `#425A8B`, hover filled `#425A8B` with white text).
- Bottom divider (`1px solid #E5E9F2`) + 3 bullet points (`•`) of product specifications.

### 2. Sidebar Filters (`ShopFiltersSidebar.component.tsx`)
- **Product Categories Box**: `1px solid #D5DFE4`, `8px` radius, header `Product Categories` in `#425A8B` bold, category items with `▸` arrow and right-aligned pill counter in `#F0F3F8` (`09`, `12`, `24`).
- **Products Filter Box**: Orange `Slider` (`#FD9636`) for price range in GTQ, `Price Range: Q... - Q...`, and quick price range checkboxes with orange checked state and count badges.

### 3. Single Product Detail (`ShopProductDetail.page.tsx`)
- **Left Column**: Vertical thumbnail strip (`76x76px` boxes, active thumbnail `2px solid #FD9636`) + large main image container (`1px solid #D5DFE4`, `10px` radius, `-17%` badge).
- **Right Column**: Large title in `#425A8B`, `by Category/Brand`, 5 orange stars, `Add to Wish list` & `Add to Compare` buttons, dynamic variant price, 2-column bullet specifications, dynamic attribute selectors (`Color`, `Style`, `Size`) with `2px solid #FD9636` active border, `Quantity` `- 1 +` selector, and `Add to Cart` / `Buy Now` actions.
