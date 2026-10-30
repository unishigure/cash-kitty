import index from "./index.html";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": index,
  },
});

console.log(`Server running on ${server.url}`);
