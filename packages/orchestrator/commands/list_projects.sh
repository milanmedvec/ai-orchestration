#!/bin/sh

dir="${PROJECTS_DIR:-$HOME/projects}"

if [ ! -d "$dir" ]; then
  printf '{"projects":[]}\n'
  exit 0
fi

json='['
first=1
for path in "$dir"/*/; do
  [ -d "$path" ] || continue
  name="${path%/}"
  name="${name##*/}"
  if [ $first -eq 1 ]; then first=0; else json="$json,"; fi
  json="$json{\"id\":\"$name\",\"name\":\"$name\",\"path\":\"$path\"}"
done
json="$json]"

printf '{"projects":%s}\n' "$json"
