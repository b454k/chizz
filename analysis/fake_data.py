"""A synthetic chizz dataset, shaped exactly like export_data.py's output, with effects
planted on purpose.

It exists so the notebook can be run before there is real data, and so each method can
be checked against an answer known in advance: if the serial-position cell does not find
the primacy and recency put in here, the cell is wrong, not the players.

Planted:
  - primacy and recency: the first and last words drawn are remembered better
  - more seconds per word -> better memory; kolay (picking) beats zor (typing)
  - a wrong pick lands in the drawing's own silhouette family far above chance
  - more ink -> a friend guesses the drawing better; mouse drawings carry more ink
  - language has NO effect (a null the notebook should not "find")
  - retention that decays with days since a device first played
  - share chains: finished rounds are shared, links bring new players, some share on
  - every word has its own way of being drawn, so a classifier has something to learn

    python analysis/fake_data.py           # writes analysis/data-fake/
"""
import json
import math
import zlib
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from chizz_data import ROOT, N

OUT = ROOT / "analysis" / "data-fake"
DAYS = 45
EPOCH = int(datetime(2026, 9, 7, 21, tzinfo=timezone.utc).timestamp() * 1000)   # day 1, lib/day.js
DAY_MS = 86400000
CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

rng = np.random.default_rng(7)
doc = json.loads((ROOT / "docs" / "words.json").read_text(encoding="utf-8"))
FAM = {f["id"]: f["words"] for f in doc["families"]}
FAMILY_OF = {w: fid for fid, ws in FAM.items() for w in ws}
ALL_WORDS = list(FAMILY_OF)
WORD_DIFF = {w: rng.normal(0, 0.6) for w in ALL_WORDS}
# Quiet at night, busier through the day, busiest in the evening.
HOUR_W = np.r_[np.full(7, 0.2), np.full(10, 0.9), np.full(7, 1.3)]
HOUR_P = HOUR_W / HOUR_W.sum()


def word_template(w):
    """2-4 smooth strokes that are this word's way of being drawn."""
    r = np.random.default_rng(zlib.crc32(w.encode("utf-8")))
    out = []
    for _ in range(r.integers(2, 5)):
        x, y = r.uniform(50, 205, 2)
        ang = r.uniform(0, 2 * math.pi)
        pts = [(x, y)]
        for _ in range(r.integers(4, 9)):
            ang += r.normal(0, 0.7)
            step = r.uniform(12, 28)
            x, y = np.clip(x + step * math.cos(ang), 10, 245), np.clip(y + step * math.sin(ang), 10, 245)
            pts.append((x, y))
        out.append(np.array(pts))
    return out


TEMPLATES = {}


def draw(word, secs, mouse):
    tpl = TEMPLATES.setdefault(word, word_template(word))
    scale, dx, dy = rng.uniform(0.6, 1.1), rng.normal(0, 18), rng.normal(0, 18)
    t, strokes, ink = 700 + int(rng.gamma(2, 180)), [], 0.0
    first = t
    budget = 700 + secs * 1000
    for st in tpl:
        if rng.random() > 0.85 or t > budget:
            continue
        p = (st - 128) * scale + 128 + [dx, dy] + rng.normal(0, 7 if not mouse else 4, st.shape)
        p = np.clip(np.round(p), 0, 255).astype(int)
        steps = np.cumsum(rng.gamma(2, 25 if mouse else 32, len(p))).astype(int)
        ts = t + steps - steps[0]
        t = int(ts[-1] + rng.gamma(2, 90))
        seg = np.diff(p, axis=0)
        ink += float(np.hypot(seg[:, 0], seg[:, 1]).sum()) / 255 * (1.25 if mouse else 1)
        strokes.append([p[:, 0].tolist(), p[:, 1].tolist(), ts.tolist()])
    last = max((s[2][-1] for s in strokes), default=None)
    return {"drawing": json.dumps(strokes), "strokes": len(strokes),
            "points": sum(len(s[0]) for s in strokes), "ink": round(ink, 3),
            "first_ms": first if strokes else None, "last_ms": last,
            "clears": int(rng.random() < 0.04)}


def new_id():
    return "".join(rng.choice(list("0123456789abcdef"), 16))


def new_code():
    return "".join(rng.choice(list(CODE_ALPHABET), 4))


def deal():
    a, b = rng.choice(list(FAM), 2, replace=False)
    words = list(rng.choice(FAM[a], 10, replace=False)) + list(rng.choice(FAM[b], 10, replace=False))
    rng.shuffle(words)
    return words


def logistic(z):
    return 1 / (1 + math.exp(-z))


def serial(idx):
    return {0: 0.9, 1: 0.6, 2: 0.3}.get(idx, 0) + {19: 0.7, 18: 0.45, 17: 0.2}.get(idx, 0)


visits, events, rounds, items = [], [], [], []
devices = []
round_by_code = {}
links_due = {}                   # day -> [(code, parent device)]


def make_device(first_day, by_link):
    touch = rng.random() < 0.72
    return {"skill": rng.normal(0, 0.5), "input": "touch" if touch else "mouse",
            "os": rng.choice(["ios", "android"], p=[0.45, 0.55]) if touch else rng.choice(["windows", "mac"], p=[0.7, 0.3]),
            "w": int(rng.choice([360, 375, 390, 412, 430])) if touch else int(rng.choice([1280, 1440, 1536, 1920])),
            "lang": "en" if rng.random() < 0.15 else "tr",
            "country": rng.choice(["TR", "DE", "NL", "US", "AZ", "GB"], p=[0.84, 0.06, 0.03, 0.03, 0.02, 0.02]),
            "hour": int(rng.choice(24, p=HOUR_P)),
            "first_day": first_day, "played": False, "dailies": [], "by_link": by_link,
            "ret": rng.uniform(0.15, 0.6)}


def play(dev, day, entry, via):
    vid, t, ev = new_id(), 0, []
    start = EPOCH + (day - 1) * DAY_MS + ((dev["hour"] - 3) % 24) * 3600000 + int(rng.integers(0, 3600000))
    h = 812 if dev["w"] < 700 else 900

    def add(type_, **kw):
        nonlocal t
        t += int(rng.gamma(2, 900))
        ev.append(dict(t=t, type=type_, **kw))

    def tap(screen, target, x, y):
        add("tap", screen=screen, target=target,
            x=float(np.clip(x + rng.normal(0, 0.03), 0, 1)), y=float(np.clip(y + rng.normal(0, 0.015), 0, 1)))

    played_before = dev["played"]
    days_played = sum(1 for d in dev["dailies"] if 0 <= day - d < 14)
    last = "home"

    def one_round(kind, role, words, code, drawer_inks=None):
        nonlocal last
        rid = new_id()
        secs = 3.0 if kind == "daily" else float(rng.choice([2, 2.5, 3, 4, 5], p=[0.15, 0.15, 0.4, 0.2, 0.1]))
        if kind == "friend":
            secs = round_by_code[code]["secs"]
        r = dict(id=rid, visit_id=vid, started_at=start + t, kind=kind, role=role, code=None, day=day if kind == "daily" else None,
                 secs=secs, mode=None, lang=dev["lang"], input=None, words=json.dumps(words, ensure_ascii=False),
                 drawn_at=None, finished_at=None, score=None, recall_ms=None)
        rows = [dict(round_id=rid, idx=i, word=w) for i, w in enumerate(words)]
        inks = drawer_inks
        if role != "guesser":
            tap("home", "#dailyGo" if kind == "daily" else "#startGo", 0.5, 0.62 if kind == "daily" else 0.82)
            add("screen", screen="countdown"); add("screen", screen="draw")
            r["input"] = dev["input"]
            last = "draw"
            if rng.random() < 0.06:                       # gave up mid-drawing
                rounds.append(r); return None
            inks = []
            for i, w in enumerate(words):
                d = draw(w, secs, dev["input"] == "mouse")
                rows[i].update(d)
                inks.append(d["ink"])
                if d["clears"]:
                    tap("draw", "#clearPad", 0.5, 0.2)
            r["drawn_at"] = start + t
            add("screen", screen="between"); last = "between"
            if rng.random() < 0.08:
                rounds.append(r); items.extend(rows); return None
            tap("between", "#toRecall", 0.5, 0.66)
        add("screen", screen="choose"); last = "choose"
        mode = "pool" if rng.random() < 0.7 else "typed"
        tap("choose", "#choose button.mode", 0.5, 0.45 if mode == "pool" else 0.6)
        add("screen", screen="recall"); last = "recall"
        if code is None and role != "guesser":
            code = new_code()
        r.update(code=code, mode=mode)
        if rng.random() < 0.1:                            # left the grid unfinished
            rounds.append(r); items.extend(rows); return None
        order = rng.permutation(N)
        ink_z = (np.array(inks) - 1.2) / 0.5 if inks else np.zeros(N)
        clock, score = 0, 0
        for pos, i in enumerate(order):
            w = words[i]
            if role == "guesser":
                z = -0.2 + dev["skill"] + 0.8 * ink_z[i] + WORD_DIFF[w] + (1.1 if mode == "pool" else -0.2)
            else:
                z = 0.2 + dev["skill"] + serial(i) + 0.3 * (secs - 3) + WORD_DIFF[w] + (1.1 if mode == "pool" else -0.2)
            right = rng.random() < logistic(z)
            blank = not right and rng.random() < 0.15
            clock += int(rng.gamma(2, 1600) + (0 if right else rng.gamma(2, 900)))
            if right:
                ans, aw = w, w
            elif blank:
                ans, aw = "", None
            else:
                same = [x for x in words if FAMILY_OF[x] == FAMILY_OF[w] and x != w]
                other = [x for x in words if FAMILY_OF[x] != FAMILY_OF[w]]
                pool = same if (rng.random() < 0.75 and same) else other
                aw = str(rng.choice(pool))
                if mode == "typed" and rng.random() < 0.5:
                    ans, aw = str(rng.choice(ALL_WORDS)), None
                    aw = ans if ans in words else None
                else:
                    ans = aw
            tries = 0 if blank else 1 + int(rng.random() < (0.25 if not right else 0.07))
            rows[i].update(grid_pos=pos, answer=ans, answer_word=aw, correct=int(right),
                           answer_ms=None if blank else clock, tries=tries)
            score += right
            if not blank:
                if mode == "pool":
                    tap("recall", "#recallGrid canvas", 0.15 + 0.23 * (pos % 4), 0.2 + 0.13 * (pos // 4))
                    tap("recall", "#chips button.chip", rng.uniform(0.15, 0.85), rng.uniform(0.62, 0.9))
                else:
                    tap("recall", "#recallGrid canvas", 0.15 + 0.23 * (pos % 4), 0.2 + 0.13 * (pos // 4))
                    tap("recall", "#modalForm button", 0.75, 0.42)
        tap("recall", "#finish", 0.78, 0.95)
        tap("recall", "#finishYes", 0.5, 0.55)
        t_fin = start + t
        r.update(finished_at=t_fin, score=int(score), recall_ms=int(clock))
        add("screen", screen="result"); last = "result"
        rounds.append(r)
        items.extend(rows)
        if code:
            round_by_code.setdefault(code, {"secs": secs, "words": words, "inks": inks, "device": dev})
        return code

    if entry == "link":
        src = round_by_code[via]
        add("screen", screen="loading")
        if rng.random() < 0.85:
            one_round("friend", "guesser", src["words"], via, src["inks"])
        if last == "result" and rng.random() < 0.45:
            tap("result", "#again", 0.7, 0.9)
            add("screen", screen="home")
            last = "home"
    else:
        add("screen", screen="home")

    if last == "home" and rng.random() < 0.88:
        kind = "daily" if day not in dev["dailies"] and rng.random() < 0.8 else "unlimited"
        if kind == "daily":
            dev["dailies"].append(day)
        code = one_round(kind, "solo", deal(), None)
        if code and rng.random() < 0.32:
            add("share", how=str(rng.choice(["copy", "chip", "link"], p=[0.6, 0.25, 0.15])), code=code)
            tap("result", "#share", 0.3, 0.9)
            for _ in range(rng.poisson(1.3)):
                links_due.setdefault(day + int(rng.random() < 0.4), []).append(code)
        if code and rng.random() < 0.25:
            tap("result", "#again", 0.7, 0.9)
            one_round("unlimited", "solo", deal(), None)

    add("hide", screen=last)
    if rng.random() < 0.6:
        add("leave", screen=last)
    dev["played"] = True
    visits.append(dict(id=vid, started_at=start, last_at=start + t, day=day, local_hour=dev["hour"],
                       country=dev["country"], lang=dev["lang"], input=dev["input"], os=dev["os"],
                       width=dev["w"], height=h, entry=entry, via_code=via, played_before=int(played_before),
                       first_day=dev["first_day"] if played_before else None, days_played=days_played,
                       last_screen=last, left_at=start + t, events=len(ev)))
    for i in range(0, len(ev), 40):
        for e in ev[i:i + 40]:
            events.append(dict(visit_id=vid, seq=i // 40, **e))


for day in range(1, DAYS + 1):
    for _ in range(rng.poisson(6 + day * 0.25)):
        devices.append(make_device(day, False))
    today = []
    for dev in devices:
        if dev["first_day"] == day and not dev["by_link"]:
            today.append((dev, "home", None))
        elif dev["played"] and rng.random() < dev["ret"] * math.exp(-0.05 * (day - dev["first_day"])):
            today.append((dev, "home", None))
    for code in links_due.pop(day, []):
        dev = make_device(day, True)
        devices.append(dev)
        today.append((dev, "link", code))
    for dev, entry, via in today:
        play(dev, day, entry, via)

OUT.mkdir(parents=True, exist_ok=True)
tables = {"visits": visits, "events": events, "rounds": rounds, "round_items": items}
for name, rows in tables.items():
    pd.DataFrame(rows).to_csv(OUT / f"{name}.csv", index=False)
    print(f"{name:12} {len(rows):>8} rows")
print("written to", OUT)
