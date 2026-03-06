// ─── Common ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
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

// ─── Categories ───────────────────────────────────────────────────────────────

export interface CategoryResponse {
  id: string;
  nameAr: string;
  slug: string;
  descriptionAr: string;
  imageUrl: string;
  parentCategoryId: string | null;
  parentCategoryName: string;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  subCategories: CategoryResponse[];
}

export interface CreateCategoryRequest {
  nameAr: string;
  descriptionAr?: string;
  imageUrl?: string;
  parentCategoryId?: string | null;
  displayOrder?: number;
  isActive: boolean;
}

export type UpdateCategoryRequest = CreateCategoryRequest;

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductColorImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isMain: boolean;
  altText: string;
}

export interface ProductVariant {
  id: string;
  sizeId: string;
  sizeName: string;
  availableQuantity: number;
  price: number;
  isActive: boolean;
  isLowStock: boolean;
}

export interface ProductColor {
  id: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  isDefault: boolean;
  images: ProductColorImage[];
  variants: ProductVariant[];
}

export interface ProductResponse {
  id: string;
  nameAr: string;
  slug: string;
  descriptionAr: string;
  basePrice: number;
  percentageDiscount?: number | null;
  fixedAmountDiscount?: number | null;
  discountedPrice: number;
  discountPercentage: number;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  mainImageUrl: string;
  createdAt: string;
  colors: ProductColor[];
}

export interface ProductFilterParams extends PaginationParams {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  hasDiscount?: boolean;
}

export interface CreateProductRequest {
  nameAr: string;
  descriptionAr?: string;
  basePrice: number;
  percentageDiscount?: number | null;
  fixedAmountDiscount?: number | null;
  categoryId: string;
  sizeTypeId?: string;
  isActive: boolean;
  isFeatured: boolean;
  colorId?: string;
  sizeId?: string;
  availableQuantity?: number;
  priceOverride?: number | null;
}

/** Request body for POST /products/batch — add product(s) using slugs/names */
export interface AddProductImageItem {
  imageUrl: string;
  displayOrder: number;
  isMain: boolean;
  altText?: string;
}

export interface AddProductSizeItem {
  sizeName: string;
  availableQuantity: number;
  priceOverride: number | null;
}

export interface AddProductColorItem {
  colorName: string;
  isDefault: boolean;
  images: AddProductImageItem[];
  sizes: AddProductSizeItem[];
}

export interface AddProductItem {
  nameAr: string;
  slug: string;
  descriptionAr: string;
  basePrice: number;
  percentageDiscount?: number | null;
  fixedAmountDiscount?: number | null;
  categorySlug: string;
  sizeType: string;
  isActive: boolean;
  isFeatured: boolean;
  colors: AddProductColorItem[];
}

export interface AddProductBatchRequest {
  products: AddProductItem[];
}

export interface UpdateProductRequest {
  nameAr: string;
  descriptionAr?: string;
  basePrice: number;
  percentageDiscount?: number | null;
  fixedAmountDiscount?: number | null;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  colors?: AddProductColorItem[];
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
  productImageUrl: string;
}

export interface OrderStatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  notes: string;
  createdAt: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  governorateName: string;
  city: string;
  detailedAddress: string;
  notes: string;
  subTotal: number;
  discountAmount: number;
  couponCode: string;
  couponDiscountAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  trackingNumber: string;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
}

export interface OrderFilterParams extends PaginationParams {
  orderStatus?: string;
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
  notes: string;
  isDefault: boolean;
}

// ─── Discounts ────────────────────────────────────────────────────────────────

export interface DiscountResponse {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
  targetType: string;
  targetId: string | null;
  targetName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDiscountRequest {
  name: string;
  discountType: number;
  discountValue: number;
  targetType: number;
  targetId?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponResponse {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number;
  usageLimit: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isValid: boolean;
  createdAt: string;
}

export interface CreateCouponRequest {
  code: string;
  description?: string;
  discountType: number;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ─── Governorates ─────────────────────────────────────────────────────────────

export interface GovernorateResponse {
  id: string;
  nameAr: string;
  shippingCost: number;
  isActive: boolean;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: OrderResponse[];
  ordersByStatus: { status: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}
