import { useState } from "react";
import { CategoryChip } from "@/components/CategoryChip";
import { ChipLabel } from "@/components/ChipLabel";
import { HelpPopover } from "@/components/HelpPopover";
import { Notice } from "@/components/Notice";
import { useDriveState } from "@/hooks/useDrive";
import type { ChipHue } from "@/lib/chart";
import {
  connectDrive,
  type DriveState,
  disconnectDrive,
  requestSync,
} from "@/lib/drive-sync";
import { setFixedCategories, useFixedCosts } from "@/lib/fixed-costs";
import { type Category, categories } from "@/lib/receipt";
import { getTheme, setTheme, type Theme, themes } from "@/lib/theme";
import {
  buttonClass,
  cardClass,
  dangerButtonClass,
  primaryButtonClass,
} from "@/lib/ui";

const statusChips: Record<
  DriveState["status"],
  { label: string; hue: ChipHue }
> = {
  unconfigured: { label: "利用不可", hue: "red" },
  disconnected: { label: "未接続", hue: "gray" },
  connecting: { label: "接続中…", hue: "blue" },
  connected: { label: "接続済み", hue: "green" },
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ThemeSection() {
  const [theme, setThemeState] = useState(getTheme);

  function select(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <fieldset className={`grid gap-3 ${cardClass}`}>
      <legend className="float-left mb-1 w-full text-std-20B-150 text-solid-gray-900">
        テーマ
      </legend>
      <div className="flex flex-wrap gap-x-6">
        {themes.map(({ value, label }) => (
          <label
            key={value}
            className="flex min-h-12 cursor-pointer items-center gap-2"
          >
            <input
              type="radio"
              name="theme"
              className="size-5 cursor-pointer accent-key-900"
              checked={theme === value}
              onChange={() => select(value)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FixedCostSection() {
  const fixedCosts = useFixedCosts();

  function toggle(category: Category, checked: boolean) {
    setFixedCategories(
      checked
        ? [...fixedCosts.categories, category]
        : fixedCosts.categories.filter((c) => c !== category),
    );
  }

  return (
    <fieldset className={`grid gap-3 ${cardClass}`}>
      <legend className="float-left mb-1 flex w-full items-center gap-1 text-std-20B-150 text-solid-gray-900">
        固定費
        <HelpPopover id="settings-fixed-cost-help" label="固定費の説明">
          統計画面で「固定費を除く」を選ぶと、
          ここで選んだカテゴリーを支出から除きます。
        </HelpPopover>
      </legend>
      <div className="flex flex-wrap gap-x-6">
        {categories.map((category) => (
          <label
            key={category}
            className="flex min-h-12 cursor-pointer items-center gap-2"
          >
            <input
              type="checkbox"
              className="size-5 cursor-pointer accent-key-900"
              checked={fixedCosts.categories.includes(category)}
              onChange={(event) => toggle(category, event.target.checked)}
            />
            <CategoryChip category={category} />
          </label>
        ))}
      </div>
    </fieldset>
  );
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
    <>
      <ThemeSection />
      <FixedCostSection />
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
        {drive.error && (
          <Notice status={{ tone: "error", text: `エラー: ${drive.error}` }} />
        )}
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
    </>
  );
}
