export function getAdminToken(): string {
  const token = process.env.ADMIN_SESSION_TOKEN;
  if (!token) throw new Error("ADMIN_SESSION_TOKEN env var is not set");
  return token;
}

export function isValidAdminCookie(value: string | undefined): boolean {
  if (!value) return false;
  const token = process.env.ADMIN_SESSION_TOKEN;
  if (!token) return false;
  return value === token;
}
