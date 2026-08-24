#!/bin/bash
# Builds ./origin.git (bare) + ./repo (clone on branch $BRANCH). origin/main is
# $AHEAD commits ahead of the branch. $TEST_CMD is the demo app's test script.
set -e
BRANCH=${BRANCH:-sean/demo-readme}; AHEAD=${AHEAD:-1}; TEST_CMD=${TEST_CMD:-true}; DIFF=${DIFF:-readme}
export GIT_AUTHOR_NAME=thirdwavediscounts GIT_AUTHOR_EMAIL=sean@thirdwavediscounts.com GIT_COMMITTER_NAME=thirdwavediscounts GIT_COMMITTER_EMAIL=sean@thirdwavediscounts.com
git init -q --bare origin.git
git clone -q origin.git repo 2>/dev/null; cd repo; git checkout -q -b main
cat > package.json <<'J'
{"name":"eval-monorepo","private":true,"packageManager":"pnpm@9.0.0"}
J
printf "packages:\n  - 'apps/*'\n" > pnpm-workspace.yaml
mkdir -p apps/demo/src
cat > apps/demo/package.json <<J
{"name":"demo","version":"0.0.1","private":true,"scripts":{"typecheck":"true","test":"$TEST_CMD","build":"true"}}
J
echo "export const x = 1;" > apps/demo/src/index.ts
echo "# demo" > apps/demo/README.md
git add -A && git commit -qm "init" && git push -q -u origin main
[ "$BRANCH" = main ] || git checkout -q -b "$BRANCH"
if [ "$DIFF" = readme ]; then echo "Docs update." >> apps/demo/README.md; else echo "export const y = 2;" >> apps/demo/src/index.ts; fi
git add -A && git commit -qm "sean/ demo change"
# advance origin/main independently (non-conflicting)
for ((i=1;i<=AHEAD;i++)); do git checkout -q main; echo "line $i" >> apps/demo/CHANGELOG.md; git add -A; git commit -qm "other work $i"; git push -q origin main; done
git checkout -q "$BRANCH"
