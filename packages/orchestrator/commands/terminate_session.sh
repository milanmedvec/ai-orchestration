#!/bin/sh
session_id="$1"
tmux_name="claude-$session_id"

tmux kill-session -t "$tmux_name" >&2 || { printf '{"success":false,"sessionId":"%s"}\n' "$session_id"; exit 1; }

printf '{"success":true,"sessionId":"%s"}\n' "$session_id"
