# TableTrail — project report

## Abstract

TableTrail is a centralized restaurant database application that connects multiple branches, customer orders, menu recipes, ingredient inventory, suppliers, promotions, and feedback. It uses a normalized MySQL schema with an Express API and a Next.js interface. Its central workflow completes an order, records payment, and consumes recipe ingredients atomically. The project demonstrates relational design, constraints, joins, views, stored routines, triggers, transactions, and indexes through practical restaurant operations.

## Problem statement

Separate spreadsheets or branch-level records make it difficult to reconcile orders, ingredient consumption, and revenue. Manually deducted stock can become inconsistent, and managers lack a reliable view of branch performance and customer visits.

## Objectives

1. Store restaurant facts once in a normalized relational model.
2. Maintain valid customer, branch, menu, and order relationships.
3. Prevent duplicate payment and ingredient overselling.
4. Provide meaningful branch, customer, menu, promotion, and stock reports.
5. Keep employee access appropriate to role and assigned branch.
6. Produce a small project students can run and explain.

## Existing system

A typical manual approach records sales and stock in separate registers or spreadsheets. Updates rely on staff copying information between them. Reports require manual aggregation, duplicates are easy to introduce, and concurrent changes can be lost. This is a problem scenario, not a claim that a specific restaurant was surveyed.

## Proposed system

A shared database stores branch facts, global menu/customer records, recipes, stock, orders, payments, promotions, and feedback. The API supplies validation, authentication, and transaction boundaries. Managers view SQL-backed reports; staff create orders and record payment; customers submit feedback through a receipt link.

## Functional requirements

- Maintain branches, employees, customer details, categories, dishes, ingredients, recipes, suppliers, and quotes.
- Maintain branch stock thresholds and menu availability.
- Create a pending order with one or more dishes and optionally one promotion.
- Complete the order with cash/card/UPI recorded as a method; automatically consume ingredients.
- Cancel pending orders; reject repeated completion and cancellation after payment.
- Show net revenue, completed orders, active branches, customer visits, best sellers, low stock, category performance, promotions, and feedback.
- Store campaign name/channel/budget linked to a promotion; do not send marketing messages.
- Restrict access to role and branch.

## Non-functional requirements

- Integrity: foreign keys, checks, uniqueness and transactional updates.
- Security: hashed passwords, signed HTTP-only cookies, validation, parameterized SQL, environment-based secrets, role/branch enforcement.
- Maintainability: small modules, named React components, clear SQL files, lockfile and focused commits.
- Usability: responsive forms, loading/error feedback, readable reports and empty states.
- Reproducibility: documented setup, realistic seed data, automated tests and CI.

## Design and implementation

The [ER diagram](../er-diagram/README.md) and [normalization analysis](../architecture/database-design.md) explain all 19 tables. The [architecture](../architecture/README.md) traces the browser-to-database request path. Executable SQL lives in the database folder, with the suggested query demonstrations in queries.sql.

The project uses price and discount snapshots for orders. Inventory consumption uses the recipe at payment completion. Stock updates and their audit trigger occur in the same transaction as payment, so errors do not leave partial changes. The one-payment constraint also protects against duplicate submissions.

## Test cases and results

See [testing.md](testing.md) for the test matrix and verified run. The repository's GitHub Actions workflow starts a temporary MySQL 8.4 service and tests actual SQL execution. This avoids depending on a reviewer's existing database or passwords.

## Demonstration script (5–7 minutes)

1. Sign in as admin and show the three branches and SQL-backed dashboard.
2. Open Manage → Recipes & costs. Explain one dish's ingredients and the composite key.
3. Open Inventory and note the rice balance for Jubilee Hills.
4. Create a Paneer Rice Bowl order for Aarav, optionally apply WELCOME10.
5. View the pending order, then complete payment. Explain the transaction and stored procedure.
6. Revisit inventory: rice decreases by 150 g and paneer by 100 g per bowl.
7. Open the completed order's customer feedback link and submit a rating.
8. Open Reports to show customer spending, promotions and feedback.
9. Log in as manager/staff and show the narrower navigation and branch scope.
10. In MySQL, run SELECT * FROM low_stock and inspect inventory_log. Show the query examples and explain a JOIN/HAVING query.

## Results

The implementation connects restaurant workflows to concrete relational operations. Its sample data spans three branches and supports meaningful aggregate reports. Checkout maintains stock/payment consistency, and access checks separate global administration from branch operations. Screenshots and automated test evidence are supplied with the final repository.

## Future scope

Add recipe revision history, purchase-order receipts, refunds and reversals, split payments, table reservations, customer accounts, and campaign delivery/attribution. These features are deliberately outside the compact submission.

## Conclusion

TableTrail demonstrates how normalized relationships, constraints, stored routines and transactions solve practical restaurant data problems. The interface makes these database operations visible without obscuring them behind a large application framework.
