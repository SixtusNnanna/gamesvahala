import crypto from 'node:crypto';
import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { db } from './index.ts';
import { transactions, games } from './schema.ts';

export interface TransactionFilterParams {
  gameId?: string;
  date?: string; // YYYY-MM-DD
  paymentMode?: 'bank_transfer' | 'landmark_app' | 'upside_down_house';
}

export async function getTransactionsWithTotal(filter: TransactionFilterParams = {}) {
  try {
    const conditions = [];

    if (filter.gameId) {
      conditions.push(eq(transactions.gameId, filter.gameId));
    }

    if (filter.paymentMode) {
      conditions.push(eq(transactions.paymentMode, filter.paymentMode));
    }

    if (filter.date) {
      const startDate = new Date(`${filter.date}T00:00:00.000Z`);
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      conditions.push(and(gte(transactions.createdAt, startDate), lt(transactions.createdAt, endDate)));
    }

    const query = db
      .select({
        id: transactions.id,
        gameId: transactions.gameId,
        amount: transactions.amount,
        paymentMode: transactions.paymentMode,
        createdAt: transactions.createdAt,
        gameName: games.name,
      })
      .from(transactions)
      .innerJoin(games, eq(transactions.gameId, games.id))
      .orderBy(desc(transactions.createdAt));

    const records = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    const rawTotal = records.reduce((acc, row) => acc + Number(row.amount), 0);

    // Business fee deduction logic from original TransactionService:
    // bank_transfer: total = amount - (0.2323 * amount)
    // landmark_app: total = amount - (0.15 * amount)
    let netTotal = rawTotal;
    let feeDeducted = 0;
    let feePercentage = 0;
    let isFeeApplied = false;

    if (filter.paymentMode === 'bank_transfer') {
      feePercentage = 23.23;
      feeDeducted = rawTotal * 0.2323;
      netTotal = rawTotal - feeDeducted;
      isFeeApplied = true;
    } else if (filter.paymentMode === 'landmark_app') {
      feePercentage = 15;
      feeDeducted = rawTotal * 0.15;
      netTotal = rawTotal - feeDeducted;
      isFeeApplied = true;
    }

    return {
      transactions: records.map(r => ({
        id: String(r.id),
        gameId: String(r.gameId),
        amount: Number(r.amount),
        paymentMode: r.paymentMode,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        game: {
          id: String(r.gameId),
          name: r.gameName,
        },
      })),
      rawTotal: Number(rawTotal.toFixed(2)),
      total: Number(netTotal.toFixed(2)),
      feeDeducted: Number(feeDeducted.toFixed(2)),
      feePercentage,
      isFeeApplied,
    };
  } catch (error) {
    console.error('Failed to get transactions from MySQL:', error);
    throw new Error('Database query failed for transactions.', { cause: error });
  }
}

export async function getRecentTransactions(limit = 5) {
  try {
    const records = await db
      .select({
        id: transactions.id,
        gameId: transactions.gameId,
        amount: transactions.amount,
        paymentMode: transactions.paymentMode,
        createdAt: transactions.createdAt,
        gameName: games.name,
      })
      .from(transactions)
      .innerJoin(games, eq(transactions.gameId, games.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return records.map(r => ({
      id: String(r.id),
      gameId: String(r.gameId),
      amount: Number(r.amount),
      paymentMode: r.paymentMode,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      game: {
        id: String(r.gameId),
        name: r.gameName,
      },
    }));
  } catch (error) {
    console.error('Failed to get recent transactions from MySQL:', error);
    throw new Error('Database query failed for recent transactions.', { cause: error });
  }
}

export async function createTransaction(
  gameId: string,
  amount: number,
  paymentMode: 'bank_transfer' | 'landmark_app' | 'upside_down_house'
) {
  try {
    const id = crypto.randomUUID().replace(/-/g, '');
    const createdAt = new Date();

    await db.insert(transactions).values({
      id,
      gameId,
      amount: amount.toFixed(2),
      paymentMode,
      createdAt,
    });

    const created = await db
      .select({
        id: transactions.id,
        gameId: transactions.gameId,
        amount: transactions.amount,
        paymentMode: transactions.paymentMode,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    return created[0];
  } catch (error) {
    console.error('Failed to create transaction in MySQL:', error);
    throw new Error('Database insert failed for transaction.', { cause: error });
  }
}
