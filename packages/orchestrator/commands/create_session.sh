#!/bin/sh
project_id="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_dir="$dir/$project_id"

session_id="$(uuidgen)"
session_dir="$project_dir/$session_id"
tmux_name="claude-$session_id"

mkdir -p "$session_dir" >&2 || { printf '{"error":"failed to create session directory"}\n' >&2; exit 1; }

tmux new-session -d -s "$tmux_name" -c "$session_dir" "claude --remote-control $session_id" >&2 \
  || { printf '{"error":"failed to start tmux session"}\n' >&2; exit 1; }

printf '{"id":"%s","projectId":"%s","status":"active"}\n' "$session_id" "$project_id"
