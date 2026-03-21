import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const maxValid = Math.floor(256 / chars.length) * chars.length;
  let result = '';
  while (result.length < length) {
    const byte = randomBytes(1)[0];
    if (byte < maxValid) {
      result += chars[byte % chars.length];
    }
  }
  return result;
}
