#!/bin/sh

set -e

name="$1"
repo_url="$2"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_id="$(cat /proc/sys/kernel/random/uuid)"
path="$dir/$project_id"

mkdir -p "$path" >&2

printf 'id = "%s"\nname = "%s"\nrepo_url = "%s"\n' "$project_id" "$name" "$repo_url" \
  > "$path/project.toml"

if [ -n "$repo_url" ]; then
  git clone "$repo_url" "$path/.repo" >&2 \
    || { printf '{"error":"failed to clone repository"}\n' >&2; exit 1; }
else
  git init -b main "$path/.repo" >&2
  git -C "$path/.repo" -c user.email="orchestrator@local" -c user.name="Orchestrator" \
    commit --allow-empty -m "init" >&2
fi

printf '{"id":"%s","name":"%s","repoUrl":"%s"}\n' "$project_id" "$name" "$repo_url"
