'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  Leaf,
  ArrowUpRight,
  IndianRupee,
  Store,
  LogOut,
  Plus,
  UtensilsCrossed,
} from 'lucide-react';
import { api, Brand } from '../components/shared';
import { Records, resources } from '../components/Records';
import { Dashboard } from '../components/Dashboard';
import { NewOrder, Orders } from '../components/Orders';
import { Inventory } from '../components/Inventory';
import { Recipes } from '../components/Recipes';
import { Reports } from '../components/Reports';
export default function Home() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null),
    [page, setPage] = useState('Dashboard'),
    [branch, setBranch] = useState(''),
    [data, setData] = useState(null),
    [orders, setOrders] = useState([]),
    [lookups, setLookups] = useState({
      branches: [],
      menu: [],
      categories: [],
      customers: [],
      promotions: [],
      availability: [],
      ingredients: [],
      suppliers: [],
    }),
    [newOrder, setNewOrder] = useState(false),
    [resource, setResource] = useState('branches');
  const run = useCallback(async (work, message) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
      if (message) setNotice({ text: message });
    } catch (e) {
      setNotice({ text: e.message, error: true });
    } finally {
      setBusy(false);
    }
  }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    const suffix = branch ? '?branch_id=' + branch : '';
    const keys = [
      'branches',
      'menu',
      'categories',
      'customers',
      'promotions',
      'availability',
      'ingredients',
      'suppliers',
    ];
    const values = await Promise.all(keys.map((k) => api('/' + k)));
    setLookups(Object.fromEntries(keys.map((k, i) => [k, values[i]])));
    setOrders(await api('/orders' + suffix));
    if (user.role !== 'staff') setData(await api('/analytics' + suffix));
  }, [user, branch]);
  useEffect(() => {
    api('/auth/me')
      .then((u) => {
        setUser(u);
        setPage(u.role === 'staff' ? 'Orders' : 'Dashboard');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user) run(refresh);
  }, [refresh, run, user]);
  if (loading) return <div className="spinner">Opening TableTrail…</div>;
  if (!user)
    return (
      <main className="login">
        <section className="login-story">
          <Brand />
          <div className="eyebrow mt-12" style={{ color: '#a8c496' }}>
            Your restaurant, connected
          </div>
          <h1>
            Every order.
            <br />
            Every branch.
            <br />
            <span style={{ color: '#c6e3aa' }}>One clear picture.</span>
          </h1>
          <p>
            Track every order. Understand every customer.
            <br />
            Run every branch smarter.
          </p>
          <div className="mt-10 text-xs" style={{ color: '#88ab96' }}>
            TABLETRAIL / RESTAURANT MANAGEMENT
          </div>
        </section>
        <section className="login-box">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              run(async () => {
                await api('/auth/login', 'POST', Object.fromEntries(form));
                const u = await api('/auth/me');
                setUser(u);
                setPage(u.role === 'staff' ? 'Orders' : 'Dashboard');
              });
            }}
          >
            <div>
              <div className="eyebrow mb-3">Welcome back</div>
              <h1>Sign in to your workspace</h1>
              <p className="muted">A smarter service starts here.</p>
            </div>
            {notice && (
              <div className="notice error" role="alert">
                {notice.text}
              </div>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                placeholder="admin@tabletrail.test"
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button className="primary" disabled={busy}>
              Sign in <ArrowUpRight size={16} className="inline ml-2" />
            </button>
            <p className="login-foot">
              Demo accounts: admin@tabletrail.test, manager@tabletrail.test,
              staff@tabletrail.test.
              <br />
              Use the password chosen during database setup.
            </p>
          </form>
        </section>
      </main>
    );
  const navigation = [
    ['Dashboard', LayoutDashboard],
    ['Orders', ShoppingBag],
    ['Inventory', Package],
    ['Customers', Users],
    ['Reports', ArrowUpRight],
    ['Manage', Settings],
  ].filter(([name]) =>
    user.role === 'staff'
      ? ['Orders', 'Customers'].includes(name)
      : user.role === 'manager'
        ? name !== 'Manage'
        : true,
  );
  const descriptions = {
    Dashboard: 'A fresh look at how your restaurants are doing.',
    Orders: 'From the first dish to the final payment.',
    Inventory: 'Keep every kitchen ready for service.',
    Customers: 'Build a better understanding of your guests.',
    Reports: 'Useful insights, straight from your database.',
    Manage: 'The essentials that keep your restaurants running.',
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <div className="eyebrow mt-10">Workspace</div>
        <nav className="nav" aria-label="Main navigation">
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? 'active' : ''}
              onClick={() => {
                setPage(name);
                setNewOrder(false);
                setNotice(null);
              }}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={25} className="mb-3" />
          <strong className="text-white">Made for better service.</strong>
          <br />
          One connected view of your restaurant business.
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user.name[0]}</div>
          <div>
            <strong className="text-xs text-white">{user.name}</strong>
            <div className="text-xs capitalize mt-1">{user.role}</div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="muted text-xs">
            Workspace <span className="mx-2">/</span>
            <strong style={{ color: 'var(--ink)' }}>{page}</strong>
          </span>
          <div className="flex gap-3 items-center">
            {user.role === 'admin' ? (
              <select
                aria-label="Branch filter"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setData(null);
                  setNewOrder(false);
                }}
              >
                <option value="">All branches</option>
                {lookups.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="badge">
                {lookups.branches[0]?.name || 'Branch workspace'}
              </span>
            )}
            <button
              aria-label="Sign out"
              className="secondary small"
              onClick={() =>
                run(async () => {
                  await api('/auth/logout', 'POST', {});
                  setUser(null);
                  setData(null);
                  setBranch('');
                }, 'Signed out')
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow mb-2">
                {page === 'Dashboard'
                  ? 'The big picture'
                  : 'Restaurant workspace'}
              </div>
              <h1>
                {newOrder
                  ? 'Create an order'
                  : page === 'Dashboard'
                    ? 'Business overview'
                    : page}
              </h1>
              <p>{descriptions[page]}</p>
            </div>
            {['Dashboard', 'Orders'].includes(page) && !newOrder && (
              <button
                className="primary"
                disabled={busy || !lookups.branches.length}
                onClick={() => {
                  setPage('Orders');
                  setNewOrder(true);
                }}
              >
                <Plus size={16} className="inline mr-1" /> New order
              </button>
            )}
          </div>
          {notice && (
            <div
              className={'notice ' + (notice.error ? 'error' : '')}
              role={notice.error ? 'alert' : 'status'}
            >
              {notice.text}
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                ×
              </button>
            </div>
          )}
          {busy && (
            <div className="muted text-xs mb-3" role="status">
              Updating workspace…
            </div>
          )}
          {page === 'Dashboard' && (
            <Dashboard
              data={data}
              orders={orders}
              onOrders={() => setPage('Orders')}
            />
          )}
          {page === 'Orders' &&
            (newOrder ? (
              <NewOrder
                lookups={lookups}
                branch={branch}
                user={user}
                run={run}
                refresh={refresh}
                busy={busy}
                onClose={() => setNewOrder(false)}
              />
            ) : (
              <Orders
                key={branch}
                rows={orders}
                run={run}
                refresh={refresh}
                busy={busy}
              />
            ))}
          {page === 'Inventory' && (
            <Inventory
              lookups={lookups}
              branch={branch}
              run={run}
              refresh={refresh}
              busy={busy}
            />
          )}
          {page === 'Customers' && (
            <Records
              resource="customers"
              lookups={lookups}
              run={run}
              refresh={refresh}
              busy={busy}
            />
          )}
          {page === 'Reports' && <Reports data={data} />}
          {page === 'Manage' && (
            <>
              <div className="tabs">
                {Object.entries(resources)
                  .filter(([key]) => key !== 'customers')
                  .map(([key, v]) => (
                    <button
                      key={key}
                      className={resource === key ? 'selected' : ''}
                      onClick={() => setResource(key)}
                    >
                      {v.label}
                    </button>
                  ))}
                <button
                  className={resource === 'recipes' ? 'selected' : ''}
                  onClick={() => setResource('recipes')}
                >
                  Recipes & costs
                </button>
              </div>
              {resource === 'recipes' ? (
                <Recipes lookups={lookups} run={run} busy={busy} />
              ) : (
                <Records
                  key={resource}
                  resource={resource}
                  lookups={lookups}
                  run={run}
                  refresh={refresh}
                  busy={busy}
                />
              )}
            </>
          )}
          <footer className="mt-8 text-xs muted flex justify-between">
            <span>TableTrail · Restaurant intelligence</span>
            <span>Powered by your MySQL database</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
