import { useState } from "react";
import { ChipLabel } from "@/components/ui/ChipLabel";
import { HelpPopover } from "@/components/ui/HelpPopover";
import { Notice } from "@/components/ui/Notice";
import { useDriveState } from "@/hooks/useDrive";
import {
  connectDrive,
  type DriveState,
  disconnectDrive,
  requestSync,
} from "@/lib/drive/sync";
import type { ChipHue } from "@/lib/receipt/category";
import {
  buttonClass,
  cardClass,
  dangerButtonClass,
  primaryButtonClass,
} from "@/lib/ui/styles";
import { formatDateTime } from "@/lib/utils/date";

const statusChips: Record<
  DriveState["status"],
  { label: string; hue: ChipHue }
> = {
  unconfigured: { label: "利用不可", hue: "red" },
  disconnected: { label: "未接続", hue: "gray" },
  connecting: { label: "接続中…", hue: "blue" },
  connected: { label: "接続済み", hue: "green" },
};

export function DriveSection() {
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
      <div className="flex items-center gap-1">
        <h2
          id="settings-drive"
          className="text-std-20B-150 text-solid-gray-900"
        >
          Google Drive 連携
        </h2>
        <HelpPopover id="settings-drive-help" label="Google Drive 連携の説明">
          明細とレシート画像を Google Drive
          のアプリ専用領域に保存し、端末間で同期します。
        </HelpPopover>
      </div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
        <dt className="text-solid-gray-600">状態</dt>
        <dd className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-solid-gray-900">
          <ChipLabel hue={statusChips[drive.status].hue}>
            {statusChips[drive.status].label}
          </ChipLabel>
          {drive.status === "unconfigured" && (
            <span className="text-dns-14N-130 text-solid-gray-600">
              BUN_PUBLIC_GOOGLE_CLIENT_ID が未設定
            </span>
          )}
        </dd>
        {connected && (
          <>
            <dt className="text-solid-gray-600">最終同期</dt>
            <dd className="text-right text-solid-gray-900 tabular-nums">
              {drive.syncing
                ? "同期中…"
                : drive.lastSyncedAt
                  ? formatDateTime(drive.lastSyncedAt)
                  : "—"}
            </dd>
          </>
        )}
      </dl>
      {drive.error && <Notice status={{ tone: "error", text: drive.error }} />}
      <div className="flex flex-wrap justify-end gap-2">
        {connected ? (
          <>
            <button
              type="button"
              className={dangerButtonClass}
              disabled={disconnecting}
              onClick={() => void handleDisconnect()}
            >
              接続を解除
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={drive.syncing}
              onClick={() => void requestSync()}
            >
              今すぐ同期
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
