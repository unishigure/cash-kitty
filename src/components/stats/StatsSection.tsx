import type { ReactNode } from "react";
import { cardClass } from "@/lib/ui/styles";

export function StatsSection({
  title,
  period,
  children,
}: {
  title: string;
  period?: string;
  children: ReactNode;
}) {
  return (
    <section className={`grid gap-4 ${cardClass}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-std-20B-150 text-solid-gray-900">{title}</h2>
        {period && (
          <p className="text-dns-14N-130 text-solid-gray-600">{period}</p>
        )}
      </div>
      {children}
    </section>
  );
}
