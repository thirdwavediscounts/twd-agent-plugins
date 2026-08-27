#!/usr/bin/env bash
# SessionStart hook: inject the operator's personal rules as session context.
# Gated on SHELLY_OPERATOR so a teammate who installs the same plugin does not
# inherit another person's push-approval, branch-prefix, or prod rules. Set it
# in ~/.claude/settings.json `env` locally and in the cloud environment's
# variables. Stdout of a SessionStart hook becomes context; always exit 0.
set -u
op="${SHELLY_OPERATOR:-}"
[ -n "$op" ] || exit 0
f="$(dirname "$0")/../rules/operator-${op}.md"
[ -f "$f" ] && cat "$f"
exit 0
