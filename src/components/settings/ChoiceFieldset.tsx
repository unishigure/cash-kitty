import type { ComponentProps, ReactNode } from "react";

import { cardClass } from "@/lib/ui/styles";

export function ChoiceFieldset({
  legend,
  children,
}: {
  legend: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cardClass}>
      <fieldset className="min-w-0">
        <legend className="text-std-20B-150 text-solid-gray-900 mb-4 w-full">
          <span className="flex items-center gap-1">{legend}</span>
        </legend>
        <div className="flex flex-wrap gap-x-6">{children}</div>
      </fieldset>
    </div>
  );
}

export function Choice({ children, ...props }: ComponentProps<"input">) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-2">
      <input className="accent-key-900 size-5 cursor-pointer" {...props} />
      {children}
    </label>
  );
}
