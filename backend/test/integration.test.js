import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';
if (!process.env.DB_NAME?.endsWith('_test'))
  throw new Error('Integration tests require a seeded DB_NAME ending in _test');
const admin = request.agent(app),
  manager = request.agent(app),
  staff = request.agent(app);
let orderId;
const input = (branch = 1, items = [{ menu_item_id: 1, quantity: 1 }]) => ({
  branch_id: branch,
  customer_id: 1,
  items,
});
before(async () => {
  for (const [agent, email] of [
    [admin, 'admin'],
    [manager, 'manager'],
    [staff, 'staff'],
  ])
    await agent
      .post('/api/auth/login')
      .send({
        email: email + '@tabletrail.test',
        password: process.env.DEMO_PASSWORD,
      })
      .expect(200);
});
after(async () => {
  await pool.end();
});
test('unauthenticated and bad-password requests are denied', async () => {
  await request(app).get('/api/orders').expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@tabletrail.test', password: 'wrong' })
    .expect(401);
});
test('staff cannot view analytics or modify menu', async () => {
  await staff.get('/api/analytics').expect(403);
  await staff
    .post('/api/menu')
    .send({ name: 'Unauthorized', category_id: 1, price: 1 })
    .expect(403);
});
test('branch scope applies to orders, inventory and reports', async () => {
  await staff.post('/api/orders').send(input(2)).expect(403);
  await manager
    .put('/api/inventory/2/1')
    .send({ add: 50, threshold: 100 })
    .expect(403);
  const report = await manager.get('/api/analytics?branch_id=2').expect(200);
  assert.deepEqual(
    report.body.branches.map((b) => b.branch_id),
    [1],
  );
  const other = (
    await query('SELECT id FROM orders WHERE branch_id=2 LIMIT 1')
  )[0];
  await staff.get('/api/orders/' + other.id).expect(403);
  await staff
    .post('/api/orders/' + other.id + '/complete')
    .send({ method: 'cash' })
    .expect(403);
});
test('input validation and parameterized login resist malformed input', async () => {
  await staff
    .post('/api/orders')
    .send(input(1, [{ menu_item_id: 1, quantity: -2 }]))
    .expect(400);
  await request(app)
    .post('/api/auth/login')
    .send({ email: "' OR 1=1 --", password: 'example' })
    .expect(400);
  await staff
    .post('/api/orders')
    .set('Content-Type', 'text/plain')
    .send('x')
    .expect(415);
  await staff
    .post('/api/orders')
    .set('Origin', 'https://evil.example')
    .send(input())
    .expect(403);
});
test('create order snapshots database price and does not consume inventory yet', async () => {
  const stock = await query(
    'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
  );
  const response = await staff
    .post('/api/orders')
    .send({ ...input(), promotion_id: 1, price: 1 })
    .expect(201);
  orderId = response.body.id;
  const detail = await staff.get('/api/orders/' + orderId).expect(200);
  assert.equal(detail.body.total, 216);
  assert.equal(detail.body.items[0].unit_price, 240);
  assert.equal(
    (
      await query(
        'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
      )
    )[0].quantity,
    stock[0].quantity,
  );
});
test('checkout pays exact discounted amount and deducts recipe quantities once', async () => {
  const before = (
    await query(
      'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
    )
  )[0].quantity;
  await staff
    .post('/api/orders/' + orderId + '/complete')
    .send({ method: 'upi' })
    .expect(200);
  assert.equal(
    (
      await query(
        'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
      )
    )[0].quantity,
    before - 150,
  );
  assert.equal(
    (await query('SELECT amount FROM payments WHERE order_id=?', [orderId]))[0]
      .amount,
    216,
  );
  await staff
    .post('/api/orders/' + orderId + '/complete')
    .send({ method: 'upi' })
    .expect(409);
  assert.equal(
    (
      await query(
        'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
      )
    )[0].quantity,
    before - 150,
  );
});
test('insufficient stock rolls back earlier deductions, payment, audit and order status', async () => {
  const created = await staff
    .post('/api/orders')
    .send(input(1, [{ menu_item_id: 1, quantity: 50 }]))
    .expect(201);
  const old = (
    await query(
      'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=2',
    )
  )[0].quantity;
  await query(
    'UPDATE inventory SET quantity=0 WHERE branch_id=1 AND ingredient_id=2',
  );
  const rice = (
    await query(
      'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
    )
  )[0].quantity;
  const logs = (await query('SELECT COUNT(*) n FROM inventory_log'))[0].n;
  await staff
    .post('/api/orders/' + created.body.id + '/complete')
    .send({ method: 'cash' })
    .expect(409);
  assert.equal(
    (
      await query(
        'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
      )
    )[0].quantity,
    rice,
  );
  assert.equal(
    (await query('SELECT COUNT(*) n FROM inventory_log'))[0].n,
    logs,
  );
  assert.equal(
    (await query('SELECT status FROM orders WHERE id=?', [created.body.id]))[0]
      .status,
    'pending',
  );
  assert.equal(
    (
      await query('SELECT COUNT(*) n FROM payments WHERE order_id=?', [
        created.body.id,
      ])
    )[0].n,
    0,
  );
  await query(
    'UPDATE inventory SET quantity=? WHERE branch_id=1 AND ingredient_id=2',
    [old],
  );
});
test('concurrent checkouts competing for one serving cannot oversell', async () => {
  const a = await staff.post('/api/orders').send(input()).expect(201),
    b = await staff.post('/api/orders').send(input()).expect(201);
  const old = (
    await query(
      'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
    )
  )[0].quantity;
  await query(
    'UPDATE inventory SET quantity=150 WHERE branch_id=1 AND ingredient_id=1',
  );
  const responses = await Promise.all(
    [a, b].map((o) =>
      staff
        .post('/api/orders/' + o.body.id + '/complete')
        .send({ method: 'cash' }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (
      await query(
        'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
      )
    )[0].quantity,
    0,
  );
  await query(
    'UPDATE inventory SET quantity=? WHERE branch_id=1 AND ingredient_id=1',
    [old],
  );
});
test('feedback belongs to a completed order and is unique', async () => {
  await staff
    .post('/api/orders/' + orderId + '/feedback')
    .send({ rating: 5, comment: 'Great service' })
    .expect(201);
  await staff
    .post('/api/orders/' + orderId + '/feedback')
    .send({ rating: 4 })
    .expect(409);
  const pending = await staff.post('/api/orders').send(input()).expect(201);
  await staff
    .post('/api/orders/' + pending.body.id + '/feedback')
    .send({ rating: 5 })
    .expect(409);
});
test('unavailable items and expired promotions are rejected without partial orders', async () => {
  await manager
    .put('/api/availability/1/1')
    .send({ available: false })
    .expect(200);
  const count = (await query('SELECT COUNT(*) n FROM orders'))[0].n;
  await staff.post('/api/orders').send(input()).expect(400);
  await manager
    .put('/api/availability/1/1')
    .send({ available: true })
    .expect(200);
  const promo = await query(
    "INSERT INTO promotions(code,discount_percent,starts_on,ends_on) VALUES('EXPIRED_TEST',10,'2020-01-01','2020-02-01')",
  );
  await staff
    .post('/api/orders')
    .send({ ...input(), promotion_id: promo.insertId })
    .expect(400);
  assert.equal((await query('SELECT COUNT(*) n FROM orders'))[0].n, count);
});
test('cancellation preserves stock and prevents later payment', async () => {
  const order = await staff.post('/api/orders').send(input()).expect(201);
  const stock = (
    await query(
      'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
    )
  )[0].quantity;
  await staff
    .post('/api/orders/' + order.body.id + '/cancel')
    .send({})
    .expect(200);
  await staff
    .post('/api/orders/' + order.body.id + '/complete')
    .send({ method: 'cash' })
    .expect(409);
  assert.equal(
    (
      await query(
        'SELECT quantity FROM inventory WHERE branch_id=1 AND ingredient_id=1',
      )
    )[0].quantity,
    stock,
  );
});
test('admin creates branch junction rows and enforces email uniqueness', async () => {
  const branch = await admin
    .post('/api/branches')
    .send({ name: 'Test Branch', city: 'Pune', active: true })
    .expect(201);
  assert.equal(
    (
      await query('SELECT COUNT(*) n FROM inventory WHERE branch_id=?', [
        branch.body.id,
      ])
    )[0].n,
    5,
  );
  assert.equal(
    (
      await query('SELECT COUNT(*) n FROM branch_menu WHERE branch_id=?', [
        branch.body.id,
      ])
    )[0].n,
    4,
  );
  await staff
    .post('/api/customers')
    .send({ name: 'Duplicate', email: 'aarav@example.test' })
    .expect(409);
});
test('restock creates an audit row and low-stock view responds', async () => {
  await manager
    .put('/api/inventory/1/4')
    .send({ add: 1, threshold: 999 })
    .expect(200);
  assert.ok(
    (
      await query(
        'SELECT * FROM low_stock WHERE branch_id=1 AND ingredient_id=4',
      )
    ).length,
  );
  assert.ok(
    (
      await query(
        'SELECT * FROM inventory_log WHERE branch_id=1 AND ingredient_id=4',
      )
    ).length,
  );
});
test('dashboard net revenue agrees with recorded payments', async () => {
  const report = await admin.get('/api/analytics').expect(200);
  const total = (await query('SELECT SUM(amount) total FROM payments'))[0]
    .total;
  assert.ok(Math.abs(report.body.summary.revenue - total) < 0.001);
});
test('database enforces CHECK and foreign key constraints', async () => {
  await assert.rejects(
    query('INSERT INTO recipes VALUES(1,999999,1)'),
    (e) => e.code === 'ER_NO_REFERENCED_ROW_2',
  );
  await assert.rejects(
    query(
      'UPDATE inventory SET quantity=-1 WHERE branch_id=1 AND ingredient_id=1',
    ),
    (e) => e.code === 'ER_CHECK_CONSTRAINT_VIOLATED',
  );
});

test('customer receipt is scoped, tamper-proof, and cannot become a staff session', async () => {
  const created = await staff.post('/api/orders').send(input()).expect(201);
  await staff
    .post('/api/orders/' + created.body.id + '/complete')
    .send({ method: 'cash' })
    .expect(200);
  const detail = await staff.get('/api/orders/' + created.body.id).expect(200);
  const token = detail.body.feedback_token;
  await request(app)
    .get('/api/feedback/' + token)
    .expect(200);
  await request(app)
    .get('/api/orders')
    .set('Cookie', 'session=' + token)
    .expect(401);
  await request(app)
    .get('/api/feedback/' + token + 'broken')
    .expect(400);
  await request(app)
    .post('/api/feedback/' + token)
    .send({ rating: 4, comment: 'Guest link works' })
    .expect(201);
  await request(app)
    .post('/api/feedback/' + token)
    .send({ rating: 5 })
    .expect(409);
});

test('existing ingredient units cannot be changed without converting related data', async () => {
  await admin
    .put('/api/ingredients/1')
    .send({ name: 'Rice', unit: 'piece' })
    .expect(400);
  assert.equal(
    (await query('SELECT unit FROM ingredients WHERE id=1'))[0].unit,
    'g',
  );
});
