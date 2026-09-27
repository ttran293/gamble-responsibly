"""Assign a reproducible mix of fictional sports to the v1 bet fixtures.

Run generate-v2-demo.py afterward so both demo versions share the same mix.
"""

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "data" / "v1_demo"
SPORTS = ("Basketball", "Football", "Baseball", "Soccer", "Basketball", "Hockey", "Football", "Baseball", "Basketball", "Soccer")
TOTALS = {"Basketball": "155.5", "Football": "42.5", "Baseball": "8.5", "Soccer": "2.5", "Hockey": "5.5"}


def main() -> None:
    for source in sorted(ROOT.glob("*/*_connected_bets.csv")):
        with source.open(newline="", encoding="utf-8") as stream:
            reader = csv.DictReader(stream)
            fields = reader.fieldnames
            rows = list(reader)
        if fields is None:
            raise RuntimeError(f"Missing CSV header: {source}")
        events: dict[str, str] = {}
        for row in rows:
            # Keep the intentionally fictional racing sequence intact.
            if row["market"] == "Race winner":
                continue
            original_event = row["event"]
            sport = events.setdefault(original_event, SPORTS[len(events) % len(SPORTS)])
            row["sport"] = sport
            row["league"] = f"Fictional {sport} League"
            if row["market"] == "Two-leg combined market":
                team = original_event.split(" vs ", 1)[0]
                row["selection"] = f"{team} to win + game total over {TOTALS[sport]}"
            elif row["market"] == "Moneyline":
                team = original_event.split(" vs ", 1)[0]
                row["selection"] = f"{team} to win"
        with source.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
        print(source.relative_to(ROOT))


if __name__ == "__main__":
    main()
