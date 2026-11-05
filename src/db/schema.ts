import { mysqlTable, varchar, text, decimal, datetime, mysqlEnum } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Matches original FastAPI SQLAlchemy `users` table in app/database/models.py
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  hashedPassword: varchar('hashed_password', { length: 200 }).notNull(),
  role: mysqlEnum('role', ['staff', 'admin']).notNull().default('staff'),
});

// Matches original FastAPI SQLAlchemy `games` table in app/database/models.py
export const games = mysqlTable('games', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['available', 'unavailable']).notNull().default('available'),
});

// Matches original FastAPI SQLAlchemy `transactions` table in app/database/models.py
export const transactions = mysqlTable('transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMode: mysqlEnum('payment_mode', ['bank_transfer', 'landmark_app', 'upside_down_house'])
    .notNull()
    .default('bank_transfer'),
  gameId: varchar('game_id', { length: 36 }).notNull(),
  createdAt: datetime('created_at'),
});

// Relations
export const gamesRelations = relations(games, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  game: one(games, {
    fields: [transactions.gameId],
    references: [games.id],
  }),
}));
