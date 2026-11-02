import type { ComponentProps } from "react";

export function ModalDialog(props: ComponentProps<"dialog">) {
  return (
    <dialog
      closedby="any"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-8 border border-black p-0 text-std-16N-170 text-solid-gray-800 shadow-3 backdrop:bg-opacity-gray-600"
      {...props}
    />
  );
}
