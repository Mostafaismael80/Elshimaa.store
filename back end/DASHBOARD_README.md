# Elshima Admin Dashboard

The Elshima Admin Dashboard is a modern, responsive, and robust React-based web application for managing the Elshima e-commerce platform. It provides comprehensive tools for administrators to oversee products, orders, customers, discounts, promotions, and categories.

## Tech Stack Overview

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite targetting modern browsers
- **State & Data Fetching**: TanStack Query v5 (React Query)
- **Forms & Validation**: React Hook Form + Zod
- **Styling**: Tailwind CSS + Radix UI primitives
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Charts**: Recharts

## Architecture & Data Flow

The dashboard follows a clean, modular architecture separating UI components from API logic and state management:

1. **API Layer (`src/api/*`)**: Centralized Axios client (`client.ts`) with dedicated services for each domain (`products.ts`, `orders.ts`, etc.). It includes an Axios interceptor that automatically handles `401 Unauthorized` responses by attempting a silent token refresh via `/api/auth/refresh-token`.
2. **Types Layer (`src/types/index.ts`)**: Strictly typed interfaces ensuring parity with the backend ASP.NET Core API DTOs. Includes discriminated properties for product pricing, discount enums (0/1), order statuses, and paginated responses.
3. **Context Layer (`src/context/*`)**: Provides global state. `AuthContext` manages user sessions, JWT/Refresh tokens in `localStorage`, and provides granular role-based access control (RBAC).
4. **Pages (`src/pages/*`)**: Route-level components mapping directly to major dashboard features. Each page intelligently handles its own data fetching via `useQuery` and mutations via `useMutation`, keeping the UI perfectly consistent with backend state.

## Core Features & Capabilities

- **Dashboard KPIs**: Real-time insights into total revenue, orders, active products, and customer counts, visualised using Recharts.
- **Product Management**: Full CRUD operations with support for extended details (`Includes`, `Length`, `Material`). Supports dedicated Color Image uploads (for detail galleries) and Display Image uploads (exactly 2 sequence images for listing/hover effects). Complex variant tracking via `sizeTypeId` and `colorId`.
- **Order Processing**: Track end-to-end order lifecycles. Update statuses via modal (Pending → Confirmed → Shipped → Delivered), attach tracking numbers/notes, and preview order line items and customer addresses. Safely blocks cancellation for shipped/delivered orders.
- **Category Hierarchy**: Tree-like category management handling `parentCategoryId` relationships and multipart form uploads for category thumbnails.
- **Dynamic Pricing & Discounts**: Granular discount Engine (Fixed Amount vs Percentage) targeting the entire store, specific categories, or single products. Validates coupon constraints (max uses, min order value).
- **Governorates**: Read-only listing of support governorates and dynamic shipping costs directly from the backend.
- **Review Moderation**: Admin interface to moderate customer reviews, specifically focusing on uploading, reordering, and deleting user-submitted review imagery.
- **Global Announcements**: CRUD interface for scheduling and styling (Hex color constraints) site-wide promotional banners that integrate with the backend's memory cache.
- **Promotions Engine**: Full admin management (Create/Update/Delete) of cart-level promotions including Percentage, Fixed, BuyXGetY, and FreeShipping types with priority-based stacking and coupon conflict control.

## Image Handling Guidelines

Images in the dashboard are handled cleanly via separated backend endpoints:

- **Entity Thumbnails (Categories)**: Uses a direct multipart upload endpoint `POST /api/categories/with-image` to create the entity and upload the image simultaneously.
- **Product Galleries (Colors & Display Images)**: Follows a decoupled "upload then link" model. Images are POSTed to `/api/images/upload`. The backend returns a relative path (e.g. `products/some-guid.jpg`). This relative path is passed into the product JSON payload (`POST /api/products`). The backend's `IPictureUrlResolver` dynamically constructs full absolute URLs at read time. 
- **Review Images**: Reuses the core image upload service natively (`POST /api/admin/reviews/{id}/images`) to tie review photos explicitly to customer feedback without frontend path manipulation.

Product Card UI uses a fallback pattern for its thumbnail: `listingMainImageUrl ?? mainImageUrl`.

## Setup & Running Locally

1. Ensure the ASP.NET Core API is running locally (e.g., `https://localhost:7208`).
2. Clone the repository and navigate to `elshima-dashboard`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Navigate to `http://localhost:5173` and log in with an Admin account.
