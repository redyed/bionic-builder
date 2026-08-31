#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OG="$ROOT/scripts/og"
OUT="$ROOT/public/images"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT=8765

cd "$ROOT"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/og-http.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 0.4

shot() {
  local page="$1"
  local dest="$2"
  local w="$3"
  local h="$4"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    --window-size="${w},${h}" \
    --virtual-time-budget=5000 \
    --screenshot="$dest" \
    "http://127.0.0.1:${PORT}/scripts/og/${page}"
  sips -z "$h" "$w" "$dest" >/dev/null
}

shot "og-home.html"    "$OUT/og-home.png"    1200 630
shot "og-setups.html"  "$OUT/og-setups.png"  1200 630
shot "og-setup-1.html" "$OUT/og-setup-1.png" 1200 630
shot "og-setup-2.html" "$OUT/og-setup-2.png" 1200 630
shot "og-now.html"     "$OUT/og-now.png"     1200 630
shot "apple-touch.html" "$ROOT/public/apple-touch-icon.png" 180 180
cp "$OUT/og-home.png" "$OUT/og.png"

python3 - "$ROOT" <<'PY'
from pathlib import Path
import struct, subprocess, sys

root = Path(sys.argv[1])
src = root / "public/apple-touch-icon.png"
tmp = Path("/tmp/favicon-32.png")
subprocess.check_call(["sips", "-z", "32", "32", str(src), "--out", str(tmp)])
png = tmp.read_bytes()
entry = struct.pack("<BBBBHHII", 32, 32, 0, 0, 1, 32, len(png), 22)
header = struct.pack("<HHH", 0, 1, 1)
(root / "public/favicon.ico").write_bytes(header + entry + png)
print("OG cards, apple-touch-icon, favicon.ico written")
PY
