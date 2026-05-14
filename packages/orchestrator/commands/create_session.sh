#!/bin/sh

project_id="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_dir="$dir/$project_id"
rootfs="${ROOTFS_DIR:-$HOME/.local/share/ai-orchestration/rootfs}"
commands_dir="$(dirname "$0")"

[ -f "$project_dir/project.toml" ] || { printf '{"error":"project.toml not found"}\n' >&2; exit 1; }

session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
session_dir="$project_dir/$session_id"
branch="session/$session_id"
container_id="claude-$session_id"

git -C "$project_dir/.repo" worktree add "$session_dir" -b "$branch" >&2 \
  || { printf '{"error":"failed to create worktree"}\n' >&2; exit 1; }

jq \
  --arg rootfs "$rootfs" \
  --arg src "$session_dir" \
  --arg hostname "$container_id" \
  --arg session_id "$session_id" \
  '
    .root.path = $rootfs |
    .hostname = $hostname |
    .process.args += ["--remote-control", $session_id] |
    (.mounts[] | select(.destination == "/project") | .source) = $src
  ' "$commands_dir/config.json.template" > "$session_dir/config.json" \
  || { printf '{"error":"failed to generate config.json"}\n' >&2; exit 1; }

tmux new-session -d -s "$container_id" \
  "runc run --bundle '$session_dir' '$container_id'" >&2 \
  || { printf '{"error":"failed to start container"}\n' >&2; exit 1; }

printf '{"id":"%s","projectId":"%s","status":"active"}\n' "$session_id" "$project_id"
