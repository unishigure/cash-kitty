import path from "node:path";
import { file, Glob, serve } from "bun";
import index from "@/index.html";

const publicDir = path.join(import.meta.dir, "../public");
const publicRoutes = Object.fromEntries(
  [...new Glob("**/*").scanSync(publicDir)].map((name) => [
    `/${name.replaceAll(path.sep, "/")}`,
    file(path.join(publicDir, name)),
  ]),
);

const server = serve({
  routes: {
    ...publicRoutes,
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
