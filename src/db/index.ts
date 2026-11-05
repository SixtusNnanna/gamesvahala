import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';

dotenv.config();

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const createPool = () => {
  if (!global._mysqlPool) {
    const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

    if (connectionUri) {
      const parsed = new URL(connectionUri);
      const useSsl =
        process.env.MYSQL_SSL === 'true' ||
        parsed.searchParams.has('ssl-mode') ||
        parsed.searchParams.has('ssl') ||
        parsed.hostname.includes('aivencloud.com');

      global._mysqlPool = mysql.createPool({
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ''),
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } else {
      const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || '127.0.0.1';
      const portStr = process.env.MYSQL_PORT || process.env.MYSQLPORT;
      const useSsl =
        process.env.MYSQL_SSL === 'true' ||
        host.includes('aivencloud.com');

      global._mysqlPool = mysql.createPool({
        host,
        port: portStr ? parseInt(portStr, 10) : 3306,
        user: process.env.MYSQL_USER || process.env.MYSQLUSER || 'valhala_user',
        password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || 'valhala_pass',
        database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'valhala_games',
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    }
  }
  return global._mysqlPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema, mode: 'default' });
