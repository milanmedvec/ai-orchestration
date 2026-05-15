#!/bin/sh

set -e

dir="${PROJECTS_DIR:-$HOME/projects}"

if [ ! -d "$dir" ]; then
  printf '{"projects":[]}\n'
  exit 0
fi

json='['
first=1

for path in "$dir"/*/; do
  [ -d "$path" ] || continue

  toml="${path}project.toml"
  [ -f "$toml" ] || continue

  id=$(grep '^id' "$toml" | sed 's/^id *= *"\(.*\)"/\1/')
  name=$(grep '^name' "$toml" | sed 's/^name *= *"\(.*\)"/\1/')
  repo_url=$(grep '^repo_url' "$toml" | sed 's/^repo_url *= *"\(.*\)"/\1/')
  [ -n "$id" ] || continue

  if [ $first -eq 1 ];
  then
    first=0;
  else
    json="$json,";
  fi

  json="$json{\"id\":\"$id\",\"name\":\"$name\",\"repoUrl\":\"$repo_url\"}"
done

json="$json]"

printf '{"projects":%s}\n' "$json"
