import { buttonClass, cardClass } from "@/lib/ui";

export function SettingsPage() {
  return (
    <section
      className={`flex flex-col gap-3 ${cardClass}`}
      aria-labelledby="settings-drive"
    >
      <h2 id="settings-drive" className="text-std-20B-150 text-solid-gray-900">
        Google Drive 連携
      </h2>
      <dl className="flex gap-2">
        <dt className="text-solid-gray-600">状態</dt>
        <dd className="text-solid-gray-900">未連携</dd>
      </dl>
      <div>
        <button type="button" className={buttonClass} disabled>
          Google Drive に接続（準備中）
        </button>
      </div>
    </section>
  );
}
