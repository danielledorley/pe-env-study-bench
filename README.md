# Study Bench — PE Environmental Exam Prep

A static flashcard + problem-set web app for studying for the PE Environmental exam.
No build step, no backend — just HTML/CSS/JS, deployable free on GitHub Pages.

## Run it locally
Open `index.html` in a browser, or serve the folder (needed for the JSON `fetch()` calls to work in some browsers):
```
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

## Deploy to GitHub Pages
```
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/pe-env-study-bench.git
git push -u origin main
```
Then in the repo on GitHub: **Settings → Pages → Source → Deploy from branch → main → / (root)**.
Your app will be live at `https://<your-username>.github.io/pe-env-study-bench/`.

If you'd rather keep it private, GitHub Pages works on private repos too if you're on a paid plan; otherwise just use it locally, or make the repo private and skip Pages.

## Content
Flashcards and problem sets are organized around the 8 folders from your course structure: Environmental Basics, Air and Solid Waste, Water Resources, Water Treatment, Wastewater, Site Assessment & Remediation, Environmental Health & Safety, and Project Management/Economics/Data Management.

- **193 flashcards** — a mix of originally-written cards covering the concepts your course materials touch on, plus cards built directly from your own Quizlet study sets (deduped across the overlapping sets you exported).
- **143 problems** across three difficulty levels (easy/medium/hard, roughly evenly split), each with a **Hint** button (a nudge toward the right concept, without naming the formula outright) and a full step-by-step walkthrough after you answer. Difficulty increases through unit conversions, unnamed formulas, multi-step chains, and extraneous data — not just uglier numbers. Every numeric answer was computed and cross-checked programmatically.
- Use the **Difficulty** and **Topic** filters together on the Problem Sets tab to target practice (e.g. "Site Assessment, Hard only").

## Progress dashboard
The **Progress** tab tracks flashcard mastery %, quiz accuracy % (per topic, and by difficulty under the hood), a day streak, and total days studied — all from your local browser storage, nothing sent anywhere. It also surfaces simple recommendations: topics under 70% quiz accuracy (with at least 3 attempts) get flagged, as do topics you haven't tried any problems in yet.

## Study Guide
A **Study Guide** tab holds a prose write-up for each topic — why the section matters, how its sub-concepts build on each other, and where it connects to other topics (e.g. how Darcy's Law in Water Resources reappears in Site Assessment with a retardation factor added, or how first-order decay shows up in BOD, disinfection, and radioactive decay alike). It's meant to be read straight through once per topic, not drilled like the flashcards. To edit or add to it, open `data/guide.json` — each key is a topic id, and the value is a small Markdown-like string (supports `## headings`, `**bold**`, and `- bullet` lists).

## Adding your own content
Everything lives in three JSON files under `data/` — no code changes needed:

- **`data/topics.json`** — the six exam-spec areas (Water, Air, Solid & Hazardous Waste, Site Assessment & Remediation, EHS, Associated Engineering Principles). Edit `color` per topic if you want.
- **`data/flashcards.json`** — array of `{ id, topic, front, back }`. `id` just needs to be unique. `topic` must match a topic `id`.
- **`data/problems.json`** — array of `{ id, topic, question, choices[], answerIndex, explanation }`.

Just append new objects to the arrays and refresh the page.

## A note on your source material
I seeded this with a handful of original example cards/problems (standard formulas and definitions — Darcy's Law, RCRA Subtitle C/D, benefit-cost ratio, etc.) so the app has something to show out of the box.

I didn't pull content from the PDFs in your "PE Exam Prep" Drive folder (the NCEES Reference Handbooks and School of PE course materials) — those are copyrighted and explicitly marked "not allowed to distribute to others." Copying that text into a repo — even a private one, since it leaves your machine — crosses into redistribution that NCEES and School of PE don't permit.

The fix is easy: when you build out your own cards, **write them in your own words** from what you've studied, rather than pasting handbook text. Formulas, definitions, and facts themselves aren't copyrightable — only NCEES's/School of PE's specific wording and layout are — so a card like "Darcy's Law: Q = -KA(dh/dl)" is totally fine; a paragraph lifted verbatim from the handbook isn't.

## Step-by-step walkthroughs
Any problem with a `steps` array (see `data/problems.json`) gets a "Show step-by-step walkthrough" button after you answer — it reveals the reasoning one basic step at a time (what formula to use, why, the arithmetic, a sanity check). To add walkthroughs to your own problems, give them a `steps` array of `{ "title": "...", "detail": "..." }` objects.

## Importing from Quizlet
Flashcards tab → **Import from Quizlet**. On Quizlet's website (not the app): open your set → ⋯ menu → **Export** → set "between term and definition" to comma and "between cards" to new line → **Copy text** → paste into the import box, pick a topic, and add. Imported cards are stored in your browser (`localStorage`, key `pe-study-custom-cards-v1`) alongside the built-in ones. To make them permanent (so they survive clearing browser data, or show up if you redeploy), copy them into `data/flashcards.json` — open your browser's dev console and run `localStorage.getItem('pe-study-custom-cards-v1')` to get the JSON to paste in.

## Progress tracking
Flashcard progress uses a simple 5-box leitner system stored in your browser's `localStorage` (key `pe-study-progress-v1`) — cards you get right move to a higher box and come back less often; cards you miss reset to box 0. This is per-browser, not synced anywhere.
