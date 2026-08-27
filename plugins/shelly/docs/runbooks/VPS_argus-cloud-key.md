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

Append to the setup script:

```
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' "$ARGUS_SSH_KEY" > ~/.ssh/argus && chmod 600 ~/.ssh/argus
printf '%s\n' "$ARGUS_KNOWN_HOST" >> ~/.ssh/known_hosts
printf 'Host ken-ai-agents\n  HostName %s\n  User root\n  IdentityFile ~/.ssh/argus\n  IdentitiesOnly yes\n' "$ARGUS_HOST" > ~/.ssh/config
```

Same alias as the Mac (`ssh ken-ai-agents`), so every skill and memory that
names it works unchanged. Engine source for deploys: clone
`thirdwavediscounts/twd-argus-engine` (private; the GitHub connector's token
covers it) into the session and follow the engine's own deploy notes
(memory `argus-deploy-source-root-vs-opt`: cardscout = `/opt` releases,
ebay-scraper + workflows = `/root`).

## 5. If port 22 egress is blocked from the cloud

Unverified until the first cloud test session. If `ssh ken-ai-agents` times
out there, add `Port 443` under `Port 22` in `/etc/ssh/sshd_config` on the
VPS, `systemctl reload ssh`, and add `Port 443` to the cloud `Host` block.
Nothing else on the box listens on 443.

## Revoke

```
sed -i '/ claude-cloud$/d' /root/.ssh/authorized_keys
```

Then blank `ARGUS_SSH_KEY` in the environment dialog.
