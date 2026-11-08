#!/usr/bin/env python3
"""Rename only application-owned Smali classes and all textual references.

This is intentionally conservative: it does not rename methods or fields, and it keeps
R/BuildConfig classes stable. Apktool is responsible for rebuilding the DEX files.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

CLASS_RE = re.compile(r"^\s*\.class\b.*?\s+(L[^;]+;)", re.MULTILINE)
PACKAGE_RE = re.compile(r"\bpackage=\"([^\"]+)\"")
TEXT_SUFFIXES = {".smali", ".xml", ".yml", ".yaml", ".txt", ".properties", ".json"}
SKIP_BASENAMES = {"R", "BuildConfig"}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="strict")


def class_files(root: Path) -> list[tuple[Path, str]]:
    result: list[tuple[Path, str]] = []
    for path in sorted(root.rglob("*.smali")):
        text = read_text(path)
        match = CLASS_RE.search(text)
        if match:
            result.append((path, match.group(1)))
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("decoded_dir", type=Path)
    args = parser.parse_args()
    root = args.decoded_dir
    manifest = root / "AndroidManifest.xml"
    if not manifest.exists():
        raise SystemExit("AndroidManifest.xml não encontrado após o decode do Apktool.")

    manifest_text = read_text(manifest)
    package_match = PACKAGE_RE.search(manifest_text)
    if not package_match:
        raise SystemExit("O manifesto decodificado não informa o package da aplicação.")
    package_descriptor = "L" + package_match.group(1).replace(".", "/") + "/"

    candidates: list[tuple[Path, str]] = []
    for path, descriptor in class_files(root):
        if not descriptor.startswith(package_descriptor):
            continue
        basename = descriptor[1:-1].rsplit("/", 1)[-1]
        if basename.split("$", 1)[0] in SKIP_BASENAMES:
            continue
        candidates.append((path, descriptor))
    if not candidates:
        raise SystemExit("Nenhuma classe Smali pertencente ao package da aplicação foi encontrada.")

    # Stable names make the result reproducible for the same decoded input.
    mapping: dict[str, str] = {}
    for index, (_path, descriptor) in enumerate(sorted(candidates, key=lambda item: item[1]), start=1):
        parent, _old_name = descriptor[1:-1].rsplit("/", 1)
        mapping[descriptor] = f"L{parent}/c{index};"

    # Replace descriptor and dotted references in decoded textual resources.
    text_files = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in TEXT_SUFFIXES]
    for path in text_files:
        text = read_text(path)
        updated = text
        for old, new in sorted(mapping.items(), key=lambda item: len(item[0]), reverse=True):
            updated = updated.replace(old, new)
            updated = updated.replace(old[1:-1].replace("/", "."), new[1:-1].replace("/", "."))
        if updated != text:
            path.write_text(updated, encoding="utf-8")

    for path, old_descriptor in sorted(candidates, key=lambda item: len(item[1]), reverse=True):
        new_descriptor = mapping[old_descriptor]
        new_name = new_descriptor[1:-1].rsplit("/", 1)[-1] + ".smali"
        destination = path.with_name(new_name)
        if destination != path:
            path.rename(destination)

    print(f"Classes Smali renomeadas: {len(mapping)}; métodos e campos preservados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
