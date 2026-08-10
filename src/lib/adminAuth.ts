export function getAdminToken(): string {
  return process.env.ADMIN_SESSION_TOKEN || "change-this-in-env";
}

export function isValidAdminCookie(value: string | undefined): boolean {
  if (!value) return false;
  return value === getAdminToken();
}
