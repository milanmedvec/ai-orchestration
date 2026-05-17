# ai-orchestration

A platform for running AI agents (Claude) in isolated containers, controlled from a web UI, mobile app, or CLI — all connected through a central WebSocket relay.

Each **session** is a git worktree inside an OCI container managed by `runc`, running in a detached tmux session. Projects group sessions and hold the underlying git repository. Clients send commands to an orchestrator over the relay; the orchestrator executes shell scripts and streams results back.

## Architecture

```
┌──────────────┐      WebSocket      ┌──────────────┐      WebSocket      ┌─────────────────────┐
│  Web / CLI   │ ──────────────────▶ │ Relay Server │ ──────────────────▶ │    Orchestrator      │
│   (client)   │ ◀────────────────── │  :3000/ws    │ ◀────────────────── │  (shell commands)    │
└──────────────┘                     └──────────────┘                     └─────────────────────┘
                                                                                    │
                                                                           runc containers
                                                                           (one per session)
```

**Message flow:**
1. Client sends `command_request` to relay
2. Relay dispatches `command_dispatch` to the target orchestrator
3. Orchestrator sends `command_ack`, runs the shell command, then sends `command_result` or `command_error`
4. Relay fans results out to all connected clients

## Packages

| Package | Purpose |
|---|---|
| `packages/lib` | Shared Zod schemas, types, `serialize`/`deserialize` helpers |
| `packages/relay-server` | WebSocket hub — routes messages between clients and orchestrators |
| `packages/orchestrator` | Connects to relay, executes shell commands, validates I/O |
| `packages/client` | CLI client |
| `packages/web` | React web UI + Android app (Capacitor) |

## Prerequisites

- [Bun](https://bun.sh) v1.x
- `runc` — OCI container runtime
- `tmux` — sessions run inside detached tmux sessions
- `jq`, `uuidgen` — used by orchestrator shell commands
- A rootfs image at `$ROOTFS_DIR` (default: `~/.local/share/ai-orchestration/rootfs`)

## Getting started

```sh
bun install
```

Start each service in a separate terminal:

```sh
# 1. Relay server (required first)
bun run --cwd packages/relay-server dev

# 2. Orchestrator
bun run --cwd packages/orchestrator dev

# 3. Web UI
bun run --cwd packages/web dev

# 4. CLI client (optional)
bun run --cwd packages/client dev
```

Health check:

```sh
curl http://localhost:3000/health
```

## Configuration

### Relay server

| Env var | Default | Description |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `AUTH_TOKEN` | _(none)_ | If set, all peers must provide this token on `register` |

### Orchestrator

| Env var | Default | Description |
|---|---|---|
| `RELAY_URL` | `ws://localhost:3000/ws` | Relay WebSocket URL |
| `PROJECTS_DIR` | `~/projects` | Root directory for all projects |
| `ROOTFS_DIR` | `~/.local/share/ai-orchestration/rootfs` | Shared container rootfs |
| `AUTH_TOKEN` | _(none)_ | Token sent to relay on registration |

### Web UI

Copy `packages/web/.env.example` to `packages/web/.env` and set:

```sh
# For LAN / Android builds, set the relay server's LAN IP
VITE_RELAY_URL=ws://192.168.1.x:3000/ws
```

## Project & session layout

```
~/projects/{projectId}/
  project.toml                            # id, name, repoUrl
  .repo/                                  # non-bare git repository
  {projectName}_{sessionName}/            # git worktree (= session workspace)
  .bundles/{projectName}_{sessionName}/   # runc OCI bundle (config.json)
```

Each session runs as a container named `claude-{projectName}_{sessionName}`, launched in a tmux session with the same ID. The project directory is bind-mounted at `/project` inside the container.

## Commands

Commands are defined in `packages/orchestrator/config/commands.toml` and mapped to shell scripts under `packages/orchestrator/commands/`. Each script receives input as positional arguments and must write valid JSON to stdout matching the protocol output schema.

| Command | Input | Description |
|---|---|---|
| `list_projects` | — | List all projects |
| `create_project` | `name`, `repoUrl?` | Clone or init a repo, create project directory |
| `list_sessions` | `projectId` | List sessions for a project |
| `create_session` | `projectId`, `name` | Create a git worktree + runc bundle, start container |
| `terminate_session` | `sessionId` | Kill container, remove tmux session and worktree |

## Protocol

All message schemas are defined in `packages/lib/src/protocol.ts` using Zod. Peers connect to `ws://localhost:3000/ws` and register with a `role` of either `client` or `orchestrator`.

Key message types:

- `register` — peer → relay, declares role and optional auth token
- `command_request` — client → relay → orchestrator (as `command_dispatch`)
- `command_ack` — orchestrator confirms receipt
- `command_result` / `command_error` — orchestrator → relay → all clients
- `orchestrator_joined` / `orchestrator_left` — relay notifies clients of orchestrator presence

## Android

The web package includes a Capacitor Android app. After building the web UI (`bun run --cwd packages/web build`), sync and open in Android Studio:

```sh
cd packages/web
bunx cap sync android
bunx cap open android
```

Set `VITE_RELAY_URL` to your machine's LAN IP before building so the Android app can reach the relay server.
