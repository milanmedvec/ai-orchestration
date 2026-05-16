#!/bin/sh

set -e

session_id="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"
container_id="claude-$session_id"

runc kill "$container_id" SIGTERM >&2 2>/dev/null || true
sleep 1
runc kill "$container_id" SIGKILL >&2 2>/dev/null || true
runc delete --force "$container_id" >&2 2>/dev/null || true

tmux kill-session -t "$container_id" >&2 2>/dev/null || true

session_dir=$(find "$dir" -maxdepth 2 -mindepth 2 -type d -name "$session_id" 2>/dev/null | head -1)

if [ -n "$session_dir" ]; then
  project_dir="$(dirname "$session_dir")"
  git -C "$project_dir/.repo" worktree remove "$session_dir" --force >&2 2>/dev/null || true
  rm -rf "$project_dir/.bundles/$session_id"
fi

printf '{"success":true,"sessionId":"%s"}\n' "$session_id"
