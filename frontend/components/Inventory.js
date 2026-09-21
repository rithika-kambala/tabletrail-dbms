import { useState, useEffect, useCallback } from 'react';
import { api, Table, Status } from './shared';
export function Inventory({ lookups, branch, run, refresh, busy }) {
  const [rows, setRows] = useState([]),
    [edit, setEdit] = useState(null),
    [add, setAdd] = useState(0),
    [threshold, setThreshold] = useState(0);
  const load = useCallback(
    () =>
      api('/inventory' + (branch ? '?branch_id=' + branch : '')).then(setRows),
    [branch],
  );
  useEffect(() => {
    load().catch((e) => run(() => Promise.reject(e)));
    setEdit(null);
  }, [load]);
  const availability = lookups.availability.filter(
    (a) => !branch || a.branch_id === Number(branch),
  );
  return (
    <div className="stack">
      {edit && (
        <form
          className="panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api(
                `/inventory/${edit.branch_id}/${edit.ingredient_id}`,
                'PUT',
                { add: Number(add), threshold: Number(threshold) },
              );
              setEdit(null);
              await load();
              await refresh();
            }, 'Stock updated');
          }}
        >
          <h2 className="col-span-full">
            Restock {edit.ingredient} · {edit.branch}
          </h2>
          <label>
            Add quantity ({edit.unit})
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={add}
              onChange={(e) => setAdd(e.target.value)}
            />
          </label>
          <label>
            Low stock threshold ({edit.unit})
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              Save stock
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEdit(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="panel">
        <h2>Ingredient inventory</h2>
        <Table
          rows={rows}
          columns={[
            ['ingredient', 'Ingredient'],
            ['branch', 'Branch'],
            ['quantity', 'On hand', (r) => r.quantity + ' ' + r.unit],
            ['threshold', 'Threshold', (r) => r.threshold + ' ' + r.unit],
            [
              'stock',
              'Stock',
              (r) => (
                <Status value={r.quantity < r.threshold ? 'low' : 'healthy'} />
              ),
            ],
            [
              'action',
              '',
              (r) => (
                <button
                  className="secondary small"
                  onClick={() => {
                    setEdit(r);
                    setAdd(0);
                    setThreshold(r.threshold);
                  }}
                >
                  Restock
                </button>
              ),
            ],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Branch menu availability</h2>
        <Table
          rows={availability}
          columns={[
            ['item', 'Dish'],
            ['branch', 'Branch'],
            [
              'available',
              'Available',
              (r) => (
                <input
                  aria-label={'Availability of ' + r.item + ' at ' + r.branch}
                  type="checkbox"
                  style={{ width: 18 }}
                  checked={!!r.available}
                  disabled={busy}
                  onChange={(e) =>
                    run(async () => {
                      await api(
                        `/availability/${r.branch_id}/${r.menu_item_id}`,
                        'PUT',
                        { available: e.target.checked },
                      );
                      await refresh();
                    }, 'Availability saved')
                  }
                />
              ),
            ],
          ]}
        />
      </section>
    </div>
  );
}
