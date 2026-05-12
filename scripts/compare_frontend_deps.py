import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def main() -> None:
    imports_file = ROOT / ".tmp_frontend_imports.txt"
    raw = imports_file.read_text(encoding="utf-8-sig")
    imports = [l.strip().lstrip("\ufeff") for l in raw.splitlines() if l.strip()]

    pkg = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
    declared = set()
    for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        declared |= set((pkg.get(section) or {}).keys())

    local_alias_prefixes = ("@/", "@components", "@pages", "@utils", "@hooks", "@services", "@types")
    ignore_exact = {"perf_hooks", "access_token"}

    missing = []
    for name in imports:
        if name.startswith(local_alias_prefixes):
            continue
        if name in ignore_exact:
            continue
        if name not in declared:
            missing.append(name)

    print("\n".join(sorted(missing)))


if __name__ == "__main__":
    main()
