"""Regenerate the private v2 demo CSVs from the local v1 demo fixtures."""

import csv
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path


DATA = Path(__file__).resolve().parents[1] / "data"
SOURCE = DATA / "v1_demo"
DESTINATION = DATA / "v2_demo"
MONEY_FIELDS = {"amount", "balance_after", "wager", "payout"}


def transform(field: str, value: str) -> str:
    if not value:
        return value
    if field.endswith("_minor") or field in MONEY_FIELDS:
        return format(Decimal(value) * 2, "f")
    if value.startswith("sim_"):
        return "sim_v2_" + value[4:]
    if len(value) >= 10 and value[4:5] == "-" and value[7:8] == "-" and "T" in value:
        shifted = datetime.fromisoformat(value.replace("Z", "+00:00")) + timedelta(days=1)
        return shifted.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return value


def main() -> None:
    files = sorted(SOURCE.glob("*/*.csv"))
    if len(files) != 8:
        raise RuntimeError(f"Expected 8 v1 demo CSVs, found {len(files)}")
    for source in files:
        destination = DESTINATION / source.parent.name / source.name.replace("v1_", "v2_", 1)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with source.open(newline="", encoding="utf-8") as input_file:
            reader = csv.DictReader(input_file)
            if reader.fieldnames is None:
                raise RuntimeError(f"Missing CSV header: {source}")
            rows = [{field: transform(field, value) for field, value in row.items()} for row in reader]
        with destination.open("w", newline="", encoding="utf-8") as output_file:
            writer = csv.DictWriter(output_file, fieldnames=reader.fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(destination.relative_to(DATA))


if __name__ == "__main__":
    main()
