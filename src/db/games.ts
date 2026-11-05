import crypto from 'node:crypto';
import { eq, asc } from 'drizzle-orm';
import { db } from './index.ts';
import { games } from './schema.ts';

export async function getGames() {
  try {
    return await db.select().from(games).orderBy(asc(games.name));
  } catch (error) {
    console.error('Failed to get games from MySQL:', error);
    throw new Error('Database query failed for games.', { cause: error });
  }
}

export async function createGame(
  name: string,
  description: string,
  status: 'available' | 'unavailable' = 'available'
) {
  try {
    const id = crypto.randomUUID().replace(/-/g, '');
    await db.insert(games).values({
      id,
      name,
      description,
      status,
    });

    const created = await db.select().from(games).where(eq(games.id, id)).limit(1);
    return created[0];
  } catch (error) {
    console.error('Failed to create game in MySQL:', error);
    throw new Error('Database insert failed for game.', { cause: error });
  }
}

export async function updateGameStatus(id: string, status: 'available' | 'unavailable') {
  try {
    await db
      .update(games)
      .set({ status })
      .where(eq(games.id, id));

    const updated = await db.select().from(games).where(eq(games.id, id)).limit(1);
    return updated[0] || null;
  } catch (error) {
    console.error('Failed to update game status in MySQL:', error);
    throw new Error('Database update failed for game status.', { cause: error });
  }
}
