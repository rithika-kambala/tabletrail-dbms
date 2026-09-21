# API reference

Base URL: `/api` through Next.js, or `http://127.0.0.1:4000/api` directly. JSON bodies are required for writes. Use the session cookie returned by login. GET requests return objects/arrays; errors return `{ "error": "Readable explanation" }`.

## Authentication

| Method / route    | Body / result                                    |
| ----------------- | ------------------------------------------------ |
| POST /auth/login  | `{email,password}`; sets HttpOnly session cookie |
| GET /auth/me      | Current id, name, email, role, branch_id         |
| POST /auth/logout | `{}`; clears cookie                              |
| GET /health       | `{status:"ok"}` after a database check           |

Sessions expire after eight hours. Inactive users are rejected on every authenticated request. An admin may edit other employees but cannot deactivate/demote their own account.

## Orders — all employee roles, own branch unless admin

| Method / route            | Body / result                                                                    |
| ------------------------- | -------------------------------------------------------------------------------- |
| GET /orders?branch_id=1   | Most recent 100 orders, totals, status, customer, branch                         |
| GET /orders/:id           | Items, historical prices, current total; completed orders include feedback_token |
| POST /orders              | `{branch_id,customer_id,promotion_id:null,items:[{menu_item_id,quantity}]}`      |
| POST /orders/:id/complete | `{method:"cash"}`; cash/card/upi; records payment and deducts stock              |
| POST /orders/:id/cancel   | `{}`; pending orders only                                                        |
| POST /orders/:id/feedback | `{rating:5,comment:"Good service"}`; one per completed order                     |

Creation returns 201 with `{id}`. Prices and discount values are read from the database, never accepted from the client. Quantities must be integers from 1 to 50. Each dish can appear only once per submitted order; increase its quantity instead.

## Catalogue management

GET `/:resource`, POST `/:resource`, PUT `/:resource/:id` for the resources below. PUT supplies the complete editable record. Admin can write all resources; all employees can add/edit customers. Employee listing and edits are admin-only. Branch listings are restricted to the user's branch except for admin. Shared catalogue reads are available to authenticated employees.

| Resource    | Editable fields                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| branches    | name, city, active                                                                                              |
| employees   | name, email, role, branch_id (null for global admin), active, password (required on creation; optional on edit) |
| customers   | name, email, phone (optional)                                                                                   |
| categories  | name                                                                                                            |
| menu        | name, category_id, price, active                                                                                |
| ingredients | name, unit (g/ml/piece; existing units cannot change)                                                           |
| suppliers   | name, email                                                                                                     |
| promotions  | code, discount_percent, starts_on, ends_on (YYYY-MM-DD)                                                         |
| campaigns   | name, promotion_id, channel (email/social/in-store), budget                                                     |

New branches automatically receive inventory and branch-menu rows. New ingredients receive stock rows in each branch. New dishes receive branch availability rows but cannot be ordered until a recipe exists. There are no delete endpoints: deactivate where supported to preserve foreign-key history.

## Recipes, inventory, availability and quotes

| Method / route                     | Access              | Body / result                                                            |
| ---------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| GET /recipes                       | Employees           | Joined dish/ingredient quantities                                        |
| PUT /recipes/:menuItemId           | Admin               | `[{ingredient_id:1,quantity:150},...]`; replaces whole recipe atomically |
| GET /inventory?branch_id=1         | Admin / manager     | Ingredient, branch, quantity, unit, threshold                            |
| PUT /inventory/:branch/:ingredient | Admin / own manager | `{add:500,threshold:1000}`; adds stock, sets threshold                   |
| GET /availability?branch_id=1      | Employees           | Own branch for manager/staff                                             |
| PUT /availability/:branch/:item    | Admin / own manager | `{available:false}`                                                      |
| GET /supplier-quotes               | Admin / manager     | Cost per ingredient base unit                                            |
| PUT /supplier-quotes               | Admin               | `{supplier_id,ingredient_id,unit_cost}`; creates or updates a quote      |

## Reports and public feedback

GET `/analytics?branch_id=1` is restricted to admin/manager. Returns summary, branch performance, lowStock, bestSellers, daily net revenue, customer spending, favorite items, promotions, category sales, and feedback. Managers are always scoped to their branch, even if they submit a different query parameter. Admin may omit the filter for global results.

GET `/feedback/:token` returns only order ID, branch, and whether feedback already exists. POST to the same route accepts `{rating,comment}`. No employee session is needed; the signed, order-specific token expires after 30 days. Employees obtain the link from a completed order's detail view. It is a bearer link: give it only to that order's customer.

## Status codes

200 success; 201 created; 400 invalid input or relation; 401 not signed in; 403 wrong role/branch/origin; 404 missing record/route; 409 duplicate, insufficient stock, finalized order, or transaction conflict; 415 wrong content type; 429 too many login attempts; 500 unexpected server failure. Database credentials, password hashes, and SQL statements are never returned to the client.
