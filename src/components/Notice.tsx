import type { Status } from "@/lib/ui";

const bannerClass =
  "block rounded-8 border-2 border-current bg-white py-3 pr-4 pl-6 text-std-16N-170 shadow-[inset_0.5rem_0_0_0_currentColor] *:text-solid-gray-900";

const noticeClass: Record<Status["tone"], string> = {
  neutral: "block text-dns-16N-130 text-solid-gray-600",
  info: `${bannerClass} text-key-900`,
  success: `${bannerClass} text-success-2`,
  error: `${bannerClass} text-error-1`,
};

export function Notice({ status }: { status?: Status }) {
  return (
    <output
      className={status?.text ? noticeClass[status.tone] : "block"}
      aria-live="polite"
    >
      {status?.text && (
        <span>
          {status.tone === "error" && "エラー: "}
          {status.text}
        </span>
      )}
    </output>
  );
}
