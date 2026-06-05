/**
 * Google Drive REST client scoped to the application data folder
 * (`appDataFolder`). Each receipt is stored as one JSON file named
 * `receipt-<id>.json`. This folder is hidden from the user's normal Drive UI
 * and is only accessible by this app.
 */
import type { Receipt } from "./types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

function fileName(id: string): string {
  return `receipt-${id}.json`;
}

async function driveFetch(
  token: string,
  url: string,
  init: RequestInit = {},
  /** Status codes to treat as success in addition to 2xx (e.g. 404 on delete). */
  okStatuses: number[] = [],
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok && !okStatuses.includes(res.status)) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`Drive API エラー (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return res;
}

/** Sentinel error used to signal that the token expired and re-auth is needed. */
export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

interface DriveFile {
  id: string;
  name: string;
}

/** List all receipt files in the appDataFolder. */
async function listReceiptFiles(token: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      fields: "files(id,name),nextPageToken",
      pageSize: "1000",
      q: "name contains 'receipt-'",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await driveFetch(token, `${DRIVE_API}/files?${params}`);
    const body = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return files.filter((f) => f.name.startsWith("receipt-"));
}

/** Fetch and parse the JSON content of a single Drive file. */
async function getReceiptContent(token: string, file: DriveFile): Promise<Receipt | null> {
  const res = await driveFetch(token, `${DRIVE_API}/files/${file.id}?alt=media`);
  try {
    const raw = (await res.json()) as Partial<Receipt>;
    return normalizeReceipt(raw, file.id);
  } catch {
    return null;
  }
}

/**
 * Coerce a raw JSON object into a valid Receipt, filling in defaults for any
 * missing fields. This protects the UI from older or hand-edited files that may
 * lack `date`, `category`, etc.
 */
function normalizeReceipt(raw: Partial<Receipt>, fileId: string): Receipt {
  const created = typeof raw.createdAt === "string" ? raw.createdAt : "";
  // Best-effort date: explicit date -> createdAt's date -> empty.
  const date =
    typeof raw.date === "string" && raw.date
      ? raw.date.slice(0, 10)
      : created.slice(0, 10);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fileId,
    fileId,
    storeName: typeof raw.storeName === "string" ? raw.storeName : "",
    totalAmount: Number.isFinite(raw.totalAmount) ? Number(raw.totalAmount) : 0,
    date,
    category: typeof raw.category === "string" && raw.category ? raw.category : "その他",
    memo: typeof raw.memo === "string" ? raw.memo : undefined,
    imageFileId: typeof raw.imageFileId === "string" ? raw.imageFileId : undefined,
    imageMimeType: typeof raw.imageMimeType === "string" ? raw.imageMimeType : undefined,
    fullText: typeof raw.fullText === "string" ? raw.fullText : undefined,
    createdAt: created,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : created,
  };
}

/** Load every receipt from the appDataFolder. */
export async function listReceipts(token: string): Promise<Receipt[]> {
  const files = await listReceiptFiles(token);
  const receipts = await Promise.all(files.map((f) => getReceiptContent(token, f)));
  return receipts
    .filter((r): r is Receipt => r !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function multipartBody(metadata: object, json: object): { body: Blob; boundary: string } {
  const boundary = "money-note-boundary-x7f3a";
  const parts =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(json) +
    `\r\n--${boundary}--`;
  return { body: new Blob([parts]), boundary };
}

/** Create a new receipt file. Returns the receipt with its assigned fileId. */
export async function createReceipt(token: string, receipt: Receipt): Promise<Receipt> {
  const metadata = {
    name: fileName(receipt.id),
    parents: ["appDataFolder"],
    mimeType: "application/json",
  };
  const { body, boundary } = multipartBody(metadata, receipt);
  const res = await driveFetch(token, `${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const created = (await res.json()) as { id: string };
  return { ...receipt, fileId: created.id };
}

/** Overwrite an existing receipt file's content. */
export async function updateReceipt(token: string, receipt: Receipt): Promise<Receipt> {
  if (!receipt.fileId) return createReceipt(token, receipt);
  await driveFetch(token, `${UPLOAD_API}/files/${receipt.fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(receipt),
  });
  return receipt;
}

/** Delete a file by id. A 404 (already gone) is treated as success. */
export async function deleteFile(token: string, fileId: string): Promise<void> {
  await driveFetch(token, `${DRIVE_API}/files/${fileId}`, { method: "DELETE" }, [404]);
}

/** Delete a receipt file. A 404 (already gone) is treated as success. */
export async function deleteReceipt(token: string, fileId: string): Promise<void> {
  await deleteFile(token, fileId);
}

/** Upload a binary file (e.g. a receipt image) to the appDataFolder. Returns its file id. */
export async function uploadFile(
  token: string,
  name: string,
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const boundary = "money-note-bin-boundary-q9k2";
  const metadata = { name, parents: ["appDataFolder"], mimeType };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ]);
  const res = await driveFetch(token, `${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const created = (await res.json()) as { id: string };
  return created.id;
}

/** Fetch a file's raw content as a Blob (e.g. to display a stored image). */
export async function getFileBlob(token: string, fileId: string): Promise<Blob> {
  const res = await driveFetch(token, `${DRIVE_API}/files/${fileId}?alt=media`);
  return res.blob();
}
