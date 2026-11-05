import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

/**
 * Generates a Passlib-compatible Argon2id PHC string:
 * $argon2id$v=19$m=65536,t=3,p=4$<salt_b64_no_pad>$<hash_b64_no_pad>
 */
export function hashPasswordArgon2(password: string): string {
  const salt = crypto.randomBytes(16);
  const memory = 65536;
  const passes = 3;
  const parallelism = 4;
  const tagLength = 32;

  const derived: Buffer = (crypto as any).argon2Sync('argon2id', {
    message: password,
    nonce: salt,
    parallelism,
    tagLength,
    memory,
    passes,
  });

  const saltB64 = salt.toString('base64').replace(/=+$/, '');
  const hashB64 = derived.toString('base64').replace(/=+$/, '');
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${saltB64}$${hashB64}`;
}

/**
 * Verifies a password against either a Passlib Argon2 PHC string ($argon2id$...)
 * or a bcrypt hash ($2a$ / $2b$ / $2y$).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  if (storedHash.startsWith('$argon2')) {
    try {
      // Example: $argon2id$v=19$m=65536,t=3,p=4$saltB64$hashB64
      const parts = storedHash.split('$');
      if (parts.length < 6) return false;

      const variant = parts[1] as 'argon2id' | 'argon2i' | 'argon2d';
      if (variant !== 'argon2id' && variant !== 'argon2i' && variant !== 'argon2d') {
        return false;
      }

      const paramParts = parts[3].split(',');
      let memory = 65536;
      let passes = 3;
      let parallelism = 4;

      for (const param of paramParts) {
        const [k, v] = param.split('=');
        const num = parseInt(v, 10);
        if (!isNaN(num)) {
          if (k === 'm') memory = num;
          if (k === 't') passes = num;
          if (k === 'p') parallelism = num;
        }
      }

      const salt = Buffer.from(parts[4], 'base64');
      const expectedHash = Buffer.from(parts[5], 'base64');

      const derived: Buffer = (crypto as any).argon2Sync(variant, {
        message: password,
        nonce: salt,
        parallelism,
        tagLength: expectedHash.length,
        memory,
        passes,
      });

      return (
        derived.length === expectedHash.length &&
        crypto.timingSafeEqual(derived, expectedHash)
      );
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
    const hashedPassword = hashPasswordArgon2(password);

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
