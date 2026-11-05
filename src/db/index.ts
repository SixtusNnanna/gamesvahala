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
    const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;

    if (connectionUri) {
      global._mysqlPool = mysql.createPool({
        uri: connectionUri,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } else {
      global._mysqlPool = mysql.createPool({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
        user: process.env.MYSQL_USER || 'valhala_user',
        password: process.env.MYSQL_PASSWORD || 'valhala_pass',
        database: process.env.MYSQL_DATABASE || 'valhala_games',
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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
