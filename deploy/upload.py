import os
import posixpath
import stat
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ["VPS_HOST"]
USER = os.environ.get("VPS_USER", "root")
PASSWORD = os.environ["VPS_PASS"]
REMOTE = "/var/www/listopays-console"

SKIP_DIRS = {".next", "node_modules", ".git", "design-system", "deploy"}
SKIP_FILES = {".env.local"}


def ignored(path: Path) -> bool:
    parts = set(path.relative_to(ROOT).parts)
    if parts & SKIP_DIRS:
        return True
    if path.name in SKIP_FILES:
        return True
    return False


def ensure_dir(sftp, remote_dir: str) -> None:
    current = ""
    for part in remote_dir.strip("/").split("/"):
        current = f"{current}/{part}"
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def main() -> None:
    print(f"connecting {USER}@{HOST}", flush=True)
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
    print("ssh connected", flush=True)
    sftp = client.open_sftp()
    ensure_dir(sftp, REMOTE)
    ensure_dir(sftp, f"{REMOTE}/deploy")

    for path in ROOT.rglob("*"):
        if path.is_dir() or ignored(path):
            continue
        rel = path.relative_to(ROOT).as_posix()
        remote_path = posixpath.join(REMOTE, rel)
        ensure_dir(sftp, posixpath.dirname(remote_path))
        if path.suffix in {".sh", ".conf"} or path.name.endswith(".sh"):
            data = path.read_bytes().replace(b"\r\n", b"\n")
            with sftp.file(remote_path, "wb") as handle:
                handle.write(data)
        else:
            sftp.put(str(path), remote_path)
        print(f"uploaded {rel}", flush=True)

    for name in ("nginx.conf", "remote.sh", "listopays-locations.conf"):
        local = ROOT / "deploy" / name
        data = local.read_bytes().replace(b"\r\n", b"\n")
        remote_path = f"{REMOTE}/deploy/{name}"
        with sftp.file(remote_path, "wb") as handle:
            handle.write(data)
        print(f"uploaded deploy/{name}", flush=True)
    sftp.chmod(f"{REMOTE}/deploy/remote.sh", stat.S_IRWXU)

    env = (ROOT / ".env.local").read_text(encoding="utf-8").replace("\r\n", "\n")
    with sftp.file(f"{REMOTE}/.env.local", "w") as handle:
        handle.write(env)

    stdin, stdout, stderr = client.exec_command(f"bash {REMOTE}/deploy/remote.sh", get_pty=True)
    for line in iter(stdout.readline, ""):
        print(line.encode("ascii", "replace").decode("ascii"), end="")
    code = stdout.channel.recv_exit_status()
    err = stderr.read().decode("utf-8", "replace")
    if err:
        print(err)
    sftp.close()
    client.close()
    if code != 0:
        raise SystemExit(f"remote setup failed with exit {code}")
    print("deploy complete")


if __name__ == "__main__":
    main()
