# Database design and normalization

## Why these entities?

TableTrail separates reusable restaurant facts from transactions. A branch owns stock and local availability, while the menu and customer directory are shared across the chain. Each recipe connects a dish to the ingredient quantities needed for one serving. Supplier quotes are separate from recipes because an ingredient may be available from several suppliers.

An order references exactly one branch, customer, and employee. Its items preserve the selling price at order creation. One promotion is allowed per order, and its percentage is also preserved. A completed order has one payment. Feedback belongs to the order, so its customer and branch are obtained through joins rather than duplicated.

## Relational schema

`PK` = primary key; `FK` = foreign key; `UQ` = unique candidate key. All columns are mandatory unless marked nullable. Auto-increment IDs are surrogate keys; unique emails/names/codes are natural candidate keys.

| Relation             | Key and main attributes                                                               | Relationships / purpose                                 |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| branches             | id PK; name UQ; city; active                                                          | Shared branch identity                                  |
| customers            | id PK; email UQ; name; phone nullable                                                 | Shared customer directory                               |
| employees            | id PK; email UQ; name; password_hash; role; active; branch_id FK nullable             | Branch mandatory for manager/staff; admin may be global |
| menu_categories      | id PK; name UQ                                                                        | Groups dishes                                           |
| menu_items           | id PK; name UQ; category_id FK; price; active                                         | One category per dish                                   |
| branch_menu          | (branch_id FK, menu_item_id FK) PK; available                                         | Branch–dish M:N relationship                            |
| ingredients          | id PK; name UQ; unit                                                                  | One consistent base unit per ingredient                 |
| suppliers            | id PK; name UQ; email UQ                                                              | Supplier directory                                      |
| supplier_ingredients | (supplier_id FK, ingredient_id FK) PK; unit_cost                                      | Supplier–ingredient M:N quotes                          |
| recipes              | (menu_item_id FK, ingredient_id FK) PK; quantity                                      | Dish–ingredient M:N quantities per serving              |
| inventory            | (branch_id FK, ingredient_id FK) PK; quantity; threshold                              | Branch–ingredient M:N stock                             |
| inventory_log        | id PK; (branch_id,ingredient_id) composite FK; old_quantity; new_quantity; changed_at | Trigger-generated stock history                         |
| promotions           | id PK; code UQ; discount_percent; starts_on; ends_on                                  | Promotion validity                                      |
| marketing_campaigns  | id PK; name; promotion_id FK; channel; budget                                         | Basic campaign records                                  |
| orders               | id PK; branch_id FK; customer_id FK; employee_id FK; status; created_at               | Order header                                            |
| order_items          | (order_id FK,menu_item_id FK) PK; quantity; unit_price                                | Order–dish M:N with price snapshot                      |
| order_promotions     | order_id PK/FK; promotion_id FK; discount_percent                                     | Zero or one promotion per order; historical percentage  |
| payments             | id PK; order_id FK/UQ; amount; method; paid_at                                        | Zero or one payment; exactly one for a completed order  |
| customer_feedback    | order_id PK/FK; rating; comment; created_at                                           | Zero or one feedback entry per completed order          |

## Cardinality and optionality

- A branch can have zero or many employees, orders, stock rows, and available dishes.
- A customer can have zero or many orders; every order must reference a customer.
- A menu category can have zero or many dishes; every dish has exactly one category.
- A dish and ingredient are many-to-many through recipes; the composite key prevents duplicate recipe ingredients.
- Branches and ingredients are many-to-many through inventory; quantity depends on both keys.
- Orders and dishes are many-to-many through order_items; repeated quantities share one line.
- An order has zero or one payment and zero or one feedback row. UNIQUE/order PK constraints enforce the 1:1 upper bound. Checkout and feedback validation enforce the required business state.
- Promotions can occur on many orders; an order can have zero or one promotion. This scope intentionally disallows stacked discounts.
- A campaign refers to one promotion; a promotion can support multiple campaigns. Sales are attributed to the promotion, not to a specific campaign channel.

## Normalization

**1NF:** columns contain single values. Order items, recipe ingredients, and supplier quotes are rows, not comma-separated lists.

**2NF:** in a composite-key table, non-key attributes depend on the complete key. Inventory quantity depends on both branch and ingredient. Recipe quantity depends on both dish and ingredient. Supplier price depends on supplier and ingredient. Names belong in their parent tables.

**3NF:** no non-key attribute determines an unrelated non-key attribute inside the same relation. A menu item stores category_id, not category name. An order stores customer_id, not customer email. Feedback stores order_id, not the branch/customer copied from the order. Branch and customer report totals are computed rather than stored as mutable summaries.

**Historical facts:** order_items.unit_price is the agreed selling price for that particular order, not a redundant copy that must follow today's menu price. order_promotions.discount_percent is the agreed discount, not today's promotion setting. payments.amount is the amount paid. These are facts about transactions.

The small inventory audit log intentionally records before/after values to explain changes. It is an append-only history generated by a trigger, not a second writable inventory balance.

## Checkout transaction

1. Validate the signed session, branch access, order ID, and payment method.
2. Start an InnoDB transaction and lock the order row using `SELECT ... FOR UPDATE`.
3. Call `complete_order`. It rejects non-pending and empty orders and missing recipes.
4. A cursor groups recipe requirements by ingredient, sorted by ingredient ID.
5. For each ingredient, `UPDATE inventory SET quantity=quantity-needed WHERE quantity>=needed` obtains the stock row lock and prevents negative stock. A missing row or insufficient quantity raises a SQL exception.
6. The inventory trigger writes old/new quantities inside the same transaction.
7. Insert the one payment, using `order_total`, then mark the order completed.
8. Commit everything; on any error, roll back inventory, audit rows, payment, and status together.

Two requests for the same order serialize on its row lock. Two orders competing for stock serialize on inventory row locks. Duplicate payment is independently prevented by `payments.order_id UNIQUE`. Deadlocks return a retryable 409 response. Orders do not reserve ingredients while pending.

The stored procedure expects its caller to own the transaction; the API and setup script do so. To demonstrate it manually, use `START TRANSACTION; CALL complete_order(id,'cash'); COMMIT;` and issue `ROLLBACK` if the call fails. Do not call it in autocommit mode. Database access is for trusted administrators; application users interact through the API.

Recipe quantities in effect at completion are used. For this college scope, historical recipe revisions and stock reservation are future work. Completed orders have no edit API. Cancellation is supported only before payment, so no reverse stock deduction is needed.

## Concept-to-code map

| DBMS concept                         | Concrete implementation                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Primary keys                         | All tables; surrogate IDs and composite junction keys                                        |
| Candidate keys / UNIQUE              | Employee/customer email, promotion code, branch name                                         |
| Foreign keys / referential integrity | orders references branches/customers/employees; invalid references fail                      |
| Composite FK                         | inventory_log references the branch + ingredient inventory key                               |
| NOT NULL / DEFAULT                   | Orders default to pending; active/available default to true                                  |
| CHECK                                | Positive prices/recipe quantities, nonnegative inventory, ratings 1–5, valid promotion dates |
| 1:1                                  | Order–payment and order–feedback                                                             |
| 1:N                                  | Branch–orders; category–menu items                                                           |
| M:N                                  | Recipes, inventory, supplier quotes, branch menu, order items                                |
| INNER / LEFT / RIGHT JOIN            | queries.sql examples 1–3                                                                     |
| GROUP BY / HAVING / aggregate        | Repeat customers and category sales in queries.sql                                           |
| Nested / correlated subquery         | Above-average spenders and cheapest supplier quotes                                          |
| Views                                | low_stock, branch_performance, customer_insights, promotion_performance                      |
| Stored function                      | order_total(order_id): rounded discounted payable amount                                     |
| Stored procedure                     | complete_order: inventory consumption and payment                                            |
| Triggers                             | inventory_audit; feedback_completed; order_transition                                        |
| Transactions                         | db.js transaction helper; checkout, creation, recipes, feedback, stock updates               |
| Indexing                             | Branch/status/date history; customer/status; branch/audit timestamp                          |

## Reporting definitions

- Net revenue = recorded payment amounts, after discounts, across completed orders.
- Gross item/category sales = quantity × historical unit price, before discounts.
- Average order value = net revenue / completed orders.
- Global customer card = all registered customers; branch card = distinct paying customers served there.
- Repeat customer = more than one completed order in the selected scope.
- Low stock = quantity strictly below threshold. Equality is healthy.
- Best sellers = completed-order units, all time, top five.
- Dashboard chart = payments in the last seven calendar days. Only dates with payments appear.
- Ratings = average of all recorded feedback in the selected scope.
- Branch filter applies to dashboard/reports/orders/inventory. Shared catalogue management remains global.

## Design limits

Money uses DECIMAL with two decimal places, and stock uses three. The backend uses parameterized values; dynamic table/column identifiers come only from a fixed server allowlist. Menu ingredient units should be treated as fixed once used; changing a unit requires separately converting recipe, stock, threshold, and supplier cost values. The interface will prevent edits to an existing unit.
