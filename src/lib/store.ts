import { randomUUID } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { ActivityItem, StoreData } from "./types";

const FILE = path.join(process.cwd(), "data", "store.json");

const EMPTY: StoreData = {
  payments: [],
  charges: [],
  refunds: [],
  webhooks: [],
  activity: [],
  users: [],
};

function ensureFile() {
  mkdirSync(path.dirname(FILE), { recursive: true });
  if (!existsSync(FILE)) {
    writeFileSync(FILE, JSON.stringify(EMPTY, null, 2), "utf8");
  }
}

export function readStore(): StoreData {
  ensureFile();
  try {
    const raw = readFileSync(FILE, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) } as StoreData;
  } catch {
    return structuredClone(EMPTY);
  }
}

export function writeStore(data: StoreData) {
  ensureFile();
  writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function mutateStore<T>(fn: (data: StoreData) => T): T {
  const data = readStore();
  const result = fn(data);
  writeStore(data);
  return result;
}

export function logActivity(
  data: StoreData,
  item: Omit<ActivityItem, "id" | "at">,
) {
  data.activity.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    ...item,
  });
  data.activity = data.activity.slice(0, 200);
}
