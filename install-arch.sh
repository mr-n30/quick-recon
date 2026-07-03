#!/usr/bin/env bash
# Install QuickRecon prerequisites on Arch Linux and Arch-based distributions.

set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    echo "Please run as root: sudo ./install-arch.sh" >&2
    exit 1
fi

if [[ ! -f /etc/arch-release ]] || ! command -v pacman >/dev/null 2>&1; then
    echo "This installer requires Arch Linux or an Arch-based distribution with pacman." >&2
    exit 1
fi

TOOLS_DIR="/opt/tools"
SECLISTS_DIR="$TOOLS_DIR/seclists"
LINKFINDER_DIR="$TOOLS_DIR/linkfinder"

install -d "$TOOLS_DIR" /usr/share /usr/local/bin

echo "Updating Arch Linux and installing system dependencies..."
pacman -Syu --needed --noconfirm \
    base-devel \
    git \
    curl \
    wget \
    unzip \
    python \
    python-pip \
    go \
    nmap

if [[ ! -d "$SECLISTS_DIR/.git" ]]; then
    echo "Installing SecLists..."
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$SECLISTS_DIR"
else
    echo "Updating SecLists..."
    git -C "$SECLISTS_DIR" pull --ff-only
fi

ln -sfn "$SECLISTS_DIR" /usr/share/seclists

# Install Go binaries system-wide so the web backend can find them without
# depending on a specific user's GOPATH.
export GOBIN="/usr/local/bin"

install_go_tool() {
    local name="$1"
    local module="$2"
    echo "Installing $name..."
    go install -v "$module"
}

install_go_tool subfinder github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
install_go_tool httpx github.com/projectdiscovery/httpx/cmd/httpx@latest
install_go_tool nuclei github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
install_go_tool ffuf github.com/ffuf/ffuf/v2@latest
install_go_tool waybackurls github.com/tomnomnom/waybackurls@latest
install_go_tool gau github.com/lc/gau/v2/cmd/gau@latest
install_go_tool hakrawler github.com/hakluke/hakrawler@latest
install_go_tool subjs github.com/lc/subjs@latest
install_go_tool jsleak github.com/channyein1337/jsleak@latest

if [[ ! -d "$LINKFINDER_DIR/.git" ]]; then
    echo "Installing LinkFinder..."
    git clone https://github.com/GerbenJavado/LinkFinder.git "$LINKFINDER_DIR"
else
    echo "Updating LinkFinder..."
    git -C "$LINKFINDER_DIR" pull --ff-only
fi

python -m venv "$LINKFINDER_DIR/venv"
"$LINKFINDER_DIR/venv/bin/pip" install --upgrade pip setuptools
"$LINKFINDER_DIR/venv/bin/pip" install "$LINKFINDER_DIR"
"$LINKFINDER_DIR/venv/bin/pip" install -r "$LINKFINDER_DIR/requirements.txt"

echo "All QuickRecon tools were installed successfully."
echo "Go binaries: /usr/local/bin"
echo "SecLists: /usr/share/seclists"
echo "LinkFinder: $LINKFINDER_DIR"
