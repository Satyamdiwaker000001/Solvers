import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(password, encoded) {
  const [saltHex, keyHex] = String(encoded || "").split(":");
  if (!saltHex || !keyHex || !/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(keyHex)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
