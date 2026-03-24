# Elshima API Reference

**Base URL:** `https://localhost:7208` *(set `Urls:BaseUrl` in config)*
**Auth:** Bearer Token — `Authorization: Bearer {token}`
**Response Envelope:** All responses use `ApiResponse<T>` wrapper.
**PageSize cap:** 50 (enforced server-side)

**Legend:**
🔒 Admin only &nbsp;&nbsp; ✅ Authenticated user &nbsp;&nbsp; 🌐 Public &nbsp;&nbsp; 👤 Guest allowed

---

## Auth Endpoints

### 🌐 POST /api/auth/login
**Used by:** Dashboard / Store
**Rate Limit:** `auth` (5/min)
**Description:** Authenticate with email and password. Returns JWT + refresh token.

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | — |

#### Response — HTTP 200
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "eyJhbGci...",
    "refreshToken": "base64string==",
    "expiresAt": "2026-03-23T05:00:00Z",
    "user": {
      "id": "a1b2c3d4-...",
      "fullName": "سارة محمد",
      "email": "sara@example.com",
      "phoneNumber": "01012345678",
      "roles": ["Customer"]
    }
  }
}
```

#### Errors
| HTTP | Condition |
|---|---|
| 404 | Email not registered |
| 400 | Inactive account or wrong password |

---

### 🌐 POST /api/auth/register
**Used by:** Store
**Rate Limit:** `auth` (5/min)
**Description:** Create a new customer account. Returns JWT immediately.

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `fullName` | string | ✅ | 2–200 chars |
| `email` | string | ✅ | Valid email, unique |
| `phoneNumber` | string | ✅ | Valid phone |
| `password` | string | ✅ | Min 8 chars, digit+upper+lower+symbol |
| `confirmPassword` | string | ✅ | Must match password |

#### Response — HTTP 200
Same as Login response.

#### Errors
| HTTP | Condition |
|---|---|
| 409 | Email already registered |
| 400 | Password policy violation |

---

### 🌐 POST /api/auth/refresh-token
**Description:** Exchange a valid refresh token for a new access token + new refresh token (rotation).

#### Request
| Field | Type | Required |
|---|---|---|
| `token` | string | ✅ |
| `refreshToken` | string | ✅ |

#### Response — HTTP 200
Same as Login response.

---

### ✅ POST /api/auth/logout
**Description:** Revokes all refresh tokens for the current user.

#### Response — HTTP 200
```json
{ "success": true, "message": "تم تسجيل الخروج بنجاح" }
```

---

### ✅ POST /api/auth/change-password
**Description:** Change password. Revokes all existing refresh tokens.

#### Request
| Field | Type | Required |
|---|---|---|
| `currentPassword` | string | ✅ |
| `newPassword` | string | ✅ |

---

### 🌐 POST /api/auth/forgot-password
**Rate Limit:** `auth` (5/min)
**Description:** Sends reset link to email. Always returns 200 (prevents email enumeration).

#### Request
| Field | Type |
|---|---|
| `email` | string |

---

### 🌐 POST /api/auth/reset-password
**Rate Limit:** `auth` (5/min)
**Description:** Reset password using token from email.

#### Request
| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |
| `token` | string | ✅ |
| `newPassword` | string | ✅ |

---

## Category Endpoints

### 🌐 GET /api/categories
**Used by:** Store / Dashboard
**Description:** List all active categories ordered by `DisplayOrder`. Admin can pass `?includeInactive=true`.

#### Query Params
| Param | Type | Default |
|---|---|---|
| `includeInactive` | bool | false |

#### Response — HTTP 200
```json
{
  "success": true,
  "data": [
    {
      "id": "c1d2e3f4-...",
      "nameAr": "عباءات",
      "slug": "عباءات-a1b2c3d4",
      "imageUrl": "https://localhost:7208/images/categories/abc.jpg",
      "displayOrder": 1,
      "isActive": true
    }
  ]
}
```

---

### 🌐 GET /api/categories/root
**Description:** List active root-level categories.

---

### 🌐 GET /api/categories/{id:guid}
**Description:** Get single category by ID.

#### Errors
| HTTP | Condition |
|---|---|
| 404 | Category not found |

---

### 🌐 GET /api/categories/slug/{slug}
**Description:** Get category by URL slug.

---

### 🔒 POST /api/categories
**Description:** Create a new category (JSON body, image URL pre-uploaded separately).

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `nameAr` | string | ✅ | 2–100 chars |
| `descriptionAr` | string | — | — |
| `imageUrl` | string | — | Relative path from image upload |
| `displayOrder` | int | — | — |
| `isActive` | bool | — | Default true |
| `discountType` | int | — | 0=Percentage, 1=FixedAmount |
| `discountValue` | decimal | — | ≥ 0 |
| `isDiscountActive` | bool | — | — |
| `discountStartDate`| DateTime | — | — |
| `discountEndDate`  | DateTime | — | — |

#### Response — HTTP 201

---

### 🔒 POST /api/categories/with-image
**Description:** Create category + upload image in one multipart request.
**Content-Type:** `multipart/form-data`

#### Form Fields (same as above + `image` file)
Security pipeline: size (5MB) → extension whitelist → magic bytes → GUID filename → path traversal guard

---

### 🔒 PUT /api/categories/{id:guid}
**Description:** Update category. Slug regenerated only if name changes.

---

### 🔒 DELETE /api/categories/{id:guid}
**Description:** Soft-delete category.

---

## Product Endpoints

### 🌐 GET /api/products
**Used by:** Store / Dashboard
**Description:** Paginated product listing with full filtering. Includes `DisplayImages[]`, `ListingMainImageUrl`, `ListingHoverImageUrl`.

#### Query Params
| Param | Type | Default | Description |
|---|---|---|---|
| `pageNumber` | int | 1 | — |
| `pageSize` | int | 10 | Max 50 |
| `search` | string | — | Full-text search on name |
| `categoryId` | Guid | — | Filter by category |
| `minPrice` | decimal | — | Min base price |
| `maxPrice` | decimal | — | Max base price |
| `isActive` | bool | — | Filter by active status |
| `isFeatured` | bool | — | Filter featured only |
| `hasDiscount` | bool | — | Filter discounted only |
| `sortBy` | string | — | `price`, `name`, `createdAt`, `viewCount` |
| `sortDescending` | bool | false | — |

#### Response — HTTP 200
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "p1q2r3s4-...",
        "nameAr": "عباءة خليجية فاخرة",
        "slug": "عباية-خليجية-p1q2r3s4",
        "basePrice": 350.00,
        "originalPrice": 350.00,
        "finalPrice": 297.50,
        "hasDiscount": true,
        "discountValue": 15.0,
        "discountType": "Percentage",
        "discountSource": "Product",
        "categoryName": "عباءات",
        "isActive": true,
        "isFeatured": true,
        "viewCount": 412,
        "mainImageUrl": "https://localhost:7208/images/products/abc.jpg",
        "listingMainImageUrl": "https://localhost:7208/images/products/main.jpg",
        "listingHoverImageUrl": "https://localhost:7208/images/products/hover.jpg",
        "displayImages": [
          { "id": "...", "imageUrl": "...", "sortOrder": 0, "altText": "الصورة الرئيسية" },
          { "id": "...", "imageUrl": "...", "sortOrder": 1, "altText": "صورة التمرير" }
        ],
        "colors": [],
        "createdAt": "2026-03-10T12:00:00Z"
      }
    ],
    "totalCount": 85,
    "pageNumber": 1,
    "pageSize": 10,
    "totalPages": 9
  }
}
```

> ℹ️ `colors[]` is empty in listing responses. Full `Colors[].Images[]` and `Colors[].Variants[]` are returned only by `/api/products/{id}` and `/api/products/slug/{slug}`.

---

### 🌐 GET /api/products/{id:guid}
**Description:** Full product detail including all colors, images, and variants. Increments view count.

#### Response — HTTP 200
Same as listing item but `colors[]` is fully populated.

#### Errors
| HTTP | Condition |
|---|---|
| 404 | Product not found |

---

### 🌐 GET /api/products/slug/{slug}
**Description:** Product detail by URL slug. Increments view count.

---

### 🌐 GET /api/products/featured?count=10
**Description:** Top N featured active products ordered by newest. Default count = 10.

---

### 🌐 GET /api/products/{id:guid}/related?count=4
**Description:** Related products in same category, excluding the current product. Default count = 4.

---

### 🔒 POST /api/products
**Description:** Create product with full JSON body (pre-uploaded image URLs).

#### Request (key fields)
| Field | Type | Required | Rules |
|---|---|---|---|
| `nameAr` | string | ✅ | 2–200 chars |
| `basePrice` | decimal | ✅ | > 0 |
| `categoryId` | Guid | ✅ | — |
| `sizeTypeId` | Guid | ✅ | — |
| `isActive` | bool | — | Default true |
| `discountType` | int | — | 0=Percentage, 1=FixedAmount |
| `discountValue` | decimal | — | ≥ 0 |
| `isDiscountActive` | bool | — | — |
| `discountStartDate`| DateTime | — | — |
| `discountEndDate`  | DateTime | — | — |
| `colors` | array | — | Each has `colorId`, `images[]`, `variants[]` |
| `displayImages` | array? | — | Exactly 2 when provided (SortOrder 0 + 1) |

#### Response — HTTP 201

---

### 🔒 POST /api/products/batch
**Description:** Batch-create multiple products in one request.

#### Request
```json
{
  "sizeTypeId": "uuid",
  "products": [
    {
      "nameAr": "عباءة كلوش",
      "basePrice": 280.00,
      "categoryId": "uuid",
      "isActive": true,
      "colors": [...],
      "displayImages": null
    }
  ]
}
```

---

### 🔒 POST /api/products/with-image
**Description:** Create a simple product with a single color/variant + uploaded image in one multipart form.
**Content-Type:** `multipart/form-data`

Full image security pipeline applied (size → extension → magic bytes → GUID → path check).

---

### 🔒 PUT /api/products/{id:guid}
**Description:** Update product fields. `displayImages` semantics:
- `null` → no change to existing display images
- `[]` → 400 error
- exactly 2 (SortOrder 0+1) → full replacement

---

### 🔒 DELETE /api/products/{id:guid}
**Description:** Soft-delete product (hidden from all public listing endpoints).

---

## Cart Endpoints

### ✅ GET /api/cart
**Used by:** Store
**Description:** Get current user's cart. Cart is auto-created on first use.

#### Response — HTTP 200
```json
{
  "success": true,
  "data": {
    "id": "cart-uuid",
    "userId": "user-uuid",
    "cartItems": [
      {
        "id": "item-uuid",
        "productVariantId": "variant-uuid",
        "productName": "عباءة خليجية فاخرة",
        "colorName": "أسود",
        "sizeName": "L",
        "quantity": 2,
        "unitPrice": 297.50,
        "imageUrl": "https://localhost:7208/images/products/abc.jpg"
      }
    ],
    "totalItems": 2,
    "subTotal": 595.00
  }
}
```

---

### ✅ POST /api/cart/items
**Description:** Add item to cart. Validates stock availability.

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `productVariantId` | Guid | ✅ | Must be active |
| `quantity` | int | ✅ | ≥ 1 |

#### Errors
| HTTP | Condition |
|---|---|
| 400 | Variant inactive or insufficient stock |

---

### ✅ PUT /api/cart/items/{itemId:guid}
**Description:** Update item quantity.

#### Request
| Field | Type | Required |
|---|---|---|
| `quantity` | int | ✅ |

---

### ✅ DELETE /api/cart/items/{itemId:guid}
**Description:** Remove single item from cart.

---

### ✅ DELETE /api/cart
**Description:** Clear entire cart.

---

## Order Endpoints

### 🔒 GET /api/orders
**Used by:** Dashboard only
**Description:** Paginated, filtered list of all orders.

#### Query Params
| Param | Type |
|---|---|
| `pageNumber` / `pageSize` | int |
| `search` | string |
| `orderStatus` | int (enum) |
| `paymentStatus` | int (enum) |
| `paymentMethod` | int (enum) |
| `userId` | Guid |
| `fromDate` / `toDate` | DateTime |
| `sortBy` / `sortDescending` | string / bool |

---

### ✅ GET /api/orders/{id:guid}
**Description:** Get order by ID. Customer can only see their own orders; Admin sees all.

---

### 🔒 GET /api/orders/number/{orderNumber}
**Description:** Get order by order number (Admin only).

---

### ✅ GET /api/orders/my-orders
**Description:** List all orders for the authenticated customer.

---

### 👤 POST /api/orders
**Used by:** Store (guest + authenticated)
**Description:** Create order. No auth required (guest checkout). `userId` extracted from token if present.

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `customerName` | string | ✅ | 2–200 chars |
| `customerEmail` | string | — | Valid email |
| `customerPhone` | string | ✅ | Valid phone |
| `governorateId` | Guid | ✅ | Must exist |
| `city` | string | ✅ | Max 100 chars |
| `detailedAddress` | string | ✅ | Max 500 chars |
| `paymentMethod` | int | ✅ | Enum value |
| `couponCode` | string | — | Optional coupon |
| `items` | array | ✅ | ≥ 1 item |
| `items[].productVariantId` | Guid | ✅ | — |
| `items[].quantity` | int | ✅ | 1–100 |

#### Response — HTTP 201
```json
{
  "success": true,
  "message": "تم إنشاء الطلب بنجاح",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-20260322-A1B2C3D4",
    "customerName": "فاطمة أحمد",
    "customerPhone": "01098765432",
    "orderStatus": "Pending",
    "paymentStatus": "Pending",
    "subTotal": 595.00,
    "shippingCost": 50.00,
    "couponDiscountAmount": 0.00,
    "totalAmount": 645.00,
    "createdAt": "2026-03-22T01:38:00Z"
  }
}
```

#### Errors
| HTTP | Condition |
|---|---|
| 400 | Insufficient stock, invalid variant, invalid coupon |
| 404 | Governorate not found |

---

### 🔒 PUT /api/orders/{id:guid}/status
**Description:** Update order status (Admin only). Tracks status history.

#### Request
| Field | Type | Required |
|---|---|---|
| `newStatus` | int | ✅ |
| `trackingNumber` | string | — |
| `notes` | string | — |

#### Business Rules
- Cannot set `Cancelled` on `Shipped` or `Delivered` orders
- Setting `Delivered` automatically sets `PaymentStatus = Paid`

---

### ✅ POST /api/orders/{id:guid}/cancel
**Description:** Cancel order. Customer can only cancel their own; Admin cancels any.

#### Business Rules
- Cannot cancel `Shipped` or `Delivered` orders (400 error)
- Stock restored per variant
- Coupon `UsedCount` decremented; `CouponUsage` record deleted

---

### 👤 GET /api/orders/track?orderNumber=ORD-...&phone=01...
**Rate Limit:** `guest` (10/min)
**Description:** Track order by order number + phone number. No auth required.

---

## Discount Endpoints

### 🔒 GET /api/discounts?includeInactive=false
**Description:** List discounts. By default returns only active + within-date-range discounts.

---

### 🔒 GET /api/discounts/{id:guid}
**Description:** Get discount by ID.

---

### 🔒 POST /api/discounts
**Description:** Create a product or category discount.

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | — |
| `discountType` | int | ✅ | 0=Percentage, 1=FixedAmount |
| `discountValue` | decimal | ✅ | — |
| `targetType` | int | ✅ | 0=Product, 1=Category |
| `targetId` | Guid | ✅ | Product or Category ID |
| `startDate` | DateTime | ✅ | — |
| `endDate` | DateTime | — | — |
| `isActive` | bool | — | — |

---

### 🔒 PUT /api/discounts/{id:guid}
### 🔒 DELETE /api/discounts/{id:guid}

---

## Coupon Endpoints

### 🔒 GET /api/coupons?includeInactive=false
### 🔒 GET /api/coupons/{id:guid}
### 🔒 POST /api/coupons
### 🔒 PUT /api/coupons/{id:guid}
### 🔒 DELETE /api/coupons/{id:guid}

#### Create/Update Coupon Request
| Field | Type | Required |
|---|---|---|
| `code` | string | ✅ |
| `description` | string | — |
| `discountType` | int | ✅ |
| `discountValue` | decimal | ✅ |
| `minimumOrderAmount` | decimal | — |
| `maximumDiscountAmount` | decimal | — |
| `usageLimit` | int | — |
| `startDate` | DateTime | ✅ |
| `endDate` | DateTime | — |
| `isActive` | bool | — |

---

### 🌐 POST /api/coupons/validate
**Description:** Validate coupon for a given order total. No auth required; pass `userId` to check per-user usage.

#### Request
```json
{
  "code": "SUMMER20",
  "orderTotal": 500.00,
  "userId": "user-uuid-or-null"
}
```

#### Response — HTTP 200
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "كود الخصم صالح",
    "discountAmount": 100.00,
    "discountType": "Percentage"
  }
}
```

**Validation order:** existence → IsActive → date range → UsageLimit → MinimumOrderAmount → per-user usage

---

## Promotion Engine (Automatic Cart Discounts)

Promotions are applied automatically to every cart response. No dedicated API endpoint is needed — the `GET /api/cart` and all cart-modifying endpoints return an enriched `CartResponse` with promotion data.

### How It Works
1. Active promotions are loaded from the `Promotions` table (filtered by `IsActive`, `StartDate`, `EndDate`)
2. Sorted by `Priority DESC`, then alphabetically by `Name`
3. Each promotion is applied via its type-specific handler (Strategy pattern)
4. If `IsStackable = false` → no further promotions are applied after this one
5. If `AllowCouponStacking = false` → coupon usage is blocked at checkout

### Promotion Types
| Type | Enum | Behavior |
|---|---|---|
| Percentage | 0 | Deducts `Value`% of `BasePrice * Quantity` for in-scope items |
| Fixed | 1 | Deducts `Value` EGP per in-scope item (capped at item total) |
| BuyXGetY | 2 | For every `BuyQuantity + GetQuantity` units, `GetQuantity` units are free |
| FreeShipping | 3 | Sets `cart.Shipping = 0` |

### Enriched Cart Response Fields
```json
{
  "id": "cart-uuid",
  "userId": "user-uuid",
  "items": [
    {
      "id": "item-uuid",
      "productVariantId": "variant-uuid",
      "productId": "product-uuid",
      "categoryId": "category-uuid",
      "productName": "عباءة خليجية فاخرة",
      "colorName": "أسود",
      "sizeName": "L",
      "basePrice": 350.00,
      "unitPrice": 297.50,
      "quantity": 2,
      "totalPrice": 595.00
    }
  ],
  "subTotal": 595.00,
  "baseSubTotal": 700.00,
  "promotionDiscount": 105.00,
  "shipping": 0.00,
  "total": 490.00,
  "totalItems": 2,
  "appliedPromotions": [
    {
      "name": "Summer 15%",
      "type": "Percentage",
      "savedAmount": 105.00,
      "description": "15% off",
      "allowCoupon": true
    }
  ]
}
```

> ℹ️ `basePrice` = raw price from DB (before PricingHelper legacy discount). `unitPrice` = price after PricingHelper. Promotions calculate on `basePrice` to prevent double discounting.

### Coupon + Promotion Conflict
When creating an order with a `couponCode`, the system checks if any applied promotion has `AllowCouponStacking = false`. If so, the order is rejected with HTTP 400.

---

## User Endpoints

### ✅ GET /api/users/me
**Description:** Get current user profile.

#### Response — HTTP 200
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "fullName": "سارة محمد",
    "email": "sara@example.com",
    "phoneNumber": "01012345678",
    "roles": ["Customer"]
  }
}
```

---

### ✅ GET /api/users/addresses
### ✅ GET /api/users/addresses/{id:guid}
### ✅ POST /api/users/addresses
### ✅ PUT /api/users/addresses/{id:guid}
### ✅ DELETE /api/users/addresses/{id:guid}
### ✅ PUT /api/users/addresses/{id:guid}/default

#### Create/Update Address Request
| Field | Type | Required |
|---|---|---|
| `fullName` | string | ✅ |
| `phoneNumber` | string | ✅ |
| `governorateId` | Guid | ✅ |
| `city` | string | ✅ |
| `detailedAddress` | string | ✅ |
| `notes` | string | — |
| `isDefault` | bool | — |

---

## Governorate Endpoints

### 🌐 GET /api/governorates
**Description:** List all active Egyptian governorates with shipping costs.

#### Response — HTTP 200
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "nameAr": "القاهرة", "shippingCost": 40.00, "isActive": true },
    { "id": "uuid", "nameAr": "الإسكندرية", "shippingCost": 50.00, "isActive": true }
  ]
}
```

---

### 🌐 GET /api/governorates/{id:guid}

---

### 🔒 PUT /api/governorates/{id:guid}/shipping-cost
**Description:** Update the shipping cost for a specific governorate (Admin only).

#### Request
| Field | Type | Required | Rules |
|---|---|---|---|
| `shippingCost` | decimal | ✅ | 0–10000 |

#### Response — HTTP 200
Returns the updated governorate object.

---

## Image Upload Endpoint

### 🔒 POST /api/images/upload
**Content-Type:** `multipart/form-data`
**Description:** Upload a product image. Returns the relative path to store in product/category DTOs.

#### Form Field
| Field | Type |
|---|---|
| `file` | IFormFile |

#### Security Pipeline
1. Null/empty check
2. Size validation (max 5 MB)
3. Extension whitelist (.jpg .jpeg .png .webp .gif)
4. Magic bytes validation (binary header check)
5. Safe GUID-based filename (no user-supplied names)
6. Path traversal guard (`Path.GetFullPath`)

#### Response — HTTP 200
```json
{
  "success": true,
  "message": "تم رفع الصورة بنجاح",
  "data": {
    "url": "products/3f2a1b0c9d8e7f6a5b4c3d2e1f0a.jpg"
  }
}
```

> **Use this relative path** as the value of `imageUrl` fields in product/category create requests.
> The full URL is resolved at read time by `IPictureUrlResolver`: `{BaseUrl}/images/{path}`.

#### Errors
| HTTP | Condition |
|---|---|
| 400 | File too large, unsupported type, invalid image signature |
| 401 | Not authenticated as Admin |

---

---

## Product Images — Frontend Integration Guide

### Image Field Reference

| Field | Source Entity | When Populated | Best Used For |
|---|---|---|---|
| `MainImageUrl` | Default color → `IsMain` image (legacy) | Always if any colors with images exist | Fallback only |
| `ListingMainImageUrl` | `ProductDisplayImage` SortOrder 0 | Only if display images uploaded | Product card — primary |
| `ListingHoverImageUrl` | `ProductDisplayImage` SortOrder 1 | Only if display images uploaded | Product card — hover |
| `DisplayImages[]` | `ProductDisplayImage` entity | Only if display images uploaded | Full listing image set |
| `Colors[].Images[]` | `ProductColorImage` entity | **Detail endpoint only** | Per-color gallery |

> ℹ️ `Colors[].Images[]` is **only included** in the detail endpoints (`GET /api/products/{id}` and `GET /api/products/slug/{slug}`). Listing endpoints return `colors: []` to keep payloads small.

### Store Frontend Rules

```
Product Card (listing / category page):
  primary_image  = listingMainImageUrl  ?? mainImageUrl
  hover_image    = listingHoverImageUrl ?? null   // no hover effect if absent

Product Detail Page:
  gallery        = colors[selectedColor].images[] sorted by displayOrder
  selected_image = images[].isMain == true for selected color
  fallback       = mainImageUrl if no color selected yet
```

### Admin Dashboard Rules

```
Display Images section (SortOrder 0 + 1):
  - Always send exactly 2 on update, OR omit the field entirely
  - Sending an empty array [] returns 400 validation error
  - Sending only 1 image returns 400 validation error
  - Manage independently from color images

Color Images section (Colors[].Images[]):
  - Managed per color independently
  - Completely separate from display images
  - isMain flag = which image shows first in gallery
```

### Null Safety Rules

| Field | Nullable? | Safe to render without null check? |
|---|---|---|
| `listingMainImageUrl` | ✅ Yes | No — check before using |
| `listingHoverImageUrl` | ✅ Yes | No — check before using |
| `mainImageUrl` | ✅ Yes | No — check before using |
| `finalPrice` | ❌ No | Yes — always present |
| `discountSource` | ✅ Yes | No — only when `hasDiscount == true` |
| `discountValue` | ✅ Yes | No — only when `hasDiscount == true` |

---

## Frontend Consumption Rules

### Nullable Fields

| Field | Null When |
|---|---|
| `listingMainImageUrl` | No display images uploaded for this product |
| `listingHoverImageUrl` | No display images uploaded or only 1 exists |
| `mainImageUrl` | Product has no color images at all |
| `discountValue` | `hasDiscount == false` |
| `discountType` | `hasDiscount == false` |
| `discountSource` | `hasDiscount == false` |
| `customerEmail` (order) | Guest checked out without email |

**Safe to render without null check:** `finalPrice`, `basePrice`, `subTotal`, `totalAmount`, `orderNumber`, `orderStatus`, `nameAr`, `slug`

---

### Price Display

```
Always display:  finalPrice  (already has discount applied)
Strikethrough:   originalPrice   ONLY when hasDiscount == true
Discount badge:  show ONLY when hasDiscount == true
Badge content:   e.g. "خصم 15%" when discountType == "Percentage"
                 e.g. "خصم 50 جنيه" when discountType == "FixedAmount"
Badge source:    discountSource ("Product" or "Category")
```

---

### Inactive Products

- `isActive == false` products are **hidden** from all public listing endpoints by default
- Only `GET /api/products?isActive=false` (Admin) returns inactive products
- Never show inactive products to Store Frontend users

---

### Listing vs Detail Response Differences

| Feature | Listing (GET /api/products) | Detail (GET /api/products/{id}) |
|---|---|---|
| `displayImages[]` | ✅ Included | Not included (use detail spec) |
| `listingMainImageUrl` | ✅ Included | ✅ Included |
| `listingHoverImageUrl` | ✅ Included | ✅ Included |
| `mainImageUrl` | ✅ Included | ✅ Included |
| `colors[].images[]` | ❌ Empty | ✅ Fully populated |
| `colors[].variants[]` | ❌ Empty | ✅ Fully populated |

> **Performance rule:** Never call the detail endpoint for listing pages. It performs extra eager-loading joins that are unnecessary for a product card.

---

### Guest Checkout

- `POST /api/orders` does **not** require a Bearer token
- All customer fields (`customerName`, `customerPhone`, `governorateId`, `city`, `detailedAddress`) are **required** in the request body
- Order tracking works via `GET /api/orders/track?orderNumber=ORD-...&phone=01...` — no auth required
- Guest orders have `userId = null` in the database

---

### Coupon Usage in Checkout Flow

```
1. Customer enters coupon code
2. Call POST /api/coupons/validate with orderTotal and userId
3. If isValid == true, display discountAmount to user
4. Pass couponCode in POST /api/orders body
   (server re-validates and applies on create)
5. On success: coupon.UsedCount++ and CouponUsage record created
6. On cancel: automatically reversed (UsedCount-- and CouponUsage deleted)
```

---

### Order Status Values

| Value | Int | Meaning |
|---|---|---|
| `Pending` | 0 | Just placed, awaiting confirmation |
| `Confirmed` | 1 | Admin confirmed |
| `Shipped` | 2 | Dispatched — cannot cancel |
| `Delivered` | 3 | Delivered, PaymentStatus auto-set to Paid |
| `Cancelled` | 4 | Cancelled by customer or admin |

---

### Error Response Shape

All errors follow the same envelope:

```json
{
  "success": false,
  "message": "رسالة الخطأ بالعربية",
  "data": null,
  "errors": null
}
```

In Development mode, `errors[]` contains the stack trace for 500 errors.
