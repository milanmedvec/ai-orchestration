#!/bin/sh

set -e

project_id="$1"
dir="${PROJECTS_DIR:-$HOME/projects}"
project_dir="$dir/$project_id"

[ -d "$project_dir" ] || { printf '{"sessions":[]}\n'; exit 0; }

json='['
first=1

for session_dir in "$project_dir"/*/; do
  [ -d "$session_dir" ] || continue
  name="${session_dir%/}"
  name="${name##*/}"
  [ "$name" = ".bundles" ] && continue

  container_id="claude-$name"
  tmux has-session -t "$container_id" 2>/dev/null || continue

  [ $first -eq 1 ] && first=0 || json="$json,"
  json="$json{\"id\":\"$name\",\"name\":\"$name\",\"projectId\":\"$project_id\",\"status\":\"active\"}"
done

json="$json]"
printf '{"sessions":%s}\n' "$json"
