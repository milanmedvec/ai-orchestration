#!/bin/sh
session_id="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"

tmux kill-session -t "claude-$session_id" >&2 \
  || { printf '{"success":false,"sessionId":"%s"}\n' "$session_id"; exit 1; }

session_dir=$(find "$dir" -maxdepth 2 -mindepth 2 -type d -name "$session_id" 2>/dev/null | head -1)
if [ -n "$session_dir" ]; then
  project_dir="$(dirname "$session_dir")"
  git -C "$project_dir/.repo" worktree remove "$session_dir" --force >&2 2>/dev/null || true
fi

printf '{"success":true,"sessionId":"%s"}\n' "$session_id"
