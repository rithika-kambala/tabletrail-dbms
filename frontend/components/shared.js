import { UtensilsCrossed } from 'lucide-react';
export const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
export async function api(path, method = 'GET', data) {
  const response = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
export function Table({ columns, rows, empty = 'No records yet.' }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map(([key, , render]) => (
                <td key={key}>
                  {render ? render(row) : String(row[key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">{empty}</div>}
    </div>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <UtensilsCrossed size={21} />
      </span>
      TableTrail<span style={{ color: '#a8c496' }}>.</span>
    </div>
  );
}
export function Status({ value }) {
  return <span className={'badge ' + value}>{value}</span>;
}
