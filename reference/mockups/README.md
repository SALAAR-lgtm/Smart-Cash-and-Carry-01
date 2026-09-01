# Prototype mockups — inventory

Seven images, intended to define the look of the customer-facing app.
Pulled from `E:\Shared For Ubuntu and Kali\New folder\` on 2026-08-31.
**Source-of-truth brand palette:** purple `#4A148C` / `#380b6e`, red `#D32F2F` /
`#b71c1c`. The mockups were generated against a different (purple) target
palette and the green/orange elements in some images are placeholders from
Gemini, not part of the brand.

| File | What it depicts | Status |
|---|---|---|
| `Gemini_Generated_Image_xg4klxg4klxg4klx.png` | **Home / browse categories** — purple header, search bar with cart badge, "BROWSE CATEGORIES" grid (Fresh Produce, Grocery & Pantry, Dairy & Eggs, Meat & Seafood, Bakery, Beverages, Snacks, Household Supplies, Baby Care), then product strip below. **Cart icon shows a `1` badge** — captures the cart state. | Use for Sprint 2 home screen. |
| `Gemini_Generated_Image_njttn8njttn8njtt.png` | **Category product listing** — search bar, category tabs (FRESH PRODUCE / GROCERY / DAIRY / MEAT), section header "MEAT & SEAFOOD", 2×N product grid with image, title, PKR price, **"ADD TO CART" button per card**. Sticky bottom bar. | Use for Sprint 2 category page. |
| `Gemini_Generated_Image_fbi4aifbi4aifbi4.jpg` | **Product detail page** — full-bleed image, title, **PKR price in purple**, quantity stepper (`− 1 +`), red **"ADD TO CART"** button, product description. Categories: FRESH PRODUCE / GROCERY / DAIRY / MEAT as inline tabs. | Use for Sprint 2 product detail. |
| `Gemini_Generated_Image_8ymf6x8ymf6x8ymf.jpg` | **Cart / review screen** — purple header "My Cart" with X close, line items (image, name, PKR, stepper, line total), Subtotal + Delivery Fee + **Total in bold**, red **"Proceed to Quick Order"** button. | Use for Sprint 3 cart. |
| `Gemini_Generated_Image_wqnysbwqnysbwqny.jpg` | **Guest checkout form** — Full Name, Phone Number, Delivery Address / Landmark, payment method shows "Cash on Delivery" pre-selected with check mark, red **"Confirm & Place Order"** button. (Stars `**...**` in the mockup are placeholder text — strip in production.) | Use for Sprint 3 checkout. |
| `Gemini_Generated_Image_21h8wk21h8wk21h8.jpg` | **Order confirmation** — large green check, "Order Placed!" headline, **order number badge `#SCC-1042`**, estimated delivery time, store contact card. Bottom of screen has an "ALL ORDERS" button (cut off). | Use for Sprint 3 confirmation. |
| `Screenshot_189.png` | A screenshot of an empty Manus preview tab — NOT a mockup. Trash. | **Discard — not a design reference.** |

## Useful details captured for the build

- **Order number format:** `SCC-####` (e.g. SCC-1042)
- **Cart icon badge** with item count is visible in the home mockup
- **Delivery fee** is a separate line, not folded into the total
- **Currency:** "PKR" prefix, never a symbol, never a decimal
- **Layout density:** 2-column product grid on phone
- **Stepper:** `− 1 +` pattern with the number centred
- **CTA hierarchy:** red for primary action, purple for headers, white cards
- **Bottom action bar** appears on the product detail screen (the mockup shows a finger hovering "ADD TO CART" but the button itself sits inside a card, not pinned)

## Categories shown in the mockups vs. what's in `data/products.csv`

Mockups show 9 categories. Real CSV has **5** (Masalas & Spices, Toothpastes &
Oral Care, Tea & Coffee, Soaps & Body Wash, Cooking Oils & Ghee). The mockup
categories are reference only — the build reads categories from the database.
