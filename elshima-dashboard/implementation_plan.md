# Elshima Admin Dashboard — Full Rebuild Plan

The existing dashboard has the correct tech stack (React 19 + TypeScript + Vite + Tailwind + TanStack Query v5 + React Hook Form + Zod + Radix UI) but several critical mismatches between the API shapes and the frontend types/API calls. This plan audits every layer and specifies the exact changes needed.

---

## Proposed Changes

### Types Layer

#### [MODIFY] [index.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts)

- **[ProductResponse](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#107-126)**: Replace stale fields (`discountedPrice`, `discountPercentage`, `percentageDiscount`, `fixedAmountDiscount`) with correct API fields: `finalPrice`, `originalPrice`, `hasDiscount`, `discountValue`, `discountType`, `discountSource`, `listingMainImageUrl`, `listingHoverImageUrl`, `displayImages[]`
- **[ProductFilterParams](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#127-135)**: Add missing `hasDiscount`, ensure all real query params present
- **[CreateProductRequest](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#136-151)** / **[UpdateProductRequest](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#191-202)**: Align with real API body — use `colors[].colorId`, `colors[].images[].imageUrl`, `colors[].variants[]`, `displayImages[]`, `sizeTypeId`
- **New interface `ProductDisplayImage`**: `{ id, imageUrl, sortOrder, altText }`
- **[OrderFilterParams](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#257-265)**: Change `orderStatus` to `number | string` (enum int), add `paymentStatus` as int
- **[DiscountResponse](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#297-310)**: Add `targetName`, `isValidNow`
- **Add [GovernorateResponse](file:///F:/Elshimaa.Store/elshima-dashboard/src/types/index.ts#356-362)** to exports (already in types but ensure it's correct)

---

### API Client Layer

#### [MODIFY] [client.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/api/client.ts)
- Add 401 → refresh-token → retry interceptor (attempt `POST /api/auth/refresh-token` before redirecting to login)

#### [MODIFY] [products.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/api/products.ts)
- Fix `getAll` to use correct param names from API
- Fix `create` to `POST /api/products` (JSON) with correct DTO including `sizeTypeId`, `colors[]`, `displayImages[]`
- Fix [update](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Products.tsx#215-223) (`PUT /api/products/{id}`) — correct `displayImages` semantics (null = no change, exactly 2 = replace)
- Add `uploadImage` to use `/api/images/upload`
- Remove `createBatch` (batch creates use entirely different format; simplify to `POST /api/products`)

#### [MODIFY] [categories.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/api/categories.ts)
- Add `createWithImage(formData: FormData)` → `POST /api/categories/with-image`
- Fix [update](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Products.tsx#215-223) to use correct type

#### [MODIFY] [orders.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/api/orders.ts)
- Add `updateStatus(id, body)` → `PUT /api/orders/{id}/status`
- Add `cancel(id)` → `POST /api/orders/{id}/cancel`
- Add `getByNumber(orderNumber)` → `GET /api/orders/number/{orderNumber}`
- Fix filter params alignment

#### [NEW] [images.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/api/images.ts)
- `uploadImage(file: File): Promise<string>` — returns relative path from `POST /api/images/upload`

#### [NEW] [governorates.ts](file:///F:/Elshimaa.Store/elshima-dashboard/src/api/governorates.ts)
- `getAll()` → `GET /api/governorates`

---

### Pages

#### [MODIFY] [Dashboard.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Dashboard.tsx)
- Replace mock/stub stats with real data derived from orders API
- Show 4 KPI cards: Total Orders, Total Revenue (sum of delivered), Active Products, Total Customers
- Recent Orders table (last 5 from `GET /api/orders?pageSize=5&sortBy=createdAt&sortDescending=true`)
- Orders-by-status donut chart using `recharts`

#### [MODIFY] [Products.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Products.tsx)
- **Image display**: Use `listingMainImageUrl ?? mainImageUrl` (not `mainImageUrl` with `BASE_URL` prefix — the API already returns full URLs)
- **Price display**: Show `finalPrice` prominently; show `originalPrice` with strikethrough only when `hasDiscount == true`; show discount badge
- **Create form**: Switch to `POST /api/products` with proper DTO — `sizeTypeId` (UUID from a select), `colors[]` with `colorId` + `images[]` + `variants[]`, optional `displayImages[]` (exactly 2)
- **Display Images section**: Add separate section for the 2 listing display images (SortOrder 0 + 1) — independent from color images
- **Edit form**: Populate from full product detail (`GET /api/products/{id}`) not the listing response
- **Filter**: Add category filter, featured filter dropdowns

#### [MODIFY] [Categories.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Categories.tsx)
- Fix image upload to use `POST /api/categories/with-image` multipart form
- Show category image, product count, active status correctly
- Fix `includeInactive=true` query for admin view

#### [MODIFY] [Orders.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Orders.tsx)
- Fix filter params alignment (orderStatus as int enum)
- Add status update modal with `notes` + `trackingNumber` fields
- Add cancel button (blocked for Shipped/Delivered)
- Color-coded status badges
- Order detail view in a side panel / dialog

#### [MODIFY] [Discounts.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Discounts.tsx)
- Fix enum values: `discountType` 0=Percentage / 1=FixedAmount, `targetType` 0=Product / 1=Category
- Load products/categories for target selection
- Show active/date-range validity

#### [MODIFY] [Coupons.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Coupons.tsx)
- Show usage progress bar (usedCount / usageLimit)
- Add inline coupon validation preview button → `POST /api/coupons/validate`

#### [MODIFY] [Customers.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Customers.tsx)
- Since there's no `GET /api/users` admin list endpoint, derive customer list from Orders (unique customers by phone)
- Show order count and total spend per customer

#### [NEW] [Governorates.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/pages/Governorates.tsx)
- Read-only view of all governorates and their shipping costs

---

### Layout

#### [MODIFY] [Layout.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/components/layout/Layout.tsx)
- Add Governorates nav item with Map icon
- Add route protection: check user role = Admin; redirect non-admins to login

#### [MODIFY] [App.tsx](file:///F:/Elshimaa.Store/elshima-dashboard/src/App.tsx)
- Add `/governorates` route

---

### Documentation Output

#### [MODIFY] [README.md](file:///F:\ElshimaSolution\README.md)
- Keep existing backend README but ensure it's already fully up-to-date (it is — per audit)

#### Produce `DASHBOARD_README.md` in root of `F:\Elshimaa.Store\elshima-dashboard\`
- Project description, tech stack, folder structure, how to run, auth flow, image rules

---

## Image Upload Guidelines (for all devs)

```
Color Images  (ProductColorImage):
  - Upload via POST /api/images/upload → get relative path
  - Pass relative path in colors[].images[].imageUrl
  - These appear only on product detail page gallery

Display Images (ProductDisplayImage):
  - Same upload endpoint
  - Must send EXACTLY 2 images (SortOrder 0 = main card, SortOrder 1 = hover)
  - Omit displayImages field entirely to keep existing images unchanged
  - NEVER send empty array [] → 400 error
  - listingMainImageUrl ?? mainImageUrl pattern for product cards

Category Images:
  - Use POST /api/categories/with-image multipart (image + form fields)
  - Or upload via POST /api/images/upload, store relative path in imageUrl field
```

---

## Verification Plan

### Dev Server Start
```bash
cd F:\Elshimaa.Store\elshima-dashboard
npm run dev
# Opens at http://localhost:5173
```

### Manual Verification Checklist (browser)
1. **Login** — `http://localhost:5173/login` → enter admin email + password → verify redirect to dashboard
2. **Dashboard KPIs** — verify 4 stat cards load with real numbers (not 0)
3. **Products list** — verify images show from `listingMainImageUrl ?? mainImageUrl`, prices show `finalPrice` and strikethrough `originalPrice`
4. **Create product** — open dialog, fill form, add 2 display images + 1 color image → submit → verify product appears in list
5. **Edit product** — open edit dialog for existing product → verify fields pre-filled → save
6. **Delete product** — soft-delete → verify product disappears from list
7. **Categories** — create category with image upload → verify appears in list with image
8. **Orders** — list all orders → open one → update status → verify badge changes color
9. **Discounts** — create a Percentage discount targeting a Category → verify appears in list
10. **Coupons** — create a coupon → use validate preview for an order amount → verify discount shown
11. **Governorates** — open `/governorates` → verify table of governorates with shipping costs

### TypeScript Build Check
```bash
cd F:\Elshimaa.Store\elshima-dashboard
npx tsc --noEmit
```
