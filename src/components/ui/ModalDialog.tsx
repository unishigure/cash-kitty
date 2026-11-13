import type { ComponentProps } from "react";

export function ModalDialog(props: ComponentProps<"dialog">) {
  return (
    <dialog
      closedby="any"
      className="rounded-8 text-std-16N-170 text-solid-gray-800 shadow-3 backdrop:bg-opacity-gray-600 m-auto w-[calc(100%-2rem)] max-w-md border border-black p-0"
      {...props}
    />
  );
}
