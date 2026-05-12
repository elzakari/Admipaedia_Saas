import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "frontend" / "src"
EXTS = {".ts", ".tsx", ".js", ".jsx"}


RE_FROM = re.compile(r"\bfrom\s+(['\"])(?P<spec>[^'\"]+)\1")
RE_REQ = re.compile(r"\brequire\(\s*(['\"])(?P<spec>[^'\"]+)\1\s*\)")


def add_spec(packages: set[str], spec: str) -> None:
    if not spec:
        return
    if spec.startswith((".", "/", "@/", "~", "#")):
        return
    if spec.startswith(("node:", "virtual:", "vite:")):
        return

    parts = spec.split("/")
    name = parts[0]
    if name.startswith("@") and len(parts) >= 2:
        name = "/".join(parts[:2])
    packages.add(name)


def main() -> None:
    packages: set[str] = set()
    for dirpath, _, filenames in os.walk(ROOT):
        for filename in filenames:
            p = Path(dirpath) / filename
            if p.suffix not in EXTS:
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except Exception:
                continue
            for m in RE_FROM.finditer(text):
                add_spec(packages, m.group("spec"))
            for m in RE_REQ.finditer(text):
                add_spec(packages, m.group("spec"))

    for name in sorted(packages):
        print(name)


if __name__ == "__main__":
    main()

