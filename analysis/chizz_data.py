"""Loading chizz's exported analytics, and the few helpers the notebook shares.

The tables are described in migrations/0001_analytics.sql. The CSVs come from
export_data.py (real data) or fake_data.py (a synthetic stand-in with known effects).
"""
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
N = 20

# The order a round goes through, for funnels. "countdown" is only a moment long, so a
# visit that reaches it has pressed start.
FUNNEL = ["home", "countdown", "draw", "between", "choose", "recall", "result"]


def data_dir():
    return Path(os.environ.get("CHIZZ_DATA", ROOT / "analysis" / "data"))


def families():
    """word -> silhouette family id, from docs/words.json."""
    doc = json.loads((ROOT / "docs" / "words.json").read_text(encoding="utf-8"))
    return {w: f["id"] for f in doc["families"] for w in f["words"]}


def load(path=None):
    """The four tables as DataFrames, with times as datetimes and JSON parsed where cheap.

    round_items.drawing stays a JSON string: it is large, and only the classifier needs it
    (see strokes()).
    """
    d = Path(path) if path else data_dir()
    if not (d / "visits.csv").exists():
        raise FileNotFoundError(
            f"no export in {d}. run `python analysis/export_data.py --remote` "
            f"(or set CHIZZ_DATA to the folder fake_data.py wrote)")
    visits = pd.read_csv(d / "visits.csv")
    events = pd.read_csv(d / "events.csv", low_memory=False)
    rounds = pd.read_csv(d / "rounds.csv")
    items = pd.read_csv(d / "round_items.csv", low_memory=False)

    for df, cols in ((visits, ["started_at", "last_at", "left_at"]),
                     (rounds, ["started_at", "drawn_at", "finished_at"])):
        for c in cols:
            df[c + "_dt"] = pd.to_datetime(df[c], unit="ms", utc=True)
    rounds["words"] = rounds["words"].map(json.loads)
    fam = families()
    items["family"] = items["word"].map(fam)
    items["answer_family"] = items["answer_word"].map(fam)
    items = items.merge(rounds[["id", "visit_id", "kind", "role", "mode", "secs", "lang", "input", "finished_at"]],
                        left_on="round_id", right_on="id", how="left").drop(columns="id")
    return {"visits": visits, "events": events, "rounds": rounds, "items": items}


def wilson(k, n, z=1.96):
    """Wilson score interval for k successes in n, as (low, high). Works on arrays."""
    k, n = np.asarray(k, float), np.asarray(n, float)
    with np.errstate(invalid="ignore", divide="ignore"):
        p = k / n
        den = 1 + z ** 2 / n
        mid = (p + z ** 2 / (2 * n)) / den
        half = z * np.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2)) / den
    return mid - half, mid + half


def strokes(drawing_json):
    """A stored drawing -> list of (xs, ys, ts) arrays, coordinates 0-255."""
    if not isinstance(drawing_json, str):
        return []
    return [tuple(np.asarray(a) for a in st) for st in json.loads(drawing_json)]


def rasterize(drawing_json, size=28, pad=2):
    """A drawing as a size x size float image: the strokes scaled to fit, as in Quick, Draw!
    training data, so where on the pad it was drawn and how big does not matter."""
    st = strokes(drawing_json)
    img = np.zeros((size, size), np.float32)
    if not st:
        return img
    xs = np.concatenate([s[0] for s in st]).astype(float)
    ys = np.concatenate([s[1] for s in st]).astype(float)
    x0, y0 = xs.min(), ys.min()
    span = max(xs.max() - x0, ys.max() - y0, 1.0)
    k = (size - 1 - 2 * pad) / span
    for sx, sy, _ in st:
        px = (sx - x0) * k + pad
        py = (sy - y0) * k + pad
        if len(px) == 1:
            img[int(round(py[0])), int(round(px[0]))] = 1
            continue
        for i in range(len(px) - 1):
            n = int(max(abs(px[i + 1] - px[i]), abs(py[i + 1] - py[i])) * 2) + 2
            lx = np.linspace(px[i], px[i + 1], n).round().astype(int)
            ly = np.linspace(py[i], py[i + 1], n).round().astype(int)
            img[ly, lx] = 1
    return img


def quickdraw_ndjson(items, path):
    """Write drawings in the Quick, Draw! simplified format, one JSON object per line."""
    with open(path, "w", encoding="utf-8") as f:
        for r in items.dropna(subset=["drawing"]).itertuples():
            f.write(json.dumps({"word": r.word, "countrycode": "", "recognized": bool(r.correct == 1),
                                "key_id": f"{r.round_id}-{r.idx}",
                                "drawing": [[list(map(int, a)) for a in s[:2]] for s in strokes(r.drawing)]},
                               ensure_ascii=False) + "\n")
