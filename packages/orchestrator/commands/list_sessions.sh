#!/bin/sh
project_id="$1"

names=$(tmux list-sessions -F "#{session_name}" 2>/dev/null | grep "^claude-") || true

json='['
first=1
while IFS= read -r name; do
  [ -z "$name" ] && continue
  id="${name#claude-}"
  if [ $first -eq 1 ]; then first=0; else json="$json,"; fi
  json="$json{\"id\":\"$id\",\"projectId\":\"$project_id\",\"status\":\"active\"}"
done << EOF
$names
EOF
json="$json]"

printf '{"sessions":%s}\n' "$json"
