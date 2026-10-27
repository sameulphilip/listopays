import os
import posixpath
import stat
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
import getpass

HOST = os.environ.get("VPS_HOST") or input("VPS host (IP): ").strip()
USER = os.environ.get("VPS_USER", "root")
PASSWORD = os.environ.get("VPS_PASS") or getpass.getpass(f"Password for {USER}@{HOST}: ")
REMOTE = "/var/www/listopays-console"

FILES = [
    "src/lib/payment-status.ts",
    "src/components/checkout-frame.tsx",
    "src/components/ui.tsx",
    "public/brand/checkout.js",
    "deploy/listopays-locations.conf",
    "deploy/apply_checkout_fix.sh",
]


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"connecting {USER}@{HOST}", flush=True)
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
    print("payment status fix deployed", flush=True)


if __name__ == "__main__":
    main()
