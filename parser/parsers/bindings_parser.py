"""
bindings_parser.py

Walks through $ZEPHYR_BASE/dts/bindings/ and extracts all peripheral
binding info into a structured list of dicts, ready for JSON export or
SQLite insert.

Usage:
    python bindings_parser.py --zephyr-base "D:/Projects/zephyr_project/external/zephyr"

Output:
    Prints a summary and writes data/json/bindings.json
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


# ---------------------------------------------------------------------------
# Peripheral category detection
# Maps folder names inside dts/bindings/ to friendly category names
# ---------------------------------------------------------------------------
CATEGORY_MAP = {
    "gpio":       "GPIO",
    "pwm":        "PWM",
    "serial":     "UART",
    "spi":        "SPI",
    "i2c":        "I2C",
    "adc":        "ADC",
    "dac":        "DAC",
    "can":        "CAN",
    "usb":        "USB",
    "ethernet":   "Ethernet",
    "flash":      "Flash",
    "watchdog":   "Watchdog",
    "sensor":     "Sensor",
    "bluetooth":  "BLE",
    "pinctrl":    "PinCtrl",
    "clock":      "Clock",
    "timer":      "Timer",
    "dma":        "DMA",
    "display":    "Display",
    "led":        "LED",
    "input":      "Input",
    "interrupt":  "Interrupt",
    "power":      "Power",
    "rtc":        "RTC",
    "memory":     "Memory",
    "mdio":       "MDIO",
    "audio":      "Audio",
    "video":      "Video",
    "wifi":       "WiFi",
    "ieee802154": "IEEE 802.15.4",
    "kscan":      "Key Scan",
    "ipm":        "IPM",
    "mbox":       "Mailbox",
    "misc":       "Misc",
    "net":        "Networking",
    "mtd":        "MTD / Flash",
    "regulator":  "Regulator",
    "reserved":   "Reserved",
    "cpu":        "CPU",
}


def detect_category(yaml_path: Path) -> str:
    """Detect category from folder structure, e.g. dts/bindings/pwm/ → 'PWM'"""
    parts = yaml_path.parts
    try:
        bindings_idx = next(i for i, p in enumerate(parts) if p == "bindings")
        folder = parts[bindings_idx + 1] if bindings_idx + 1 < len(parts) else "misc"
        return CATEGORY_MAP.get(folder.lower(), folder.capitalize())
    except StopIteration:
        return "Unknown"


def detect_vendor(compatible: str) -> str:
    """Extract vendor from compatible string e.g. 'espressif,esp32-gpio' → 'espressif'"""
    if compatible and "," in compatible:
        return compatible.split(",")[0].strip()
    return "generic"


def detect_soc_family(compatible: str) -> list[str]:
    """
    Try to detect which SoC family a binding applies to.
    e.g. 'espressif,esp32s3-ledc' → ['esp32s3', 'esp32']
         'nordic,nrf-gpio'        → ['nrf']
         'st,stm32-uart'          → ['stm32']
    """
    if not compatible or "," not in compatible:
        return []

    device_part = compatible.split(",")[1].lower()   # e.g. "esp32s3-ledc"
    soc_hints = []

    # Common patterns
    patterns = [
        "esp32s3", "esp32s2", "esp32c3", "esp32c6", "esp32h2", "esp32",
        "nrf9160", "nrf5340", "nrf52840", "nrf52833", "nrf52", "nrf",
        "stm32h7", "stm32f4", "stm32l4", "stm32g0", "stm32",
        "rp2040",
        "imxrt",
        "lpc",
        "sam",
        "pic32",
        "cc13", "cc26", "cc32",
        "gd32",
        "mimxrt",
    ]
    for pat in patterns:
        if pat in device_part:
            soc_hints.append(pat)
            break   # take most specific match only

    return soc_hints


def parse_properties(raw_props: dict) -> list[dict]:
    """
    Convert the raw YAML 'properties' dict into a clean list of property objects.

    Each property looks like:
      {
        "name": "pinctrl-0",
        "type": "phandles",
        "description": "...",
        "required": true,
        "default": null,
        "enum": null
      }
    """
    if not raw_props or not isinstance(raw_props, dict):
        return []

    result = []
    for prop_name, prop_def in raw_props.items():
        if not isinstance(prop_def, dict):
            # Some bindings have shorthand like `reg: true` — skip
            continue

        entry = {
            "name":        prop_name,
            "type":        prop_def.get("type", "unknown"),
            "description": prop_def.get("description", ""),
            "required":    prop_def.get("required", False),
            "default":     prop_def.get("default", None),
            "enum":        prop_def.get("enum", None),
            "const":       prop_def.get("const", None),
        }
        result.append(entry)

    return result


def parse_single_binding(yaml_path: Path, zephyr_base: Path) -> dict | None:
    """
    Parse one .yaml binding file and return a structured dict.
    Returns None if the file is not a real binding (e.g. base includes).
    """
    try:
        with open(yaml_path, "r", encoding="utf-8", errors="replace") as f:
            data = yaml.safe_load(f)
    except Exception as e:
        print(f"  [WARN] Could not parse {yaml_path.name}: {e}")
        return None

    if not isinstance(data, dict):
        return None

    # A binding must have either 'compatible' or 'description' to be useful
    compatible = data.get("compatible", "")
    description = data.get("description", "")

    if not compatible and not description:
        return None

    # Relative path from zephyr_base for display
    try:
        rel_path = str(yaml_path.relative_to(zephyr_base)).replace("\\", "/")
    except ValueError:
        rel_path = str(yaml_path)

    category   = detect_category(yaml_path)
    vendor     = detect_vendor(compatible)
    soc_family = detect_soc_family(compatible)
    properties = parse_properties(data.get("properties", {}))

    # include: can be a string or a list
    raw_include = data.get("include", [])
    if isinstance(raw_include, str):
        includes = [raw_include]
    elif isinstance(raw_include, list):
        includes = []
        for item in raw_include:
            if isinstance(item, str):
                includes.append(item)
            elif isinstance(item, dict) and "name" in item:
                includes.append(item["name"])
    else:
        includes = []

    return {
        "compatible":   compatible,
        "title":        description.split("\n")[0].strip() if description else compatible,
        "description":  description.strip() if description else "",
        "category":     category,
        "vendor":       vendor,
        "soc_family":   soc_family,
        "bus":          data.get("bus", ""),
        "on_bus":       data.get("on-bus", ""),
        "properties":   properties,
        "includes":     includes,
        "child_binding": True if "child-binding" in data else False,
        "source_file":  rel_path,
    }


def parse_all_bindings(zephyr_base: Path) -> list[dict]:
    """
    Walk dts/bindings/ recursively and parse every .yaml file.
    Returns a list of binding dicts (None results are filtered out).
    """
    bindings_dir = zephyr_base / "dts" / "bindings"

    if not bindings_dir.exists():
        print(f"ERROR: Cannot find {bindings_dir}")
        print(f"       Check that ZEPHYR_BASE is correct: {zephyr_base}")
        sys.exit(1)

    yaml_files = list(bindings_dir.rglob("*.yaml"))
    total = len(yaml_files)
    print(f"Found {total} YAML files in {bindings_dir}")

    results = []
    skipped = 0

    for i, yaml_path in enumerate(sorted(yaml_files)):
        if i % 100 == 0:
            print(f"  Parsing {i}/{total}...", end="\r")

        binding = parse_single_binding(yaml_path, zephyr_base)
        if binding is None:
            skipped += 1
            continue
        results.append(binding)

    print(f"\nParsed:  {len(results)} bindings")
    print(f"Skipped: {skipped} (base/include-only files)")
    return results


def print_summary(bindings: list[dict]) -> None:
    """Print a breakdown by category so you can verify the output looks right."""
    from collections import Counter

    print("\n--- Category breakdown ---")
    cats = Counter(b["category"] for b in bindings)
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:<20} {count}")

    print("\n--- Vendor breakdown (top 15) ---")
    vendors = Counter(b["vendor"] for b in bindings if b["vendor"] != "generic")
    for vendor, count in vendors.most_common(15):
        print(f"  {vendor:<25} {count}")

    print("\n--- Sample: first PWM binding found ---")
    pwm = next((b for b in bindings if b["category"] == "PWM"), None)
    if pwm:
        print(f"  compatible  : {pwm['compatible']}")
        print(f"  title       : {pwm['title'][:60]}")
        print(f"  vendor      : {pwm['vendor']}")
        print(f"  soc_family  : {pwm['soc_family']}")
        print(f"  bus         : {pwm['bus']}")
        print(f"  properties  : {len(pwm['properties'])} defined")
        for p in pwm["properties"][:4]:
            req = " [required]" if p["required"] else ""
            print(f"    - {p['name']} ({p['type']}){req}")

    print("\n--- Sample: ESP32 bindings ---")
    esp = [b for b in bindings if "espressif" in b.get("vendor", "")]
    print(f"  Found {len(esp)} espressif bindings")
    for b in esp[:6]:
        print(f"    {b['compatible']:<45} [{b['category']}]")


def save_json(bindings: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(bindings, f, indent=2, ensure_ascii=False)
    size_kb = output_path.stat().st_size // 1024
    print(f"\nSaved → {output_path}  ({size_kb} KB, {len(bindings)} entries)")


def main():
    parser = argparse.ArgumentParser(description="Parse Zephyr DTS bindings to JSON")
    parser.add_argument(
        "--zephyr-base",
        required=True,
        help='Path to Zephyr root, e.g. "D:/Projects/zephyr_project/external/zephyr"',
    )
    parser.add_argument(
        "--output",
        default="data/json/bindings.json",
        help="Output JSON file path (default: data/json/bindings.json)",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        default=True,
        help="Print summary after parsing (default: true)",
    )
    args = parser.parse_args()

    zephyr_base = Path(args.zephyr_base)
    if not zephyr_base.exists():
        print(f"ERROR: Path does not exist: {zephyr_base}")
        sys.exit(1)

    print(f"ZEPHYR_BASE : {zephyr_base}")
    print(f"Output      : {args.output}")
    print()

    bindings = parse_all_bindings(zephyr_base)

    if args.summary:
        print_summary(bindings)

    save_json(bindings, Path(args.output))
    print("\nDone! Next step: run board_parser.py")


if __name__ == "__main__":
    main()
