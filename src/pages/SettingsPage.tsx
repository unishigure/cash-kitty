import { useState } from "react";
import { Notice } from "@/components/Notice";
import { useDriveState } from "@/hooks/useDrive";
import {
  connectDrive,
  type DriveState,
  disconnectDrive,
  requestSync,
} from "@/lib/drive-sync";
import {
  buttonClass,
  cardClass,
  dangerButtonClass,
  primaryButtonClass,
} from "@/lib/ui";

const statusLabels: Record<DriveState["status"], string> = {
  unconfigured: "利用不可（BUN_PUBLIC_GOOGLE_CLIENT_ID が未設定）",
  disconnected: "未接続",
  connecting: "接続中…",
  connected: "接続済み",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SettingsPage() {
  const drive = useDriveState();
  const [disconnecting, setDisconnecting] = useState(false);
  const connected = drive.status === "connected";

  async function handleDisconnect() {
    if (
      !confirm(
        "Google Drive との接続を解除しますか？\nDrive に保存済みの明細はこの端末から削除されます（Drive には残ります）。",
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      await disconnectDrive();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section
      className={`flex flex-col gap-3 ${cardClass}`}
      aria-labelledby="settings-drive"
    >
      <h2 id="settings-drive" className="text-std-20B-150 text-solid-gray-900">
        Google Drive 連携
      </h2>
      <p className="text-dns-16N-130 text-solid-gray-700">
        明細とレシート画像を Google Drive
        のアプリ専用領域に保存し、端末間で同期します。
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-solid-gray-600">状態</dt>
        <dd className="text-solid-gray-900">{statusLabels[drive.status]}</dd>
        {connected && (
          <>
            <dt className="text-solid-gray-600">最終同期</dt>
            <dd className="text-solid-gray-900">
              {drive.syncing
                ? "同期中…"
                : drive.lastSyncedAt
                  ? formatDateTime(drive.lastSyncedAt)
                  : "—"}
            </dd>
          </>
        )}
      </dl>
      {drive.error && (
        <Notice status={{ tone: "error", text: `エラー: ${drive.error}` }} />
      )}
      <div className="flex flex-wrap gap-2">
        {connected ? (
          <>
            <button
              type="button"
              className={buttonClass}
              disabled={drive.syncing}
              onClick={() => void requestSync()}
            >
              今すぐ同期
            </button>
            <button
              type="button"
              className={dangerButtonClass}
              disabled={disconnecting}
              onClick={() => void handleDisconnect()}
            >
              接続を解除
            </button>
          </>
        ) : (
          <button
            type="button"
            className={primaryButtonClass}
            disabled={drive.status !== "disconnected"}
            onClick={connectDrive}
          >
            Google Drive に接続
          </button>
        )}
      </div>
    </section>
  );
}
