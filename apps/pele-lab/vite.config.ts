import { defineConfig } from "vite";

function portFromEnv(raw: string | undefined): number {
  if (raw === undefined) return 5173;
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `PORT must be an integer from 1 to 65535 (received ${JSON.stringify(raw)})`,
    );
  }
  const port = Number(raw);
  if (port < 1 || port > 65535) {
    throw new Error(
      `PORT must be an integer from 1 to 65535 (received ${JSON.stringify(raw)})`,
    );
  }
  return port;
}

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: portFromEnv(process.env.PORT),
    strictPort: true,
    allowedHosts: true,
  },
});
