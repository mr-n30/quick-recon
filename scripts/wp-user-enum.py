import requests
import sys

def enumerate_users(base_url, output_file):
    base_url = base_url.rstrip("/")
    endpoint = f"{base_url}/wp-json/wp/v2/users"

    seen = set()

    with open(output_file, "w") as f:
        for page in range(1, 1001):  # 1–1000
            url = f"{endpoint}?per_page=100&page={page}"

            try:
                r = requests.get(url, timeout=10)
            except requests.RequestException as e:
                print(f"[!] Request failed on page {page}: {e}")
                continue

            if r.status_code != 200:
                print(f"[!] Stopping at page {page} (status: {r.status_code})")
                break

            data = r.json()

            if not data:
                print(f"[+] No more users found at page {page}. Stopping.")
                break

            print(f"[+] Page {page} - Found {len(data)} users")

            for user in data:
                username = user.get("slug")
                if username and username not in seen:
                    seen.add(username)
                    print(f"  -> {username}")
                    f.write(username + "\n")

    print(f"\n[+] Done. Total unique users: {len(seen)}")
    print(f"[+] Saved to: {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: python3 {sys.argv[0]} <target_url> <output_file>")
        print(f"Example: python3 {sys.argv[0]} https://example.com users.txt")
        sys.exit(1)

    target = sys.argv[1]
    output = sys.argv[2]

    enumerate_users(target, output)
