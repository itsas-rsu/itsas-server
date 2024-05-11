import crypto from 'crypto';

const algorithm = process.env.CRYPTO_ALGORITHM;
const password = process.env.CRYPTO_PASSWORD
const key = crypto.scryptSync(password, process.env.CRYPTO_PASSWORD, 32);
const iv = Buffer.alloc(16, 0);

export function encode(data: string) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted
}

export function decode(data: string) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
