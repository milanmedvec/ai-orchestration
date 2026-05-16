import index from "./index.html";
import { init } from "./context.ts";

function main() {
  const { config, logger } = init(Bun.env);

  const server = Bun.serve({
    port: config.PORT,
    routes: {
      "/": index,
      "/config": () =>
        Response.json({ relayUrl: config.RELAY_URL }),
      "/health": () => Response.json({ status: "ok" }),
    },
    development: { hmr: true, console: true },
  });

  logger.info("web listening", { url: `http://localhost:${server.port}` });
}

main();
