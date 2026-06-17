"""
run_all.py

Master script that runs all parsers in the correct order.

Usage:
    python run_all.py --zephyr-base "D:/Projects/zephyr_project/external/zephyr"

Output files produced in data/json/:
    bindings.json    ← from bindings_parser.py
    boards.json      ← from board_parser.py
"""

import sys
import argparse
import subprocess
from pathlib import Path

SCRIPTS = [
    ("Bindings parser",  "parser/parsers/bindings_parser.py", "data/json/bindings.json"),
    ("Board parser",     "parser/parsers/board_parser.py",    "data/json/boards.json"),
]


def run_script(label: str, script: str, output: str, zephyr_base: str) -> bool:
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")

    cmd = [
        sys.executable, script,
        "--zephyr-base", zephyr_base,
        "--output", output,
    ]
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"\n[ERROR] {label} failed!")
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Run all Zephyr metadata parsers")
    parser.add_argument(
        "--zephyr-base",
        required=True,
        help='Path to Zephyr root e.g. "D:/Projects/zephyr_project/external/zephyr"',
    )
    args = parser.parse_args()

    print(f"\nZEPHYR_BASE: {args.zephyr_base}\n")

    for label, script, output in SCRIPTS:
        ok = run_script(label, script, output, args.zephyr_base)
        if not ok:
            print("Stopping due to error.")
            sys.exit(1)

    print(f"\n{'='*60}")
    print("  All parsers completed successfully!")
    print(f"{'='*60}")
    print("\nFiles written:")
    for _, _, output in SCRIPTS:
        p = Path(output)
        if p.exists():
            size_kb = p.stat().st_size // 1024
            print(f"  {output:<35} {size_kb} KB")

    print("\nNext step: start the backend server")
    print("  cd backend && uvicorn main:app --reload")


if __name__ == "__main__":
    main()
