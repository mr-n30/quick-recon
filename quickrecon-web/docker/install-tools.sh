#!/bin/bash

set -euo pipefail

TOOLS_DIR="/opt/tools"
mkdir -p "$TOOLS_DIR" /usr/share

export GOPATH="${GOPATH:-/root/go}"
export PATH="$PATH:$GOPATH/bin"

apt-get update
apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    python3-venv \
    golang-go \
    nmap

if [ ! -d "$TOOLS_DIR/seclists/.git" ]; then
    echo "Installing SecLists..."
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$TOOLS_DIR/seclists"
fi

ln -sfn "$TOOLS_DIR/seclists" /usr/share/seclists

echo "Installing subfinder..."
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

echo "Installing httpx..."
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

echo "Installing nuclei..."
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

echo "Installing ffuf..."
go install github.com/ffuf/ffuf/v2@latest

echo "Installing waybackurls..."
go install github.com/tomnomnom/waybackurls@latest

echo "Installing gau..."
go install github.com/lc/gau/v2/cmd/gau@latest

echo "Installing hakrawler..."
go install github.com/hakluke/hakrawler@latest

echo "Installing subjs..."
go install github.com/lc/subjs@latest

echo "Installing jsleak..."
go install github.com/channyein1337/jsleak@latest

if [ ! -d "$TOOLS_DIR/linkfinder/.git" ]; then
    echo "Installing LinkFinder..."
    git clone --depth 1 https://github.com/GerbenJavado/LinkFinder.git "$TOOLS_DIR/linkfinder"
fi

cd "$TOOLS_DIR/linkfinder"
python3 -m venv venv
./venv/bin/pip install --upgrade pip setuptools
./venv/bin/pip install .
./venv/bin/pip install -r requirements.txt

rm -rf /var/lib/apt/lists/*
