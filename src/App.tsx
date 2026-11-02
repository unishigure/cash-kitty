import "@/style.css";
import { useEffect, useSyncExternalStore } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { hashPath } from "@/lib/route";
import { sidePanelQuery } from "@/lib/ui";
import { ImportPage } from "@/pages/ImportPage";
import { ReceiptsPage } from "@/pages/ReceiptsPage";
import { StatsPage } from "@/pages/StatsPage";

const routes = [
  {
    hash: "#/import",
    label: "取込",
    icon: "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    Page: ImportPage,
  },
  {
    hash: "#/receipts",
    label: "明細",
    icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
    Page: ReceiptsPage,
    coveredBySidePanel: true,
  },
  {
    hash: "#/stats",
    label: "統計",
    icon: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
    Page: StatsPage,
    wide: true,
  },
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
  withIcon = false,
}: {
  routes: readonly Route[];
  current: Route;
  className: string;
  withIcon?: boolean;
}) {
  return routes.map((route) => (
    <a
      key={route.hash}
      href={route.hash}
      className={className}
      aria-current={route === current ? "page" : undefined}
    >
      {withIcon && (
        <svg
          className="size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={route.icon} />
        </svg>
      )}
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
    <div className="flex min-h-dvh flex-col text-std-16N-170">
      <header className="sticky top-0 z-20 hidden border-b border-solid-gray-420 bg-white md:block">
        <div className="mx-auto flex h-16 max-w-240 items-stretch gap-8 px-4 lg:max-w-360">
          <p className="self-center text-std-20B-150 text-solid-gray-900">
            Cash Kitty
          </p>
          <nav className="flex gap-2" aria-label="メイン">
            <NavLinks
              routes={available}
              current={current}
              className="-mb-px flex items-center border-b-4 border-transparent px-3 pt-1 text-solid-gray-800 underline-offset-[3px] hover:underline aria-[current=page]:border-key-900 aria-[current=page]:font-bold aria-[current=page]:text-key-900"
            />
          </nav>
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-6 md:py-10 ${widthClass}`}
      >
        <current.Page />
      </main>

      <nav
        className="sticky bottom-0 z-20 grid grid-cols-3 border-t border-solid-gray-420 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="メイン"
      >
        <NavLinks
          routes={available}
          current={current}
          withIcon
          className="-mt-px flex h-16 flex-col items-center justify-center gap-0.5 border-t-4 border-transparent text-dns-14N-120 text-solid-gray-700 focus-visible:focus-ring-inset aria-[current=page]:border-key-900 aria-[current=page]:font-bold aria-[current=page]:text-key-900"
        />
      </nav>
    </div>
  );
}

export default App;
