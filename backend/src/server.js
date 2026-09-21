import { app } from './app.js';
import { pool } from './db.js';
const server = app.listen(process.env.PORT || 4000, '127.0.0.1', () =>
  console.log(`TableTrail API: http://127.0.0.1:${process.env.PORT || 4000}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
