"""
board_parser.py

Walks through $ZEPHYR_BASE/boards/ and extracts all board definitions
into a structured list, ready for JSON export or SQLite insert.

Usage:
    python board_parser.py --zephyr-base "D:/Projects/zephyr_project/external/zephyr"
"""

import os
import sys
import json
import argparse
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed. Run:  pip install pyyaml")
    sys.exit(1)


# Known arch folder names in Zephyr boards/
ARCH_MAP = {
    "arm":    "ARM",
    "arm64":  "ARM64",
    "x86":    "x86",
    "riscv":  "RISC-V",
    "arc":    "ARC",
    "xtensa": "Xtensa",
    "mips":   "MIPS",
    "posix":  "POSIX",
    "nios2":  "Nios II",
    "sparc":  "SPARC",
}

# Vendor hint from board folder / yaml
VENDOR_MAP = {
    "espressif": "Espressif",
    "nordic":    "Nordic Semiconductor",
    "st":        "STMicroelectronics",
    "nxp":       "NXP",
    "microchip": "Microchip",
    "raspberrypi": "Raspberry Pi",
    "ti":        "Texas Instruments",
    "silabs":    "Silicon Labs",
    "renesas":   "Renesas",
    "intel":     "Intel",
    "arduino":   "Arduino",
    "adafruit":  "Adafruit",
    "seeed":     "Seeed Studio",
    "sparkfun":  "SparkFun",
}


def detect_arch(board_path: Path) -> str:
    """Detect architecture from path: boards/arm/board_name/ → ARM"""
    parts = board_path.parts
    try:
        boards_idx = next(i for i, p in enumerate(parts) if p == "boards")
        arch_folder = parts[boards_idx + 1] if boards_idx + 1 < len(parts) else "unknown"
        return ARCH_MAP.get(arch_folder.lower(), arch_folder)
    except StopIteration:
        return "Unknown"


def detect_vendor_from_name(board_name: str) -> str:
    """Guess vendor from board name string"""
    name_lower = board_name.lower()
    for key, friendly in VENDOR_MAP.items():
        if key in name_lower:
            return friendly
    return "Unknown"


def parse_board_yaml(yaml_path: Path, zephyr_base: Path) -> list[dict]:
    """
    Parse a board .yaml file.
    Newer Zephyr boards use a board.yml with 'board:' key.
    Older ones just have flat fields.
    Returns a list because some board.yml files define multiple variants.
    """
    try:
        with open(yaml_path, "r", encoding="utf-8", errors="replace") as f:
            data = yaml.safe_load(f)
    except Exception as e:
        print(f"  [WARN] Could not parse {yaml_path.name}: {e}")
        return []

    if not isinstance(data, dict):
        return []

    try:
        rel_path = str(yaml_path.relative_to(zephyr_base)).replace("\\", "/")
    except ValueError:
        rel_path = str(yaml_path)

    arch = detect_arch(yaml_path)
    results = []

    # ---- New format: board.yml with 'board:' top-level key ----
    if "board" in data:
        board_section = data["board"]
        if not isinstance(board_section, dict):
            return []

        name    = board_section.get("name", yaml_path.parent.name)
        full_name = board_section.get("full_name", name)
        vendor  = board_section.get("vendor", detect_vendor_from_name(name))
        # Friendly vendor name
        vendor_friendly = VENDOR_MAP.get(vendor.lower(), vendor)

        # socs: can be a list of {name: ..., variants: [...]}
        socs_raw = board_section.get("socs", [])
        if isinstance(socs_raw, list):
            for soc_entry in socs_raw:
                if isinstance(soc_entry, dict):
                    soc_name = soc_entry.get("name", "")
                elif isinstance(soc_entry, str):
                    soc_name = soc_entry
                else:
                    continue

                results.append({
                    "name":        name,
                    "full_name":   full_name,
                    "soc":         soc_name,
                    "arch":        arch,
                    "vendor":      vendor_friendly,
                    "supported_features": board_section.get("supported", []) or [],
                    "yaml_path":   rel_path,
                })
        else:
            # No socs list — just use the board name itself
            results.append({
                "name":        name,
                "full_name":   full_name,
                "soc":         "",
                "arch":        arch,
                "vendor":      vendor_friendly,
                "supported_features": [],
                "yaml_path":   rel_path,
            })

    # ---- Old format: flat YAML with 'identifier', 'name', 'type' ----
    elif "identifier" in data or "name" in data:
        name     = data.get("identifier", yaml_path.parent.name)
        full_name = data.get("name", name)
        vendor   = detect_vendor_from_name(name)

        results.append({
            "name":        name,
            "full_name":   full_name,
            "soc":         data.get("soc", ""),
            "arch":        arch,
            "vendor":      vendor,
            "supported_features": data.get("supported", []) or [],
            "yaml_path":   rel_path,
        })

    return results


def parse_all_boards(zephyr_base: Path) -> list[dict]:
    """Walk boards/ directory and parse every board YAML."""
    boards_dir = zephyr_base / "boards"

    if not boards_dir.exists():
        print(f"ERROR: Cannot find {boards_dir}")
        sys.exit(1)

    # Look for board.yml (new format) and *.yaml (old format board descriptors)
    yaml_files = (
        list(boards_dir.rglob("board.yml")) +
        list(boards_dir.rglob("board.yaml"))
    )

    # Fallback: some boards only have <boardname>.yaml at their folder level
    if not yaml_files:
        yaml_files = [
            f for f in boards_dir.rglob("*.yaml")
            if f.stem == f.parent.name   # filename matches folder name
        ]

    total = len(yaml_files)
    print(f"Found {total} board YAML files in {boards_dir}")

    results = []
    for i, yaml_path in enumerate(sorted(yaml_files)):
        if i % 50 == 0:
            print(f"  Parsing {i}/{total}...", end="\r")

        boards = parse_board_yaml(yaml_path, zephyr_base)
        results.extend(boards)

    # Deduplicate by (name, soc)
    seen = set()
    deduped = []
    for b in results:
        key = (b["name"], b["soc"])
        if key not in seen:
            seen.add(key)
            deduped.append(b)

    print(f"\nParsed:  {len(deduped)} boards (from {total} files)")
    return deduped


def print_summary(boards: list[dict]) -> None:
    from collections import Counter

    print("\n--- Architecture breakdown ---")
    archs = Counter(b["arch"] for b in boards)
    for arch, count in sorted(archs.items(), key=lambda x: -x[1]):
        print(f"  {arch:<15} {count}")

    print("\n--- Vendor breakdown (top 10) ---")
    vendors = Counter(b["vendor"] for b in boards if b["vendor"] != "Unknown")
    for vendor, count in vendors.most_common(10):
        print(f"  {vendor:<30} {count}")

    print("\n--- Sample: ESP32-S3 boards ---")
    esp32s3 = [b for b in boards if "esp32s3" in b.get("soc", "").lower()
                                  or "esp32s3" in b.get("name", "").lower()]
    print(f"  Found {len(esp32s3)} ESP32-S3 boards")
    for b in esp32s3[:8]:
        print(f"    {b['name']:<40} soc: {b['soc']}")


def save_json(boards: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(boards, f, indent=2, ensure_ascii=False)
    size_kb = output_path.stat().st_size // 1024
    print(f"\nSaved → {output_path}  ({size_kb} KB, {len(boards)} entries)")


def main():
    parser = argparse.ArgumentParser(description="Parse Zephyr board definitions to JSON")
    parser.add_argument("--zephyr-base", required=True)
    parser.add_argument("--output", default="data/json/boards.json")
    args = parser.parse_args()

    zephyr_base = Path(args.zephyr_base)
    if not zephyr_base.exists():
        print(f"ERROR: Path does not exist: {zephyr_base}")
        sys.exit(1)

    print(f"ZEPHYR_BASE : {zephyr_base}")
    print(f"Output      : {args.output}")
    print()

    boards = parse_all_boards(zephyr_base)
    print_summary(boards)
    save_json(boards, Path(args.output))
    print("\nDone! Next step: run soc_parser.py")


if __name__ == "__main__":
    main()
