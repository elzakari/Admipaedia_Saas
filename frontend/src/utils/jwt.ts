export type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

function base64UrlToBase64(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padLength);
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwtPayload<T extends JwtPayload = JwtPayload>(token: string): T | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const payloadJson = decodeBase64Utf8(base64UrlToBase64(payloadPart));
    const payload = JSON.parse(payloadJson) as T;
    return payload;
  } catch {
    return null;
  }
}

export function getJwtExpirationMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  return exp * 1000;
}
