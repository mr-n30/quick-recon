#!/bin/bash

set -euo pipefail

usage() {
  echo "Usage: $0 -d <domain|domain_list_file> -o <output_dir> [-f <exclude_subdomains_file_or_csv>]"
  echo
  echo "  -d  Single domain (example.com) or a file containing domains"
  echo "  -o  Output directory"
  echo "  -f  Optional subfinder filter input (file or comma-separated subdomains to exclude)"
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[!] Missing required command: $1"
    exit 1
  fi
}

DOMAIN_INPUT=""
OUTPUT_DIR=""
EXCLUDE_FILTER=""

while getopts ":d:o:f:" opt; do
  case "$opt" in
    d) DOMAIN_INPUT="$OPTARG" ;;
    o) OUTPUT_DIR="$OPTARG" ;;
    f) EXCLUDE_FILTER="$OPTARG" ;;
    *) usage ;;
  esac
done

if [[ -z "$DOMAIN_INPUT" || -z "$OUTPUT_DIR" ]]; then
  echo "[!] Error: both -d and -o are required."
  usage
fi

require_command subfinder
require_command httpx
require_command waybackurls
require_command gau
require_command hakrawler
require_command subjs

mkdir -p "$OUTPUT_DIR"

SUBFINDER_FILTER_ARGS=()
if [[ -n "$EXCLUDE_FILTER" ]]; then
  echo "[+] Using subfinder filter input: $EXCLUDE_FILTER"
  SUBFINDER_FILTER_ARGS=(-f "$EXCLUDE_FILTER")
fi

if [[ -f "$DOMAIN_INPUT" ]]; then
  echo "[+] Detected domain list file: $DOMAIN_INPUT"
  SUBFINDER_CMD=(subfinder -dL "$DOMAIN_INPUT" -o "$OUTPUT_DIR/sf.txt" -all "${SUBFINDER_FILTER_ARGS[@]}")
  WAYBACK_INPUT_CMD=(cat "$DOMAIN_INPUT")
  GAU_INPUT_CMD=(cat "$DOMAIN_INPUT")
else
  echo "[+] Detected single domain: $DOMAIN_INPUT"
  SUBFINDER_CMD=(subfinder -d "$DOMAIN_INPUT" -o "$OUTPUT_DIR/sf.txt" -all "${SUBFINDER_FILTER_ARGS[@]}")
  WAYBACK_INPUT_CMD=(printf '%s\n' "$DOMAIN_INPUT")
  GAU_INPUT_CMD=(printf '%s\n' "$DOMAIN_INPUT")
fi

echo "Running subfinder..."
"${SUBFINDER_CMD[@]}"

if [[ -s "$OUTPUT_DIR/sf.txt" ]]; then
  echo "Running httpx..."
  httpx -l "$OUTPUT_DIR/sf.txt" -o "$OUTPUT_DIR/httpx-full.txt" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -title \
    -status-code \
    -content-length \
    -fr \
    -server \
    -td \
    -silent

  awk '{print $1}' "$OUTPUT_DIR/httpx-full.txt" > "$OUTPUT_DIR/httpx.txt"
else
  echo "[!] subfinder produced no subdomains; skipping httpx and hakrawler."
  : > "$OUTPUT_DIR/httpx-full.txt"
  : > "$OUTPUT_DIR/httpx.txt"
  : > "$OUTPUT_DIR/hk.txt"
fi

echo "Running waybackurls..."
"${WAYBACK_INPUT_CMD[@]}" | waybackurls | tee "$OUTPUT_DIR/wb.txt"

echo "Running gau..."
"${GAU_INPUT_CMD[@]}" | gau | tee "$OUTPUT_DIR/gau.txt"

if [[ -s "$OUTPUT_DIR/httpx.txt" ]]; then
  echo "Running hakrawler..."
  hakrawler < "$OUTPUT_DIR/httpx.txt" | tee "$OUTPUT_DIR/hk.txt"
fi

echo "Running subjs..."
cat "$OUTPUT_DIR/hk.txt" "$OUTPUT_DIR/wb.txt" "$OUTPUT_DIR/gau.txt" \
  | sed -E 's/\?.*$//g' \
  | sort -u \
  | subjs \
  | sort -u > "$OUTPUT_DIR/subjs.txt"

echo "Running linkfinder..."
LINKFINDER_SCRIPT="/opt/tools/linkfinder/linkfinder.py"
LINKFINDER_VENV_PYTHON="/opt/tools/linkfinder/venv/bin/python"

if [[ -f "$LINKFINDER_SCRIPT" ]]; then
  if [[ -x "$LINKFINDER_VENV_PYTHON" ]]; then
    LINKFINDER_PYTHON="$LINKFINDER_VENV_PYTHON"
  else
    require_command python3
    LINKFINDER_PYTHON="python3"
  fi

  : > "$OUTPUT_DIR/lf.txt"
  while IFS= read -r URL; do
    [[ -z "$URL" ]] && continue
    "$LINKFINDER_PYTHON" "$LINKFINDER_SCRIPT" -i "$URL" -o cli | tee -a "$OUTPUT_DIR/lf.txt"
  done < "$OUTPUT_DIR/subjs.txt"
else
  echo "[!] Skipping linkfinder because $LINKFINDER_SCRIPT was not found."
  : > "$OUTPUT_DIR/lf.txt"
fi

echo "[+] Reconnaissance completed. Results saved in $OUTPUT_DIR"
