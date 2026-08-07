export type ExpiryStatus = "expired" | "soon" | "warning" | "caution" | "valid" | "unknown";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getExpiryStatus(expiryDate: string | null): {
  label: string;
  tone: string;
  daysRemaining: number | null;
  status: ExpiryStatus;
} {
  const parsed = parseDate(expiryDate);
  if (!parsed) {
    return {
      label: "Bilgi Yok",
      tone: "neutral",
      daysRemaining: null,
      status: "unknown",
    };
  }

  const now = new Date();
  const diffMs = parsed.getTime() - now.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      label: "Süresi Doldu",
      tone: "danger",
      daysRemaining,
      status: "expired",
    };
  }

  if (daysRemaining <= 30) {
    return {
      label: `${daysRemaining} gün`,
      tone: "danger",
      daysRemaining,
      status: "soon",
    };
  }

  if (daysRemaining <= 60) {
    return {
      label: `${daysRemaining} gün`,
      tone: "amber",
      daysRemaining,
      status: "warning",
    };
  }

  if (daysRemaining <= 90) {
    return {
      label: `${daysRemaining} gün`,
      tone: "warning",
      daysRemaining,
      status: "caution",
    };
  }

  return {
    label: "Geçerli",
    tone: "success",
    daysRemaining,
    status: "valid",
  };
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
