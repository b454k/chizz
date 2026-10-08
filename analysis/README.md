# chizz analysis

How people draw and remember, from the game's own analytics. The notebook,
[`chizz.ipynb`](chizz.ipynb), works through ten questions:

| # | question | method |
|---|---|---|
| 1 | where do players stop? | funnel over screens, end screens |
| 2 | is the first word remembered best, and the last? | serial position curve, logistic regression with round-clustered errors |
| 3 | does more time per word help? | accuracy by seconds, logistic regression (observational) |
| 4 | does hesitation predict a wrong answer? | ROC AUC of tries, answer time, answer order |
| 5 | do mistakes stay inside the silhouette family? | binomial test against the 9/19 blind-guess baseline, family confusion matrix |
| 6 | which words are hardest to remember, and to draw? | empirical-Bayes shrunk accuracy per word |
| 7 | touch vs mouse, language, time of day | Mann-Whitney, logistic regression, quintiles of ink |
| 8 | do players come back? | cohort retention on the once-a-day daily round |
| 9 | do shared links bring new players? | viral funnel, k-factor, chain depth |
| 10 | can a model recognise the drawings? | 28×28 rasters, logistic regression and MLP, round-grouped split, model vs people |

The data is anonymous by design: no accounts, no device id, no IP addresses. What is
recorded is set out in [`public/privacy.html`](../public/privacy.html), and the tables in
[`migrations/0001_analytics.sql`](../migrations/0001_analytics.sql).

## Running it

```bash
py -m venv analysis/.venv
analysis/.venv/Scripts/python -m pip install -r analysis/requirements.txt
```

**With real data.** Export the live database (needs `npx wrangler login` once, and the
database id, which is never committed):

```bash
CHIZZ_D1_ID=<id from `npx wrangler d1 list`> analysis/.venv/Scripts/python analysis/export_data.py --remote
```

**Before there is real data.** `fake_data.py` writes a synthetic dataset of the same shape
with known effects planted in it: primacy and recency, a time-per-word effect,
same-family confusions, an ink effect on recognition, retention decay, share chains, and
one deliberate *null* (language). Running the notebook on it checks that each method finds
what is there and nothing that is not:

```bash
cd analysis
.venv/Scripts/python fake_data.py
CHIZZ_DATA=data-fake .venv/Scripts/jupyter lab chizz.ipynb
```

Exports land in `analysis/data/` and `analysis/data-fake/`. Both are ignored by git and
never published: they hold every player's drawings.

The notebook also writes the drawings in Google's Quick, Draw! `ndjson` format, for
training elsewhere.
