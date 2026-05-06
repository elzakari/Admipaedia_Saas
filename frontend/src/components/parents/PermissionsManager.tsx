import { useEffect, useMemo, useRef, useState } from "react";
import { TouchFriendlyButton } from "../../components/common/TouchFriendlyButton";
import { submitPermissionForm, requestChange, revokePermission, getAuditTrail, getCurrentPolicyVersion } from "../../services/permissions";

type StudentData = {
  id: string;
  name: string;
  studentId: string;
  class: string;
  photo?: string;
};

type PermissionsManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  currentChild: StudentData;
};

type SignatureData = {
  type: "typed" | "drawn";
  value: string;
  timestamp: string;
  hash: string;
};

const translations = {
  en: {
    title: "Parent Permissions",
    description: "Review and update your child's permissions. Your choices are saved securely and can be changed at any time.",
    language: "Language",
    highContrast: "High contrast",
    textSize: "Text size",
    mediaConsent: "Media (photo/video) consent",
    fieldTripConsent: "Field trip consent",
    dataSharingConsent: "Data sharing consent",
    receiveNotices: "Receive school notices",
    signatureTitle: "Electronic Signature",
    signatureTypedLabel: "Typed full name (as signature)",
    signatureDrawnLabel: "Drawn signature (optional)",
    submit: "Submit",
    changesTitle: "Request Modification or Revoke",
    changesPlaceholder: "Describe your request (e.g., revoke media consent)",
    sendRequest: "Send Request",
    revokeAll: "Revoke All Permissions",
    close: "Close",
    required: "This field is required.",
    saved: "Permissions updated.",
    requestSent: "Request sent.",
    revokeDone: "All permissions revoked.",
    auditTitle: "Audit Trail",
    auditEmpty: "No audit entries available.",
    policyVersion: "Policy Version",
    formVersion: "Form Version",
  },
  es: {
    title: "Permisos de Padres",
    description: "Revise y actualice los permisos de su hijo. Sus elecciones se guardan de forma segura y se pueden cambiar en cualquier momento.",
    language: "Idioma",
    highContrast: "Alto contraste",
    textSize: "Tamaño de texto",
    mediaConsent: "Consentimiento de medios (foto/video)",
    fieldTripConsent: "Consentimiento para excursiones",
    dataSharingConsent: "Consentimiento para compartir datos",
    receiveNotices: "Recibir avisos escolares",
    signatureTitle: "Firma Electrónica",
    signatureTypedLabel: "Nombre completo (como firma)",
    signatureDrawnLabel: "Firma dibujada (opcional)",
    submit: "Enviar",
    changesTitle: "Solicitar Modificación o Revocar",
    changesPlaceholder: "Describa su solicitud (p. ej., revocar consentimiento de medios)",
    sendRequest: "Enviar Solicitud",
    revokeAll: "Revocar Todos los Permisos",
    close: "Cerrar",
    required: "Este campo es obligatorio.",
    saved: "Permisos actualizados.",
    requestSent: "Solicitud enviada.",
    revokeDone: "Todos los permisos revocados.",
    auditTitle: "Registro de auditoría",
    auditEmpty: "No hay entradas de auditoría disponibles.",
    policyVersion: "Versión de la Política",
    formVersion: "Versión del Formulario",
  },
  fr: {
    title: "Autorisations des Parents",
    description: "Examinez et mettez à jour les autorisations de votre enfant. Vos choix sont enregistrés en toute sécurité et peuvent être modifiés à tout moment.",
    language: "Langue",
    highContrast: "Contraste élevé",
    textSize: "Taille du texte",
    mediaConsent: "Consentement médias (photo/vidéo)",
    fieldTripConsent: "Consentement aux sorties scolaires",
    dataSharingConsent: "Consentement au partage des données",
    receiveNotices: "Recevoir les avis de l'école",
    signatureTitle: "Signature Électronique",
    signatureTypedLabel: "Nom complet (comme signature)",
    signatureDrawnLabel: "Signature dessinée (optionnel)",
    submit: "Soumettre",
    changesTitle: "Demander une modification ou Révoquer",
    changesPlaceholder: "Décrivez votre demande (ex. révoquer le consentement médias)",
    sendRequest: "Envoyer la demande",
    revokeAll: "Révoquer toutes les autorisations",
    close: "Fermer",
    required: "Ce champ est requis.",
    saved: "Autorisations mises à jour.",
    requestSent: "Demande envoyée.",
    revokeDone: "Toutes les autorisations ont été révoquées.",
    auditTitle: "Journal d'audit",
    auditEmpty: "Aucune entrée d'audit disponible.",
    policyVersion: "Version de la Politique",
    formVersion: "Version du Formulaire",
  },
  ar: {
    title: "أذونات الوالدين",
    description: "راجع وقم بتحديث أذونات طفلك. يتم حفظ اختياراتك بأمان ويمكن تغييرها في أي وقت.",
    language: "اللغة",
    highContrast: "تباين عالٍ",
    textSize: "حجم النص",
    mediaConsent: "إذن الوسائط (صورة/فيديو)",
    fieldTripConsent: "إذن الرحلات المدرسية",
    dataSharingConsent: "إذن مشاركة البيانات",
    receiveNotices: "استلام إشعارات المدرسة",
    signatureTitle: "توقيع إلكتروني",
    signatureTypedLabel: "الاسم الكامل (كتوقيع)",
    signatureDrawnLabel: "توقيع مرسوم (اختياري)",
    submit: "إرسال",
    changesTitle: "طلب تعديل أو إلغاء",
    changesPlaceholder: "صف طلبك (مثلاً إلغاء إذن الوسائط)",
    sendRequest: "إرسال الطلب",
    revokeAll: "إلغاء جميع الأذونات",
    close: "إغلاق",
    required: "هذا الحقل مطلوب.",
    saved: "تم تحديث الأذونات.",
    requestSent: "تم إرسال الطلب.",
    revokeDone: "تم إلغاء جميع الأذونات.",
    auditTitle: "سجل التدقيق",
    auditEmpty: "لا توجد إدخالات تدقيق متاحة.",
    policyVersion: "إصدار السياسة",
    formVersion: "إصدار النموذج",
  }
};

const FORM_VERSION = "1.0.0";

function simpleHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export default function PermissionsManager({ isOpen, onClose, currentChild }: PermissionsManagerProps) {
  const [locale, setLocale] = useState<keyof typeof translations>("en");
  const t = useMemo(() => (key: keyof typeof translations["en"]) => translations[locale][key], [locale]);

  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [mediaConsent, setMediaConsent] = useState(false);
  const [fieldTripConsent, setFieldTripConsent] = useState(false);
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [receiveNotices, setReceiveNotices] = useState(true);

  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("");

  const [auditEntries, setAuditEntries] = useState<Array<{ timestamp: string; action: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      setAuditEntries(getAuditTrail(currentChild.studentId));
    }
  }, [isOpen, currentChild.studentId]);

  const policyVersion = getCurrentPolicyVersion();

  const signature: SignatureData | null = useMemo(() => {
    if (typedSignature.trim()) {
      const ts = new Date().toISOString();
      return {
        type: "typed",
        value: typedSignature.trim(),
        timestamp: ts,
        hash: simpleHash(typedSignature.trim() + ts),
      };
    }
    if (drawnSignatureDataUrl) {
      const ts = new Date().toISOString();
      return {
        type: "drawn",
        value: drawnSignatureDataUrl,
        timestamp: ts,
        hash: simpleHash(drawnSignatureDataUrl + ts),
      };
    }
    return null;
  }, [typedSignature, drawnSignatureDataUrl]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!signature) {
      newErrors.signature = t("required");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setStatus("");
    if (!validate()) return;

    const result = await submitPermissionForm({
      studentId: currentChild.studentId,
      childName: currentChild.name,
      locale,
      permissions: {
        mediaConsent,
        fieldTripConsent,
        dataSharingConsent,
        receiveNotices,
      },
      signature: signature!,
      version: {
        policyVersion,
        formVersion: FORM_VERSION,
      },
      metadata: {
        userAgent: navigator.userAgent,
      },
    });

    if (result.ok) {
      setStatus(t("saved"));
      setAuditEntries(getAuditTrail(currentChild.studentId));
    } else {
      setStatus(result.error || "Error");
    }
  };

  const handleRequestChange = async (text: string) => {
    setStatus("");
    if (!text.trim()) {
      setErrors({ request: t("required") });
      return;
    }
    const result = await requestChange({
      studentId: currentChild.studentId,
      text: text.trim(),
      locale,
    });
    if (result.ok) {
      setStatus(t("requestSent"));
      setAuditEntries(getAuditTrail(currentChild.studentId));
    } else {
      setStatus(result.error || "Error");
    }
  };

  const handleRevokeAll = async () => {
    const result = await revokePermission({
      studentId: currentChild.studentId,
      revokeAll: true,
    });
    if (result.ok) {
      setStatus(t("revokeDone"));
      setMediaConsent(false);
      setFieldTripConsent(false);
      setDataSharingConsent(false);
      setReceiveNotices(false);
      setAuditEntries(getAuditTrail(currentChild.studentId));
    } else {
      setStatus(result.error || "Error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        className={`relative max-w-2xl w-full rounded-lg shadow-lg p-4 sm:p-6 outline-none ${
          highContrast ? "bg-white text-black" : "bg-white bg-opacity-95 text-indigo-900"
        }`}
        style={{ fontSize: `${fontScale}rem` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="permissions-title" className="text-xl sm:text-2xl font-bold">
            {t("title")}
          </h2>
          <TouchFriendlyButton variant="outline" onClick={onClose}>
            {t("close")}
          </TouchFriendlyButton>
        </div>

        <p className="mb-3">{t("description")}</p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label className="flex items-center gap-2">
            <span className="text-sm">{t("language")}:</span>
            <select
              aria-label={t("language")}
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm">{t("highContrast")}:</span>
            <input
              type="checkbox"
              aria-label={t("highContrast")}
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm">{t("textSize")}:</span>
            <input
              type="range"
              min={1}
              max={1.6}
              step={0.1}
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              aria-label={t("textSize")}
            />
          </label>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          aria-describedby={errors.signature ? "error-signature" : undefined}
        >
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                ref={firstFieldRef}
                type="checkbox"
                checked={mediaConsent}
                onChange={(e) => setMediaConsent(e.target.checked)}
              />
              <span>{t("mediaConsent")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={fieldTripConsent}
                onChange={(e) => setFieldTripConsent(e.target.checked)}
              />
              <span>{t("fieldTripConsent")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dataSharingConsent}
                onChange={(e) => setDataSharingConsent(e.target.checked)}
              />
              <span>{t("dataSharingConsent")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={receiveNotices}
                onChange={(e) => setReceiveNotices(e.target.checked)}
              />
              <span>{t("receiveNotices")}</span>
            </label>
          </div>

          <fieldset className="border rounded p-3 mb-4">
            <legend className="font-semibold">{t("signatureTitle")}</legend>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm">{t("signatureTypedLabel")}</span>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="border rounded w-full px-2 py-1"
                  aria-invalid={!!errors.signature}
                />
              </label>

              <label className="block">
                <span className="text-sm">{t("signatureDrawnLabel")}</span>
                <SignatureCanvas onChange={(dataUrl) => setDrawnSignatureDataUrl(dataUrl)} />
              </label>

              {errors.signature && (
                <div id="error-signature" role="alert" className="text-red-600 text-sm">
                  {errors.signature}
                </div>
              )}
            </div>
          </fieldset>

          <div className="flex gap-2">
            <TouchFriendlyButton type="submit" className="glass-button">
              {t("submit")}
            </TouchFriendlyButton>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">{t("changesTitle")}</h3>
          <ChangeRequest onSubmit={(text) => handleRequestChange(text)} error={errors.request} />
          <div className="mt-2">
            <TouchFriendlyButton variant="outline" onClick={handleRevokeAll} className="glass-button-outline">
              {t("revokeAll")}
            </TouchFriendlyButton>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm mb-2">
            <span className="mr-4">{t("policyVersion")}: {policyVersion}</span>
            <span>{t("formVersion")}: {FORM_VERSION}</span>
          </div>
          <h3 className="font-semibold mb-1">{t("auditTitle")}</h3>
          {auditEntries.length === 0 ? (
            <div className="text-sm text-indigo-700">{t("auditEmpty")}</div>
          ) : (
            <ul className="text-sm list-disc ml-5">
              {auditEntries.map((e, idx) => (
                <li key={idx}>
                  {new Date(e.timestamp).toLocaleString()} — {e.action}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div aria-live="polite" className="sr-only">
          {status}
        </div>
        {status && <div className="mt-3 text-green-700">{status}</div>}
      </div>
    </div>
  );
}

function SignatureCanvas({ onChange }: { onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";
    ctx.lineCap = "round";
  }, []);

  const start = (x: number, y: number) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const draw = (x: number, y: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    setIsDrawing(false);
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onChange(dataUrl);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    start(e.clientX - rect.left, e.clientY - rect.top);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    draw(e.clientX - rect.left, e.clientY - rect.top);
  };
  const handlePointerUp = () => end();

  return (
    <div className="border rounded p-2">
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        className="w-full border rounded"
        role="img"
        aria-label="Signature drawing area"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}

function ChangeRequest({ onSubmit, error }: { onSubmit: (text: string) => void | Promise<void>; error?: string | undefined }) {
  const [text, setText] = useState("");
  return (
    <div aria-describedby={error ? "error-request" : undefined}>
      <textarea
        className="border rounded w-full px-2 py-1"
        rows={3}
        placeholder="Describe your request"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && (
        <div id="error-request" role="alert" className="text-red-600 text-sm">
          {error}
        </div>
      )}
      <div className="mt-2">
        <TouchFriendlyButton variant="outline" className="glass-button-outline" onClick={() => onSubmit(text)}>
          Submit
        </TouchFriendlyButton>
      </div>
    </div>
  );
}