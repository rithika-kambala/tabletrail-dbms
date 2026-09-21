import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});
export const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'tabletrail',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tabletrail',
  decimalNumbers: true,
  // DATE has no timezone: keep promotion dates unchanged in JSON and edit forms.
  dateStrings: ['DATE'],
  ...(process.env.DB_CA_BASE64
    ? {
        ssl: {
          ca: Buffer.from(process.env.DB_CA_BASE64, 'base64'),
          rejectUnauthorized: true,
        },
      }
    : {}),
};
export const pool = mysql.createPool({ ...config, connectionLimit: 10 });
export async function query(sql, values = [], db = pool) {
  const [rows] = await db.execute(sql, values);
  return rows;
}
export async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
export function fail(status, message) {
  return Object.assign(new Error(message), { status });
}
