import crypto from "node:crypto";

export function generateCode(length = 6) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verifyCode(input: string, hash: string | null | undefined) {
  if (!hash) return false;
  return hashCode(input) === hash;
}
