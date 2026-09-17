#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${BEND_HOME:-$HOME/.bend}/bin:${PATH}"

if ! command -v bend >/dev/null 2>&1; then
  echo "bend not found. Install: curl -fsSL https://bend-lang.com/install.sh | sh"
  exit 1
fi

bend --version
cd "$ROOT/bend"
bend PROOF.bend
