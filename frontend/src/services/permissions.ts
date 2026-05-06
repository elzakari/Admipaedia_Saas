type SignatureData = {
  type: "typed" | "drawn";
  value: string;
  timestamp: string;
  hash: string;
};

type SubmitPayload = {
  studentId: string;
  childName: string;
  locale: string;
  permissions: {
    mediaConsent: boolean;
    fieldTripConsent: boolean;
    dataSharingConsent: boolean;
    receiveNotices: boolean;
  };
  signature: SignatureData;
  version: {
    policyVersion: string;
    formVersion: string;
  };
  metadata?: Record<string, any>;
};

const STORAGE_KEY = "admipaedia.permissions.audit";
const POLICY_VERSION = "2025.10";

export function getCurrentPolicyVersion() {
  return POLICY_VERSION;
}

function readAudit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAudit(data: Record<string, Array<{ timestamp: string; action: string }>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function appendAudit(studentId: string, action: string) {
  const audit = readAudit();
  const entries = audit[studentId] || [];
  entries.push({ timestamp: new Date().toISOString(), action });
  audit[studentId] = entries;
  writeAudit(audit);
}

export async function submitPermissionForm(payload: SubmitPayload): Promise<{ ok: boolean; error?: string }> {
  appendAudit(payload.studentId, `Permissions updated (policy ${payload.version.policyVersion}, form ${payload.version.formVersion})`);
  appendAudit(payload.studentId, `Signature ${payload.signature.type} hash=${payload.signature.hash}`);
  return { ok: true };
}

export async function requestChange(args: { studentId: string; text: string; locale: string }): Promise<{ ok: boolean; error?: string }> {
  appendAudit(args.studentId, `Change request (${args.locale}): ${args.text}`);
  return { ok: true };
}

export async function revokePermission(args: { studentId: string; revokeAll?: boolean }): Promise<{ ok: boolean; error?: string }> {
  appendAudit(args.studentId, args.revokeAll ? "All permissions revoked" : "Permission revoked");
  return { ok: true };
}

export function getAuditTrail(studentId: string): Array<{ timestamp: string; action: string }> {
  const audit = readAudit();
  return audit[studentId] || [];
}