#!/bin/bash

set -euo pipefail

usage() {
  echo "Usage: $0 -d <domain|domain_list_file> -o <output_dir>"
  echo
  echo "  -d  Single domain (example.com) or a file containing domains"
  echo "  -o  Output directory"
  exit 1
}

DOMAIN_INPUT=""
OUTPUT_DIR=""

while getopts ":d:o:" opt; do
  case "$opt" in
    d) DOMAIN_INPUT="$OPTARG" ;;
    o) OUTPUT_DIR="$OPTARG" ;;
    *) usage ;;
  esac
done

if [[ -z "$DOMAIN_INPUT" || -z "$OUTPUT_DIR" ]]; then
  echo "[!] Error: both -d and -o are required."
  usage
fi

mkdir -p "$OUTPUT_DIR"

if [[ -f "$DOMAIN_INPUT" ]]; then
  echo "[+] Detected domain list file: $DOMAIN_INPUT"
  SUBFINDER_INPUT_MODE="file"
  SUBFINDER_CMD=(subfinder -dL "$DOMAIN_INPUT" -o "$OUTPUT_DIR/sf.txt" -all)
  WAYBACK_INPUT_CMD=(cat "$DOMAIN_INPUT")
  GAU_INPUT_CMD=(cat "$DOMAIN_INPUT")
else
  echo "[+] Detected single domain: $DOMAIN_INPUT"
  SUBFINDER_INPUT_MODE="domain"
  SUBFINDER_CMD=(subfinder -d "$DOMAIN_INPUT" -o "$OUTPUT_DIR/sf.txt" -all)
  WAYBACK_INPUT_CMD=(printf '%s\n' "$DOMAIN_INPUT")
  GAU_INPUT_CMD=(printf '%s\n' "$DOMAIN_INPUT")
fi

echo "Running subfinder..."
"${SUBFINDER_CMD[@]}"

echo "Running httpx..."
httpx -l "$OUTPUT_DIR/sf.txt" -o "$OUTPUT_DIR/httpx.txt" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
  -title \
  -status-code \
  -content-length \
  -redirects \
  -web-server \
  -tech-detect \
  -silent

echo "Running waybackurls..."
"${WAYBACK_INPUT_CMD[@]}" | waybackurls | tee -a "$OUTPUT_DIR/wb.txt"

echo "Running gau..."
"${GAU_INPUT_CMD[@]}" | gau | tee -a "$OUTPUT_DIR/gau.txt"

echo "Running hakrawler..."
hakrawler < "$OUTPUT_DIR/httpx.txt" | tee -a "$OUTPUT_DIR/hk.txt"

echo "Running subjs..."
cat "$OUTPUT_DIR/hk.txt" "$OUTPUT_DIR/wb.txt" "$OUTPUT_DIR/gau.txt" | subjs | tee -a "$OUTPUT_DIR/subjs.txt"

echo "Running linkfinder..."
source /opt/tools/linkfinder/venv/bin/activate
while IFS= read -r URL; do
  [[ -z "$URL" ]] && continue
  python3 /opt/tools/linkfinder/linkfinder.py -i "$URL" -o cli | tee -a "$OUTPUT_DIR/lf.txt"
done < "$OUTPUT_DIR/subjs.txt"

echo "[+] Reconnaissance completed. Results saved in $OUTPUT_DIR :)"
