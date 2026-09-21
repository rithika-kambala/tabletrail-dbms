import { useState, useEffect, useCallback } from 'react';
import { api, Table } from './shared';
export const resources = {
  branches: {
    label: 'Branches',
    fields: [
      ['name', 'Name'],
      ['city', 'City'],
      ['active', 'Active', 'boolean'],
    ],
  },
  employees: {
    label: 'Employees',
    fields: [
      ['name', 'Name'],
      ['email', 'Email', 'email'],
      ['role', 'Role', ['admin', 'manager', 'staff']],
      ['branch_id', 'Branch', 'branches'],
      ['password', 'Password (leave blank to keep)', 'password'],
      ['active', 'Active', 'boolean'],
    ],
  },
  menu: {
    label: 'Menu',
    fields: [
      ['name', 'Name'],
      ['category_id', 'Category', 'categories'],
      ['price', 'Price (₹)', 'number'],
      ['active', 'Active', 'boolean'],
    ],
  },
  categories: { label: 'Categories', fields: [['name', 'Name']] },
  ingredients: {
    label: 'Ingredients',
    fields: [
      ['name', 'Name'],
      ['unit', 'Unit', ['g', 'ml', 'piece']],
    ],
  },
  suppliers: {
    label: 'Suppliers',
    fields: [
      ['name', 'Name'],
      ['email', 'Email', 'email'],
    ],
  },
  promotions: {
    label: 'Promotions',
    fields: [
      ['code', 'Code'],
      ['discount_percent', 'Discount %', 'number'],
      ['starts_on', 'Start date', 'date'],
      ['ends_on', 'End date', 'date'],
    ],
  },
  campaigns: {
    label: 'Campaigns',
    fields: [
      ['name', 'Name'],
      ['promotion_id', 'Promotion', 'promotions'],
      ['channel', 'Channel', ['email', 'social', 'in-store']],
      ['budget', 'Budget (₹)', 'number'],
    ],
  },
  customers: {
    label: 'Customers',
    fields: [
      ['name', 'Name'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone'],
    ],
  },
};
function RecordForm({ resource, record, lookups, onSave, onCancel, busy }) {
  const definition = resources[resource];
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      definition.fields.map(([k, , t]) => [
        k,
        t === 'boolean'
          ? record
            ? !!record[k]
            : true
          : t === 'date'
            ? record?.[k]?.slice(0, 10) || ''
            : (record?.[k] ?? ''),
      ]),
    ),
  );
  function submit(e) {
    e.preventDefault();
    const data = { ...values };
    if (resource === 'employees') {
      if (!data.password) delete data.password;
      data.branch_id = data.branch_id ? Number(data.branch_id) : null;
    }
    onSave(data);
  }
  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2 className="col-span-full">
        {record ? 'Edit' : 'Add'} {definition.label.toLowerCase()}
      </h2>
      {definition.fields.map(([key, label, type = 'text']) => {
        const options = Array.isArray(type)
          ? type.map((v) => ({ id: v, name: v }))
          : lookups[type];
        return (
          <label key={key} className={type === 'boolean' ? 'check' : ''}>
            {label}
            {type === 'boolean' ? (
              <input
                type="checkbox"
                checked={values[key]}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.checked })
                }
              />
            ) : options ? (
              <select
                disabled={
                  resource === 'ingredients' && key === 'unit' && !!record
                }
                value={values[key]}
                required={!(resource === 'employees' && key === 'branch_id')}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
              >
                <option value="">Select…</option>
                {options.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.code}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                step={type === 'number' ? '0.01' : undefined}
                min={type === 'number' ? 0 : undefined}
                autoComplete={type === 'password' ? 'new-password' : undefined}
                required={!['phone', 'password'].includes(key)}
                value={values[key]}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
              />
            )}
          </label>
        );
      })}
      <div className="form-actions">
        <button className="primary" disabled={busy}>
          Save
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
export function Records({ resource, lookups, run, refresh, busy }) {
  const [rows, setRows] = useState([]),
    [editing, setEditing] = useState(undefined);
  const load = useCallback(() => api('/' + resource).then(setRows), [resource]);
  useEffect(() => {
    load().catch((e) => run(() => Promise.reject(e)));
    setEditing(undefined);
  }, [load]);
  const definition = resources[resource];
  return (
    <div className="stack">
      <div className="flex items-center justify-between">
        <p className="muted mb-0">
          Add or edit records. Deactivate branches, menu items, and employees to
          retain history.
        </p>
        <button className="primary small" onClick={() => setEditing(null)}>
          + Add
        </button>
      </div>
      {editing !== undefined && (
        <RecordForm
          key={resource + ':' + (editing?.id || 'new')}
          resource={resource}
          record={editing}
          lookups={lookups}
          busy={busy}
          onCancel={() => setEditing(undefined)}
          onSave={(data) =>
            run(async () => {
              await api(
                '/' + resource + (editing ? '/' + editing.id : ''),
                editing ? 'PUT' : 'POST',
                data,
              );
              setEditing(undefined);
              await load();
              await refresh();
            }, 'Record saved')
          }
        />
      )}
      <div className="panel">
        <Table
          rows={rows}
          columns={[
            ['id', 'ID'],
            ...definition.fields
              .filter(([k]) => k !== 'password')
              .map(([key, label, type]) => [
                key,
                label,
                (row) =>
                  type === 'boolean'
                    ? row[key]
                      ? 'Yes'
                      : 'No'
                    : lookups[type]
                      ? lookups[type].find((v) => v.id === row[key])?.name ||
                        lookups[type].find((v) => v.id === row[key])?.code ||
                        '—'
                      : type === 'date'
                        ? row[key]?.slice(0, 10)
                        : row[key],
              ]),
            [
              'action',
              '',
              (r) => (
                <button
                  className="secondary small"
                  onClick={() => setEditing(r)}
                >
                  Edit
                </button>
              ),
            ],
          ]}
        />
      </div>
    </div>
  );
}
