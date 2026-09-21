import { useState } from 'react';
import { UtensilsCrossed, Plus } from 'lucide-react';
import { api, money, Table, Status } from './shared';
export function NewOrder({
  lookups,
  branch,
  user,
  run,
  refresh,
  busy,
  onClose,
}) {
  const [branchId, setBranchId] = useState(
      branch ||
        user.branch_id ||
        lookups.branches.find((b) => b.active)?.id ||
        '',
    ),
    [customer, setCustomer] = useState(''),
    [promotion, setPromotion] = useState(''),
    [cart, setCart] = useState({});
  const menu = lookups.menu.filter(
    (m) =>
      m.active &&
      lookups.availability.some(
        (a) =>
          a.branch_id === Number(branchId) &&
          a.menu_item_id === m.id &&
          a.available,
      ),
  );
  const promo = lookups.promotions.find((p) => p.id === Number(promotion));
  const subtotal = Object.entries(cart).reduce(
    (s, [id, q]) =>
      s + (lookups.menu.find((m) => m.id === Number(id))?.price || 0) * q,
    0,
  );
  async function submit(e) {
    e.preventDefault();
    await run(async () => {
      await api('/orders', 'POST', {
        branch_id: Number(branchId),
        customer_id: Number(customer),
        promotion_id: promotion ? Number(promotion) : null,
        items: Object.entries(cart)
          .filter(([, q]) => q > 0)
          .map(([id, quantity]) => ({ menu_item_id: Number(id), quantity })),
      });
      await refresh();
      onClose();
    }, 'Order created. Complete payment to deduct ingredients.');
  }
  return (
    <form onSubmit={submit} className="order-layout">
      <section className="stack">
        <div className="panel form-grid">
          <label>
            Branch
            <select
              required
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setCart({});
              }}
            >
              {lookups.branches
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Customer
            <select
              required
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">Select customer</option>
              {lookups.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="menu-grid">
          {menu.map((m) => (
            <article className="menu-card" key={m.id}>
              <div className="menu-icon">
                <UtensilsCrossed size={24} />
              </div>
              <div>
                <h3 className="mb-1">{m.name}</h3>
                <span className="muted text-xs">
                  {lookups.categories.find((c) => c.id === m.category_id)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <strong>{money(m.price)}</strong>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() =>
                    setCart({
                      ...cart,
                      [m.id]: Math.min(50, (cart[m.id] || 0) + 1),
                    })
                  }
                >
                  <Plus size={12} className="inline" /> Add
                </button>
              </div>
            </article>
          ))}
        </div>
        {!menu.length && (
          <p className="empty">No available menu items at this branch.</p>
        )}
      </section>
      <aside className="panel self-start">
        <h2>New order</h2>
        {Object.entries(cart)
          .filter(([, q]) => q > 0)
          .map(([id, q]) => (
            <div className="cart-row" key={id}>
              <div>
                <strong>
                  {lookups.menu.find((m) => m.id === Number(id))?.name}
                </strong>
                <div className="mt-2">
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => setCart({ ...cart, [id]: 0 })}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={q}
                  onChange={(e) =>
                    setCart({ ...cart, [id]: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          ))}
        {!subtotal && <p className="empty">Choose dishes from the menu.</p>}
        <label className="mt-5">
          Promotion
          <select
            value={promotion}
            onChange={(e) => setPromotion(e.target.value)}
          >
            <option value="">No promotion</option>
            {lookups.promotions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.discount_percent}%
              </option>
            ))}
          </select>
        </label>
        <div className="cart-total">
          <span>Estimated total</span>
          <span>
            {money(subtotal * (1 - (promo?.discount_percent || 0) / 100))}
          </span>
        </div>
        <p className="muted text-xs">
          The server verifies availability, prices, and promotion dates. Stock
          is deducted when payment is completed.
        </p>
        <button disabled={busy || !subtotal} className="primary w-full">
          Create order
        </button>
        <button
          type="button"
          className="secondary w-full mt-2"
          onClick={onClose}
        >
          Cancel
        </button>
      </aside>
    </form>
  );
}
export function Orders({ rows, run, refresh, busy }) {
  const [selected, setSelected] = useState(null),
    [method, setMethod] = useState('cash'),
    [rating, setRating] = useState('5'),
    [comment, setComment] = useState('');
  return (
    <div className="stack">
      {selected && (
        <section className="panel">
          <div className="flex justify-between">
            <h2>
              Order #TT-{selected.id} · {money(selected.total)}
            </h2>
            <button
              className="secondary small"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          {selected.feedback_token && (
            <p className="mt-3 mb-4">
              <a
                className="text-green-800 underline"
                href={
                  '/feedback?token=' +
                  encodeURIComponent(selected.feedback_token)
                }
                target="_blank"
                rel="noreferrer"
              >
                Open customer feedback page ↗
              </a>
              <span className="muted text-xs block mt-1">
                Share this order-specific link with the customer. Valid for 30
                days.
              </span>
            </p>
          )}
          <Table
            rows={selected.items}
            columns={[
              ['name', 'Dish'],
              ['quantity', 'Quantity'],
              ['unit_price', 'Price', (r) => money(r.unit_price)],
            ]}
          />
          {selected.status === 'pending' ? (
            <div className="flex gap-3 items-end mt-5">
              <label>
                Payment method
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {['cash', 'card', 'upi'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                className="primary"
                onClick={() =>
                  run(async () => {
                    await api('/orders/' + selected.id + '/complete', 'POST', {
                      method,
                    });
                    setSelected(null);
                    await refresh();
                  }, 'Payment recorded. Inventory updated.')
                }
              >
                Complete payment
              </button>
              <button
                disabled={busy}
                className="secondary"
                onClick={() =>
                  run(async () => {
                    await api('/orders/' + selected.id + '/cancel', 'POST', {});
                    setSelected(null);
                    await refresh();
                  }, 'Order cancelled')
                }
              >
                Cancel order
              </button>
            </div>
          ) : (
            selected.status === 'completed' && (
              <form
                className="form-grid mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await api('/orders/' + selected.id + '/feedback', 'POST', {
                      rating: Number(rating),
                      comment,
                    });
                    setSelected(null);
                    setComment('');
                    await refresh();
                  }, 'Feedback saved');
                }}
              >
                <label>
                  Customer rating
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Customer comment
                  <input
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <div>
                  <button className="primary" disabled={busy}>
                    Record customer feedback
                  </button>
                  <p className="muted text-xs mt-2">
                    One feedback entry per completed order.
                  </p>
                </div>
              </form>
            )
          )}
        </section>
      )}
      <section className="panel">
        <Table
          rows={rows}
          columns={[
            ['id', 'Order', (r) => '#TT-' + r.id],
            ['customer', 'Customer'],
            ['branch', 'Branch'],
            [
              'created_at',
              'Placed',
              (r) => new Date(r.created_at).toLocaleDateString('en-IN'),
            ],
            ['total', 'Total', (r) => money(r.total)],
            ['status', 'Status', (r) => <Status value={r.status} />],
            [
              'action',
              '',
              (r) => (
                <button
                  className="secondary small"
                  onClick={() =>
                    run(async () => {
                      setSelected(await api('/orders/' + r.id));
                    })
                  }
                >
                  View
                </button>
              ),
            ],
          ]}
        />
        <p className="muted text-xs mt-4 mb-0">
          Showing the most recent 100 orders. Reports include all completed
          orders.
        </p>
      </section>
    </div>
  );
}
