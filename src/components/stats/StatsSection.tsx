import type { ReactNode } from "react";

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
    <section className="grid gap-3 border border-gray-400 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {period && <p className="text-sm text-gray-600">{period}</p>}
      </div>
      {children}
    </section>
  );
}
