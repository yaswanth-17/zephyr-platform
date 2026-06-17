"""
core/datastore.py

Loads the parser-generated JSON files once at app startup and keeps them
in memory. All API routes read from this instead of hitting disk on every
request.
"""

import json
from pathlib import Path
from typing import Any


class DataStore:
    def __init__(self):
        self.bindings: list[dict] = []
        self.boards:   list[dict] = []
        self._loaded = False

    def load(self, bindings_path: Path, boards_path: Path) -> None:
        """Call once at FastAPI startup."""
        if bindings_path.exists():
            with open(bindings_path, "r", encoding="utf-8") as f:
                self.bindings = json.load(f)
            print(f"[datastore] Loaded {len(self.bindings)} bindings from {bindings_path}")
        else:
            print(f"[datastore] WARNING: {bindings_path} not found — run the parser first!")

        if boards_path.exists():
            with open(boards_path, "r", encoding="utf-8") as f:
                self.boards = json.load(f)
            print(f"[datastore] Loaded {len(self.boards)} boards from {boards_path}")
        else:
            print(f"[datastore] WARNING: {boards_path} not found — run the parser first!")

        # Build quick-lookup indexes
        self._build_indexes()
        self._loaded = True

    def _build_indexes(self) -> None:
        """Pre-build lookup dicts for O(1) access."""
        # compatible → binding
        self._binding_by_compatible: dict[str, dict] = {
            b["compatible"]: b for b in self.bindings if b.get("compatible")
        }
        # soc name → list of boards
        self._boards_by_soc: dict[str, list[dict]] = {}
        for board in self.boards:
            soc = board.get("soc", "").lower()
            self._boards_by_soc.setdefault(soc, []).append(board)

        # category → list of bindings
        self._bindings_by_category: dict[str, list[dict]] = {}
        for b in self.bindings:
            cat = b.get("category", "misc")
            self._bindings_by_category.setdefault(cat, []).append(b)

    # --- Public query methods ---

    def get_binding(self, compatible: str) -> dict | None:
        return self._binding_by_compatible.get(compatible)

    def get_bindings_by_category(self, category: str) -> list[dict]:
        return self._bindings_by_category.get(category, [])

    def get_boards_by_soc(self, soc: str) -> list[dict]:
        return self._boards_by_soc.get(soc.lower(), [])

    def list_categories(self) -> list[str]:
        return sorted(self._bindings_by_category.keys())

    def list_socs(self) -> list[str]:
        """Return sorted unique SoC names that have at least one board."""
        socs = set()
        for b in self.boards:
            soc = b.get("soc", "").strip()
            if soc:
                socs.add(soc)
        return sorted(socs)

    def list_vendors(self) -> list[str]:
        vendors = set()
        for b in self.bindings:
            v = b.get("vendor", "")
            if v and v not in ("generic", "unknown"):
                vendors.add(v)
        return sorted(vendors)

    def search(self, query: str, limit: int = 30) -> list[dict]:
        """
        Simple full-text search across compatible string, title,
        description, and category. Returns ranked results.
        """
        if not query or not query.strip():
            return []

        q = query.lower().strip()
        words = q.split()

        scored: list[tuple[int, dict]] = []

        for b in self.bindings:
            score = 0
            compatible = (b.get("compatible") or "").lower()
            title       = (b.get("title") or "").lower()
            description = (b.get("description") or "").lower()
            category    = (b.get("category") or "").lower()
            vendor      = (b.get("vendor") or "").lower()

            for word in words:
                if word in compatible:
                    score += 10   # strongest signal
                if word in title:
                    score += 6
                if word in category:
                    score += 5
                if word in vendor:
                    score += 4
                if word in description:
                    score += 2

            if score > 0:
                scored.append((score, b))

        scored.sort(key=lambda x: -x[0])
        return [b for _, b in scored[:limit]]


# Singleton — imported by routes
store = DataStore()
