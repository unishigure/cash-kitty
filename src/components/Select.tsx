import type { ComponentProps } from "react";
import { Icon } from "@/components/Icon";

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <span className={`relative block ${className}`}>
      <select
        className="peer h-12 w-full cursor-pointer appearance-none rounded-8 border border-solid-gray-600 bg-white pr-10 pl-4 text-oln-16N-100 text-solid-gray-800 hover:border-black aria-invalid:border-error-1 aria-invalid:hover:border-red-1000 disabled:cursor-not-allowed disabled:border-solid-gray-300 disabled:bg-solid-gray-50 disabled:text-solid-gray-420 forced-colors:appearance-auto"
        {...props}
      />
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute inset-y-0 right-4 my-auto size-4 text-solid-gray-900 peer-disabled:text-solid-gray-420 forced-colors:hidden"
        strokeWidth={2.5}
      />
    </span>
  );
}
