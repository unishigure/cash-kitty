import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

const toneClass = {
  help: "text-solid-gray-700",
  warning: "text-warning-orange-1",
} as const;

export function HelpPopover({
  id,
  label,
  tone = "help",
  children,
}: {
  id: string;
  label: string;
  tone?: keyof typeof toneClass;
  children: ReactNode;
}) {
  const anchor = `--${id}`;

  return (
    <>
      <button
        type="button"
        className={`grid size-10 cursor-pointer place-items-center rounded-full ${toneClass[tone]} hover:bg-solid-gray-50 focus-visible:focus-ring`}
        style={{ anchorName: anchor }}
        aria-label={label}
        popoverTarget={id}
      >
        <Icon name={tone} />
      </button>
      <span
        id={id}
        popover="auto"
        className="m-0 mt-1 max-w-[min(20rem,calc(100vw-2rem))] rounded-8 border border-solid-gray-420 bg-white p-3 text-dns-16N-130 font-normal text-solid-gray-800 shadow-2 inset-auto [position-area:bottom] [position-try-fallbacks:flip-block]"
        style={{ positionAnchor: anchor }}
      >
        {children}
      </span>
    </>
  );
}
