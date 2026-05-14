#!/bin/sh
name="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"
path="$dir/$name"

mkdir -p "$path" >&2 || { printf '{"error":"failed to create directory"}\n' >&2; exit 1; }

printf '{"id":"%s","name":"%s","path":"%s"}\n' "$name" "$name" "$path"
