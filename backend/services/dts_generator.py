"""
services/dts_generator.py

Mode A: Auto-generate a DTS overlay given peripheral + SoC + board.

The generator:
1. Finds the best-matching binding for (peripheral, soc)
2. Builds a DTS overlay template with all required properties
3. Adds pinctrl stub if needed
4. Returns the overlay + Kconfig hints + explanation
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.datastore import DataStore


# Properties we know how to fill with sensible defaults per peripheral
PROP_DEFAULTS: dict[str, dict[str, str]] = {
    "status": '"okay"',
    "pinctrl-0": "<&{node}_default>",
    "pinctrl-names": '"default"',
    "#pwm-cells": "<3>",
    "#gpio-cells": "<2>",
    "#address-cells": "<1>",
    "#size-cells": "<0>",
}

# Per-peripheral Kconfig symbols to enable
KCONFIG_MAP: dict[str, list[str]] = {
    "PWM":      ["CONFIG_PWM=y"],
    "GPIO":     ["CONFIG_GPIO=y"],
    "UART":     ["CONFIG_SERIAL=y", "CONFIG_UART_INTERRUPT_DRIVEN=y"],
    "SPI":      ["CONFIG_SPI=y"],
    "I2C":      ["CONFIG_I2C=y"],
    "ADC":      ["CONFIG_ADC=y"],
    "CAN":      ["CONFIG_CAN=y"],
    "USB":      ["CONFIG_USB_DEVICE_STACK=y"],
    "Flash":    ["CONFIG_FLASH=y", "CONFIG_FLASH_MAP=y"],
    "Watchdog": ["CONFIG_WATCHDOG=y"],
    "Sensor":   ["CONFIG_SENSOR=y"],
    "RTC":      ["CONFIG_RTC=y"],
    "BLE":      ["CONFIG_BT=y", "CONFIG_BT_HCI=y"],
}

# CMake additions per peripheral
CMAKE_MAP: dict[str, list[str]] = {
    "PWM":   ["target_sources(app PRIVATE src/pwm_sample.c)"],
    "GPIO":  ["target_sources(app PRIVATE src/gpio_sample.c)"],
    "UART":  ["target_sources(app PRIVATE src/uart_sample.c)"],
    "SPI":   ["target_sources(app PRIVATE src/spi_sample.c)"],
    "I2C":   ["target_sources(app PRIVATE src/i2c_sample.c)"],
    "ADC":   ["target_sources(app PRIVATE src/adc_sample.c)"],
}


def _find_best_binding(peripheral: str, soc: str, store: "DataStore") -> dict | None:
    """
    Find the most relevant binding for a peripheral + SoC combination.

    Priority:
      1. Exact SoC match   e.g. esp32s3 in compatible string
      2. SoC family match  e.g. esp32 in compatible string
      3. Generic binding for the peripheral category
    """
    soc_lower = soc.lower()
    peripheral_lower = peripheral.lower()

    # Get all bindings for this peripheral category
    candidates = store.get_bindings_by_category(peripheral)
    if not candidates:
        # Try searching by name
        candidates = store.search(f"{peripheral} {soc}", limit=20)

    if not candidates:
        return None

    # Score each candidate
    def score(b: dict) -> int:
        s = 0
        compat = b.get("compatible", "").lower()
        soc_family = [x.lower() for x in b.get("soc_family", [])]

        # Exact SoC in compatible string
        if soc_lower in compat:
            s += 100
        # SoC family match
        for fam in soc_family:
            if fam in soc_lower or soc_lower.startswith(fam):
                s += 50
                break
        # Peripheral keyword in compatible
        if peripheral_lower in compat:
            s += 10
        # Has properties defined
        s += len(b.get("properties", []))
        return s

    candidates_scored = sorted(candidates, key=score, reverse=True)
    return candidates_scored[0] if candidates_scored else None


def _node_name_for(binding: dict) -> str:
    """
    Derive a short DTS node reference name from the compatible string.
    e.g. 'espressif,esp32-ledc' → 'ledc0'
         'nordic,nrf-pwm'       → 'pwm0'
    """
    compat = binding.get("compatible", "")
    if "," in compat:
        device = compat.split(",")[1]   # e.g. "esp32-ledc"
        # Take the last segment after the last dash
        name = device.split("-")[-1]    # e.g. "ledc"
    else:
        name = compat.split("-")[-1] if "-" in compat else compat
    return f"{name}0"


def _build_overlay(binding: dict, node_name: str, needs_pinctrl: bool) -> str:
    """Build the .overlay file content."""
    lines = [f"/* Auto-generated overlay for {binding.get('compatible', '')} */", ""]

    if needs_pinctrl:
        lines += [
            "/* Pin control — define your GPIO mapping here */",
            "&pinctrl {",
            f"\t{node_name}_default: {node_name}_default {{",
            "\t\tgroup1 {",
            "\t\t\t/* pinmux = <PERIPHERAL_CHx_GPIOy>; */",
            "\t\t\t/* Replace with the correct macro from your SoC's dt-bindings/pinctrl */",
            "\t\t};",
            "\t};",
            "};",
            "",
        ]

    lines += [f"&{node_name} {{"]

    # Fill required properties
    required_props = [p for p in binding.get("properties", []) if p.get("required")]
    optional_props = [p for p in binding.get("properties", []) if not p.get("required")]

    for prop in required_props:
        name = prop["name"]
        value = PROP_DEFAULTS.get(name, "/* TODO: fill in value */")
        # Replace placeholder {node} with actual node name
        value = value.replace("{node}", node_name)
        lines.append(f'\tstatus = "okay";') if name == "status" else None
        if name != "status":
            lines.append(f"\t{name} = {value};")

    # Always add status
    if not any(p["name"] == "status" for p in required_props):
        lines.append('\tstatus = "okay";')

    if optional_props:
        lines.append("")
        lines.append("\t/* Optional properties (uncomment to use): */")
        for prop in optional_props[:5]:   # show first 5 optionals
            name = prop["name"]
            ptype = prop.get("type", "")
            default = prop.get("default")
            comment = f"  /* {prop.get('description', '').split(chr(10))[0][:60]} */" if prop.get("description") else ""
            if default is not None:
                lines.append(f"\t/* {name} = {json_val(default, ptype)};{comment} */")
            else:
                lines.append(f"\t/* {name} = <value>;{comment} */")

    lines += ["};", ""]
    return "\n".join(lines)


def json_val(val, ptype: str) -> str:
    if ptype == "string":
        return f'"{val}"'
    if ptype in ("int", "boolean"):
        return str(val).lower()
    return str(val)


def _build_explanation(binding: dict, node_name: str, peripheral: str, soc: str) -> str:
    compat = binding.get("compatible", "")
    title  = binding.get("title", "")
    props  = binding.get("properties", [])
    required = [p["name"] for p in props if p.get("required")]

    lines = [
        f"## What was generated",
        f"",
        f"This overlay enables **{peripheral}** on **{soc}** using the `{compat}` binding.",
        f"",
        f"### Node: `&{node_name}`",
        f"Reference to the `{node_name}` peripheral node already defined in the SoC's base DTS.",
        f"You don't define the node — you just configure it here.",
        f"",
    ]

    if required:
        lines += [
            f"### Required properties",
            *[f"- `{p}` — must be present for the driver to initialise" for p in required],
            f"",
        ]

    if any(p["name"] == "pinctrl-0" for p in props if p.get("required")):
        lines += [
            f"### Pin control",
            f"This peripheral requires `pinctrl-0` which maps GPIO pins to the peripheral.",
            f"The `{node_name}_default` state defined in the pinctrl block is where you set",
            f"which GPIO pin carries which signal. Check your board's `-pinctrl.dtsi` file",
            f"to see if a default mapping already exists.",
            f"",
        ]

    lines += [
        f"### Where to put this file",
        f"Save as `boards/{soc}.overlay` inside your application folder:",
        f"```",
        f"my_app/",
        f"├── CMakeLists.txt",
        f"├── prj.conf",
        f"├── src/main.c",
        f"└── boards/{soc}.overlay   ← this file",
        f"```",
    ]

    return "\n".join(lines)


def generate_overlay(
    peripheral: str,
    soc: str,
    board: str,
    store: "DataStore",
) -> dict | None:
    """
    Main entry point called by the API route.
    Returns a dict with: overlay, pinctrl, kconfig, cmake, explanation, binding_used
    """
    binding = _find_best_binding(peripheral, soc, store)
    if not binding:
        return None

    node_name     = _node_name_for(binding)
    props         = binding.get("properties", [])
    needs_pinctrl = any(p["name"] == "pinctrl-0" for p in props)

    overlay     = _build_overlay(binding, node_name, needs_pinctrl)
    explanation = _build_explanation(binding, node_name, peripheral, soc)
    kconfig     = KCONFIG_MAP.get(peripheral, [f"# Enable {peripheral} driver"])
    cmake       = CMAKE_MAP.get(peripheral, [])

    return {
        "peripheral":    peripheral,
        "soc":           soc,
        "board":         board,
        "binding_used":  binding.get("compatible"),
        "node_name":     node_name,
        "overlay":       overlay,
        "needs_pinctrl": needs_pinctrl,
        "kconfig":       kconfig,
        "cmake":         cmake,
        "explanation":   explanation,
        "properties":    props,
    }
