import dotenv from 'dotenv';

const result = dotenv.config({
  path: 'backend/.env.cloud',
  override: true,
  quiet: true,
});
if (result.error)
  throw new Error('Create backend/.env.cloud from backend/.env.example first');
for (const key of [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_CA_BASE64',
  'JWT_SECRET',
  'DEMO_PASSWORD',
]) {
  if (!process.env[key] || /^(replace-|choose-)/.test(process.env[key])) {
    throw new Error(`Set ${key} in backend/.env.cloud before setup`);
  }
}
await import('../backend/scripts/setup.js');
