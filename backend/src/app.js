import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, fail } from './db.js';
import { authenticate, sign, cookieOptions } from './auth.js';
import { orders } from './orders.js';
import { management } from './management.js';
import { feedback } from './feedback.js';
import { analytics } from './analytics.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    !req.is('application/json')
  )
    throw fail(415, 'Use application/json');
  const origin = req.get('origin');
  if (origin && origin !== (process.env.APP_ORIGIN || 'http://localhost:3000'))
    throw fail(403, 'Origin is not allowed');
  next();
});
app.get('/api/health', async (req, res) => {
  await query('SELECT 1');
  res.json({ status: 'ok' });
});
app.post(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
  async (req, res) => {
    const { email, password } = z
      .object({ email: z.email(), password: z.string().min(1).max(72) })
      .parse(req.body);
    const [user] = await query(
      'SELECT * FROM employees WHERE email=? AND active=TRUE',
      [email],
    );
    // A fixed dummy hash keeps missing-user checks computationally comparable.
    const hash =
      user?.password_hash ||
      '$2b$12$hEDGOAVGaoLWOMysBn/lQ.cP9d1LjA5yR8SgFKCKpjcjPCUc9JRoq';
    const valid = await bcrypt.compare(password, hash);
    if (!user || !valid) throw fail(401, 'Incorrect email or password');
    res
      .cookie('session', sign(user), cookieOptions)
      .json({ message: 'Signed in' });
  },
);
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session', { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Signed out' });
});
app.use('/api/feedback', feedback);
app.use('/api', authenticate);
app.get('/api/auth/me', (req, res) => res.json(req.user));
app.use('/api/orders', orders);
app.use('/api/analytics', analytics);
app.use('/api', management);
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((error, req, res, next) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({
      error: error.issues
        .map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`)
        .join('; '),
    });
  if (error.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ error: 'This record already exists' });
  if (
    [
      'ER_NO_REFERENCED_ROW_2',
      'ER_ROW_IS_REFERENCED_2',
      'ER_CHECK_CONSTRAINT_VIOLATED',
    ].includes(error.code)
  )
    return res
      .status(400)
      .json({ error: 'A database relationship or value is invalid' });
  if (error.code === 'ER_SIGNAL_EXCEPTION')
    return res.status(409).json({ error: error.sqlMessage });
  if (error.code === 'ER_LOCK_DEADLOCK')
    return res
      .status(409)
      .json({ error: 'Another update conflicted. Please retry.' });
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid JSON body' });
  if (!error.status)
    console.error('Request failed:', error.code || error.message);
  res.status(error.status || 500).json({
    error: error.status
      ? error.message
      : 'Server error. Check the backend log.',
  });
});
