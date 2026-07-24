export function decodeJwtEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}
