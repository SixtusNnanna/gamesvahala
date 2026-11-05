import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
    user: process.env.MYSQL_USER || "valhala_user",
    password: process.env.MYSQL_PASSWORD || "valhala_pass",
    database: process.env.MYSQL_DATABASE || "valhala_games",
  },
  verbose: true,
});
