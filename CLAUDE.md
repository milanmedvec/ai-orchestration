
## Project Structure

Bun workspace monorepo. Three packages under `packages/`:

| Package | Name | Purpose |
|---|---|---|
| `packages/lib` | `@ai-orchestration/lib` | Shared Zod schemas, inferred types, `serialize`/`deserialize` helpers, command registry. |
| `packages/relay-server` | `@ai-orchestration/relay-server` | WebSocket hub. Routes messages between clients and orchestrators. |
| `packages/client` | `@ai-orchestration/client` | CLI client. Commands: `orchestrators`, `list-projects`, `create-project`, `list-sessions`, `create-session`, `terminate-session`. |
| `packages/orchestrator` | `@ai-orchestration/orchestrator` | Reads `commands.toml`, runs shell commands, validates input/output against protocol schemas. |
| `packages/web` | `@ai-orchestration/web` | React frontend. Projects/sessions UI. |

Each package has its own `tsconfig.json` extending the root one, and a `src/` directory for implementation files.

### Running packages

```sh
# Start relay server (required first)
bun run --cwd packages/relay-server dev

# Start orchestrator stub
bun run --cwd packages/orchestrator dev

# Start client stub
bun run --cwd packages/client dev

# Start web UI
bun run --cwd packages/web dev
```

Health check: `curl http://localhost:3000/health`

### Protocol

All shared Zod schemas, types, and helpers live in `packages/lib/src/protocol.ts`. Import from `@ai-orchestration/lib`.

**Commands** (defined in `CommandDefs`): `list_projects`, `create_project`, `list_sessions`, `create_session`, `terminate_session`. Each has `input` and `output` Zod schemas.

**Message flow**: `command_request` (client→relay→orchestrator as `command_dispatch`) → `command_ack` → `command_result` or `command_error` (orchestrator→relay→all clients, correlated by `requestId`).

**Orchestrator config**: `packages/orchestrator/commands.toml` maps command names to shell commands with `{{fieldName}}` template vars. Commands must output JSON to stdout matching the output schema.

WebSocket endpoint: `ws://localhost:3000/ws` (override with `RELAY_URL` / `PORT` env vars).

### Orchestrator — session & container layout

Projects are stored under `$PROJECTS_DIR` (default `~/projects`):

```
~/projects/{projectId}/
  project.toml                          # id, name, repoUrl
  .repo/                                # non-bare git repo
  {projectName}_{sessionName}/          # git worktree (= session)
  .bundles/{projectName}_{sessionName}/ # runc OCI bundle (config.json)
```

The worktree's `.git` file uses a **relative path** (`gitdir: ../.repo/.git/worktrees/…`) so git works identically on the host and inside the container.

**Container** (runtime: `runc`, launched in a detached tmux session):

| Property | Value |
|----------|-------|
| Container / tmux id | `claude-{projectName}_{sessionName}` |
| Mount | `{projectDir}` → `/project` |
| `cwd` | `/project/{projectName}_{sessionName}` |
| Rootfs | `$ROOTFS_DIR` (default `~/.local/share/ai-orchestration/rootfs`) |

**Env vars:**

| Var | Default | Purpose |
|-----|---------|---------|
| `PROJECTS_DIR` | `~/projects` | Root for all project directories |
| `ROOTFS_DIR` | `~/.local/share/ai-orchestration/rootfs` | Shared container rootfs |
| `RELAY_URL` | `ws://localhost:3000/ws` | WebSocket relay endpoint |
| `PORT` | `3000` | Relay server listen port |

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
