// Seals the board's figures so only the right credentials can read them.
// Neither the username nor the password is written anywhere: the key is derived
// from them, and only salt + iv + ciphertext are emitted.
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ITER = 250000;
const [user, pass] = [process.env.BOARD_USER, process.env.BOARD_PASS];
if (!user || !pass) { console.error('BOARD_USER / BOARD_PASS not set'); process.exit(1); }

const payload = readFileSync('snapshot.json', 'utf8');
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv   = crypto.getRandomValues(new Uint8Array(12));

// username is folded into the KDF input, so a wrong user fails exactly like a wrong password
const material = await crypto.subtle.importKey(
  'raw', enc.encode(user.trim().toLowerCase() + '\u0000' + pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
  material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(payload)));

const b64 = (u8) => Buffer.from(u8).toString('base64');
const vault = { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
writeFileSync('vault.json', JSON.stringify(vault));
console.log(`sealed ${payload.length} bytes -> ${vault.ct.length} b64 chars, ${ITER} PBKDF2 iterations`);
