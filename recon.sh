#!/bin/bash

# Parse command-line arguments
while getopts "d:" opt; do
  case $opt in
    d) DOMAIN="$OPTARG" ;;
    *) echo "Usage: $0 -d <domain>" ; exit 1 ;;
  esac
done

OUTPUT_DIR="$HOME/recon/$DOMAIN"

echo "Running subfinder..."
subfinder -d $DOMAIN -o "$OUTPUT_DIR/sf.txt" -all

echo "Running httpx..."
httpx -l "$OUTPUT_DIR/subfinder.txt" -o "$OUTPUT_DIR/httpx.txt" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

echo "Running waybackurls..."
echo $DOMAIN | waybackurls | tee -a "$OUTPUT_DIR/wb.txt"

echo "Running gau..."
echo $DOMAIN |gau | tee -a "$OUTPUT_DIR/gau.txt"

echo "Running hakrawler..."
cat $OUTPUT_DIR/httpx.txt | hakrawler | tee -a "$OUTPUT_DIR/hk.txt"

echo "Running subjs..."
cat $OUTPUT_DIR/hk.txt $OUTPUT_DIR/wb.txt $OUTPUT_DIR/gau.txt | subjs | tee -a "$OUTPUT_DIR/subjs.txt"

echo "Running linkfinder..."
for URL in $(cat $OUTPUT_DIR/subjs.txt); do
    linkfinder -i "$URL" -o cli | tee -a "$OUTPUT_DIR/lf.txt"
done

echo "[+] Reconnaissance completed. Results saved in $PWD/$OUTPUT_DIR :)"