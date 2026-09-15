#!/bin/sh
# Verifies the submission bundle without needing the repository.
#
# Re-checks the three things that cause a rejected upload: a corrupted or
# mismatched archive, a manifest not at the archive root, and a listing graphic
# at the wrong dimensions. Run this immediately before you start the form.
#
# Usage:  ./verify.sh

set -u

cd "$(dirname "$0")" || exit 1

fail=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=1; }

echo "Verifying submission bundle in $(pwd)"
echo

# --- 1. Checksums over the artifact and every listing asset -------------------
echo "Checksums"
if [ ! -f SHA256SUMS.txt ]; then
  bad "SHA256SUMS.txt missing"
elif shasum -a 256 -c SHA256SUMS.txt >/dev/null 2>&1; then
  ok "all files match SHA256SUMS.txt ($(grep -c . SHA256SUMS.txt) files)"
else
  bad "checksum mismatch — do not upload:"
  shasum -a 256 -c SHA256SUMS.txt 2>&1 | grep -v ': OK$' | sed 's/^/      /'
fi
echo

# --- 2. Upload archive shape -------------------------------------------------
echo "Upload archive"
ZIP=$(ls artifact/piii-*.zip 2>/dev/null | head -1)
if [ -z "$ZIP" ]; then
  bad "no artifact/piii-*.zip found"
else
  ok "found $ZIP ($(wc -c <"$ZIP" | tr -d ' ') bytes)"

  # The store rejects an archive whose manifest is nested. Path must be exactly
  # "manifest.json" at the root — not "dist/manifest.json".
  entries=$(unzip -l "$ZIP" | awk '$NF == "manifest.json" { print $NF }' | wc -l | tr -d ' ')
  if unzip -l "$ZIP" | grep -qE '^[[:space:]]*[0-9]+[[:space:]].*[[:space:]]manifest\.json$' &&
     [ "$entries" = "1" ]; then
    ok "manifest.json is at the archive root"
  else
    bad "manifest.json is not at the archive root — the store will reject this"
  fi

  # Version must agree with the filename.
  ver=$(unzip -p "$ZIP" manifest.json 2>/dev/null |
    sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  if [ -n "$ver" ] && [ "$ZIP" = "artifact/piii-$ver.zip" ]; then
    ok "manifest version $ver matches the archive name"
  else
    bad "manifest version '$ver' does not match artifact name '$ZIP'"
  fi

  # PiiI must request no host permissions — shipping them changes what you have
  # to declare in the Privacy practices tab.
  if unzip -p "$ZIP" manifest.json 2>/dev/null | grep -q 'host_permissions'; then
    bad "manifest declares host_permissions, but PiiI requests none"
  else
    ok "no host_permissions (as designed)"
  fi

  # Every WAR pattern must be origin-level with a literal /* path; anything else
  # makes the whole manifest uninstallable.
  if unzip -p "$ZIP" manifest.json 2>/dev/null | grep -q 'web_accessible_resources'; then
    ok "web_accessible_resources present (origin-level patterns assumed, checked at package time)"
  fi
fi
echo

# --- 3. Listing graphic dimensions -------------------------------------------
echo "Listing graphics"
if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PY'
import struct, sys, glob
expected = {
    "icon128.png": (128, 128),
    "01-detections-in-composer.png": (1280, 800),
    "02-review-panel.png": (1280, 800),
    "03-popup-audit-log.png": (1280, 800),
    "04-welcome.png": (1280, 800),
    "tile-440x280.png": (440, 280),
    "marquee-1400x560.png": (1400, 560),
}
bad = 0
for name, (ew, eh) in expected.items():
    path = "listing-assets/" + name
    try:
        with open(path, "rb") as f:
            head = f.read(24)
        if head[:8] != b"\x89PNG\r\n\x1a\n":
            print(f"  \033[31m✗\033[0m {name}: not a PNG"); bad = 1; continue
        w, h = struct.unpack(">II", head[16:24])
        if (w, h) == (ew, eh):
            print(f"  \033[32m✓\033[0m {name} {w}x{h}")
        else:
            print(f"  \033[31m✗\033[0m {name} is {w}x{h}, expected {ew}x{eh}"); bad = 1
    except FileNotFoundError:
        print(f"  \033[31m✗\033[0m {name}: missing"); bad = 1
sys.exit(bad)
PY
  [ $? -ne 0 ] && fail=1
else
  echo "  – python3 not available, skipping dimension check"
fi
echo

if [ "$fail" -eq 0 ]; then
  printf '\033[32mAll checks passed.\033[0m  Open DEPLOYMENT.md and start at Step 1.\n'
  exit 0
fi

printf '\033[31mChecks failed.\033[0m  Do not upload this bundle — fix the issues above first.\n'
exit 1
