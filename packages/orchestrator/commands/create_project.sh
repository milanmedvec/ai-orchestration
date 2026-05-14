#!/bin/sh
name="$1"
repo_url="$2"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
path="$dir/$project_id"

mkdir -p "$path" >&2

printf 'id = "%s"\nname = "%s"\nrepo_url = "%s"\n' "$project_id" "$name" "$repo_url" \
  > "$path/project.toml"

git clone "$repo_url" "$path/.repo" >&2 \
  || { printf '{"error":"failed to clone repository"}\n' >&2; exit 1; }

printf '{"id":"%s","name":"%s","repoUrl":"%s"}\n' "$project_id" "$name" "$repo_url"
