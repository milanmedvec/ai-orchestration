#!/bin/sh

set -e

project_id="$1"
name="$2"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_dir="$dir/$project_id"
rootfs="${ROOTFS_DIR:-$HOME/.local/share/ai-orchestration/rootfs}"
commands_dir="$(dirname "$0")"

[ -f "$project_dir/project.toml" ] || { printf '{"error":"project.toml not found"}\n' >&2; exit 1; }

session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
session_dir="$project_dir/$name"
branch="feature/$name"
container_id="claude-$name"
project_cwd="/project/$name"

git -C "$project_dir/.repo" worktree add "$session_dir" -b "$branch" >&2 \
  || { printf '{"error":"failed to create worktree"}\n' >&2; exit 1; }

printf 'gitdir: ../.repo/.git/worktrees/%s\n' "$name" > "$session_dir/.git"

jq \
  --arg rootfs "$rootfs" \
  --arg src "$project_dir" \
  --arg cwd "$project_cwd" \
  --arg hostname "$container_id" \
  --arg name "$name" \
  '
    .root.path = $rootfs |
    .hostname = $hostname |
    .process.cwd = $cwd |
    .process.args += ["--remote-control", $name] |
    (.mounts[] | select(.destination == "/project") | .source) = $src
  ' "$commands_dir/../config/container.json.template" > "$session_dir/config.json" \
  || { printf '{"error":"failed to generate config.json"}\n' >&2; exit 1; }

tmux new-session -d -s "$container_id" \
  "runc run --bundle '$session_dir' '$container_id'" >&2 \
  || { printf '{"error":"failed to start container"}\n' >&2; exit 1; }

printf '{"id":"%s","name":"%s","projectId":"%s","status":"active"}\n' "$session_id" "$name" "$project_id"
