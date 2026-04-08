#!/bin/bash
# This script installs recon tools for Bug Bounty Hunting / OSCP / CTF / etc.
# This script is intended for Debian-based distributions (like Ubuntu).
# Author:
#   - mr-n30

set -euo pipefail

# Check if the script is run as root
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Tools installation directory
TOOLS_DIR="/opt/tools"
mkdir -p "$TOOLS_DIR"
mkdir -p /usr/share

# Ensure Go-installed binaries are available system-wide when running as root
export GOPATH="${GOPATH:-/root/go}"
export PATH="$PATH:$GOPATH/bin"

# Append Go binaries to PATH in .bashrc for future sessions
if ! grep -q 'export PATH=.*$GOPATH/bin' $HOME/.bashrc; then
    echo 'export PATH="$PATH:$GOPATH/bin"' >> $HOME/.bashrc
fi

# Update and upgrade the system
apt update
apt upgrade -y

# Install necessary packages
apt install -y \
    git \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    python3-venv \
    golang-go \
    nmap

# Install recon tools
# You can add more tools to this list as needed
if [ ! -d "$TOOLS_DIR/seclists/.git" ]; then
    echo "Installing seclists..."
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$TOOLS_DIR/seclists"
else
    echo "SecLists already exists, skipping clone..."
fi

echo "Creating symbolic link for seclists at /usr/share/seclists..."
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
    git clone https://github.com/GerbenJavado/LinkFinder.git "$TOOLS_DIR/linkfinder"
else
    echo "LinkFinder already exists, updating..."
    git -C "$TOOLS_DIR/linkfinder" pull --ff-only
fi

cd "$TOOLS_DIR/linkfinder"
python3 -m venv venv
./venv/bin/pip install --upgrade pip setuptools
./venv/bin/pip install .
./venv/bin/pip install -r requirements.txt

echo "All tools have been installed successfully!"
echo "Go binaries are in: $GOPATH/bin"
