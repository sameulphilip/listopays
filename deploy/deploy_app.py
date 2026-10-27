import os
import posixpath
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ["VPS_HOST"]
USER = os.environ.get("VPS_USER", "root")
PASSWORD = os.environ["VPS_PASS"]
REMOTE = "/var/www/listopays-console"
SKIP = {".next", "node_modules", ".git", "design-system", "tmp-checkout-debug"}


def ignored(path: Path) -> bool:
    parts = set(path.relative_to(ROOT).parts)
    return bool(parts & SKIP) or path.name == ".env.local"


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username=USER,
        password=PASSWORD,
        timeout=20,
        banner_timeout=20,
        auth_timeout=20,
        look_for_keys=False,
        allow_agent=False,
    )
    sftp = client.open_sftp()
    for path in ROOT.rglob("*"):
        if path.is_dir() or ignored(path):
            continue
        if path.suffix not in {".ts", ".tsx", ".css", ".json", ".svg", ".png", ".js", ".conf"} and path.name not in {
            "next.config.ts",
        }:
            if "src" not in path.parts and "public" not in path.parts:
                continue
        rel = path.relative_to(ROOT).as_posix()
        if not (
            rel.startswith("src/")
            or rel.startswith("public/")
            or rel in {
                "next.config.ts",
                "package.json",
                "tsconfig.json",
                "deploy/listopays-locations.conf",
            }
        ):
            continue
        remote = posixpath.join(REMOTE, rel)
        parent = posixpath.dirname(remote)
        try:
            sftp.stat(parent)
        except FileNotFoundError:
            current = ""
            for part in parent.strip("/").split("/"):
                current += f"/{part}"
                try:
                    sftp.stat(current)
                except FileNotFoundError:
                    sftp.mkdir(current)
        data = path.read_bytes()
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico"}:
            data = data.replace(b"\r\n", b"\n")
        with sftp.file(remote, "wb") as handle:
            handle.write(data)
        print("uploaded", rel, flush=True)
    sftp.close()
    stdin, stdout, stderr = client.exec_command(
        "cd /var/www/listopays-console && npm run build && pm2 restart listopays-console && cp /var/www/listopays-console/deploy/listopays-locations.conf /etc/nginx/snippets/listopays-locations.conf && nginx -t && systemctl reload nginx",
        get_pty=True,
    )
    for line in iter(stdout.readline, ""):
        print(line.encode("ascii", "replace").decode("ascii"), end="")
    code = stdout.channel.recv_exit_status()
    client.close()
    if code != 0:
        raise SystemExit(code)
    print("deployed", flush=True)


if __name__ == "__main__":
    main()
