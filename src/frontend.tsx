import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "@/App";

const elem = document.getElementById("root");
if (!elem) throw new Error("Root element not found");

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
if (import.meta.hot) {
  const data: { root?: Root } = import.meta.hot.data;
  data.root ??= createRoot(elem);
  data.root.render(app);
} else {
  createRoot(elem).render(app);
}
