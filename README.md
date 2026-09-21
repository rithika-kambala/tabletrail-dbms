# TableTrail

**Track every order. Understand every customer. Run every branch smarter.**

A compact college DBMS project for a multi-branch restaurant. Built with Next.js, React, Tailwind CSS, Express, and MySQL. The database drives the dashboard, order checkout, ingredient deductions, and customer reports.

## Features

- Admin: manage branches, employees, menu, ingredients, recipes, suppliers, promotions, and campaigns.
- Branch manager: branch reports, inventory restocking, availability, orders, and feedback.
- Staff: customer records, order creation, payment recording, and feedback collection.
- Customers: submit feedback through an order-specific receipt link, without an employee login.
- Transactions prevent overselling and duplicate payments. A trigger audits stock changes.
- Net revenue, popular dishes, category sales, repeat guests, promotions, and low stock reports.

## Quick start

Requires Node.js 22+, npm, and MySQL 8.0.16+ (8.4 recommended).

```bash
git clone https://github.com/rithika-kambala/tabletrail-dbms.git
cd tabletrail-dbms
npm ci
cp backend/.env.example backend/.env
```

Create a database and a local database user using your MySQL administrator account. Replace the placeholder password:

```sql
CREATE DATABASE tabletrail CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'tabletrail'@'localhost' IDENTIFIED BY 'YOUR_OWN_DATABASE_PASSWORD';
GRANT ALL PRIVILEGES ON tabletrail.* TO 'tabletrail'@'localhost';
-- For this local teaching database: allow trusted schema users to create stored functions.
SET GLOBAL log_bin_trust_function_creators = 1;
```

Edit `backend/.env`: set `DB_PASSWORD`, a random `JWT_SECRET` (at least 32 characters), and your own `DEMO_PASSWORD` (10–72 characters). Keep DB_HOST=127.0.0.1. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
npm run db:setup
npm run dev
```

Open **http://localhost:3000**. The API runs on port 4000. Setup creates 3 branches, 5 employees, 6 customers, 4 dishes, and 36 paid orders. It **refuses to overwrite any existing tables**.

## Sample credentials

| Email                   | Role    | Branch        |
| ----------------------- | ------- | ------------- |
| admin@tabletrail.test   | Admin   | All branches  |
| manager@tabletrail.test | Manager | Jubilee Hills |
| staff@tabletrail.test   | Staff   | Jubilee Hills |
| staff2@tabletrail.test  | Staff   | Indiranagar   |
| staff3@tabletrail.test  | Staff   | Anna Nagar    |

All demo users use the `DEMO_PASSWORD` you chose during setup. No actual password is stored in this repository. Editing `.env` later does not reset existing accounts; use the employee editor for that.

## Project structure

```text
frontend/       Next.js application and Tailwind styles
backend/        Express routes, validation, setup script and tests
database/       Schema, seed data, queries, views, procedures, functions, triggers, indexes
docs/           Design, report, API reference, Git guide and viva preparation
screenshots/    Real browser screenshots from the tested application
tests/          Playwright browser tests
```

See [database design](docs/architecture/database-design.md), [ER diagram](docs/er-diagram/README.md), [API reference](docs/architecture/api.md), [project report](docs/project-report/report.md), and [Git guide](docs/git-workflow.md).

## Running and testing

```bash
npm test                 # validation tests; no database required
npm run build            # production frontend build
npm start                # API + built frontend
```

Integration tests modify data: use a **separate, freshly seeded database** whose name ends in `_test`. Set `DB_NAME=tabletrail_test`, grant your test database user access to it, and run `npm run db:setup`, then `npm run test:integration`. Use another fresh demo database for `npm run test:e2e`; install Chromium first with `npx playwright install chromium`. GitHub Actions performs these steps automatically using temporary secrets and an isolated MySQL service.

A production deployment needs HTTPS, `NODE_ENV=production`, and the real `APP_ORIGIN`. This project records payment methods; it does not charge cards or contact a payment provider.

## Environment variables

| Variable              | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| DB_HOST / DB_PORT     | MySQL address; defaults to 127.0.0.1:3306                           |
| DB_USER / DB_PASSWORD | Database credentials                                                |
| DB_NAME               | Database name, default tabletrail                                   |
| JWT_SECRET            | Random secret for signed sessions and scoped receipt links          |
| DEMO_PASSWORD         | Initial password used only by setup and tests                       |
| PORT                  | API port, default 4000                                              |
| APP_ORIGIN            | Allowed browser origin, default http://localhost:3000               |
| NODE_ENV              | development locally; production requires HTTPS cookies              |
| API_URL               | Optional frontend server setting; defaults to http://127.0.0.1:4000 |

## DBMS concepts

Primary and candidate keys, foreign keys, composite keys, UNIQUE/NOT NULL/CHECK/DEFAULT constraints, 1NF–3NF, 1:1/1:N/M:N relationships, INNER/LEFT/RIGHT joins, GROUP BY/HAVING, aggregates, nested/correlated queries, views, stored procedures and functions, triggers, transactions, and indexing. Each is mapped to its implementation in the database design document.

## Learning and submission

- [17 development phases](docs/development-phases.md)
- [Test matrix](docs/project-report/testing.md)
- [Implementation-specific viva answers](docs/project-report/viva.md)
- [Team Git workflow](docs/git-workflow.md)

Reference documentation: [Next.js setup](https://nextjs.org/docs/app/getting-started/installation) and [MySQL stored routines](https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html).

## Team members

Rithika Kambala. Add collaborating students here before submission.

## Future scope

Purchase orders, refunds, customer accounts, and email campaign delivery. Campaigns currently store their promotion, channel, and budget; promotional order performance is reported without sending email.

## License

MIT. See [LICENSE](LICENSE).
