import crypto from "crypto";

export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateReferenceNumber(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, "0");
  return `${prefix}-${year}-${padded}`;
}
