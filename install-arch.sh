#!/usr/bin/env bash
# Install QuickRecon prerequisites on Arch Linux and Arch-based distributions.

set -euo pipefail

usage() {
    cat <<'EOF'
Usage: sudo ./install-arch.sh [--source auto|blackarch|go]

  --source auto       Use BlackArch packages when available, then fall back to upstream installs
  --source blackarch  Require the BlackArch repository and prefer its packages (default)
  --source go         Install recon tools directly from their upstream Go modules
  -h, --help          Show this help
EOF
}

SOURCE="blackarch"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source)
            [[ $# -ge 2 ]] || { echo "Missing value for --source" >&2; usage >&2; exit 2; }
            SOURCE="$2"
            shift 2
            ;;
        --source=*)
            SOURCE="${1#*=}"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

case "$SOURCE" in
    auto|blackarch|go) ;;
    *)
        echo "Invalid source '$SOURCE'; expected auto, blackarch, or go." >&2
        exit 2
        ;;
esac

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

blackarch_package_available() {
    pacman -Si "blackarch/$1" >/dev/null 2>&1
}

if [[ "$SOURCE" == "blackarch" ]] && ! blackarch_package_available seclists; then
    echo "The BlackArch repository is not configured or is unavailable." >&2
    echo "Configure it first, or use --source auto or --source go." >&2
    exit 1
fi

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

if [[ "$SOURCE" != "go" ]] && blackarch_package_available seclists; then
    echo "Installing SecLists from BlackArch..."
    pacman -S --needed --noconfirm blackarch/seclists
else
    if [[ ! -d "$SECLISTS_DIR/.git" ]]; then
        echo "Installing SecLists from upstream..."
        git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$SECLISTS_DIR"
    else
        echo "Updating SecLists from upstream..."
        git -C "$SECLISTS_DIR" pull --ff-only
    fi

    ln -sfn "$SECLISTS_DIR" /usr/share/seclists
fi

# Install Go binaries system-wide so the web backend can find them without
# depending on a specific user's GOPATH.
export GOBIN="/usr/local/bin"

install_go_tool() {
    local name="$1"
    local module="$2"
    echo "Installing $name..."
    go install -v "$module"
}

install_recon_tool() {
    local name="$1"
    local module="$2"

    if [[ "$SOURCE" != "go" ]] && blackarch_package_available "$name"; then
        echo "Installing $name from BlackArch..."
        pacman -S --needed --noconfirm "blackarch/$name"
    else
        if [[ "$SOURCE" == "blackarch" ]]; then
            echo "$name is not packaged by BlackArch; using the upstream Go module."
        fi
        install_go_tool "$name" "$module"
    fi
}

install_recon_tool subfinder github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
install_recon_tool httpx github.com/projectdiscovery/httpx/cmd/httpx@latest
install_recon_tool nuclei github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
install_recon_tool ffuf github.com/ffuf/ffuf/v2@latest
install_recon_tool waybackurls github.com/tomnomnom/waybackurls@latest
install_recon_tool gau github.com/lc/gau/v2/cmd/gau@latest
install_recon_tool hakrawler github.com/hakluke/hakrawler@latest
install_recon_tool subjs github.com/lc/subjs@latest
install_recon_tool jsleak github.com/channyein1337/jsleak@latest

if [[ "$SOURCE" != "go" ]] && blackarch_package_available linkfinder; then
    echo "Installing LinkFinder from BlackArch..."
    pacman -S --needed --noconfirm blackarch/linkfinder
else
    if [[ ! -d "$LINKFINDER_DIR/.git" ]]; then
        echo "Installing LinkFinder from upstream..."
        git clone https://github.com/GerbenJavado/LinkFinder.git "$LINKFINDER_DIR"
    else
        echo "Updating LinkFinder from upstream..."
        git -C "$LINKFINDER_DIR" pull --ff-only
    fi

    python -m venv "$LINKFINDER_DIR/venv"
    "$LINKFINDER_DIR/venv/bin/pip" install --upgrade pip setuptools
    "$LINKFINDER_DIR/venv/bin/pip" install "$LINKFINDER_DIR"
    "$LINKFINDER_DIR/venv/bin/pip" install -r "$LINKFINDER_DIR/requirements.txt"
fi

echo "Verifying installed tools..."
required_commands=(subfinder nuclei ffuf waybackurls gau hakrawler subjs jsleak)
for command_name in "${required_commands[@]}"; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Installation failed: $command_name is not available on PATH." >&2
        exit 1
    fi
done

# BlackArch renames ProjectDiscovery HTTPX to avoid conflicting with
# python-httpx. The scan runner supports both binary names.
if ! command -v httpx >/dev/null 2>&1 && ! command -v httpx-pd >/dev/null 2>&1; then
    echo "Installation failed: neither httpx nor httpx-pd is available on PATH." >&2
    exit 1
fi

if ! command -v linkfinder >/dev/null 2>&1 && [[ ! -f "$LINKFINDER_DIR/linkfinder.py" ]]; then
    echo "Installation failed: LinkFinder was not found." >&2
    exit 1
fi

if [[ ! -d /usr/share/seclists ]]; then
    echo "Installation failed: SecLists was not found at /usr/share/seclists." >&2
    exit 1
fi

echo "All QuickRecon tools were installed successfully."
echo "Requested source: $SOURCE"
echo "Go binaries: /usr/local/bin"
echo "SecLists: /usr/share/seclists"
if command -v linkfinder >/dev/null 2>&1; then
    echo "LinkFinder: $(command -v linkfinder)"
else
    echo "LinkFinder: $LINKFINDER_DIR"
fi
