import importlib.util, json, os, shutil, subprocess, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={"python":([sys.executable,"--version"],"3.12"),"node":(["node","--version"],None),"npm":(["npm.cmd","--version"],None),"docker":([str(Path(os.environ.get("LOCALAPPDATA",""))/"Programs/DockerDesktop/resources/bin/docker.exe"),"--version"],None),"compose":([str(Path(os.environ.get("LOCALAPPDATA",""))/"Programs/DockerDesktop/resources/bin/docker.exe"),"compose","version"],None)}
failed=[]
for name,(cmd,expected) in checks.items():
 try:
  p=subprocess.run(cmd,capture_output=True,text=True,timeout=20)
  out=(p.stdout+p.stderr).strip()
 except Exception as e: out=str(e); p=None
 print(f"{name}: {out}")
 if p is None or p.returncode or (expected and expected not in out): failed.append(name)
for mod in ["pytest","pytest_cov","pytest_randomly","xdist","hypothesis","freezegun","ruff","mypy","bandit","pip_audit","playwright"]:
 ok=importlib.util.find_spec(mod) is not None
 print(f"python-module {mod}: {'available' if ok else 'missing'}")
 if not ok: failed.append(mod)
for exe in ["promtool","gitleaks","k6","websocat","toxiproxy-server"]:
 p=shutil.which(exe); print(f"tool {exe}: {p or 'missing'}")
 if not p: failed.append(exe)
for path in [root/".runtime"/"venv312",root/".runtime"/"cache"]:
 try: path.mkdir(parents=True,exist_ok=True); q=path/".write-check"; q.write_text("ok"); q.unlink(); ok=True
 except Exception: ok=False
 print(f"writable {path}: {ok}")
 if not ok: failed.append(str(path))
print("FAILED="+json.dumps(failed))
sys.exit(bool(failed))
