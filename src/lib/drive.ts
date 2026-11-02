import { toCategory } from "@/lib/category";
import type { Receipt } from "@/lib/receipt";

const driveApi = "https://www.googleapis.com/drive/v3";
const uploadApi = "https://www.googleapis.com/upload/drive/v3";
const receiptPrefix = "receipt-";

export type DriveFile = { id: string; name: string; modifiedTime: string };

export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";
}

async function driveFetch(
  token: string,
  url: string,
  init: RequestInit = {},
  okStatuses: number[] = [],
) {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    throw new UnauthorizedError("Google Drive の認証が切れました。");
  }
  if (!response.ok && !okStatuses.includes(response.status)) {
    const body = (await response.json().catch(() => undefined)) as
      { error?: { message?: string } } | undefined;
    const detail = body?.error?.message;
    throw new Error(
      `Drive API エラー（HTTP ${response.status}）${detail ? `: ${detail}` : ""}`,
    );
  }
  return response;
}

function receiptFileName(receipt: Receipt) {
  return `${receiptPrefix}${receipt.date.slice(0, 7)}-${receipt.id}.json`;
}

export async function listReceiptFiles(token: string) {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      fields: "files(id,name,modifiedTime),nextPageToken",
      pageSize: "1000",
      q: `name contains '${receiptPrefix}'`,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(token, `${driveApi}/files?${params}`);
    const body = (await response.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
    };
    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return files;
}

export async function downloadReceipt(token: string, file: DriveFile) {
  const response = await driveFetch(
    token,
    `${driveApi}/files/${file.id}?alt=media`,
  );
  const raw: unknown = await response.json().catch(() => undefined);
  return raw && typeof raw === "object"
    ? parseReceipt(raw as Record<string, unknown>, file)
    : undefined;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalText(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function parseReceipt(raw: Record<string, unknown>, file: DriveFile): Receipt {
  const createdAt = text(raw.createdAt);
  const amount = Number(raw.totalAmount);
  return {
    id: optionalText(raw.id) ?? file.id,
    date: (optionalText(raw.date) ?? createdAt).slice(0, 10),
    storeName: text(raw.storeName),
    totalAmount: Number.isFinite(amount) ? amount : 0,
    category: toCategory(raw.category),
    memo: text(raw.memo),
    fullText: optionalText(raw.fullText),
    createdAt,
    updatedAt: optionalText(raw.updatedAt) ?? createdAt,
    imageMimeType: optionalText(raw.imageMimeType),
    fileId: file.id,
    imageFileId: optionalText(raw.imageFileId),
    driveModifiedTime: file.modifiedTime,
  };
}

function toStored(receipt: Receipt) {
  const { dirty, driveModifiedTime, ...stored } = receipt;
  return stored;
}

function multipartBody(metadata: object, content: BlobPart, mimeType: string) {
  const boundary = `cash-kitty-${crypto.randomUUID()}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ]);
  return {
    body,
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
  };
}

export async function saveReceiptFile(token: string, receipt: Receipt) {
  const metadata = receipt.fileId
    ? { name: receiptFileName(receipt) }
    : {
        name: receiptFileName(receipt),
        parents: ["appDataFolder"],
        mimeType: "application/json",
      };
  const response = await driveFetch(
    token,
    `${uploadApi}/files${receipt.fileId ? `/${receipt.fileId}` : ""}?uploadType=multipart&fields=id,modifiedTime`,
    {
      method: receipt.fileId ? "PATCH" : "POST",
      ...multipartBody(
        metadata,
        JSON.stringify(toStored(receipt)),
        "application/json; charset=UTF-8",
      ),
    },
  );
  return (await response.json()) as Omit<DriveFile, "name">;
}

export async function uploadImage(
  token: string,
  receipt: Receipt,
  blob: Blob,
  mimeType: string,
) {
  const metadata = {
    name: `image-${receipt.id}`,
    parents: ["appDataFolder"],
    mimeType,
  };
  const response = await driveFetch(
    token,
    `${uploadApi}/files?uploadType=multipart&fields=id`,
    { method: "POST", ...multipartBody(metadata, blob, mimeType) },
  );
  const created = (await response.json()) as { id: string };
  return created.id;
}

export async function downloadFile(token: string, fileId: string) {
  const response = await driveFetch(
    token,
    `${driveApi}/files/${fileId}?alt=media`,
  );
  return response.blob();
}

export async function deleteFile(token: string, fileId: string) {
  await driveFetch(
    token,
    `${driveApi}/files/${fileId}`,
    { method: "DELETE" },
    [404],
  );
}
