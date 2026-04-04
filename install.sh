#!/bin/bash
# This script install recon tools for your Bug Bounty Hunting / OSCP / CTF / etc. needs.
# This script is intended for Debian-based distributions (like Ubuntu).
# Author:
#   - mr-n30

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit
fi

# Update and upgrade the system
apt update && apt upgrade -y

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


# Tools installation directory
TOOLS_DIR="/opt/tools"

# Install recon tools
# You can add more tools to this list as needed
echo "Installing seclists..."
git clone --depth 1 https://github.com/danielmiessler/SecLists.git $TOOLS_DIR/seclists
echo "Creating symbolic link for seclists at /usr/share/seclists..."
ln -sf $TOOLS_DIR/seclists /usr/share/seclists

echo "Installing subfinder..."
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest > /dev/null 2>&1

echo "installing httpx..."
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest > /dev/null 2>&1

echo "Installing nuclei..."
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest > /dev/null 2>&1

echo "Installing ffuf..."
go install github.com/ffuf/ffuf/v2@latest > /dev/null 2>&1

echo "Installing waybackurls..."
go install github.com/tomnomnom/waybackurls@latest > /dev/null 2>&1

echo "Installing gau..."
go install github.com/lc/gau/v2/cmd/gau@latest > /dev/null 2>&1

echo "Installing hakrawler..."
go install github.com/hakluke/hakrawler@latest > /dev/null 2>&1

echo "Installing subjs..."
go install github.com/lc/subjs@latest > /dev/null 2>&1

echo "Installing jsleak..."
go install github.com/channyein1337/jsleak@latest > /dev/null 2>&1

echo "Installing linksfinder..."
git clone https://github.com/GerbenJavado/LinkFinder.git $TOOLS_DIR/linkfinder
cd $TOOLS_DIR/linkfinder
python3 -m venv venv
source venv/bin/activate
pip3 install setuptools
python3 setup.py install > /dev/null 2>&1
pip3 install -r requirements.txt > /dev/null 2>&1

echo "All tools have been installed successfully!"