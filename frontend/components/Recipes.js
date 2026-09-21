import { useState, useEffect } from 'react';
import { api, money, Table } from './shared';
export function Recipes({ lookups, run, busy }) {
  const [recipes, setRecipes] = useState([]),
    [quotes, setQuotes] = useState([]),
    [menuId, setMenuId] = useState(''),
    [lines, setLines] = useState([{ ingredient_id: '', quantity: 1 }]);
  async function load() {
    const [r, q] = await Promise.all([
      api('/recipes'),
      api('/supplier-quotes'),
    ]);
    setRecipes(r);
    setQuotes(q);
  }
  useEffect(() => {
    load().catch((e) => run(() => Promise.reject(e)));
  }, []);
  return (
    <div className="stack">
      <section className="panel">
        <h2>Recipes</h2>
        <p className="muted">
          Quantities are per serving, in each ingredient’s base unit. Saving
          replaces the selected dish’s recipe.
        </p>
        <Table
          rows={recipes}
          columns={[
            ['item', 'Dish'],
            ['ingredient', 'Ingredient'],
            ['quantity', 'Per serving', (r) => r.quantity + ' ' + r.unit],
          ]}
        />
        <form
          className="stack mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api(
                '/recipes/' + menuId,
                'PUT',
                lines.map((l) => ({
                  ingredient_id: Number(l.ingredient_id),
                  quantity: Number(l.quantity),
                })),
              );
              await load();
            }, 'Recipe saved');
          }}
        >
          <label>
            Dish
            <select
              required
              value={menuId}
              onChange={(e) => {
                setMenuId(e.target.value);
                const existing = recipes.filter(
                  (r) => r.menu_item_id === Number(e.target.value),
                );
                setLines(
                  existing.length
                    ? existing.map((r) => ({
                        ingredient_id: r.ingredient_id,
                        quantity: r.quantity,
                      }))
                    : [{ ingredient_id: '', quantity: 1 }],
                );
              }}
            >
              <option value="">Select a dish</option>
              {lookups.menu.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {lines.map((l, i) => (
            <div className="flex gap-3 items-end" key={i}>
              <label className="flex-1">
                Ingredient
                <select
                  required
                  value={l.ingredient_id}
                  onChange={(e) =>
                    setLines(
                      lines.map((v, j) =>
                        j === i ? { ...v, ingredient_id: e.target.value } : v,
                      ),
                    )
                  }
                >
                  <option value="">Select</option>
                  {lookups.ingredients.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={l.quantity}
                  onChange={(e) =>
                    setLines(
                      lines.map((v, j) =>
                        j === i ? { ...v, quantity: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={() => setLines(lines.filter((_, j) => i !== j))}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setLines([...lines, { ingredient_id: '', quantity: 1 }])
              }
            >
              Add ingredient
            </button>
            <button className="primary" disabled={busy || !lines.length}>
              Save recipe
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <h2>Supplier costs</h2>
        <Table
          rows={quotes}
          columns={[
            ['supplier', 'Supplier'],
            ['ingredient', 'Ingredient'],
            [
              'unit_cost',
              'Cost per unit',
              (r) => money(r.unit_cost) + ' / ' + r.unit,
            ],
          ]}
        />
        <form
          className="form-grid mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            run(async () => {
              await api('/supplier-quotes', 'PUT', values);
              await load();
            }, 'Supplier quote saved');
          }}
        >
          <label>
            Supplier
            <select name="supplier_id" required>
              <option value="">Select</option>
              {lookups.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ingredient
            <select name="ingredient_id" required>
              <option value="">Select</option>
              {lookups.ingredients.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.unit})
                </option>
              ))}
            </select>
          </label>
          <label>
            Cost per base unit (₹)
            <input
              name="unit_cost"
              type="number"
              min="0.0001"
              step="0.0001"
              required
            />
          </label>
          <div className="self-end">
            <button className="primary" disabled={busy}>
              Save quote
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
