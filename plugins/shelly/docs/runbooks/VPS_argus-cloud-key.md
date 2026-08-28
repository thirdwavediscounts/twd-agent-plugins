# VPS: ssh key for cloud sessions (`claude-cloud`)

Cloud sessions (claude.ai/code) have no secrets store — environment variables
are visible to anyone who can open the environment. Decision (Sean,
2026-08-27): the `Sean Dev` environment is single-operator, and cloud sessions
need everything an engine session does (unit files, timers, `resources.yaml`,
deploys under `/root` and `/opt`, restarts), which is root. So: a dedicated
root key that exists nowhere else and is revoked by deleting one line.
Read-only-first is a behaviour rule the operator rules already carry, not a
key restriction.

Raw journal lines are unredacted (engine-api redacts at read time) — the
cloud session masks before pasting, same as the local path.

## 1. Keypair — on the Mac, never on the VPS

```
ssh-keygen -t ed25519 -f ~/.ssh/argus_cloud -C claude-cloud -N ""
cat ~/.ssh/argus_cloud.pub
```

Keep the private key out of every transcript; it goes into the cloud
environment dialog by hand (step 4).

## 2. VPS — paste as root (`ssh ken-ai-agents`)

Replace `<PUBKEY>` with the single line printed by step 1. The options
disable forwarding and X11 — the key is for commands, not tunnels.

```
printf 'no-port-forwarding,no-agent-forwarding,no-X11-forwarding %s\n' '<PUBKEY>' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
ssh-keyscan -t ed25519 localhost 2>/dev/null | sed 's/^localhost/204.168.143.179/'
```

The last line prints the host key line for step 4 (`ARGUS_KNOWN_HOST`).

## 3. Prove it from the Mac

```
ssh -i ~/.ssh/argus_cloud root@204.168.143.179 'systemctl list-timers | head -3'
ssh -i ~/.ssh/argus_cloud -L 5432:localhost:5432 root@204.168.143.179 true
```

First prints timers; second must print `channel … administratively
prohibited` / refuse the forward. If the forward succeeds, the options in
step 2 did not apply.

## 4. Cloud environment (Sean Dev) — environment variables

```
ARGUS_HOST=204.168.143.179
ARGUS_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
…contents of ~/.ssh/argus_cloud…
-----END OPENSSH PRIVATE KEY-----"
ARGUS_KNOWN_HOST="204.168.143.179 ssh-ed25519 AAAA…"
```

The files are written by the plugin's SessionStart hook
`hooks/cloud-materialize.sh` (0.6.2), not by the setup script: the setup script
runs before the environment variables exist and its filesystem is
snapshot-cached for ~7 days, so anything it wrote from `$ARGUS_SSH_KEY` was a
1-byte stub (DEV-165, 2026-08-27). The hook writes `~/.ssh/argus`,
`known_hosts`, the `Host ken-ai-agents` block, `creds.json` and — when
`INFISICAL_*` are set — the three `.env` files, and prints one status line
with sizes/counts only. The setup script only provisions:

```
#!/bin/bash
set -e
REPO=$(find /home/user -maxdepth 3 -name pnpm-workspace.yaml -not -path '*/node_modules/*' | head -1 | xargs -r dirname)
cd "$REPO"
corepack enable && corepack prepare pnpm@10.33.2 --activate
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium || pnpm exec playwright install chromium
npm install -g @infisical/cli
```

Same alias as the Mac (`ssh ken-ai-agents`), so every skill and memory that
names it works unchanged. Engine source for deploys: clone
`thirdwavediscounts/twd-argus-engine` (private; the GitHub connector's token
covers it) into the session and follow the engine's own deploy notes
(memory `argus-deploy-source-root-vs-opt`: cardscout = `/opt` releases,
ebay-scraper + workflows = `/root`).

## 5. Cloud egress is an HTTP CONNECT proxy — no raw TCP

DEV-165 run 3 (2026-08-27): port 22 times out, port 443 "Connection closed";
curl works. The hook therefore writes `ProxyCommand nc -X connect -x
<HTTPS_PROXY host:port> %h %p` into the `Host` block whenever `HTTPS_PROXY`
is set (setup script installs `netcat-openbsd`). If the proxy only allows
CONNECT to 443: add `Port 443` under `Port 22` in `/etc/ssh/sshd_config` on
the VPS, `systemctl reload ssh`, and set `ARGUS_PORT=443` in Sean Dev.
Nothing else on the box listens on 443.

## Revoke

```
sed -i '/ claude-cloud$/d' /root/.ssh/authorized_keys
```

Then blank `ARGUS_SSH_KEY` in the environment dialog.
