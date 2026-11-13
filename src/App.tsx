import "@/style.css";
import { useEffect, useSyncExternalStore } from "react";

import { SettingsLink } from "@/components/settings/SettingsLink";
import { FixedCostToggle } from "@/components/stats/FixedCostToggle";
import { Icon } from "@/components/ui/Icon";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { sidePanelQuery } from "@/lib/ui/styles";
import { hashPath } from "@/lib/utils/route";
import { ImportPage } from "@/pages/ImportPage";
import { ReceiptsPage } from "@/pages/ReceiptsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";

const statsRoute = {
  hash: "#/stats",
  label: "統計",
  icon: "chart",
  Page: StatsPage,
  wide: true,
} as const;

const routes = [
  {
    hash: "#/import",
    label: "取込",
    icon: "camera",
    Page: ImportPage,
  },
  {
    hash: "#/receipts",
    label: "明細",
    icon: "list",
    Page: ReceiptsPage,
    coveredBySidePanel: true,
  },
  statsRoute,
] as const;

const settingsRoute = {
  hash: "#/settings",
  label: "設定",
  Page: SettingsPage,
} as const;

type NavRoute = (typeof routes)[number];

type Route = NavRoute | typeof settingsRoute;

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function NavLinks({
  routes,
  current,
  className,
  iconClassName,
}: {
  routes: readonly NavRoute[];
  current: Route;
  className: string;
  iconClassName?: string;
}) {
  return routes.map((route) => (
    <a
      key={route.hash}
      href={route.hash}
      className={className}
      aria-current={route === current ? "page" : undefined}
    >
      <Icon name={route.icon} className={iconClassName} />
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
  const requested: Route =
    [...routes, settingsRoute].find((route) => route.hash === hashPath(hash)) ??
    routes[0];
  const current =
    showsSidePanel && "coveredBySidePanel" in requested
      ? statsRoute
      : requested;
  const widthClass = `max-w-240 ${"wide" in current ? "lg:max-w-360" : ""}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [current]);

  useEffect(() => {
    if (current !== requested) location.replace(current.hash);
  }, [current, requested]);

  return (
    <div className="text-std-16N-170 flex min-h-dvh flex-col">
      <header className="border-solid-gray-420 sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex h-14 max-w-240 items-stretch gap-4 px-4 md:h-16 md:gap-8 lg:max-w-360">
          <p className="text-std-20B-150 text-solid-gray-900 self-center whitespace-nowrap">
            <span className="text-key-900">Cash</span> Kitty
          </p>
          <nav className="hidden gap-2 md:flex" aria-label="メイン">
            <NavLinks
              routes={available}
              current={current}
              iconClassName="size-5"
              className="text-solid-gray-800 aria-[current=page]:border-key-900 aria-[current=page]:text-key-900 -mb-px flex items-center gap-1.5 border-b-4 border-transparent px-3 pt-1 underline-offset-[3px] hover:underline aria-[current=page]:font-bold"
            />
          </nav>
          <div className="-mr-2 ml-auto flex items-center gap-2">
            {current === statsRoute && <FixedCostToggle />}
            <SettingsLink
              href={settingsRoute.hash}
              label={settingsRoute.label}
              current={current === settingsRoute}
            />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-6 md:py-10 ${widthClass}`}
      >
        <current.Page />
      </main>

      <nav
        className="border-solid-gray-420 sticky bottom-0 z-20 grid grid-cols-3 border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="メイン"
      >
        <NavLinks
          routes={available}
          current={current}
          className="text-dns-14N-120 text-solid-gray-700 focus-visible:focus-ring-inset aria-[current=page]:border-key-900 aria-[current=page]:text-key-900 -mt-px flex h-16 flex-col items-center justify-center gap-0.5 border-t-4 border-transparent aria-[current=page]:font-bold"
        />
      </nav>
    </div>
  );
}

export default App;
