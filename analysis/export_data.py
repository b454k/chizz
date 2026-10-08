"""Export chizz's analytics database to CSV files for the notebook.

    python analysis/export_data.py --local     # what `wrangler pages dev --persist-to C:/wr` wrote
    python analysis/export_data.py --remote    # the live database

--remote needs `npx wrangler login` once, and the database id in CHIZZ_D1_ID. The id is
never written into the repo (see CLAUDE.md), so it goes into a throwaway wrangler config
for the length of the export.

Writes to analysis/data/ (ignored by git): visits.csv, events.csv (one row per event,
unpacked from the batches they were stored in), rounds.csv and round_items.csv.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "analysis" / "data"
PAGE = 1000
# Every table in an order that pages cleanly.
TABLES = {
    "visits": "id",
    "rounds": "id",
    "round_items": "round_id, idx",
    "event_batches": "visit_id, seq",
}


def query(sql, args, config):
    npx = shutil.which("npx") or "npx"
    cmd = [npx, "-y", "wrangler@latest", "d1", "execute", "chizz-analytics", "--json", "--command", sql]
    if args.remote:
        cmd += ["--remote", "--config", str(config)]
    else:
        cmd += ["--local", "--persist-to", args.persist_to]
    done = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if done.returncode != 0:
        sys.exit("wrangler failed:\n" + done.stdout[-2000:] + done.stderr[-2000:])
    out = done.stdout
    return json.loads(out[out.index("["):])[0]["results"]


def table(name, order, args, config):
    rows, offset = [], 0
    while True:
        page = query(f"SELECT * FROM {name} ORDER BY {order} LIMIT {PAGE} OFFSET {offset}", args, config)
        rows += page
        print(f"  {name}: {len(rows)}", end="\r")
        if len(page) < PAGE:
            break
        offset += PAGE
    print()
    return pd.DataFrame(rows)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    where = ap.add_mutually_exclusive_group(required=True)
    where.add_argument("--local", action="store_true")
    where.add_argument("--remote", action="store_true")
    ap.add_argument("--persist-to", default="C:/wr", help="the --persist-to used with wrangler pages dev")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        config = Path(tmp) / "wrangler.json"
        if args.remote:
            db_id = os.environ.get("CHIZZ_D1_ID")
            if not db_id:
                sys.exit("set CHIZZ_D1_ID to the database id (npx wrangler d1 list)")
            config.write_text(json.dumps({
                "name": "chizz-export",
                "d1_databases": [{"binding": "DB", "database_name": "chizz-analytics", "database_id": db_id}],
            }))

        OUT.mkdir(parents=True, exist_ok=True)
        frames = {name: table(name, order, args, config) for name, order in TABLES.items()}

    events = []
    for b in frames.pop("event_batches").to_dict("records"):
        for e in json.loads(b["events"]):
            e["visit_id"] = b["visit_id"]
            e["seq"] = b["seq"]
            events.append(e)
    frames["events"] = pd.DataFrame(events)

    for name, df in frames.items():
        df.to_csv(OUT / f"{name}.csv", index=False)
        print(f"{name:12} {len(df):>8} rows")
    print("written to", OUT)


if __name__ == "__main__":
    main()
