import { randomBytes } from "crypto";

export function shortId(prefix: string): string {
  return `${prefix}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
