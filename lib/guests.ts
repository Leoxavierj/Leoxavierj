import "server-only";
import { randomUUID } from "node:crypto";
import { kv } from "./redis";
import { normalizeName, sameContent, type Admin, type Guest, type GuestInput } from "./types";

const GUESTS = "theo5:guests"; // hash id -> JSON do convidado
const NAMES = "theo5:names"; // hash nome normalizado -> id

function parse(v: unknown): Guest | null {
  if (!v) return null;
  if (typeof v === "string") {
    try { return JSON.parse(v) as Guest; } catch { return null; }
  }
  return v as Guest;
}

export async function listGuests(): Promise<Guest[]> {
  const all = await kv().hgetall(GUESTS);
  if (!all) return [];
  return Object.values(all)
    .map(parse)
    .filter((g): g is Guest => !!g)
    .sort((a, b) => a.responsavel.localeCompare(b.responsavel, "pt-BR"));
}

export async function getGuest(id: string): Promise<Guest | null> {
  return parse(await kv().hget(GUESTS, id));
}

async function save(g: Guest) {
  await kv().hset(GUESTS, { [g.id]: JSON.stringify(g) });
}

function toInput(g: Guest): GuestInput {
  return { responsavel: g.responsavel, status: g.status, pessoas: g.pessoas, observacao: g.observacao };
}

/** Resposta do formulário público: cria ou atualiza pelo nome do responsável. */
export async function upsertFromForm(
  input: GuestInput,
): Promise<{ guest: Guest; isNew: boolean; changed: boolean }> {
  const db = kv();
  const key = normalizeName(input.responsavel);
  const now = new Date().toISOString();

  let id = (await db.hget(NAMES, key)) as string | null;
  let existing = id ? await getGuest(id) : null;

  if (!existing) {
    const newId = randomUUID();
    const claimed = await db.hsetnx(NAMES, key, newId);
    if (claimed === 1) {
      const guest: Guest = { id: newId, ...input, origem: "formulario", createdAt: now, updatedAt: now };
      await save(guest);
      return { guest, isNew: true, changed: true };
    }
    // Outra requisição criou ao mesmo tempo (ou havia um índice órfão)
    id = (await db.hget(NAMES, key)) as string | null;
    existing = id ? await getGuest(id) : null;
    if (!existing) {
      const guest: Guest = { id: newId, ...input, origem: "formulario", createdAt: now, updatedAt: now };
      await db.hset(NAMES, { [key]: newId });
      await save(guest);
      return { guest, isNew: true, changed: true };
    }
  }

  const changed = !sameContent(toInput(existing), input) || existing.origem !== "formulario";
  const guest: Guest = {
    ...existing,
    ...input,
    origem: "formulario",
    origemPor: undefined,
    updatedAt: changed ? now : existing.updatedAt,
  };
  if (changed) await save(guest);
  // Se o convidado foi cadastrado manualmente como "aguardando", a resposta conta como nova
  const isNew = existing.status === "aguardando";
  return { guest, isNew, changed };
}

export class NameConflictError extends Error {
  constructor(public existing: Guest) {
    super(`Já existe um convidado com o nome "${existing.responsavel}".`);
  }
}

export async function createManual(input: GuestInput, admin: Admin): Promise<Guest> {
  const db = kv();
  const key = normalizeName(input.responsavel);
  const id = randomUUID();
  const claimed = await db.hsetnx(NAMES, key, id);
  if (claimed !== 1) {
    const otherId = (await db.hget(NAMES, key)) as string | null;
    const other = otherId ? await getGuest(otherId) : null;
    if (other) throw new NameConflictError(other);
    await db.hset(NAMES, { [key]: id }); // índice órfão
  }
  const now = new Date().toISOString();
  const guest: Guest = { id, ...input, origem: "manual", origemPor: admin, createdAt: now, updatedAt: now };
  await save(guest);
  return guest;
}

export async function updateGuest(id: string, input: GuestInput): Promise<Guest | null> {
  const db = kv();
  const existing = await getGuest(id);
  if (!existing) return null;
  const oldKey = normalizeName(existing.responsavel);
  const newKey = normalizeName(input.responsavel);
  if (oldKey !== newKey) {
    const claimed = await db.hsetnx(NAMES, newKey, id);
    if (claimed !== 1) {
      const otherId = (await db.hget(NAMES, newKey)) as string | null;
      const other = otherId && otherId !== id ? await getGuest(otherId) : null;
      if (other) throw new NameConflictError(other);
      await db.hset(NAMES, { [newKey]: id });
    }
    const current = await db.hget(NAMES, oldKey);
    if (current === id) await db.hdel(NAMES, oldKey);
  }
  const guest: Guest = { ...existing, ...input, updatedAt: new Date().toISOString() };
  await save(guest);
  return guest;
}

export async function deleteGuest(id: string): Promise<boolean> {
  const db = kv();
  const existing = await getGuest(id);
  if (!existing) return false;
  await db.hdel(GUESTS, id);
  const key = normalizeName(existing.responsavel);
  if ((await db.hget(NAMES, key)) === id) await db.hdel(NAMES, key);
  return true;
}

/** Limite simples por IP (janela fixa). */
export async function rateLimit(bucket: string, ip: string, max: number, windowSec: number) {
  const key = `theo5:rl:${bucket}:${ip}`;
  const n = await kv().incr(key);
  if (n === 1) await kv().expire(key, windowSec);
  return n <= max;
}
