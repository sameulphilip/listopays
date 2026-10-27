import os
import paramiko

HOST = os.environ["VPS_HOST"]
USER = os.environ.get("VPS_USER", "root")
PASSWORD = os.environ["VPS_PASS"]
CMD = os.environ.get("VPS_CMD", "bash /var/www/listopays-console/deploy/remote.sh")

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
stdin, stdout, stderr = client.exec_command(CMD, get_pty=True)
for line in iter(stdout.readline, ""):
    print(line.encode("ascii", "replace").decode("ascii"), end="")
code = stdout.channel.recv_exit_status()
print("exit", code)
client.close()
if code != 0:
    raise SystemExit(code)
