#!/bin/sh
project_id="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_dir="$dir/$project_id"
toml="$project_dir/project.toml"

[ -f "$toml" ] || { printf '{"error":"project.toml not found"}\n' >&2; exit 1; }

repo_url=$(grep '^repo_url' "$toml" | sed 's/^repo_url *= *"\(.*\)"/\1/')

[ -n "$repo_url" ] || { printf '{"error":"repo_url missing in project.toml"}\n' >&2; exit 1; }

session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
session_dir="$project_dir/$session_id"
branch="session/$session_id"

git -C "$project_dir/.repo" worktree add "$session_dir" -b "$branch" >&2 \
  || { printf '{"error":"failed to create worktree"}\n' >&2; exit 1; }

tmux new-session -d -s "claude-$session_id" -c "$session_dir" \
  "claude --remote-control $session_id" >&2 \
  || { printf '{"error":"failed to start tmux session"}\n' >&2; exit 1; }

printf '{"id":"%s","projectId":"%s","status":"active"}\n' "$session_id" "$project_id"
