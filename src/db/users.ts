import crypto from 'node:crypto';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

/**
 * Generates a Passlib-compatible Argon2id PHC string:
 * $argon2id$v=19$m=65536,t=3,p=4$<salt_b64_no_pad>$<hash_b64_no_pad>
 */
export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
  });
}

/**
 * Verifies a password against either a Passlib Argon2 PHC string ($argon2id$...)
 * or a bcrypt hash ($2a$ / $2b$ / $2y$).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  if (storedHash.startsWith('$argon2')) {
    try {
      return await argon2.verify(storedHash, password);
    } catch (err) {
      console.error('Argon2 verification error:', err);
      return false;
    }
  }

  // Fallback for bcrypt hashes
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash);
  }

  return false;
}

export async function getUserCount(): Promise<number> {
  try {
    const all = await db.select({ id: users.id }).from(users);
    return all.length;
  } catch (error) {
    console.error('Failed to get user count:', error);
    return 0;
  }
}

export async function getUserByUsername(username: string) {
  try {
    const found = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim()))
      .limit(1);
    return found[0] || null;
  } catch (error) {
    console.error('Failed to get user by username:', error);
    throw new Error('Database query failed for user.', { cause: error });
  }
}

export async function createUser(username: string, password: string, role: 'admin' | 'staff' = 'staff') {
  try {
    const trimmedUsername = username.trim();
    const existing = await getUserByUsername(trimmedUsername);
    if (existing) {
      throw new Error('User already Exist');
    }

    const id = crypto.randomUUID().replace(/-/g, '');
    const hashedPassword = await hashPasswordArgon2(password);

    await db.insert(users).values({
      id,
      username: trimmedUsername,
      hashedPassword,
      role,
    });

    return {
      id,
      username: trimmedUsername,
      role,
    };
  } catch (error: any) {
    console.error('Failed to create user in MySQL:', error);
    throw new Error(error.message || 'Database insert failed for user.', { cause: error });
  }
}

export async function authenticateUser(username: string, password: string) {
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
      return null;
    }

    return {
      id: String(user.id),
      username: user.username,
      role: user.role as 'admin' | 'staff',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function getStaffUsers() {
  try {
    const staff = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, 'staff'));
    return staff.map(s => ({
      id: String(s.id),
      username: s.username,
      role: s.role,
    }));
  } catch (error) {
    console.error('Failed to get staff users:', error);
    throw new Error('Database query failed for staff users.', { cause: error });
  }
}
