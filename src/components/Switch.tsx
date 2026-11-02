import { useId } from "react";
import { Icon } from "@/components/Icon";

// https://design.digital.go.jp/dads/components/switch/ の on-off
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <span className="inline-flex items-center gap-2">
      <label
        htmlFor={id}
        className="cursor-pointer text-dns-16N-130 whitespace-nowrap text-solid-gray-800 select-none"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className="group relative shrink-0 cursor-pointer rounded-full select-none before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']"
        onClick={() => onChange(!checked)}
      >
        <span
          className="block w-14 rounded-full border-2 border-solid-gray-600 bg-white p-1 group-hover:border-black group-hover:shadow-[0_0_0_4px_var(--color-solid-gray-420)] group-active:shadow-[0_0_0_6px_var(--color-solid-gray-600)] group-aria-checked:border-key-900 group-aria-checked:bg-key-50 group-aria-checked:group-hover:border-key-1100 forced-colors:border-[ButtonText] forced-colors:group-aria-checked:border-[Highlight]"
          aria-hidden="true"
        >
          <span className="block size-6 rounded-full bg-solid-gray-800 text-white group-hover:bg-black group-aria-checked:ml-auto group-aria-checked:bg-key-900 group-aria-checked:group-hover:bg-key-1100 forced-colors:bg-[ButtonText] forced-colors:group-aria-checked:bg-[Highlight]">
            {checked && (
              <Icon name="check" className="size-6 p-1" strokeWidth={3} />
            )}
          </span>
        </span>
      </button>
    </span>
  );
}
