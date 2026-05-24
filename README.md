# CLANK FIGHTS

**Markov chain robot rap battle simulator.**  
Two stupid robots spit bars at each other for 3 rounds. A third stupid robot judges them with numeric scores and calls it GOOD or BAD.

Zero dependencies. Open `index.html` or run a local server. Pure client-side Markov chains. Gloriously dumb.

## How to run

```bash
# Option 1: just open the file
open index.html

# Option 2: local server (recommended)
python3 -m http.server 8765
# then visit http://localhost:8765
```

Or use any static file server. No build step. No node_modules. No blockchain.

## Docker (because everything must be containerized)

```bash
# One-command glory
docker compose up --build

# Then open http://localhost:8080
```

Or the classic way:

```bash
docker build -t clank-fights .
docker run -d -p 8080:80 --name clank-fights clank-fights
# open http://localhost:8080
```

The image is tiny (~25MB) because it uses `nginx:alpine` and only ships the actual web files.

Stopping it later:

```bash
docker compose down
# or
docker stop clank-fights && docker rm clank-fights
```

Yes, your robot rap battles now run in a container. The future is here.

## How it works (the stupid tech)

- Every fighter is a **word-level 2-gram Markov chain** trained on lovingly terrible robot-themed rap lyrics.
- The generator walks the chain, occasionally forces a rhyme attempt, and chunks the output into "bars".
- **Scoring** (the "backend"):
  - **Words Used** — lexical diversity + long words + robot vocabulary hits
  - **Clarity** — average Markov transition probability (how "confident" the bot was in its own style)
  - **Meaning** — rhyme density between lines + keyword aggression (clank, rust, your mom is a toaster, etc.)
- The **Judge** is also a Markov bot, trained on rap battle judge energy. It reads the scores and delivers a roast + a big `GOOD 187/300` or `BAD 63/300` stamp.
- 3 rounds. ~28 seconds of real time per round that *feels* like 2 minutes of performance because lines are revealed with timing.
- Mechanical failures, cumulative totals, final winner declaration.

Everything happens in the browser. You can inspect the console and see the raw fight object by pressing `?` during a battle.

## Making it worse (recommended)

Click around the training data? Not yet exposed in v0.9, but the corpora live in `src/bots.js`. Change five words in any robot's `corpus` string, reload, and watch the personality shift instantly.

Future versions will let you live-edit the training text in the UI and hit "RETRAIN" between rounds.

## Why does this exist?

Because someone said "I want a stupid fighting simulator between robots" and here we are.

The first time you see `CLANK-47` drop a line about your motherboard and the judge calls it `BAD 71/300`, you will understand.

## Future stupid ideas

- Live "Training Bay" textareas so you can mutate the bots mid-session
- "Intervene" box — type one bar for your fighter in real time (risk/reward)
- More robots (especially evil ones)
- Shareable fight URLs (state in hash)
- Sound pack + better failure events
- "Hall of Clank" localStorage leaderboard of your greatest roasts
- Tauri/Electron wrapper so it feels like a real desktop app called `clank-fights`

## Credits

Hand-crafted Markov chains and terrible robot puns.

---

**Now go throw down.** 🤖🥊🗑️