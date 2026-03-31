// ─── Common ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface CategoryResponse {
  id: string;
  nameAr: string;
  slug: string;
  descriptionAr: string | null;
  imageUrl: string | null;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  subCategories: CategoryResponse[];
  // Discount fields (may be absent on old API responses — use ?? for safety)
  isDiscountActive?: boolean;
  discountType?: 'Percentage' | 'FixedAmount' | null;
  discountValue?: number | null;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

export interface CreateCategoryRequest {
  nameAr: string;
  descriptionAr?: string;
  imageUrl?: string;
  parentCategoryId?: string | null;
  displayOrder?: number;
  isActive: boolean;
  discountType?: number | null;
  discountValue?: number | null;
  isDiscountActive?: boolean | null;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

export type UpdateCategoryRequest = CreateCategoryRequest;

// ─── Products ─────────────────────────────────────────────────────────────────

/** A display image used in product cards (listing/hover). SortOrder 0 = main, 1 = hover */
export interface ProductDisplayImage {
  id: string;
  imageUrl: string;       // full URL resolved by IPictureUrlResolver
  sortOrder: number;      // 0 = ListingMain, 1 = ListingHover
  altText: string | null;
}

/** Color-specific gallery image (detail page only) */
export interface ProductColorImage {
  id: string;
  imageUrl: string;       // full URL
  displayOrder: number;
  isMain: boolean;
  altText: string | null;
}

/** Size variant for a specific color */
export interface ProductVariant {
  id: string;
  sizeId: string;
  sizeName: string;
  availableQuantity: number;
  priceOverride: number | null;
  isActive: boolean;
  isLowStock: boolean;
}

/** Color with its gallery images and size variants */
export interface ProductColor {
  id: string;
  colorId: string;
  colorName: string;
  colorHex: string | null;
  isDefault: boolean;
  images: ProductColorImage[];   // populated only in detail endpoint
  variants: ProductVariant[];    // populated only in detail endpoint
}

/**
 * Product as returned by both listing and detail endpoints.
 *
 * Image priority for product cards:
 *   primary = listingMainImageUrl ?? mainImageUrl
 *   hover   = listingHoverImageUrl (may be null)
 *
 * Price display:
 *   Always show: finalPrice
 *   Strikethrough: originalPrice  ONLY when hasDiscount == true
 */
export interface ProductResponse {
  id: string;
  nameAr: string;
  slug: string;
  descriptionAr: string | null;

  // Pricing (computed, never stored)
  basePrice: number;
  originalPrice: number;        // same as basePrice when no discount
  finalPrice: number;           // discounted price (always present)
  hasDiscount: boolean;
  discountValue: number | null; // null when hasDiscount == false
  discountType: 'Percentage' | 'FixedAmount' | null;
  discountSource: 'Product' | 'Category' | null;

  categoryId: string;
  categoryName: string;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;

  // Images — listing only uses these three + displayImages[]
  mainImageUrl: string | null;          // legacy fallback (default color's IsMain image)
  listingMainImageUrl: string | null;   // ProductDisplayImage SortOrder 0
  listingHoverImageUrl: string | null;  // ProductDisplayImage SortOrder 1

  displayImages: ProductDisplayImage[]; // included in listing response
  colors: ProductColor[];               // empty in listing, filled in detail

  createdAt: string;
}

export interface ProductFilterParams extends PaginationParams {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  hasDiscount?: boolean;
}

// ─── Product Create / Update DTOs (match POST /api/products) ──────────────────

export interface CreateColorImageDto {
  imageUrl: string;   // relative path from /api/images/upload
  displayOrder: number;
  isMain: boolean;
  altText?: string;
}

export interface CreateVariantDto {
  sizeId: string;
  sizeName: string;
  availableQuantity: number;
  priceOverride?: number | null;
}

export interface CreateColorDto {
  colorId?: string;       // undefined/omit for new colors, ProductColor.Id for existing
  colorName: string;
  isDefault: boolean;
  images: { imageUrl: string; displayOrder: number; isMain: boolean; altText?: string }[];
  sizes: { sizeId?: string; sizeName: string; availableQuantity: number; priceOverride?: number | null }[];
}

export interface CreateDisplayImageDto {
  imageUrl: string;   // relative path
  sortOrder: number;  // 0 or 1
  altText?: string;
}

/** POST /api/products */
export interface CreateProductRequest {
  nameAr: string;
  descriptionAr?: string;
  basePrice: number;
  categoryId: string;
  sizeTypeId: string;
  isActive: boolean;
  isFeatured: boolean;
  includes?: string | null;
  length?: string | null;
  material?: string | null;
  colors: CreateColorDto[];
  displayImages?: CreateDisplayImageDto[] | null; // null = none, exactly 2 when provided
  discountType?: number | null;
  discountValue?: number | null;
  isDiscountActive?: boolean | null;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

/** PUT /api/products/{id}
 *  displayImages: null = keep existing, [] = 400, exactly 2 = replace
 */
export interface UpdateProductRequest {
  nameAr: string;
  descriptionAr?: string;
  basePrice: number;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  includes?: string | null;
  length?: string | null;
  material?: string | null;
  colors?: CreateColorDto[]; // optional, include to replace colors
  displayImages?: CreateDisplayImageDto[] | null;
  discountType?: number | null;
  discountValue?: number | null;
  isDiscountActive?: boolean | null;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productVariantId: string;
  productName: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  productImageUrl: string | null;
}

export interface OrderStatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  governorateId: string;
  governorateName: string;
  city: string;
  detailedAddress: string;
  notes: string | null;
  subTotal: number;
  discountAmount: number;
  couponCode: string | null;
  couponDiscountAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  trackingNumber: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
}

export interface OrderFilterParams extends PaginationParams {
  orderStatus?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UpdateOrderStatusRequest {
  newStatus: number;
  notes?: string;
  trackingNumber?: string;
}

// ─── Order status enum values ─────────────────────────────────────────────────

export const ORDER_STATUS = {
  Pending: 0,
  Confirmed: 1,
  Shipped: 2,
  Delivered: 3,
  Cancelled: 4,
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  Pending: 'قيد الانتظار',
  Confirmed: 'مؤكد',
  Shipped: 'تم الشحن',
  Delivered: 'تم التسليم',
  Cancelled: 'ملغي',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Pending: 'معلق',
  Paid: 'مدفوع',
  Failed: 'فشل',
  Refunded: 'مسترد',
};

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserAddressResponse {
  id: string;
  fullName: string;
  phoneNumber: string;
  governorateId: string;
  governorateName: string;
  city: string;
  detailedAddress: string;
  notes: string | null;
  isDefault: boolean;
}

// ─── Discounts ────────────────────────────────────────────────────────────────

/** discountType: 0=Percentage, 1=FixedAmount */
export const DISCOUNT_TYPE_LABELS: Record<number, string> = {
  0: 'نسبة مئوية',
  1: 'مبلغ ثابت',
};

/** targetType: 0=Product, 1=Category */
export const DISCOUNT_TARGET_LABELS: Record<number, string> = {
  0: 'منتج',
  1: 'فئة',
};

export interface DiscountResponse {
  id: string;
  name: string;
  discountType: string; // "Percentage" | "FixedAmount"
  discountValue: number;
  targetType: string;   // "Product" | "Category"
  targetId: string | null;
  targetName: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isValidNow: boolean;
  createdAt: string;
}

export interface CreateDiscountRequest {
  name: string;
  discountType: number;   // 0 or 1
  discountValue: number;
  targetType: number;     // 0 or 1
  targetId?: string | null;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
}

export type UpdateDiscountRequest = CreateDiscountRequest;

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponResponse {
  id: string;
  code: string;
  description: string | null;
  discountType: string;        // "Percentage" | "FixedAmount"
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isValid: boolean;
  createdAt: string;
}

export interface CreateCouponRequest {
  code: string;
  description?: string;
  discountType: number;
  discountValue: number;
  minimumOrderAmount?: number | null;
  maximumDiscountAmount?: number | null;
  usageLimit?: number | null;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
}

export type UpdateCouponRequest = CreateCouponRequest;

export interface ValidateCouponRequest {
  code: string;
  orderTotal: number;
  userId?: string | null;
}

export interface ValidateCouponResponse {
  isValid: boolean;
  message: string;
  discountAmount: number;
  discountType: string;
}

// ─── Governorates ─────────────────────────────────────────────────────────────

export interface GovernorateResponse {
  id: string;
  nameAr: string;
  shippingCost: number;
  isActive: boolean;
}

export interface UpdateShippingCostRequest {
  shippingCost: number;
}

// ─── Promotions ───────────────────────────────────────────────────────────────

/** POST /api/promotions — type/scope are ints */
export interface CreatePromotionRequest {
  name: string;
  type: number;           // 0=Percentage, 1=Fixed, 2=BuyXGetY, 3=FreeShipping
  scope: number;          // 0=Product, 1=Category, 2=Cart, 3=AllProducts
  value: number;          // ≥ 0 (ignored for FreeShipping)
  minOrderValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  priority?: number;
  isStackable?: boolean;
  allowCouponStacking?: boolean;
  productId?: string | null;
  categoryId?: string | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  getProductId?: string | null;
}

export type UpdatePromotionRequest = CreatePromotionRequest;

/** GET /api/promotions — type/scope come back as strings */
export interface PromotionResponse {
  id: string;
  name: string;
  type: string;           // "Percentage" | "Fixed" | "BuyXGetY" | "FreeShipping"
  scope: string;          // "Product" | "Category" | "Cart" | "AllProducts"
  value: number;
  minOrderValue: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  priority: number;
  isStackable: boolean;
  allowCouponStacking: boolean;
  productId: string | null;
  categoryId: string | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  getProductId: string | null;
  createdAt: string;
}

/** Arabic labels for promotion type — key = backend string value */
export const PROMOTION_TYPE_LABELS: Record<string, string> = {
  Percentage: 'نسبة مئوية',
  Fixed: 'مبلغ ثابت',
  BuyXGetY: 'اشتري X واحصل على Y',
  FreeShipping: 'شحن مجاني',
};

/** Arabic labels for promotion scope */
export const PROMOTION_SCOPE_LABELS: Record<string, string> = {
  Product: 'منتج',
  Category: 'فئة',
  Cart: 'السلة',
  AllProducts: 'جميع المنتجات',
};

// ─── Announcements ────────────────────────────────────────────────────────────

export interface AnnouncementResponse {
  id: string;
  text: string;
  backgroundColor: string;
  redirectUrl: string | null;
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
  isCurrentlyActive: boolean;
  createdAt?: string;
}

export interface CreateAnnouncementRequest {
  text: string;
  backgroundColor: string;
  redirectUrl?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: number;
}

export type UpdateAnnouncementRequest = CreateAnnouncementRequest;

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewImageResponse {
  id: string;
  imageUrl: string;
  displayOrder: number;
}

/** Full review response from both admin and public endpoints */
export interface ReviewResponse {
  id: string;
  productId: string;
  productName: string;         // Correction 2 — explicit
  productImage: string | null; // Correction 2 — explicit (used by featured carousel)
  authorName: string;          // Correction 1 — backend contract field name
  rating: number;
  comment: string | null;
  isFeatured: boolean;
  images: ReviewImageResponse[];
  createdAt: string;
}

/** Alias for detail endpoint (same shape, explicit for code clarity) */
export type ReviewDetailsResponse = ReviewResponse;

/** POST /api/admin/reviews */
export interface CreateReviewRequest {
  productId: string;
  authorName: string;  // Correction 1
  rating: number;      // 1–5
  comment?: string;
  isFeatured: boolean;
}

/** PUT /api/admin/reviews/{id} */
export type UpdateReviewRequest = CreateReviewRequest;

export interface ReorderReviewImagesRequest {
  items: { imageId: string; displayOrder: number }[];
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  recentOrders: OrderResponse[];
  ordersByStatus: { status: string; count: number }[];
}
