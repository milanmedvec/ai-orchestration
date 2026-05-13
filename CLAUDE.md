
## Project Structure

Bun workspace monorepo. Three packages under `packages/`:

| Package | Name | Purpose |
|---|---|---|
| `packages/relay-server` | `@ai-orchestration/relay-server` | WebSocket hub. Clients and orchestrators connect here. Also exports all shared protocol types. |
| `packages/client` | `@ai-orchestration/client` | Connects to relay-server, sends tasks to orchestrators, receives results. |
| `packages/orchestrator` | `@ai-orchestration/orchestrator` | Connects to relay-server, receives dispatched tasks, sends back results. |

Each package has its own `tsconfig.json` extending the root one, and a `src/` directory for implementation files.

### Running packages

```sh
# Start relay server (required first)
bun run --cwd packages/relay-server dev

# Start orchestrator stub
bun run --cwd packages/orchestrator dev

# Start client stub
bun run --cwd packages/client dev
```

Health check: `curl http://localhost:3000/health`

### Protocol

All shared message types live in `packages/lib/src/protocol.ts`. Import them as:

```ts
import type { RegisterMsg, TaskRequestMsg } from "@ai-orchestration/lib";
```

WebSocket endpoint: `ws://localhost:3000/ws` (override with `RELAY_URL` / `PORT` env vars).

---

## Rules

- Do not run the app, start servers, or execute type checks (`tsc --noEmit`) after making changes. The user tests everything themselves.
- When the user says "do not X", add that rule to this `## Rules` section immediately.
- Do not use `#!/usr/bin/env bun` shebangs.

---

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
