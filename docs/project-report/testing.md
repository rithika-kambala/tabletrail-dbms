# Testing and evidence

The [GitHub Actions workflow](https://github.com/rithika-kambala/tabletrail-dbms/actions/workflows/ci.yml) runs against a temporary MySQL 8.4 service with secrets generated for each run. Check the latest green run for the exact tested revision. Tests do not need your local database credentials.

## Verified result — 21 September 2026

[Run 35560191216](https://github.com/rithika-kambala/tabletrail-dbms/actions/runs/35560191216) passed on application revision `7ea9b0c`: **6 validation + 18 MySQL integration + 2 browser tests = 26 passing tests**. MySQL setup, all submitted SQL examples, production build, and formatting checks also passed. The later handoff commit adds documentation and these verified screenshots; application code is unchanged.

Screenshots were reviewed at desktop and mobile widths. Narrow tables scroll within their panels instead of widening the page. Dependency audit at handoff reported zero known vulnerabilities.

Local server startup was restricted by the build workspace, so the integration and browser checks ran against real MySQL 8.4 in GitHub Actions. These results are not based on a mocked database.

## Test matrix

| Check                                                                      | Expected result                                                             | Implementation        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Valid/invalid order quantities and repeated items                          | Valid input accepted; invalid input rejected                                | validation.test.js    |
| Feedback bounds, promotion dates, duplicate ingredients, branch assignment | Domain rules enforced                                                       | validation.test.js    |
| Missing session / wrong password                                           | 401                                                                         | integration.test.js   |
| Staff changes menu or requests analytics                                   | 403                                                                         | integration.test.js   |
| Cross-branch orders, stock and reports                                     | Write rejected; reads scoped to own branch                                  | integration.test.js   |
| Malformed input / injection-shaped email / foreign origin                  | 400, 415 or 403 as appropriate                                              | integration.test.js   |
| Order creation and promotion                                               | Price comes from database; stock unchanged while pending                    | integration.test.js   |
| Successful checkout                                                        | Exact discounted payment and recipe deduction                               | integration.test.js   |
| Duplicate checkout                                                         | 409; no second payment or deduction                                         | integration.test.js   |
| Insufficient ingredient after earlier ingredient succeeds                  | Entire transaction and audit roll back                                      | integration.test.js   |
| Concurrent orders for one serving                                          | Exactly one succeeds; stock never negative                                  | integration.test.js   |
| Feedback on pending order or duplicate feedback                            | Rejected                                                                    | integration.test.js   |
| Unavailable dish / expired promotion                                       | No partial order created                                                    | integration.test.js   |
| Pending cancellation                                                       | No stock change; later payment rejected                                     | integration.test.js   |
| New branch                                                                 | Inventory and availability junction rows created                            | integration.test.js   |
| Duplicate customer email                                                   | UNIQUE constraint returns 409                                               | integration.test.js   |
| Restocking                                                                 | Audit row created; low-stock view reflects new state                        | integration.test.js   |
| Revenue reconciliation                                                     | Dashboard equals sum of payment amounts                                     | integration.test.js   |
| Direct invalid foreign key / negative inventory                            | MySQL rejects statements                                                    | integration.test.js   |
| Guest receipt link                                                         | Valid only for that order; tampering rejected; cannot authenticate as staff | integration.test.js   |
| Existing ingredient unit edited                                            | Rejected to preserve stock/recipe units                                     | integration.test.js   |
| Submitted SQL demonstrations                                               | Every query executes; demo transaction rolls back                           | integration.test.js   |
| Dashboard, management, inventory and reports                               | Visible populated screens                                                   | tests/browser.spec.js |
| Mobile viewport                                                            | No document-wide horizontal overflow                                        | tests/browser.spec.js |
| Staff order to payment to guest feedback                                   | Complete browser workflow succeeds                                          | tests/browser.spec.js |
| Frontend production build                                                  | Compiles successfully                                                       | npm run build         |
| Formatting                                                                 | All supported source/document files follow one format                       | npm run format:check  |

## Running locally

`npm test` runs six validation tests without MySQL. For integration tests, use an empty dedicated database ending in `_test`, configure DB_NAME and credentials, run `npm run db:setup`, then `npm run test:integration`. These tests intentionally change that database and expect a fresh seed each run. Do not point them at your presentation database.

Browser tests need another seeded demo database, `DEMO_PASSWORD`, Chromium (`npx playwright install chromium`), and a completed `npm run build`. Run `npm run test:e2e`; Playwright starts the API and frontend automatically. Browser tests save real screenshots in `screenshots/` and produce a report artifact in GitHub Actions.

The test runner's password-free root is restricted to its disposable CI service. App/demo passwords and JWT secrets are random, masked, and discarded after the job. Use your own password-protected database for local work.

## Practical limitations

These are correctness and workflow tests, not a load-test or production security certification. There is no real payment-provider integration. Stock reservation, refunds and recipe-version history are outside the submitted scope.
