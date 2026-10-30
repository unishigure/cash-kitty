import "@/style.css";
import { useEffect, useSyncExternalStore } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { hashPath } from "@/lib/route";
import { sidePanelQuery } from "@/lib/ui";
import { ImportPage } from "@/pages/ImportPage";
import { ReceiptsPage } from "@/pages/ReceiptsPage";
import { StatsPage } from "@/pages/StatsPage";

const routes = [
  { hash: "#/import", label: "取込", Page: ImportPage },
  {
    hash: "#/receipts",
    label: "明細",
    Page: ReceiptsPage,
    coveredBySidePanel: true,
  },
  { hash: "#/stats", label: "統計", Page: StatsPage, wide: true },
] as const;

const statsRoute = routes[2];

type Route = (typeof routes)[number];

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function NavLinks({
  routes,
  current,
  className,
}: {
  routes: readonly Route[];
  current: Route;
  className: string;
}) {
  return routes.map((route) => (
    <a
      key={route.hash}
      href={route.hash}
      className={className}
      aria-current={route === current ? "page" : undefined}
    >
      {route.label}
    </a>
  ));
}

export function App() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  const showsSidePanel = useMediaQuery(sidePanelQuery);
  const available = routes.filter(
    (route) => !(showsSidePanel && "coveredBySidePanel" in route),
  );
  const requested =
    routes.find((route) => route.hash === hashPath(hash)) ?? routes[0];
  const current = available.includes(requested) ? requested : statsRoute;
  const widthClass = `max-w-240 ${"wide" in current ? "lg:max-w-360" : ""}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [current]);

  useEffect(() => {
    if (current !== requested) location.replace(current.hash);
  }, [current, requested]);

  return (
    <div className="flex min-h-dvh flex-col font-sans leading-[1.6]">
      <header className="sticky top-0 z-20 hidden border-b border-gray-400 bg-white md:block">
        <nav className={`mx-auto flex gap-4 px-4 pt-4 ${widthClass}`}>
          <NavLinks
            routes={available}
            current={current}
            className="-mb-px border-b-2 border-transparent px-1 pb-2 hover:border-gray-400 aria-[current=page]:border-gray-800 aria-[current=page]:font-bold"
          />
        </nav>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-6 md:py-10 ${widthClass}`}
      >
        <current.Page />
      </main>

      <nav className="sticky bottom-0 z-20 grid grid-cols-3 border-t border-gray-400 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLinks
          routes={available}
          current={current}
          className="flex h-14 items-center justify-center border-t-2 border-transparent text-sm aria-[current=page]:border-gray-800 aria-[current=page]:font-bold"
        />
      </nav>
    </div>
  );
}

export default App;
