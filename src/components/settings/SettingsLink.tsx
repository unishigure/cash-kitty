import { Icon, type IconName } from "@/components/ui/Icon";
import { useDriveState } from "@/hooks/useDrive";
import type { DriveState } from "@/lib/drive/sync";
import type { ChipHue } from "@/lib/receipt/category";

type DriveIndicator = {
  label: string;
  hue: ChipHue;
  icon: IconName;
  attention: boolean;
};

function driveIndicator(drive: DriveState): DriveIndicator | undefined {
  switch (drive.status) {
    case "unconfigured":
      return undefined;
    case "disconnected":
      return { label: "未接続", hue: "red", icon: "cloudOff", attention: true };
    case "connecting":
      return { label: "接続中…", hue: "blue", icon: "cloud", attention: false };
    case "connected":
      if (drive.error) {
        return {
          label: "同期エラー",
          hue: "red",
          icon: "cloud",
          attention: true,
        };
      }
      return drive.syncing
        ? { label: "同期中…", hue: "blue", icon: "cloud", attention: false }
        : { label: "同期済み", hue: "green", icon: "cloud", attention: false };
  }
}

// 設定へのリンクに Google Drive の連携状態を添える。
// 狭い画面ではチップを省き、要対応のときだけ歯車にバッジを付ける
export function SettingsLink({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  const indicator = driveIndicator(useDriveState());
  const status = indicator && `Google Drive ${indicator.label}`;

  return (
    <>
      {indicator && (
        <a
          href={href}
          className="rounded-8 text-oln-14N-100 focus-visible:focus-ring hidden min-h-8 items-center gap-1 border px-[calc(7/16*1rem)] whitespace-nowrap hover:underline md:inline-flex"
          style={{
            backgroundColor: `var(--category-${indicator.hue}-bg)`,
            borderColor: `var(--category-${indicator.hue}-border)`,
            color: `var(--category-${indicator.hue}-text)`,
          }}
          title="Google Drive 連携の設定を開く"
        >
          <Icon name={indicator.icon} className="size-4" />
          <span className="sr-only">Google Drive</span>
          {indicator.label}
        </a>
      )}
      <a
        href={href}
        className="rounded-8 text-solid-gray-800 hover:bg-solid-gray-50 focus-visible:focus-ring aria-[current=page]:text-key-900 relative flex size-12 items-center justify-center"
        aria-label={indicator?.attention ? `${label}（${status}）` : label}
        aria-current={current ? "page" : undefined}
      >
        <Icon name="gear" />
        {indicator?.attention && (
          <span
            className="bg-error-1 absolute top-2.5 right-2.5 size-3 rounded-full border-2 border-white"
            aria-hidden="true"
          />
        )}
      </a>
    </>
  );
}
