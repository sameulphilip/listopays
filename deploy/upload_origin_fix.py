import os
import stat
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ["VPS_HOST"]
USER = os.environ.get("VPS_USER", "root")
PASSWORD = os.environ["VPS_PASS"]
REMOTE = "/var/www/listopays-console"

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
for rel in ("deploy/listopays-locations.conf", "deploy/apply_origin_fix.sh"):
    data = (ROOT / rel).read_bytes().replace(b"\r\n", b"\n")
    remote = f"{REMOTE}/{rel}"
    with sftp.file(remote, "wb") as handle:
        handle.write(data)
    print("uploaded", rel, flush=True)
sftp.chmod(f"{REMOTE}/deploy/apply_origin_fix.sh", stat.S_IRWXU)
sftp.close()
stdin, stdout, stderr = client.exec_command(
    f"bash {REMOTE}/deploy/apply_origin_fix.sh",
    get_pty=True,
)
for line in iter(stdout.readline, ""):
    print(line.encode("ascii", "replace").decode("ascii"), end="")
code = stdout.channel.recv_exit_status()
client.close()
if code != 0:
    raise SystemExit(code)
