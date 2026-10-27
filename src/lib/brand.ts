export const BRAND = {
  name: "Leez Pay",
  legalName: "Leez Pay",
  product: "Console",
  tagline: "Digital wallet & payments",
} as const;

export function roleLabel(role: string) {
  return role === "admin" ? "Admin" : "Staff";
}

export function sanitizePublicError(message: string) {
  return message
    .replace(/LISTOPAYS_[A-Z_]+/g, "a required key")
    .replace(/https?:\/\/[^\s]*listopays[^\s]*/gi, "the payment service")
    .replace(/listopays\.com/gi, "the payment service")
    .replace(/listopays/gi, "payment service");
}
