import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { createHfHandler, hfMiddleware } from "./server/hf";

// The token is read from process.env here, inside the dev/preview server, so it never reaches the browser bundle.
function hfPlanner(): Plugin {
  const middleware = () => hfMiddleware(createHfHandler({ env: process.env, fetch: (url, init) => fetch(url, init) }));
  return {
    name: "slow-assistant-lab:hf",
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}

export default defineConfig({
  plugins: [react(), hfPlanner()],
});
