import {
  IndianRupee,
  ShoppingBag,
  Store,
  Users,
  UtensilsCrossed,
  ArrowUpRight,
} from 'lucide-react';
import { money, Table, Status } from './shared';
export function Dashboard({ data, orders, onOrders }) {
  if (!data) return <div className="spinner">Loading database reports…</div>;
  const s = data.summary,
    maxDay = Math.max(1, ...data.daily.map((d) => d.revenue)),
    maxUnits = Math.max(1, ...data.bestSellers.map((d) => d.units));
  return (
    <>
      <div className="cards">
        {[
          ['Net revenue', money(s.revenue), IndianRupee, 'Completed payments'],
          [
            'Completed orders',
            s.orders,
            ShoppingBag,
            'Across selected branches',
          ],
          ['Active branches', s.activeBranches, Store, 'Currently operating'],
          [
            'Customers',
            s.customers,
            Users,
            'Registered globally · served by branch',
          ],
        ].map(([label, value, Icon, note]) => (
          <div className="card" key={label}>
            <div className="card-top">
              {label}
              <Icon size={17} />
            </div>
            <div className="metric">{value}</div>
            <div className="muted text-xs">{note}</div>
          </div>
        ))}
      </div>
      <div className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Revenue overview</h2>
              <p>Recorded payments · last 7 days</p>
            </div>
            <span className="badge">INR</span>
          </div>
          <div className="chart">
            {data.daily.map((d) => (
              <div
                className="chart-col"
                key={d.day}
                title={d.day + ': ' + money(d.revenue)}
              >
                <span>{money(d.revenue)}</span>
                <div
                  className="chart-bar"
                  style={{ height: Math.max(2, (120 * d.revenue) / maxDay) }}
                />
                <span>{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
          {!data.daily.length && (
            <p className="muted">No payments in the last seven days.</p>
          )}
          <div
            className="flex justify-between text-xs muted border-t pt-4"
            style={{ borderColor: 'var(--line)' }}
          >
            <span>
              Average order value{' '}
              <strong className="text-green-900">
                {money(s.orders ? s.revenue / s.orders : 0)}
              </strong>
            </span>
            <span>
              Customer rating{' '}
              <strong className="text-green-900">
                {s.averageRating
                  ? s.averageRating.toFixed(1) + ' / 5'
                  : 'No ratings'}
              </strong>
            </span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Best-selling dishes</h2>
              <p>Ranked by units sold · all time</p>
            </div>
            <UtensilsCrossed size={19} />
          </div>
          <div className="bar-list">
            {data.bestSellers.map((d, i) => (
              <div key={d.name}>
                <div className="bar-label">
                  <span>
                    <span className="muted mr-3">0{i + 1}</span>
                    {d.name}
                  </span>
                  <strong>{d.units} sold</strong>
                </div>
                <div className="track">
                  <div
                    className="fill"
                    style={{ width: (d.units / maxUnits) * 100 + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Branch performance</h2>
              <p>A clear view of every restaurant</p>
            </div>
            <Store size={19} />
          </div>
          <Table
            rows={data.branches}
            columns={[
              ['name', 'Branch'],
              ['orders', 'Orders'],
              ['revenue', 'Net revenue', (r) => money(r.revenue)],
              ['customers', 'Customers'],
            ]}
          />
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Inventory watch</h2>
              <p>Ingredients below their stock threshold</p>
            </div>
            <span className="badge low">{data.lowStock.length} low</span>
          </div>
          {data.lowStock.length ? (
            data.lowStock.map((r) => (
              <div
                className="stock-row"
                key={r.branch_id + '-' + r.ingredient_id}
              >
                <div>
                  <strong>{r.ingredient}</strong>
                  <small>{r.branch}</small>
                </div>
                <div>
                  <span className="badge low">
                    {r.quantity} {r.unit}
                  </span>
                  <small>
                    Minimum {r.threshold} {r.unit}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">All ingredients are above threshold.</div>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Recent orders</h2>
            <p>The latest activity from your restaurants</p>
          </div>
          <button className="secondary small" onClick={onOrders}>
            View orders <ArrowUpRight size={13} className="inline" />
          </button>
        </div>
        <Table
          rows={orders.slice(0, 5)}
          columns={[
            ['id', 'Order', (r) => '#TT-' + r.id],
            ['customer', 'Customer'],
            ['branch', 'Branch'],
            ['total', 'Amount', (r) => money(r.total)],
            ['status', 'Status', (r) => <Status value={r.status} />],
          ]}
        />
      </section>
    </>
  );
}
