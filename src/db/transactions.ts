import crypto from 'node:crypto';
import { db } from './index.ts';
import { transactions, games } from './schema.ts';
import { eq, desc, and, gte, lt } from 'drizzle-orm';

export type PaymentMode = 'bank_transfer' | 'landmark_app' | 'upside_down_house' | 'front_desk';

export interface TransactionFilterParams {
  gameId?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  paymentMode?: PaymentMode;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return dt;
}

function addOneYearUtc(date: Date): Date {
  const year = date.getUTCFullYear() + 1;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const next = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  // Clamp Feb 29 -> Feb 28 in non-leap years
  if (month === 1 && day === 29 && next.getUTCMonth() !== 1) {
    return new Date(Date.UTC(year, 1, 28, 0, 0, 0, 0));
  }
  return next;
}

function subtractOneYearUtc(date: Date): Date {
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const prev = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  if (month === 1 && day === 29 && prev.getUTCMonth() !== 1) {
    return new Date(Date.UTC(year, 1, 28, 0, 0, 0, 0));
  }
  return prev;
}

export class DateRangeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateRangeValidationError';
  }
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

    let startStr = filter.startDate;
    let endStr = filter.endDate;

    // Support legacy single-date parameter if no interval was provided
    if (!startStr && !endStr && filter.date) {
      startStr = filter.date;
      endStr = filter.date;
    }

    if (startStr && !DATE_REGEX.test(startStr)) {
      throw new DateRangeValidationError('Invalid start date format. Expected YYYY-MM-DD.');
    }
    if (endStr && !DATE_REGEX.test(endStr)) {
      throw new DateRangeValidationError('Invalid end date format. Expected YYYY-MM-DD.');
    }

    if (startStr || endStr) {
      let rangeStart: Date;
      let rangeEndInclusive: Date;

      if (startStr && endStr) {
        rangeStart = parseUtcDate(startStr);
        rangeEndInclusive = parseUtcDate(endStr);

        if (rangeStart.getTime() > rangeEndInclusive.getTime()) {
          throw new DateRangeValidationError('Start date cannot be after end date.');
        }

        const maxAllowedEnd = addOneYearUtc(rangeStart);
        if (rangeEndInclusive.getTime() > maxAllowedEnd.getTime()) {
          throw new DateRangeValidationError('Date range cannot exceed 1 year.');
        }
      } else if (startStr) {
        rangeStart = parseUtcDate(startStr);
        rangeEndInclusive = addOneYearUtc(rangeStart);
      } else {
        rangeEndInclusive = parseUtcDate(endStr!);
        rangeStart = subtractOneYearUtc(rangeEndInclusive);
      }

      // Exclusive upper bound is start of the day following rangeEndInclusive
      const rangeEndExclusive = new Date(rangeEndInclusive.getTime() + 24 * 60 * 60 * 1000);
      conditions.push(and(gte(transactions.createdAt, rangeStart), lt(transactions.createdAt, rangeEndExclusive)));
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

    // Business fee deduction logic:
    // bank_transfer: total = amount - (0.2323 * amount)
    // landmark_app: total = amount - (0.15 * amount)
    // upside_down_house & front_desk: 0% fee (full revenue)
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
    if (error instanceof DateRangeValidationError) {
      throw error;
    }
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
  paymentMode: 'bank_transfer' | 'landmark_app' | 'upside_down_house' | 'front_desk'
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
