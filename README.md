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

- **228 flashcards** — originally-written cards covering your course concepts, cards built from your own Quizlet study sets, and cards mined from the concepts covered in your Live Course folder (DNAPL/LNAPL, remediation technology types, Reynolds number, orifice discharge, Phase I/II ESA specifics, and more) — not copied text, just the underlying ideas rewritten fresh.
- **147 problems** across three difficulty levels (easy/medium/hard), each with a **Hint** button and a full step-by-step walkthrough after you answer. Every numeric answer was computed and cross-checked programmatically.
- Use the **Difficulty** and **Topic** filters together on the Problem Sets tab to target practice.

## Design
Bright, clean, professional look with your initials as the header mark. Color tokens live at the top of `styles.css` (`:root`) — change `--slate` to re-theme the header/buttons, or edit each topic's `color` in `data/topics.json` to re-theme that topic's accent everywhere (cards, flashcards, problem eyebrows, guide headings, progress bars all pull from the same value). Fonts: Space Grotesk (headings), Inter (body), IBM Plex Mono (data/formulas) — all loaded from Google Fonts in `index.html`.

## Progress dashboard
The **Progress** tab tracks flashcard mastery %, quiz accuracy % (per topic, and by difficulty under the hood), a day streak, and total days studied — all from your local browser storage, nothing sent anywhere. It also surfaces simple recommendations: topics under 70% quiz accuracy (with at least 3 attempts) get flagged, as do topics you haven't tried any problems in yet.

## Study Guide
A long-form, section-by-section guide for each topic (roughly 1,000-1,700 words per topic, ~10,400 words total) — concepts, the principles behind them, real-world application, and exam strategy, not just a formula list. Each topic opens with an "On this page" jump-nav built automatically from its `## ` section headings, so you can read straight through or jump to a specific part. Meant to be read in a sitting, not drilled like flashcards. To edit, open `data/guide.json` — each key is a topic id; use `## Section Name` for a navigable top-level section and `### Subheading` for a smaller breakdown within one (supports `**bold**` and `- bullet` lists too).

## Multi-user sync (study group)
By default, progress is saved per-browser (localStorage) — fine for one person on one device, but it won't follow anyone across devices or separate multiple people sharing a link. To get real per-person, cross-device progress tracking for you and your study group, set up a free Firebase project (Google's backend-as-a-service — the free tier comfortably covers a small study group: 50,000 reads and 20,000 writes per day).

**1. Create the Firebase project**
- Go to [console.firebase.google.com](https://console.firebase.google.com/), sign in with any Google account.
- Click **Add project**. Name it anything (e.g. `pe-study-bench`). You can decline Google Analytics — not needed.

**2. Register a web app**
- On the project's main page, click the **`</>`** (web) icon to add a web app.
- Give it a nickname, skip Firebase Hosting (you're already using GitHub Pages).
- It'll show you a config object with `apiKey`, `authDomain`, etc. — copy those values into `firebase-config.js` in this project, replacing the placeholders.

**3. Turn on Google sign-in**
- In the left sidebar: **Build → Authentication → Get started**.
- On the **Sign-in method** tab, click **Google**, toggle it **Enable**, pick a support email, **Save**.

**4. Create the database**
- **Build → Firestore Database → Create database**.
- Pick a region close to you (e.g. `us-east1`), leave the rest default, click **Enable**.

**5. Lock the database down so people can only see their own progress**
- Still in Firestore, click the **Rules** tab, replace everything with:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```
- Click **Publish**.

**6. Authorize your GitHub Pages domain**
- **Build → Authentication → Settings → Authorized domains → Add domain**.
- Add your site's domain, e.g. `your-username.github.io` (no `https://`, no trailing slash).

**7. Push the config**
- Paste your real config values into `firebase-config.js`, then commit and push (GitHub Desktop: it'll show up as a changed file — commit, push, done).

That's it. Once live, a **"Sign in to sync progress"** button appears in the header. Each person who signs in with their own Google account gets their own private, cross-device progress — nobody can see anyone else's data (that's what the security rule in step 5 enforces). If someone had already been using the app before signing in, their in-browser progress becomes the starting point for their synced account automatically on first sign-in.

If you never do this setup, the app works exactly as before — local-only, no sign-in button shown.

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


### Mixed PE practice and miss classification

The problem set includes a dedicated **Mixed PE** mode that hides the topic/method cue so you practice recognizing the correct approach before calculating. Incorrect answers can also be classified by cause (concept, method recognition, units, arithmetic, misread, setup, or careless mistake); the Progress view summarizes those categories.
