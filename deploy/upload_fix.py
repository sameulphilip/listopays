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

FILES = [
    "src/app/p/[token]/page.tsx",
    "next.config.ts",
    "deploy/nginx.conf",
    "deploy/remote.sh",
    "deploy/listopays-locations.conf",
    "deploy/apply_checkout_fix.sh",
]


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
    for rel in FILES:
        local = ROOT / rel
        remote_path = posixpath.join(REMOTE, rel.replace("\\", "/"))
        parent = posixpath.dirname(remote_path)
        try:
            sftp.stat(parent)
        except FileNotFoundError:
            sftp.mkdir(parent)
        data = local.read_bytes().replace(b"\r\n", b"\n")
        with sftp.file(remote_path, "wb") as handle:
            handle.write(data)
        print(f"uploaded {rel}", flush=True)
    sftp.chmod(f"{REMOTE}/deploy/apply_checkout_fix.sh", stat.S_IRWXU)
    sftp.chmod(f"{REMOTE}/deploy/remote.sh", stat.S_IRWXU)
    sftp.close()
    stdin, stdout, stderr = client.exec_command(
        f"bash {REMOTE}/deploy/apply_checkout_fix.sh",
        get_pty=True,
    )
    for line in iter(stdout.readline, ""):
        print(line.encode("ascii", "replace").decode("ascii"), end="")
    code = stdout.channel.recv_exit_status()
    client.close()
    if code != 0:
        raise SystemExit(code)
    print("checkout fix applied", flush=True)


if __name__ == "__main__":
    main()
