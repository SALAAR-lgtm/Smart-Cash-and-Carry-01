#!/usr/bin/env python3
"""Generate app/db/seed.sql from data/products.csv.

Run from the repo root:

    python tools/generate-seed.py

Why a generator instead of hand-written SQL:
  The CSV is the source of truth and it will change when the mart adds or
  reprices stock. Regenerating is one command; hand-editing 119 INSERT rows is
  how data drifts out of sync with reality.

Two traps this script exists to avoid:
  1. It reads the Image_File column instead of assuming .jpg. The catalogue is
     99 jpg / 19 png / 1 webp. Assuming .jpg silently breaks 20 product images.
  2. Categories are looked up by NAME, never by hardcoded id. SERIAL ids drift
     the moment ON CONFLICT DO NOTHING skips an insert, so a hardcoded id would
     point at the wrong category after any re-run.

The generated SQL is idempotent — safe to run on every boot.
"""
import csv
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "products.csv"
IMAGES_DIR = ROOT / "data" / "images"
OUT_PATH = ROOT / "app" / "db" / "seed.sql"

REQUIRED_COLUMNS = ["Item_ID", "Category", "Title", "Weight", "Price", "Image_File"]


def sql_str(value):
    """Escape a value for a single-quoted SQL literal, or return NULL."""
    if value is None or str(value).strip() == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def load_rows():
    if not CSV_PATH.exists():
        sys.exit(f"error: {CSV_PATH} not found")

    # utf-8-sig strips the BOM Excel writes, which would otherwise become part
    # of the first column name and silently break the lookup.
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = [c for c in REQUIRED_COLUMNS if c not in (reader.fieldnames or [])]
        if missing:
            sys.exit(f"error: CSV missing columns: {', '.join(missing)}")
        return list(reader)


def validate(rows):
    """Fail loudly on bad data rather than seeding a broken catalogue."""
    problems = []

    seen_ids = set()
    for index, row in enumerate(rows, start=2):  # +2: header row, 1-based
        item_id = (row["Item_ID"] or "").strip()

        if not item_id:
            problems.append(f"row {index}: empty Item_ID")
        elif item_id in seen_ids:
            problems.append(f"row {index}: duplicate Item_ID {item_id}")
        else:
            seen_ids.add(item_id)

        try:
            price = float((row["Price"] or "").strip())
            if price < 0:
                problems.append(f"row {index}: negative price {price}")
        except ValueError:
            problems.append(f"row {index}: price is not a number: {row['Price']!r}")

        image = (row["Image_File"] or "").strip()
        if image and not (IMAGES_DIR / image).exists():
            problems.append(f"row {index}: image missing from disk: {image}")

        if not (row["Category"] or "").strip():
            problems.append(f"row {index}: empty Category")

    orphan_images = sorted(
        p.name for p in IMAGES_DIR.iterdir()
        if p.is_file() and p.name not in {r["Image_File"].strip() for r in rows}
    )
    if orphan_images:
        problems.append(f"{len(orphan_images)} image(s) with no CSV row: "
                        f"{', '.join(orphan_images[:5])}")

    return problems


def render(rows):
    categories = sorted({r["Category"].strip() for r in rows if r["Category"].strip()})

    out = []
    out.append("-- GENERATED FILE — do not edit by hand.")
    out.append("-- Source: data/products.csv")
    out.append(f"-- Regenerate with:  python tools/generate-seed.py   ({len(rows)} products)")
    out.append("--")
    out.append("-- Idempotent: safe to run on every boot.")
    out.append("-- Table names are capitalised and singular — always double-quote them.")
    out.append("")
    out.append("-- 1. Categories first: products reference them by id.")
    out.append("INSERT INTO \"Category\" (name) VALUES")
    out.append(",\n".join(f"  ({sql_str(name)})" for name in categories))
    out.append("ON CONFLICT (name) DO NOTHING;")
    out.append("")
    out.append("-- 2. Products. Category resolved by name, never by hardcoded id.")
    out.append("INSERT INTO \"Product\" (item_id, name, weight, price, category_id, image_url) VALUES")

    values = []
    for row in rows:
        item_id = row["Item_ID"].strip()
        name = row["Title"].strip()
        weight = (row["Weight"] or "").strip()
        price = float(row["Price"].strip())
        category = row["Category"].strip()
        image = (row["Image_File"] or "").strip()
        image_url = f"/images/{image}" if image else None

        values.append(
            "  ({item_id}, {name}, {weight}, {price},\n"
            "    (SELECT id FROM \"Category\" WHERE name = {category}),\n"
            "    {image_url})".format(
                item_id=sql_str(item_id),
                name=sql_str(name),
                weight=sql_str(weight),
                price=f"{price:.2f}",
                category=sql_str(category),
                image_url=sql_str(image_url),
            )
        )

    out.append(",\n".join(values))
    out.append("ON CONFLICT (item_id) DO NOTHING;")
    out.append("")

    return "\n".join(out)


def main():
    rows = load_rows()
    print(f"read {len(rows)} rows from {CSV_PATH.name}")

    problems = validate(rows)
    if problems:
        print(f"\n{len(problems)} problem(s) found — NOT writing seed.sql:\n")
        for problem in problems[:20]:
            print(f"  - {problem}")
        if len(problems) > 20:
            print(f"  ... and {len(problems) - 20} more")
        sys.exit(1)

    OUT_PATH.write_text(render(rows), encoding="utf-8")
    print(f"validation passed: {len(rows)} products, "
          f"{len({r['Category'].strip() for r in rows})} categories")
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
