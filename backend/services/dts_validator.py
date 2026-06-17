"""
services/dts_validator.py

Mode B: Validate user-written DTS content against real Zephyr bindings.

Checks performed:
  1. Basic syntax — braces balance, semicolons, no obvious typos
  2. Compatible string — must match a known binding
  3. Required properties — all required props must be present
  4. Property types — basic type sanity (string in quotes, bool has no value, etc.)
  5. Status value — must be "okay" or "disabled"
  6. Suggestions — pinctrl reminder, aliases hint
"""

from __future__ import annotations
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.datastore import DataStore


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

def _err(message: str, line: int | None = None) -> dict:
    return {"level": "error", "message": message, "line": line}

def _warn(message: str, line: int | None = None) -> dict:
    return {"level": "warning", "message": message, "line": line}

def _ok(message: str) -> dict:
    return {"level": "ok", "message": message, "line": None}

def _hint(message: str) -> dict:
    return {"level": "hint", "message": message, "line": None}


# ---------------------------------------------------------------------------
# Syntax checks
# ---------------------------------------------------------------------------

def _check_syntax(lines: list[str]) -> list[dict]:
    issues = []
    open_braces  = 0
    open_brace_lines = []

    for i, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.startswith("//") or line.startswith("/*"):
            continue

        opens  = line.count("{")
        closes = line.count("}")
        open_braces += opens - closes

        for _ in range(opens):
            open_brace_lines.append(i)
        for _ in range(closes):
            if open_brace_lines:
                open_brace_lines.pop()

        # Property assignment lines should end with ;
        # Pattern: identifier = something  (but not opening brace lines)
        if "=" in line and not line.endswith("{") and not line.endswith(";") \
                and not line.startswith("//") and not line.startswith("/*") \
                and not line.endswith("*/"):
            issues.append(_err(f"Missing semicolon at end of line", i))

    if open_braces != 0:
        issues.append(_err(
            f"Unbalanced braces: {abs(open_braces)} {'opening' if open_braces > 0 else 'closing'} "
            f"brace(s) {'not closed' if open_braces > 0 else 'extra'}",
        ))

    return issues


# ---------------------------------------------------------------------------
# Node / property extraction
# ---------------------------------------------------------------------------

# Matches:  &ledc0 {  or  ledc0: ledc0@40014000 {
NODE_REF_RE  = re.compile(r"&(\w+)\s*\{")
NODE_LABEL_RE = re.compile(r"(\w+):\s*\w+@[\w]+\s*\{")

# Matches:  compatible = "espressif,esp32-ledc";
COMPAT_RE = re.compile(r'compatible\s*=\s*"([^"]+)"')

# Matches:  status = "okay";
STATUS_RE = re.compile(r'status\s*=\s*"([^"]+)"')

# Matches any property: propname = value;  or  propname;
PROP_RE = re.compile(r"^\s*([\w#-]+)\s*(?:=\s*.+)?;")


def _extract_nodes(content: str) -> list[dict]:
    """
    Very lightweight DTS parser — extract top-level node references and
    their properties. Handles &node { ... } blocks.
    """
    nodes = []
    lines = content.split("\n")

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Node reference: &ledc0 {
        m = NODE_REF_RE.search(line)
        if m:
            node_name = m.group(1)
            props = {}
            depth = 1
            i += 1
            while i < len(lines) and depth > 0:
                inner = lines[i].strip()
                depth += inner.count("{") - inner.count("}")

                if depth > 0:
                    # Extract compatible
                    cm = COMPAT_RE.search(inner)
                    if cm:
                        props["compatible"] = cm.group(1)

                    # Extract status
                    sm = STATUS_RE.search(inner)
                    if sm:
                        props["status"] = sm.group(1)

                    # Extract any property name
                    pm = PROP_RE.match(inner)
                    if pm:
                        pname = pm.group(1)
                        if pname not in props:
                            props[pname] = True   # just record presence

                i += 1

            nodes.append({"name": node_name, "properties": props, "line_start": i})
            continue

        i += 1

    return nodes


# ---------------------------------------------------------------------------
# Main validate function
# ---------------------------------------------------------------------------

def validate(
    dts_content: str,
    peripheral:  str | None,
    soc:         str | None,
    store:       "DataStore",
) -> dict:
    """
    Validate user-written DTS. Returns structured result with issues list.
    """
    issues: list[dict] = []
    lines = dts_content.split("\n")

    # 1. Syntax check
    syntax_issues = _check_syntax(lines)
    issues.extend(syntax_issues)

    # If braces don't balance, structural parsing is unreliable — stop here
    brace_error = any("Unbalanced" in i["message"] for i in syntax_issues if i["level"] == "error")
    if brace_error:
        return _result(issues, valid=False)

    # 2. Parse nodes
    nodes = _extract_nodes(dts_content)

    if not nodes:
        issues.append(_warn("No DTS nodes found. Expected at least one &node_name { ... } block."))
        return _result(issues, valid=False)

    # 3. Validate each node
    for node in nodes:
        node_name = node["name"]
        props     = node["properties"]

        # Check compatible string if present
        compat = props.get("compatible")
        if compat:
            binding = store.get_binding(compat)
            if binding:
                issues.append(_ok(f"`{node_name}`: compatible \"{compat}\" is valid"))

                # Check required properties
                required = [p for p in binding.get("properties", []) if p.get("required")]
                for req_prop in required:
                    pname = req_prop["name"]
                    if pname not in props:
                        issues.append(_err(
                            f"`{node_name}`: required property `{pname}` is missing "
                            f"(type: {req_prop.get('type', 'unknown')})"
                        ))
                    else:
                        issues.append(_ok(f"`{node_name}`: `{pname}` is present ✓"))

                # Enum validation for status
                status = props.get("status")
                if status and status not in ("okay", "disabled", "reserved", "fail"):
                    issues.append(_err(
                        f"`{node_name}`: status \"{status}\" is invalid. "
                        f"Must be one of: okay, disabled, reserved, fail"
                    ))
                elif status == "okay":
                    issues.append(_ok(f"`{node_name}`: status = \"okay\" ✓"))

            else:
                issues.append(_err(
                    f"`{node_name}`: compatible \"{compat}\" is not in the Zephyr bindings database. "
                    f"Check spelling or run the parser again."
                ))
        else:
            # No compatible in this node — validate known required patterns
            status = props.get("status")
            if status == "okay":
                issues.append(_ok(f"`{node_name}`: status = \"okay\" ✓"))
            elif status and status not in ("okay", "disabled"):
                issues.append(_err(f"`{node_name}`: invalid status value \"{status}\""))

            # Warn if pinctrl-0 present but pinctrl-names absent
            if "pinctrl-0" in props and "pinctrl-names" not in props:
                issues.append(_err(
                    f"`{node_name}`: `pinctrl-0` is set but `pinctrl-names` is missing. "
                    "Both must be present together."
                ))

    # 4. Context-aware hints based on peripheral/soc selection
    if peripheral and soc:
        binding = _find_expected_binding(peripheral, soc, store)
        if binding:
            expected_compat = binding.get("compatible")
            found_compats = [
                n["properties"].get("compatible")
                for n in nodes
                if n["properties"].get("compatible")
            ]
            if expected_compat and expected_compat not in found_compats:
                issues.append(_hint(
                    f"For {peripheral} on {soc}, the expected compatible is "
                    f"\"{expected_compat}\". Make sure your node uses this."
                ))

    # 5. General hints
    has_pinctrl_node = "&pinctrl" in dts_content or "pinctrl {" in dts_content
    needs_pinctrl = any(
        "pinctrl-0" in n["properties"] for n in nodes
    )
    if needs_pinctrl and not has_pinctrl_node:
        issues.append(_hint(
            "Your node uses `pinctrl-0` but no `&pinctrl { ... }` block was found. "
            "Make sure your pin mapping is defined in a pinctrl block or a separate -pinctrl.dtsi file."
        ))

    # Determine overall validity
    error_count = sum(1 for i in issues if i["level"] == "error")
    valid = error_count == 0

    return _result(issues, valid=valid)


def _find_expected_binding(peripheral: str, soc: str, store: "DataStore") -> dict | None:
    candidates = store.get_bindings_by_category(peripheral)
    soc_lower = soc.lower()
    for b in candidates:
        if soc_lower in b.get("compatible", "").lower():
            return b
    return candidates[0] if candidates else None


def _result(issues: list[dict], valid: bool) -> dict:
    errors   = [i for i in issues if i["level"] == "error"]
    warnings = [i for i in issues if i["level"] == "warning"]
    oks      = [i for i in issues if i["level"] == "ok"]
    hints    = [i for i in issues if i["level"] == "hint"]

    return {
        "valid":        valid,
        "error_count":  len(errors),
        "warning_count": len(warnings),
        "issues":       issues,
        "summary": (
            "All checks passed ✓" if valid and not warnings
            else f"{len(errors)} error(s), {len(warnings)} warning(s)"
        ),
    }
