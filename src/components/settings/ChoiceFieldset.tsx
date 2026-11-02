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
    <fieldset className={`grid gap-3 ${cardClass}`}>
      <legend className="float-left mb-1 flex w-full items-center gap-1 text-std-20B-150 text-solid-gray-900">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-x-6">{children}</div>
    </fieldset>
  );
}

export function Choice({ children, ...props }: ComponentProps<"input">) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-2">
      <input className="size-5 cursor-pointer accent-key-900" {...props} />
      {children}
    </label>
  );
}
