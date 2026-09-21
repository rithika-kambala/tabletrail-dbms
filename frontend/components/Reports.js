import { money, Table } from './shared';
export function Reports({ data }) {
  if (!data) return null;
  return (
    <div className="stack">
      <section className="panel">
        <h2>Customer behavior</h2>
        <Table
          rows={data.customers}
          columns={[
            ['name', 'Customer'],
            ['orders', 'Visits'],
            ['spending', 'Total spending', (r) => money(r.spending)],
            [
              'average_order_value',
              'Average order',
              (r) => money(r.average_order_value),
            ],
            ['repeat', 'Repeat visitor', (r) => (r.orders > 1 ? 'Yes' : 'No')],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Frequently ordered items</h2>
        <Table
          rows={data.favorites}
          columns={[
            ['customer', 'Customer'],
            ['item', 'Dish'],
            ['units', 'Units'],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Promotion performance</h2>
        <Table
          rows={data.promotions}
          columns={[
            ['code', 'Code'],
            ['orders', 'Paid orders'],
            [
              'discount_amount',
              'Discount given',
              (r) => money(r.discount_amount),
            ],
            ['revenue', 'Net revenue', (r) => money(r.revenue)],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Category performance</h2>
        <Table
          rows={data.categories}
          columns={[
            ['name', 'Category'],
            ['units', 'Units sold'],
            ['gross_sales', 'Gross sales', (r) => money(r.gross_sales)],
          ]}
        />
        <p className="muted text-xs mt-3">
          Gross item sales are before promotions. Net revenue elsewhere is after
          discounts.
        </p>
      </section>
      <section className="panel">
        <h2>Customer feedback</h2>
        <Table
          rows={data.feedback}
          columns={[
            ['order_id', 'Order'],
            ['customer', 'Customer'],
            ['branch', 'Branch'],
            ['rating', 'Rating', (r) => r.rating + ' / 5'],
            [
              'comment',
              'Comment',
              (r) => <div className="feedback-text">{r.comment}</div>,
            ],
          ]}
        />
      </section>
    </div>
  );
}
