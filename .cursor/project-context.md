Critical files:

* backend Program.cs
* dashboard src/api/client.ts
* storefront src/api/apiConfig.ts
* dashboard src/types/index.ts

Frozen contracts:

* ApiResponse envelope
* Pagination response
* Refresh token contract
* Cart token header
* Image upload contract

Sensitive zones:

* auth
* cart
* pricing
* discount logic
* image rendering
* production URLs

Rule:
Never modify sensitive zones without tracing all usages first.
