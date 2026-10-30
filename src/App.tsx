import "./style.css";
import { useSyncExternalStore } from "react";
import { ReceiptImport } from "./components/ReceiptImport";
import { ReceiptList } from "./components/ReceiptList";

const routes = [
  { hash: "#/import", label: "レシート取込", Page: ReceiptImport },
  { hash: "#/receipts", label: "明細一覧", Page: ReceiptList },
] as const;

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function App() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  const current = routes.find((route) => route.hash === hash) ?? routes[0];

  return (
    <div className="mx-auto my-10 flex max-w-240 flex-col gap-4 px-4 font-sans leading-[1.6]">
      <nav className="flex gap-4 border-b border-gray-400">
        {routes.map((route) => (
          <a
            key={route.hash}
            href={route.hash}
            className="-mb-px border-b-2 border-transparent px-1 pb-2 hover:border-gray-400 aria-[current=page]:border-gray-800 aria-[current=page]:font-bold"
            aria-current={route === current ? "page" : undefined}
          >
            {route.label}
          </a>
        ))}
      </nav>
      <current.Page />
    </div>
  );
}

export default App;
