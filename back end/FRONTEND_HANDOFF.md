# Elshima Frontend Technical Handoff Guide

This document is a production-grade technical handoff for the frontend AI agent responsible for building the Elshima e-commerce platform. It is based strictly on the ASP.NET Core Clean Architecture backend contracts, guaranteeing 100% accurate integration points for both the Admin Dashboard and the Customer Store interfaces.

---

# SECTION 1 — Elshima Admin Dashboard Logic

The Elshima Admin Dashboard is the central control hub where administrators fully manage the catalog, promotional mechanisms, and order lifecycles.

## Authentication

### Module Business Purpose
To securely identify administrators, manage their access sessions via token rotation, and enforce password complexity rules.

### Frontend Expected Behavior
The frontend must provide a login interface capturing email and password. Upon success, it must securely store the JWT (for `Authorization: Bearer <token>`) and the Refresh Token. Before the JWT expires, the frontend must silently call the refresh endpoint to seamlessly continue the session.

### Validation Rules
- **Login**: Requires a registered email and correct password.
- **Passwords**: Minimum 8 characters, must contain at least one digit, one uppercase, one lowercase, and one non-alphanumeric symbol (`Program.cs` Identity config). Registration form must include `ConfirmPassword` field with `[Compare]` match.

### Hidden Backend Logic
- The backend caches user sessions via Refresh Tokens that expire in 7 days and are single-use.
- Calling logout or change password instantly revokes all existing refresh tokens for that user, ensuring complete termination of foreign sessions.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | Authenticate admin | `email`, `password` | Returns JWT and string RefreshToken. | Store both tokens securely. |
| `/api/auth/refresh-token` | POST | Rotate tokens | `token`, `refreshToken` | Returns new JWT and RefreshToken. | Replace old tokens immediately. |
| `/api/auth/logout` | POST | Revoke session | None (requires Bearer) | Confirms token revocation. | Clear local storage and redirect. |

### Error Handling Table

| HTTP Status | Success Value | Meaning | Frontend Action |
|---|---|---|---|
| 400 | false | Invalid credentials or inactive account | Display specific validation message from `Message` |
| 401 | false | Missing or expired JWT | Call `/refresh-token` or redirect to login |

---

## Products

### Module Business Purpose
To allow admins to define the core catalog items. Products are the central entity tying together categories, sizes, prices, images, colors, and promotional logic.

### Frontend Expected Behavior
The frontend must provide a complex multi-step form to create products. It must allow inputting standard details, assigning a category, setting base prices, and optionally configuring discounts, display images, and extended product details.

### Validation Rules
- **Required**: `nameAr` (2-200 chars), `basePrice` (> 0), `categoryId`, `sizeTypeId`.
- **Optional Details**: `includes` (max 2000), `length` (max 200), `material` (max 500).

### Hidden Backend Logic
- Products have a global EF Core soft-delete filter (`IsDeleted`).
- Product slugs are generated auto-magically (`arabic-name-{8-char-uuid}`) to prevent URL collisions. Slugs are not re-generated on every update, only if the name changes.
- `FinalPrice` is never physically stored. The backend calculates it dynamically via `PricingHelper` using `BasePrice` and any active discounts.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/products` | GET | List products (paginated) | `?pageNumber`, `?pageSize`, etc. | Top-level product data, `colors` array is empty. | Use for tables/lists. Do NOT expect color variants here. |
| `/api/products` | POST | Create complex product | Full JSON payload including colors | Creates complete hierarchy. | Image URLs must be uploaded prior to submission. |
| `/api/products/batch` | POST | Bulk create products | `{ "sizeTypeId": uuid, "products": [...] }` | Multiple products created | Each product in array follows same rules as single create. Use for import workflows. |
| `/api/products/with-image` | POST | Quick create | `multipart/form-data` | Creates product + single variant. | Simple upload interface. |
| `/api/products/{id}` | PUT | Update product | JSON payload | Updates entity fields. | `displayImages` expects exactly 2 elements or null. Omission `[]` fails. |
| `/api/products/{id}` | DELETE | Soft delete product | None | Product hidden from public. | Refetch product list. |

### Error Handling Table

| HTTP Status | Success Value | Meaning | Frontend Action |
|---|---|---|---|
| 400 | false | Validation failure (e.g., empty DisplayImages) | Show field-level errors to admin |
| 404 | false | Product ID not found during update/delete | Redirect to list view |

---

## Product Colors

### Module Business Purpose
To support multi-color variations of the same base product without duplicating the entire product record.

### Frontend Expected Behavior
Admins must be able to add multiple colors to a single product. Exactly one color should be marked as `IsDefault = true`.

### Validation Rules
- A product should have related colors to show images in detail views.

### Hidden Backend Logic
- If no dedicated display images are supplied for a product card, the backend falls back to `MainImageUrl`, which is derived from the default color's primary image.

---

## Product Images

### Module Business Purpose
To manage visual representation. There are two distinct sets: Display Images (for listing cards) and Color Images (for detail galleries).

### Frontend Expected Behavior
Admins upload images first, receive a relative path string, and then submit that path in the product/color JSON.

### Validation Rules
- Admins must separate `ProductDisplayImage` (used for listing and hover, SortOrder 0 and 1) from `ProductColorImage` (gallery).
- Upload endpoint enforces strict 5MB size, magic bytes verification, and valid extensions (`.jpg`, `.png`, etc).

### Hidden Backend Logic
- Uploads return a **relative path** (e.g., `products/abc.jpg`). The backend's `IPictureUrlResolver` dynamically constructs full URLs using `Urls:BaseUrl` on read. Do not strip paths manually.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/images/upload` | POST | Upload product file | `multipart/form-data` | Returns relative URL string. | Call BEFORE submitting product JSON. |

---

## Stock

### Module Business Purpose
To manage inventory per specific variant (Product + Color + Size).

### Frontend Expected Behavior
Admin updates `AvailableQuantity` within the `Variants[]` array of a specific color.

### Validation Rules
- `AvailableQuantity` must be tracked accurately; out-of-stock purchases are rejected.

### Hidden Backend Logic
- The backend utilizes optimistic concurrency (`RowVersion`) to prevent race conditions during concurrent checkouts.

---

## Categories

### Module Business Purpose
To establish the catalog taxonomy.

### Frontend Expected Behavior
Admin can manage categories and optionally assign discounts globally to all products within that category.

### Validation Rules
- `nameAr` is required (2-100 chars).
- `discountValue` must be ≥ 0 if discount is active.

### Hidden Backend Logic
- Products inherit category discounts if they do not have their own active product-level discount.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/categories` | GET | List categories | `?includeInactive=true` | Returns categories | Pass `includeInactive=true` for admin tables. |
| `/api/categories` | POST | Create category | JSON | ID + URL | |
| `/api/categories/with-image`| POST | Create with upload | `multipart/form-data` | ID + URL | |

---

## Discounts

### Module Business Purpose
To apply temporary price reductions manually to complete Categories or specific Products.

### Frontend Expected Behavior
Admin manages discount rules natively. They must define the `discountType` (Percentage or FixedAmount) and valid scheduling `StartDate`/`EndDate`.

### Validation Rules
- Must validate `discountValue > 0`.
- Must validate `EndDate > StartDate`.

### Hidden Backend Logic
- Products inherit active category discounts if they do not have their own active individual discount.
- The `finalPrice` is computed dynamically on read operations; discounts are never hardcoded into the `basePrice`.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/discounts` | GET | List discounts | `?includeInactive=false` | Returns discount list. | |
| `/api/discounts/{id}` | GET | Get single discount | None | Discount detail | — |
| `/api/discounts` | POST | Create discount| JSON Payload | ID | |
| `/api/discounts/{id}` | PUT | Update discount | Same fields as POST | Updated discount | — |
| `/api/discounts/{id}` | DELETE | Delete discount | None | Deletion confirmation | Soft delete applied. Refetch list. |

---

## Coupons

### Module Business Purpose
To issue promo codes that users can type during checkout for an aggregate cart discount.

### Frontend Expected Behavior
Admin generates distinct string codes with predefined parameters like usage limits and minimum order bounds.

### Validation Rules
- `code` string cannot be empty.
- Start and End dates must be chronologically sound.

### Hidden Backend Logic
- Coupon usage count increments strictly when an order finalizes, and decrements if that order is cancelled.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/coupons` | GET | List coupons | `?includeInactive=false` | Array of coupons. | |
| `/api/coupons/{id}` | GET | Get single coupon | None | Coupon detail | — |
| `/api/coupons` | POST | Create coupon | JSON Payload | Coupon setup. | |
| `/api/coupons/{id}` | PUT | Update coupon | Same fields as POST | Updated coupon | — |
| `/api/coupons/{id}` | DELETE | Delete coupon | None | Deletion confirmation | Refetch list after delete. |

---

## Promotions Engine

### Module Business Purpose
To execute complex cart-level logic automatically (e.g., "Buy 1 Get 1 Free", "Free Shipping", "15% off cart").

### Frontend Expected Behavior
Admin designs stacking promotions utilizing pre-configured types (`Percentage`, `Fixed`, `BuyXGetY`, `FreeShipping`).

### Validation Rules
- FreeShipping type zeroes out shipping costs entirely.
- Priorities define execution order. 

### Hidden Backend Logic
- The backend automatically applies active promotions internally to every `GET /api/cart` call. The frontend does not "trigger" promotions; it merely reads them from the `CartResponse`.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/promotions` | GET | List promotions | `?includeInactive=false` | Active promotions | |
| `/api/promotions/{id}` | GET | Get single promotion | None | Promotion detail | — |
| `/api/promotions` | POST | Create promo | Complex logic JSON | ID | |
| `/api/promotions/{id}` | PUT | Update promotion | Same fields as POST | Updated promotion | — |
| `/api/promotions/{id}` | DELETE | Delete promotion | None | Deletion confirmation | Permanent delete. Refetch list. |

---

## Governorates

### Module Business Purpose
To define Egyptian governorates and bind dynamic shipping costs to each location.

### Frontend Expected Behavior
Admin can exclusively alter the `shippingCost` integer for existing governorates. New governorates are not natively created by admins; they are seeded.

### Validation Rules
- `shippingCost >= 0`.

### Hidden Backend Logic
- Used instantly in cart calculation for shipping rendering before payment is taken.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/governorates/{id}/shipping-cost` | PUT | Edit cost | `{ "shippingCost": 50 }` | Updated row | |

---

## Reviews

### Module Business Purpose
To moderate user-submitted reviews and manually define their associated image galleries.

### Frontend Expected Behavior
Admin can upload supplemental images for an existing review, delete them, or reorder them via drag-and-drop.

### Validation Rules
- Images are strictly tied to a `ReviewId`.
- Image reordering expects an array of `{ imageId, displayOrder }`.

### Hidden Backend Logic
- Reviews utilize the central `ImageUploadService`, guaranteeing the same stringent security validations as product images.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/admin/reviews/{id}/images` | POST | Add image to review | `multipart/form-data` field name: **`image`** | Returns full `ReviewResponse` with updated `images[]` | One file per request. Multiple images require multiple calls. |
| `/api/admin/reviews/images/{imageId}` | DELETE | Remove image | None | Deletes image + DB row | Refetch review images |
| `/api/admin/reviews/{id}/images/reorder` | PUT | Commit new layout | `items[]` | Reorders sorting | Send full updated array |

---

## Announcements

### Module Business Purpose
To provide global banners or promotional alerts across the site.

### Frontend Expected Behavior
Admin dictates the text, hex background color, URL redirection, and precise start/end scheduling. 

### Validation Rules
- `backgroundColor` must strictly match regex: `^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$`.
- `EndDate` securely validated against `StartDate`.
- `priority` controls display order: **lower integer = displayed first** (sorted ascending by `Priority` in the backend specification).

### Hidden Backend Logic
- The public active announcements endpoint is cached server-side for 5 minutes (sliding expiration, key `"active_announcements"`). However, **every admin mutation (Create, Update, Delete) explicitly calls `_cache.Remove(CacheKey)`** — so the public endpoint reflects changes immediately after any admin save. No stale-data window exists in practice.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/admin/announcements` | GET | List all | None | Returns inactive & active | |
| `/api/admin/announcements` | POST | Create | `CreateAnnouncementRequest` | Returns ID | |
| `/api/admin/announcements/{id}`| PUT | Update | `UpdateAnnouncementRequest` | Returns Updated entity | |
| `/api/admin/announcements/{id}` | DELETE | Remove announcement | None | Deletion confirmation | Refetch announcements list after delete. |

---

## Orders

### Module Business Purpose
To oversee financial transactions, monitor fulfillment status, and trigger post-checkout logistics.

### Frontend Expected Behavior
Admin views paginated orders, and modifies the `OrderStatus` (Pending → Confirmed → Shipped → Delivered).

### Validation Rules
- Orders set to `Shipped` or `Delivered` **cannot** be cancelled.
- Setting status to `Delivered` automatically transitions the internal `PaymentStatus` to `Paid`.

### Hidden Backend Logic
- Order cancellation (if permitted) automatically reverses inventory decrements.
- Order cancellation natively restores the Coupon `UsedCount` and deletes the customer `CouponUsage` record, allowing the customer to immediately reuse that coupon code.

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/orders` | GET | Paginated orders list | `?pageNumber` `?pageSize` `?search` `?orderStatus` `?paymentStatus` `?fromDate` `?toDate` `?sortBy` | Paginated admin orders | Admin only. Use status filter for pipeline views. |
| `/api/orders/{id}` | GET | Single order detail | None | Full order + items + address | Admin sees all. Customer sees own only. |
| `/api/orders/number/{orderNumber}` | GET | Find by order number | None | Full order detail | Admin only. Use for support search. |
| `/api/orders/{id}/status` | PUT | Update order status | `{ "newStatus": int, "trackingNumber"?: string, "notes"?: string }` | Updated order | Cannot set Cancelled on Shipped/Delivered. Delivered auto-sets PaymentStatus=Paid. |
| `/api/orders/{id}/cancel` | POST | Cancel order | None | Cancellation confirmation | Blocked on Shipped/Delivered. Auto-restores stock and coupon UsedCount. |

---

## Users (Customers)

### Module Business Purpose
To oversee registered customers and their addresses.

### Frontend Expected Behavior
Admin visibility into user lists (if endpoints queried/implemented). Customers manage their own profile and address book.

### Validation Rules
- Customers can possess multiple addresses; one must be designated as the `isDefault` address for speedy checkouts.

### Endpoint Table (Customer Profile)

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/users/me` | GET | Profile Data | Bearer Token | `UserDto` | |
| `/api/users/addresses` | GET/POST | Manage Addresses | `{ fullName ✅, phoneNumber ✅, governorateId ✅, city ✅, detailedAddress ✅, notes?, isDefault? }` | Address List / ID | fullName and phoneNumber are required. Form will fail validation without them. |
| `/api/users/addresses/{id}` | PUT/DELETE| Modify Address | Same fields as create | Address Data | |
| `/api/users/addresses/{id}/set-default` | POST | Default Toggle | None | Success bool | Refetch addresses after success. |

---

# SECTION 2 — Elshima Customer Store Logic

The Store frontend is the public-facing application built for optimal browsing, filtering, and checkout.

## Home Products

### Business Goal
To surface curated featured items and promote discovery.

### Frontend Display Logic
Call the featured endpoint to render top recommendations. Utilize `ListingMainImageUrl` and implement hover mechanics via `ListingHoverImageUrl`.

### Hidden Backend Logic
- Ensure fallback to `mainImageUrl` should the listing variables return null.
- The `colors[]` array is empty on listing endpoints for payload performance.

### Endpoint Table

| Endpoint | Method | Purpose | Request Params | Response Meaning | Frontend Rendering Notes |
|---|---|---|---|---|---|
| `/api/products/featured` | GET | Spotlight | `?count=10` | Top N promoted active products | Never call detail endpoint in lists. |

---

## Product Details

### Business Goal
To present a comprehensive product profile facilitating color selection and variant/size picking.

### Frontend Display Logic
Query the product detail explicitly via ID or Slug. Render the `includes`, `length`, and `material` strings gracefully if they exist. Use the fully populated `colors[].images[]` array, sorted by `displayOrder`, to drive the carousel, swapping arrays when the user changes colors.

### Hidden Backend Logic
- Views are auto-incremented sequentially every time the detail endpoint is requested.
- Stock availability is enforced server-side. Out-of-stock variants return 400 on cart insertion. Do not attempt to compute or predict stock availability client-side.

### Endpoint Table

| Endpoint | Method | Purpose | Request Params | Response Meaning | Frontend Rendering Notes |
|---|---|---|---|---|---|
| `/api/products/slug/{slug}` | GET | Detail View | None | Deep nested product aggregate | Extract `colors[0].images` for initial gallery load. |
| `/api/products/{id}/related` | GET | Related products | `?count=4` | Products in same category | Call after main product loads. Default count = 4. Never use on listing pages. |

---

## Search & Categories Browsing

### Business Goal
To slice the catalog by category, price, text matching, and sort preferences.

### Frontend Display Logic
Build modular filter controls. Map client state to backend parameters (`search`, `minPrice`, `maxPrice`, `sortBy`).

### Hidden Backend Logic
- Backend enforces a hard `PageSize` cap of 50.
- Soft-deleted (`IsDeleted=true`) or natively inactive (`IsActive=false`) products are filtered out organically. Do not worry about filtering them client-side.

---

## Reviews Display

### Business Goal
To build trust through customer validation.

### Frontend Display Logic
Render associated `ReviewImages` accurately sorted alongside text comments.

### Hidden Backend Logic
- Rating is aggregated natively. Assume numeric 1-5 rules.

---

## Announcements Display

### Business Goal
To inject urgent messaging or promotion codes natively on the canvas.

### Frontend Display Logic
Call the active announcements endpoint on initial mount. Loop and render banners applying the inline `backgroundColor` safely. Treat empty arrays gracefully.

### Hidden Backend Logic
- Endpoint checks `IsActive`, current UTC time, and `Priority` sorting server-side. Cache handles load.

### Endpoint Table

| Endpoint | Method | Purpose | Request Params | Response Meaning | Frontend Rendering Notes |
|---|---|---|---|---|---|
| `/api/announcements/active` | GET | Display Banner | None | Ordered list of live banners | Wrap carefully; array might be empty. |

---

## Shopping Cart & Promotions

### Business Goal
To hold intended purchases and natively broadcast calculated discounts automatically.

### Frontend Display Logic
Render `GET /api/cart`. The frontend must parse the `appliedPromotions[]` string array and display elements like "Summer 15% Off" or "Free Shipping Applied". 

### Hidden Backend Logic
- `promotionDiscount` and `savedAmount` are provided algorithmically. Do not attempt to compute cart totals manually. Read exactly what the API provides.

> ⚠️ **Field name note:** The cart response uses `items[]` for the cart item array. Always reference `response.data.items` when parsing cart contents.

### Endpoint Table

| Endpoint | Method | Purpose | Request Params | Response Meaning | Frontend Rendering Notes |
|---|---|---|---|---|---|
| `/api/cart` | GET | Fetch Cart | Bearer Token | `CartResponse` | Refresh after any item alteration. |
| `/api/cart/items` | POST | Add Variant | `{ "productVariantId": "...", "quantity": 1 }` | Re-calculated Cart | Check for 400 OutOfStock errors. |
| `/api/cart/items/{id}` | PUT | Edit Quantity | `{ "quantity": 2 }` | Re-calculated Cart | Stock validations apply. |
| `/api/cart/items/{id}` | DELETE | Remove Item | None | Re-calculated Cart | |
| `/api/cart` | DELETE | Clear Cart | None | Success bool | Resets cart to zero items. |

---

## Customer Authentication

### Business Goal
To manage identity, passwords, and user registration.

### Frontend Display Logic
Build out distinct portals for login, registration, and password recovery (`forgot-password` -> `reset-password` from email token).

### Endpoint Table

| Endpoint | Method | Purpose | Request Body | Response Meaning | Frontend Notes |
|---|---|---|---|---|---|
| `/api/auth/register` | POST | New Account | `{ fullName, email, password, etc }` | Returns JWT | Instant login |
| `/api/auth/login` | POST | Sign In | `{ email, password }` | Returns JWT | |
| `/api/auth/forgot-password` | POST | Trigger Email | `{ email }` | Success msg | Does not leak if email exists |
| `/api/auth/reset-password` | POST | New Password | `{ email, token, newPassword }` | Success msg | |
| `/api/auth/change-password` | POST | Update Password | `{ current, new }` (Auth required) | Success msg | |

---

## Customer Authentication & Checkout

### Business Goal
To facilitate frictionless conversions utilizing coupons, correct shipping rates, and guest workflows.

### Frontend Display Logic
- Step 1: Render Egyptian Governorates `GET /api/governorates`. User selects one.
- Step 2: User types `SUMMER10`. Call `POST /api/coupons/validate`. Show success message and apply discount visually.
- Step 3: Let user finalize as Guest or Authenticated.

### Validation Rules (Create Order)
- `CustomerName`: min 2, max 200 chars.
- `City`: max 100 chars.
- `DetailedAddress`: max 500 chars.
- `Items[].Quantity`: Minimum 1, Maximum 100 per variant.

### Hidden Backend Logic
- Guest Checkout `POST /api/orders` omits auth but explicitly mandates all physical address and contact fields in the form.
- The backend might reject a valid coupon at checkout if a running Cart Promotion flag `AllowCouponStacking == false` kicks in.

### Endpoint Table

| Endpoint | Method | Purpose | Request Params | Response Meaning | Frontend Rendering Notes |
|---|---|---|---|---|---|
| `/api/governorates` | GET | List Cities | None | Area + Shipping Cost | Populate shipping dropdown. |
| `/api/coupons/validate`| POST | Verify Code | `{ "code", "orderTotal", "userId" }` | `isValid`, `discountAmount` | Pass authenticated userId or null for guests. Without userId, per-user usage limit cannot be enforced. |
| `/api/orders` | POST | Finalize Checkout | Payload with items + `couponCode` | Order ID, Totals, Status | Redirect to success page tracking number. |
| `/api/orders/track` | GET | Guest tracking | `?orderNumber` & `?phone` | Order Detail | Guest checking order stat. |

---

## My Orders

### Business Goal
To allow authenticated customers to view their complete order history and track individual order status.

### Frontend Display Logic
Render a paginated list of past orders showing: order number, status badge, total amount, and creation date. Link each row to the full order detail page. Show empty state UI if no orders exist yet.

### Endpoint Table

| Endpoint | Method | Purpose | Request Params | Response Meaning | Frontend Rendering Notes |
|---|---|---|---|---|---|
| `/api/orders/my-orders` | GET | Customer order history | Bearer Token | Customer orders list | Requires authentication. Redirect to login if 401. |
| `/api/orders/{id}` | GET | Order detail | Bearer Token | Full order with line items | Customer can only view their own orders. 403 on others. |

---

# GLOBAL SECTION — Elshima Response Contract

Every endpoint in this ecosystem utilizes a standard wrapper. 

```json
{
  "success": true,
  "message": "تمت العملية بنجاح",
  "data": { },
  "errors": null
}
```

- **HTTP 200 Does Not Always Mean Success**: In some edge cases (though rare strictly due to Clean Architecture mappings), always explicitly check `if (response.data.success)`.
- **Message Value**: The `Message` field originates from domain validation and is written in Arabic. It is **frontend-visible** and designed to be dropped directly into toast/snack notifications.
- **Failures**: When `success=false` (usually alongside HTTP 400/404), display `Message` and process `errors[]` array if granular field insights are present.

---

# GLOBAL SECTION — Elshima Business Relationships

- **Product ↔ Colors**: One-to-many. The product exists as a generic shell. Colors hold the actual physical variants and the photo galleries. UI consequence: You cannot pick a size without picking a color first.
- **Product ↔ DisplayImages**: Controls the grid/card layout imagery. Entirely distinct from the detail page galleries.
- **Promotions ↔ Cart**: Automated relationship. Admin sets rules. The API computes them. Frontend merely displays the resultant enriched JSON (`Total`, `SubTotal`, `PromotionDiscount`).

---

# GLOBAL SECTION — Hidden Behaviors Frontend Must Know

> **CRITICAL ARCHITECTURAL CONCEPTS TO OBEY:**

- **Main Image Fallback**: `MainImageUrl` is derived on the fly from the default color. If the default color lacks an image, the backend cascades. It is an algorithmic fallback.
- **Guest Order Null User**: Guest checkouts write `null` to `UserId`. Order isolation relies entirely on exact phone number/order code matching for guests. 
- **Dynamic Pricing Engine**: `FinalPrice` does not exist in the database. The `PricingHelper` processes base prices against product-level, then category-level promotions. Render `FinalPrice` exactly as transmitted.
- **Review Absences**: A product might possess a review with zero images. Never index `ReviewImageResponse[0]` without a `.length` safety check.
- **Time Zones**: Validations like active announcements operate on server UTC time.

---

# GLOBAL SECTION — Cache / Refetch Rules

To maintain sync without flooding the ASP.NET Core API:

- **Cart State**: Refetch `GET /api/cart` strictly after any variant addition, quantity update, or deletion. The server applies promotional discounts per cart request.
- **Admin Dashboard Actions**: Refetch active datatables immediately upon HTTP 200 standard success from any `PUT/POST/DELETE` action. The API delegates list updates to the client.
- **Announcements**: The frontend can safely cache `GET /api/announcements/active` using SWR/React Query for 5 minutes, as the backend independently manages an identical 5-minute memory cache window.
- **Products Listing**: Never cache across auth boundaries if prices change geographically (though not currently applicable via Governorates). Safe to memoize locally per session.

---

# GLOBAL SECTION — Frontend Danger Warnings

> [!WARNING]
> Do not assume every product has colors. Defensively check `colors.length > 0`.

> [!WARNING]
> Do not assume every color has images. Detail views must handle empty swatches cleanly.

> [!WARNING]
> Do not assume optional product fields (`Includes`, `Length`, `Material`) are filled. They are string-nullable.

> [!WARNING]
> Do not assume announcements always exist. The active endpoint may return `data: []`.

> [!WARNING]
> NEVER append `/images/` to paths manually. The `IPictureUrlResolver` serves fully qualified absolute URLs natively in every DTO.
