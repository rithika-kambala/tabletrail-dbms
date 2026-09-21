# Development phases and study order

The requested phases are recorded here so you can study the finished project in order. Your approval allowed implementation to continue without waiting after every phase.

| Phase                     | What and why                                                      | Where to study                        | Verify / expected result                                       |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| 1. Requirements           | Keep the project focused on database-backed restaurant operations | README.md, project-report/report.md   | Three employee roles, customer receipt feedback, compact scope |
| 2. ER diagram             | Make relationships and optionality explicit                       | er-diagram/README.md                  | GitHub renders the Mermaid diagram                             |
| 3. Relational schema      | Translate entities into PK/FK/junction tables                     | database/schema.sql                   | 19 tables                                                      |
| 4. Normalization          | Explain 1NF, 2NF and 3NF and historical facts                     | architecture/database-design.md       | No repeated customer/category names in orders/items            |
| 5. MySQL                  | Enforce referential and domain integrity                          | schema.sql and indexes.sql            | Setup creates constraints and keys                             |
| 6. Sample data            | Support meaningful demonstrations                                 | seed.sql, backend/scripts/setup.js    | 3 branches, 36 paid orders                                     |
| 7. SQL queries            | Demonstrate joins, groups and nested queries                      | database/queries.sql                  | Run examples in MySQL                                          |
| 8. Views                  | Reuse low-stock and performance queries                           | database/views.sql                    | SELECT * FROM low_stock                                        |
| 9. Routines               | Compute totals and implement checkout                             | functions.sql, procedures.sql         | Discounted totals and grouped ingredient usage                 |
| 10. Triggers/transactions | Prevent partial updates and audit inventory                       | triggers.sql, backend/src/db.js       | Rollback and concurrency tests pass                            |
| 11. API                   | Connect validated requests to SQL                                 | backend/src/, architecture/api.md     | Correct status codes, role and branch restrictions             |
| 12. Frontend              | Make operations easy to demonstrate                               | frontend/app/, frontend/components/   | Login, orders, inventory and management screens                |
| 13. Dashboard             | Display real aggregates                                           | analytics.js, components/Dashboard.js | Totals reconcile to payments                                   |
| 14. Auth                  | Secure all exposed operations before use                          | auth.js, app.js                       | Staff cannot call admin/manager endpoints                      |
| 15. Testing               | Check the database and browser workflow                           | project-report/testing.md             | Green GitHub Actions run                                       |
| 16. GitHub/docs           | Make team work and setup reproducible                             | README.md, git-workflow.md            | Focused commits, ignored secrets, lockfile                     |
| 17. Viva                  | Explain the actual implementation                                 | project-report/viva.md                | Short answer, explanation and code reference for each question |

Authentication middleware was wired before exposing the API so intermediate builds never offered unauthenticated management access; phase 14 covers its complete user-facing integration and verification.

## Essential commands

```bash
npm ci
cp backend/.env.example backend/.env
# Set your own database credentials and generated secrets in backend/.env.
npm run db:setup
npm run dev
npm test
npm run build
```

Exact file contents are already in the repository; do not paste duplicate code into new files. Read one feature at a time, run it, then trace its API request to the SQL. Use the Git guide to see which files belong together and how to commit your next improvement.
