if (typeof window !== "undefined") throw new Error("Naeron API client is server-only.");

export interface NaeronMeta {
  serverTime: string;
  cursor: string | null;
  hasMore: boolean;
  limit: number;
  count: number;
}

export interface NaeronPage<T> { meta: NaeronMeta; data: T[] }
export interface NaeronDeletedRecord { recordID: number; deletedAt: string }
export interface NaeronDeletedPage { meta: NaeronMeta; deletedRecords: NaeronDeletedRecord[] }

export interface NaeronFlightRow extends Record<string, unknown> {
  m_ID: number; planID: number | null; type: string | null; flightDate: string; landingDate: string | null;
  OffBlock: number | null; OnBlock: number | null; duration: number | null; BlockTime: number | null;
  TakeOff: number | null; Landing: number | null; flightDuration: number | null;
  aircraft: string | null; a_ID: number | null; aircraftName_: string | null;
  studentVMID: string | null; s_ID: number | null; studentName_: string | null;
  student2VMID: string | null; s_ID2: number | null; student2Name_: string | null;
  instructorVMID: string | null; i_ID: number | null; instructorName_: string | null;
  observerVMID: string | null; o_ID: number | null; observerName_: string | null;
  baseFromName_: string | null; baseToName_: string | null; routeName_: string | null; dutyName_: string | null;
  note: string | null; tacho: string | null; formNo: string | null; landingCount: number | null;
  realized: number | null; canceled: number | null; cancelNote: string | null; incomplete: number | null;
  hasFault: number | null; faultDesc: string | null; faultState: string | null;
  _flightStatus: string | null; _lastRowStatus: string | null; _lastRowUpdate: string;
}

export interface NaeronAircraftRow extends Record<string, unknown> {
  m_ID: number; vm_ID: string | null; type: string | null; regNo: string | null; aircraftType: string | null;
  outOfInventory: number | null; tacho: string | null; lastBaseTo: string | null; lastFlightDate: string | null;
  underMaintenance: number | null; UEGGS: string | null; _lastRowStatus: string | null; _lastRowUpdate: string;
}

export class NaeronApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = "NaeronApiError"; }
}

function configuration() {
  const apiKey = process.env.NAERON_API_KEY;
  if (!apiKey) throw new Error("NAERON_API_KEY is required for Naeron synchronization.");
  return { apiKey, baseUrl: (process.env.NAERON_API_BASE_URL || "https://api.naeron.com:3110/v2").replace(/\/$/, "") };
}

async function request<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const { apiKey, baseUrl } = configuration();
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { headers: { "x-api-key": apiKey, Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403 ? "Naeron API authentication failed." : `Naeron API request failed with HTTP ${response.status}.`;
      throw new NaeronApiError(response.status, message);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Naeron API request timed out.");
    throw error;
  } finally { clearTimeout(timeout); }
}

export function getNaeronSnapshot<T>(table: string, options: { cursor?: string | null; limit?: number; startDate?: string; endDate?: string } = {}) {
  return request<NaeronPage<T>>(`/tables/${encodeURIComponent(table)}/snapshot`, { cursor: options.cursor || undefined, limit: options.limit ?? 250, startDate: options.startDate, endDate: options.endDate });
}

export function getNaeronChanges<T>(table: string, options: { cursor?: string | null; limit?: number } = {}) {
  return request<NaeronPage<T>>(`/tables/${encodeURIComponent(table)}/changes`, { cursor: options.cursor || undefined, limit: options.limit ?? 250 });
}

export function getNaeronDeleted(table: string, options: { cursor?: string | null; limit?: number } = {}) {
  return request<NaeronDeletedPage>(`/tables/${encodeURIComponent(table)}/deleted`, { cursor: options.cursor || undefined, limit: options.limit ?? 250 });
}
