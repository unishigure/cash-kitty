import {
  type DriveFile,
  deleteFile,
  downloadFile,
  downloadReceipt,
  listReceiptFiles,
  saveReceiptFile,
  UnauthorizedError,
  uploadImage,
} from "@/lib/drive";
import {
  beginAuthRedirect,
  canSilentReconnect,
  clearToken,
  consumeAuthRedirect,
  getAuthRedirectError,
  getValidToken,
  googleClientId,
  signOut,
} from "@/lib/google-auth";
import {
  applyRemoteDeletions,
  applyRemoteReceipts,
  clearDeletion,
  forgetDriveReceipts,
  getLocalImage,
  listAllReceipts,
  listDeletions,
  markPushed,
  putLocalImage,
  type Receipt,
  subscribeLocalChanges,
} from "@/lib/receipt";
import { createStore } from "@/lib/store";
import { errorMessage } from "@/lib/status";

export type DriveState = {
  status: "unconfigured" | "disconnected" | "connecting" | "connected";
  syncing: boolean;
  lastSyncedAt?: string;
  error?: string;
};

const downloadConcurrency = 6;

const store = createStore<DriveState>({
  status: "disconnected",
  syncing: false,
});
const setState = store.update;
let running: Promise<void> | undefined;
let rerun = false;

export const subscribeDrive = store.subscribe;
export const getDriveState = store.get;

export function startDrive() {
  consumeAuthRedirect();
  subscribeLocalChanges(() => void requestSync());

  if (!googleClientId) {
    setState({ status: "unconfigured" });
    return;
  }
  const error = getAuthRedirectError();
  if (error) {
    setState({ status: "disconnected", error });
  } else if (getValidToken()) {
    setState({ status: "connected" });
    void requestSync("redirect");
  } else if (canSilentReconnect()) {
    setState({ status: "connecting" });
    beginAuthRedirect("silent");
  }
}

export function connectDrive() {
  setState({ status: "connecting", error: undefined });
  beginAuthRedirect("interactive");
}

export async function disconnectDrive() {
  await running?.catch(() => {});
  signOut();
  await forgetDriveReceipts();
  setState({
    status: "disconnected",
    lastSyncedAt: undefined,
    error: undefined,
  });
}

type OnExpired = "redirect" | "disconnect";

async function withToken<T>(
  op: (token: string) => Promise<T>,
  onExpired: OnExpired,
) {
  const reauth = () => {
    if (onExpired === "redirect" && canSilentReconnect()) {
      setState({ status: "connecting" });
      beginAuthRedirect("silent");
      return new Promise<never>(() => {});
    }
    setState({ status: "disconnected" });
    throw new Error(
      "Google Drive との接続が切れました。設定から接続し直してください。",
    );
  };

  const token = getValidToken();
  if (!token) return reauth();
  try {
    return await op(token);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    clearToken();
    return reauth();
  }
}

export function requestSync(onExpired: OnExpired = "disconnect") {
  if (store.get().status !== "connected") return Promise.resolve();
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    setState({ syncing: true, error: undefined });
    try {
      do {
        rerun = false;
        await withToken(syncOnce, onExpired);
      } while (rerun);
      setState({ syncing: false, lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      console.error(error);
      setState({ syncing: false, error: errorMessage(error) });
    } finally {
      running = undefined;
    }
  })();
  return running;
}

async function syncOnce(token: string) {
  for (const deletion of await listDeletions()) {
    if (deletion.imageFileId) await deleteFile(token, deletion.imageFileId);
    if (deletion.fileId) await deleteFile(token, deletion.fileId);
    await clearDeletion(deletion.id);
  }

  const [files, local] = await Promise.all([
    listReceiptFiles(token),
    listAllReceipts(),
  ]);
  const fileIds = new Set(files.map((file) => file.id));
  const localByFileId = new Map(
    local.flatMap((receipt) =>
      receipt.fileId ? [[receipt.fileId, receipt] as const] : [],
    ),
  );

  for (const receipt of local) {
    if (receipt.dirty && (!receipt.fileId || fileIds.has(receipt.fileId))) {
      await push(token, receipt);
    }
  }

  const removed = local.filter(
    (receipt) => receipt.fileId && !fileIds.has(receipt.fileId),
  );
  const detached = await applyRemoteDeletions(
    removed.map((receipt) => receipt.id),
  );
  if (detached.length) rerun = true;

  const changed = files.filter((file) => {
    const receipt = localByFileId.get(file.id);
    return (
      !receipt ||
      (!receipt.dirty && receipt.driveModifiedTime !== file.modifiedTime)
    );
  });
  const downloaded = await mapConcurrent(
    changed,
    downloadConcurrency,
    (file: DriveFile) => downloadReceipt(token, file),
  );
  await applyRemoteReceipts(
    downloaded.filter((receipt) => receipt !== undefined),
  );
}

async function push(token: string, receipt: Receipt) {
  let { imageFileId } = receipt;
  if (!imageFileId) {
    const image = await getLocalImage(receipt.id);
    if (image) {
      imageFileId = await uploadImage(
        token,
        receipt,
        image,
        receipt.imageMimeType ?? image.type,
      );
    }
  }
  const file = await saveReceiptFile(token, { ...receipt, imageFileId });
  const stillStored = await markPushed(receipt, {
    fileId: file.id,
    imageFileId,
    driveModifiedTime: file.modifiedTime,
  });
  if (!stillStored) {
    await deleteFile(token, file.id);
    if (imageFileId) await deleteFile(token, imageFileId);
  }
}

async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index] as T);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export async function loadReceiptImage(receipt: Receipt) {
  const local = await getLocalImage(receipt.id);
  if (local) return local;
  const { imageFileId } = receipt;
  if (!imageFileId) return undefined;
  if (store.get().status !== "connected") {
    throw new Error(
      "画像は Google Drive に保存されています。設定から接続してください。",
    );
  }
  const blob = await withToken(
    (token) => downloadFile(token, imageFileId),
    "disconnect",
  );
  await putLocalImage(receipt.id, blob);
  return blob;
}
