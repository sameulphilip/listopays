import { sanitizePublicError } from "@/lib/brand";

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = (await res.json()) as T & { success?: boolean; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(sanitizePublicError(json.error || "Request failed"));
  }
  return json;
}
