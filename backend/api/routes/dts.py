"""
api/routes/dts.py

All DTS-related endpoints:
  GET  /api/dts/categories          — list all peripheral categories
  GET  /api/dts/bindings            — list bindings (filter by category, vendor, soc)
  GET  /api/dts/bindings/{compat}   — single binding detail
  GET  /api/socs                    — list all SoCs (from boards data)
  GET  /api/boards                  — list boards (filter by soc)
  GET  /api/search                  — full-text search
  POST /api/dts/generate            — generate DTS overlay for SoC + peripheral
  POST /api/dts/validate            — validate pasted DTS content
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from core.datastore import store

router = APIRouter()


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.get("/dts/categories")
def list_categories():
    """Return all peripheral categories that have at least one binding."""
    cats = store.list_categories()
    return {"categories": cats, "total": len(cats)}


# ---------------------------------------------------------------------------
# Bindings
# ---------------------------------------------------------------------------

@router.get("/dts/bindings")
def list_bindings(
    category: str | None = Query(None, description="Filter by category e.g. PWM"),
    vendor:   str | None = Query(None, description="Filter by vendor e.g. espressif"),
    soc:      str | None = Query(None, description="Filter by SoC family e.g. esp32s3"),
    limit:    int        = Query(100,  description="Max results"),
    offset:   int        = Query(0,    description="Pagination offset"),
):
    """
    List bindings with optional filters.

    Examples:
      /api/dts/bindings?category=PWM
      /api/dts/bindings?category=PWM&vendor=espressif
      /api/dts/bindings?soc=esp32s3
    """
    results = store.bindings

    if category:
        results = [b for b in results if b.get("category", "").lower() == category.lower()]

    if vendor:
        results = [b for b in results if b.get("vendor", "").lower() == vendor.lower()]

    if soc:
        soc_lower = soc.lower()
        results = [
            b for b in results
            if any(soc_lower in s for s in b.get("soc_family", []))
            or soc_lower in b.get("compatible", "").lower()
        ]

    total = len(results)
    page  = results[offset : offset + limit]

    return {
        "total":    total,
        "offset":   offset,
        "limit":    limit,
        "bindings": [_slim_binding(b) for b in page],
    }


@router.get("/dts/bindings/{compatible:path}")
def get_binding(compatible: str):
    """
    Get full detail for one binding by compatible string.
    e.g. /api/dts/bindings/espressif,esp32-ledc
    """
    binding = store.get_binding(compatible)
    if not binding:
        raise HTTPException(status_code=404, detail=f"Binding '{compatible}' not found")
    return binding


# ---------------------------------------------------------------------------
# SoCs
# ---------------------------------------------------------------------------

@router.get("/socs")
def list_socs(
    vendor: str | None = Query(None, description="Filter by vendor prefix e.g. esp32"),
):
    """Return all SoC names that appear in board definitions."""
    socs = store.list_socs()
    if vendor:
        socs = [s for s in socs if vendor.lower() in s.lower()]
    return {"socs": socs, "total": len(socs)}


# ---------------------------------------------------------------------------
# Boards
# ---------------------------------------------------------------------------

@router.get("/boards")
def list_boards(
    soc:    str | None = Query(None, description="Filter by SoC e.g. esp32s3"),
    vendor: str | None = Query(None, description="Filter by vendor e.g. Espressif"),
    arch:   str | None = Query(None, description="Filter by arch e.g. Xtensa"),
):
    """
    List boards with optional filters.

    Examples:
      /api/boards?soc=esp32s3
      /api/boards?vendor=Nordic+Semiconductor
    """
    results = store.boards

    if soc:
        results = [b for b in results if soc.lower() in b.get("soc", "").lower()]

    if vendor:
        results = [b for b in results if vendor.lower() in b.get("vendor", "").lower()]

    if arch:
        results = [b for b in results if arch.lower() in b.get("arch", "").lower()]

    return {"total": len(results), "boards": results}


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@router.get("/search")
def search(
    q:     str = Query(..., description="Search query e.g. 'pwm esp32s3'"),
    limit: int = Query(20,  description="Max results"),
):
    """
    Full-text search across bindings.

    Examples:
      /api/search?q=pwm+esp32
      /api/search?q=gpio+nrf52840
      /api/search?q=uart+stm32
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    results = store.search(q, limit=limit)
    return {
        "query":   q,
        "total":   len(results),
        "results": [_slim_binding(b) for b in results],
    }


# ---------------------------------------------------------------------------
# DTS Generator  (Mode A — auto-generate)
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    peripheral: str   # e.g. "PWM"
    soc:        str   # e.g. "esp32s3"
    board:      str   # e.g. "esp32s3_devkitc"


@router.post("/dts/generate")
def generate_dts(req: GenerateRequest):
    """
    Mode A: Given peripheral + SoC + board, generate a DTS overlay.

    The generator finds the most relevant binding for the combination,
    then builds a templated overlay with all required properties filled in.
    """
    from services.dts_generator import generate_overlay
    result = generate_overlay(
        peripheral=req.peripheral,
        soc=req.soc,
        board=req.board,
        store=store,
    )
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No binding found for {req.peripheral} on {req.soc}"
        )
    return result


# ---------------------------------------------------------------------------
# DTS Validator  (Mode B — validate user-written DTS)
# ---------------------------------------------------------------------------

class ValidateRequest(BaseModel):
    dts_content: str          # raw DTS text pasted by user
    peripheral:  str | None = None   # optional context hint
    soc:         str | None = None   # optional context hint


@router.post("/dts/validate")
def validate_dts(req: ValidateRequest):
    """
    Mode B: Validate user-written DTS content.

    Returns a list of errors, warnings, and suggestions.
    """
    from services.dts_validator import validate
    result = validate(
        dts_content=req.dts_content,
        peripheral=req.peripheral,
        soc=req.soc,
        store=store,
    )
    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slim_binding(b: dict) -> dict:
    """Return a lighter version of binding for list views (no full description)."""
    return {
        "compatible":  b.get("compatible", ""),
        "title":       b.get("title", ""),
        "category":    b.get("category", ""),
        "vendor":      b.get("vendor", ""),
        "soc_family":  b.get("soc_family", []),
        "bus":         b.get("bus", ""),
        "on_bus":      b.get("on_bus", ""),
        "prop_count":  len(b.get("properties", [])),
        "source_file": b.get("source_file", ""),
    }
