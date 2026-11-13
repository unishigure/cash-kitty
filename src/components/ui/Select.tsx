import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/Icon";

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <span className={`relative block ${className}`}>
      <select
        className="peer rounded-8 border-solid-gray-600 text-oln-16N-100 text-solid-gray-800 aria-invalid:border-error-1 aria-invalid:hover:border-red-1000 disabled:border-solid-gray-300 disabled:bg-solid-gray-50 disabled:text-solid-gray-420 h-12 w-full cursor-pointer appearance-none border bg-white pr-10 pl-4 hover:border-black disabled:cursor-not-allowed forced-colors:appearance-auto"
        {...props}
      />
      <Icon
        name="chevronDown"
        className="text-solid-gray-900 peer-disabled:text-solid-gray-420 pointer-events-none absolute inset-y-0 right-4 my-auto size-4 forced-colors:hidden"
        strokeWidth={2.5}
      />
    </span>
  );
}
