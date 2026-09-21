import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orderInput,
  feedbackInput,
  recipeInput,
  catalog,
  employeeInput,
} from '../src/validation.js';
const order = {
  branch_id: 1,
  customer_id: 1,
  items: [{ menu_item_id: 1, quantity: 2 }],
};
test('valid order is accepted and client price is discarded', () =>
  assert.deepEqual(orderInput.parse({ ...order, price: 1 }), order));
test('empty, duplicate, fractional and negative order quantities are rejected', () => {
  for (const items of [
    [],
    [{ menu_item_id: 1, quantity: 0 }],
    [{ menu_item_id: 1, quantity: 1.5 }],
    [...order.items, ...order.items],
  ])
    assert.throws(() => orderInput.parse({ ...order, items }));
});
test('feedback rating is bounded and comments have a length limit', () => {
  for (const rating of [0, 6, 2.5])
    assert.throws(() => feedbackInput.parse({ rating }));
  assert.throws(() =>
    feedbackInput.parse({ rating: 5, comment: 'x'.repeat(501) }),
  );
});
test('invalid promotion ranges and percentages are rejected', () => {
  assert.throws(() =>
    catalog.promotions.schema.parse({
      code: 'X',
      discount_percent: 110,
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
    }),
  );
  assert.throws(() =>
    catalog.promotions.schema.parse({
      code: 'X',
      discount_percent: 10,
      starts_on: '2026-12-31',
      ends_on: '2026-01-01',
    }),
  );
});
test('recipe rejects repeated ingredients', () =>
  assert.throws(() =>
    recipeInput.parse([
      { ingredient_id: 1, quantity: 10 },
      { ingredient_id: 1, quantity: 20 },
    ]),
  ));
test('staff and managers must have a branch', () =>
  assert.throws(() =>
    employeeInput.parse({
      name: 'Staff',
      email: 'test@example.test',
      branch_id: null,
      role: 'staff',
    }),
  ));
