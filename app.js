const STORAGE_KEY = 'pe-study-progress-v1';
const CUSTOM_CARDS_KEY = 'pe-study-custom-cards-v1';

const state = {
  topics: [],
  flashcards: [],
  problems: [],
  guide: {},
  view: 'home',
  progress: loadProgress(),
  session: null, // active flashcard or problem session
};

function loadCustomCards() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CARDS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCustomCards(cards) {
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
}

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return { cards: p.cards || {}, problems: p.problems || {}, activityDates: p.activityDates || [], mistakeTypes: p.mistakeTypes || {}, mistakeByProblem: p.mistakeByProblem || {} };
  } catch (e) {
    return { cards: {}, problems: {}, activityDates: [], mistakeTypes: {}, mistakeByProblem: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  if (state.user && firestoreDb) {
    firestoreDb.collection('users').doc(state.user.uid).set(state.progress).catch((e) => {
      console.error('Cloud sync failed, progress is still saved locally:', e);
    });
  }
}

function recordActivity() {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.progress.activityDates.includes(today)) {
    state.progress.activityDates.push(today);
  }
}

function recordProblemResult(topicId, difficulty, correct) {
  if (!state.progress.problems[topicId]) state.progress.problems[topicId] = {};
  if (!state.progress.problems[topicId][difficulty]) state.progress.problems[topicId][difficulty] = { attempted: 0, correct: 0 };
  state.progress.problems[topicId][difficulty].attempted += 1;
  if (correct) state.progress.problems[topicId][difficulty].correct += 1;
  recordActivity();
  saveProgress();
}

function recordMistakeType(problemId, mistakeType) {
  if (!state.progress.mistakeTypes) state.progress.mistakeTypes = {};
  if (!state.progress.mistakeTypes[mistakeType]) state.progress.mistakeTypes[mistakeType] = 0;
  state.progress.mistakeTypes[mistakeType] += 1;
  if (!state.progress.mistakeByProblem) state.progress.mistakeByProblem = {};
  state.progress.mistakeByProblem[problemId] = mistakeType;
  saveProgress();
}

function topicById(id) {
  return state.topics.find(t => t.id === id) || { name: id, color: '#0B84B0' };
}

/* ---------- FIREBASE AUTH & SYNC ---------- */
state.user = null;
state.firebaseReady = false;
let firestoreDb = null;

function firebaseConfigured() {
  return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
}

function initAuth() {
  if (!firebaseConfigured() || typeof firebase === 'undefined') {
    renderAuthArea();
    return; // local-only mode — no Firebase project configured yet
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    firestoreDb = firebase.firestore();
    state.firebaseReady = true;
    firebase.auth().onAuthStateChanged(async (user) => {
      state.user = user;
      if (user) {
        await pullProgressFromCloud(user.uid);
      } else {
        state.progress = loadProgress();
      }
      renderAuthArea();
      render();
    });
  } catch (e) {
    console.error('Firebase init failed:', e);
  }
  renderAuthArea();
}

async function pullProgressFromCloud(uid) {
  try {
    const doc = await firestoreDb.collection('users').doc(uid).get();
    if (doc.exists) {
      const cloud = doc.data();
      state.progress = { cards: cloud.cards || {}, problems: cloud.problems || {}, activityDates: cloud.activityDates || [] };
    } else {
      // First time this account has signed in — seed the cloud with whatever's in this browser already.
      await firestoreDb.collection('users').doc(uid).set(state.progress);
    }
  } catch (e) {
    console.error('Could not load cloud progress, staying on local copy:', e);
  }
}

function signIn() {
  if (!state.firebaseReady) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch((e) => {
    console.error('Sign-in failed:', e);
    alert('Sign-in did not go through — check that this site\'s domain is added under Firebase Authentication → Settings → Authorized domains.');
  });
}

function signOutUser() {
  if (!state.firebaseReady) return;
  firebase.auth().signOut();
}

function renderAuthArea() {
  const el = document.getElementById('auth-area');
  if (!el) return;
  if (!firebaseConfigured()) {
    el.innerHTML = '';
    return;
  }
  if (state.user) {
    const name = state.user.displayName || state.user.email || 'You';
    const initial = name.trim().charAt(0).toUpperCase();
    el.innerHTML = `
      <div class="auth-user">
        <span class="auth-avatar">${initial}</span>
        <span>${name.split(' ')[0]}</span>
        <button class="auth-signout" id="sign-out-btn">Sign out</button>
      </div>
    `;
    document.getElementById('sign-out-btn').addEventListener('click', signOutUser);
  } else {
    el.innerHTML = `<button class="auth-btn" id="sign-in-btn">Sign in to sync progress</button>`;
    document.getElementById('sign-in-btn').addEventListener('click', signIn);
  }
}

async function loadData() {
  const [topics, flashcards, problems, guide] = await Promise.all([
    fetch('data/topics.json').then(r => r.json()),
    fetch('data/flashcards.json').then(r => r.json()),
    fetch('data/problems.json').then(r => r.json()),
    fetch('data/guide.json').then(r => r.json()),
  ]);
  state.topics = topics;
  state.flashcards = flashcards.concat(loadCustomCards());
  state.problems = problems;
  state.guide = guide;
}

function setView(view) {
  state.view = view;
  state.session = null;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  render();
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (btn) setView(btn.dataset.view);
});

function render() {
  const app = document.getElementById('app');
  if (state.view === 'home') return renderHome(app);
  if (state.view === 'guide') return renderGuideHub(app);
  if (state.view === 'flashcards') return renderFlashcardsHub(app);
  if (state.view === 'problems') return renderProblemsHub(app);
  if (state.view === 'progress') return renderProgressHub(app);
}

/* ---------- HOME ---------- */
function renderHome(app) {
  const cardsDue = countDueCards();
  app.innerHTML = `
    <h1 class="hero">Study Bench</h1>
    <p class="hero-sub">Flashcards and problem sets for the PE Environmental exam, organized by NCEES exam-spec area. ${cardsDue} card${cardsDue === 1 ? '' : 's'} due for review today.</p>
    <div class="topic-grid">
      ${state.topics.map(t => renderTopicCard(t)).join('')}
    </div>
  `;
  app.querySelectorAll('[data-action="study-topic"]').forEach(btn => {
    btn.addEventListener('click', () => startFlashcardSession(btn.dataset.topic));
  });
  app.querySelectorAll('[data-action="quiz-topic"]').forEach(btn => {
    btn.addEventListener('click', () => startProblemSession(btn.dataset.topic));
  });
}

function renderTopicCard(t) {
  const cards = state.flashcards.filter(c => c.topic === t.id);
  const probs = state.problems.filter(p => p.topic === t.id);
  const known = cards.filter(c => (state.progress.cards[c.id]?.box || 0) >= 3).length;
  const pct = cards.length ? Math.round((known / cards.length) * 100) : 0;
  return `
    <div class="topic-card" style="--accent:${t.color}">
      <h3>${t.name}</h3>
      <p>${t.description}</p>
      <div class="topic-stats">
        <span>${cards.length} cards</span>
        <span>${probs.length} problems</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="row">
        <button class="btn primary small" data-action="study-topic" data-topic="${t.id}" ${cards.length ? '' : 'disabled'}>Study cards</button>
        <button class="btn small" data-action="quiz-topic" data-topic="${t.id}" ${probs.length ? '' : 'disabled'}>Quiz</button>
      </div>
    </div>
  `;
}

function countDueCards() {
  const today = Date.now();
  return state.flashcards.filter(c => {
    const p = state.progress.cards[c.id];
    return !p || p.due <= today;
  }).length;
}

/* ---------- FLASHCARDS HUB ---------- */
function renderFlashcardsHub(app) {
  app.innerHTML = `
    <h1 class="hero">Flashcards</h1>
    <p class="hero-sub">Pick a topic, or study everything due today.</p>
    <div class="row between" style="margin-bottom:14px;">
      <div class="filter-chips" style="margin-bottom:0;">
        <button class="chip" data-topic="">All topics</button>
        ${state.topics.map(t => `<button class="chip" data-topic="${t.id}">${t.name}</button>`).join('')}
      </div>
      <button class="btn small" id="toggle-import">Import from Quizlet</button>
    </div>
    <div id="import-panel" style="display:none;"></div>
    <div id="flashcard-session"></div>
  `;
  app.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => startFlashcardSession(chip.dataset.topic));
  });
  document.getElementById('toggle-import').addEventListener('click', () => {
    const panel = document.getElementById('import-panel');
    const showing = panel.style.display !== 'none';
    panel.style.display = showing ? 'none' : 'block';
    if (!showing) renderImportPanel(panel);
  });
  startFlashcardSession('');
}

function renderImportPanel(panel) {
  panel.innerHTML = `
    <div class="problem-card" style="margin-bottom:20px;">
      <div class="eyebrow">Import from Quizlet</div>
      <p style="font-size:0.85rem; color:#55707F; margin-top:0;">
        On Quizlet (website, not the app): open your set → ⋯ menu → <strong>Export</strong> → choose "between term and definition" = <strong>comma</strong>, "between cards" = <strong>new line</strong> → Copy text. Paste it below.
      </p>
      <textarea id="import-text" rows="8" style="width:100%; font-family:var(--mono); font-size:0.82rem; padding:10px; border:1px solid var(--line); border-radius:7px; background:var(--paper-raised);" placeholder="term,definition&#10;term,definition&#10;..."></textarea>
      <div class="row" style="margin-top:12px;">
        <label style="font-family:var(--mono); font-size:0.75rem;">Assign to topic:
          <select id="import-topic" style="margin-left:6px; font-family:var(--mono); padding:4px;">
            ${state.topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </label>
        <button class="btn primary small" id="do-import">Add cards</button>
      </div>
      <div id="import-result" style="margin-top:10px; font-family:var(--mono); font-size:0.78rem;"></div>
    </div>
  `;
  document.getElementById('do-import').addEventListener('click', () => {
    const raw = document.getElementById('import-text').value.trim();
    const topic = document.getElementById('import-topic').value;
    const resultEl = document.getElementById('import-result');
    if (!raw) { resultEl.textContent = 'Paste some text first.'; return; }
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const newCards = [];
    lines.forEach((line, i) => {
      // Split on first comma or tab — whichever the export used
      const sep = line.includes('\t') ? '\t' : ',';
      const idx = line.indexOf(sep);
      if (idx === -1) return;
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + 1).trim();
      if (front && back) {
        newCards.push({ id: `custom-${Date.now()}-${i}`, topic, front, back });
      }
    });
    if (!newCards.length) {
      resultEl.textContent = 'Couldn\'t parse any cards — check the separator matches what you exported.';
      return;
    }
    const existing = loadCustomCards();
    const merged = existing.concat(newCards);
    saveCustomCards(merged);
    state.flashcards = state.flashcards.concat(newCards);
    resultEl.textContent = `Added ${newCards.length} card${newCards.length === 1 ? '' : 's'} to ${topicById(topic).name}. They're saved in this browser — see the README to make them permanent in data/flashcards.json.`;
    document.getElementById('import-text').value = '';
  });
}

function startFlashcardSession(topicId) {
  let pool = topicId ? state.flashcards.filter(c => c.topic === topicId) : state.flashcards.slice();
  if (!pool.length) {
    renderSessionEmpty('No flashcards in this topic yet — add some to data/flashcards.json.');
    return;
  }
  // Prioritize due / never-seen cards, shuffle within priority
  const today = Date.now();
  pool.sort((a, b) => {
    const pa = state.progress.cards[a.id];
    const pb = state.progress.cards[b.id];
    const dueA = !pa || pa.due <= today ? 0 : 1;
    const dueB = !pb || pb.due <= today ? 0 : 1;
    return dueA - dueB || Math.random() - 0.5;
  });
  state.session = { type: 'flashcards', queue: pool, index: 0, flipped: false, topicId };
  ensureSessionMount();
  renderFlashcardSession();
}

function ensureSessionMount() {
  if (state.view !== 'flashcards') setViewSilently('flashcards');
  let mount = document.getElementById('flashcard-session');
  if (!mount) {
    // full view wasn't rendered (e.g. called from home) — render hub shell first
    renderFlashcardsHub(document.getElementById('app'));
  }
}

function setViewSilently(view) {
  state.view = view;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
}

function renderFlashcardSession() {
  const mount = document.getElementById('flashcard-session');
  const s = state.session;
  if (!mount || !s) return;
  if (s.index >= s.queue.length) {
    mount.innerHTML = `<div class="empty-state">Session complete — ${s.queue.length} card${s.queue.length === 1 ? '' : 's'} reviewed.<br><br><button class="btn primary" id="restart-session">Study again</button></div>`;
    document.getElementById('restart-session').addEventListener('click', () => startFlashcardSession(s.topicId));
    return;
  }
  const card = s.queue[s.index];
  const t = topicById(card.topic);
  mount.innerHTML = `
    <div class="session-bar"><span>Card ${s.index + 1} of ${s.queue.length}</span><span>${t.name}</span></div>
    <div class="card-stage">
      <div class="flashcard" style="--accent:${t.color}" id="flip-target">
        <div class="eyebrow">${s.flipped ? 'Answer' : 'Question'}</div>
        <div class="content">${s.flipped ? card.back : card.front}</div>
        <div class="hint">tap to flip</div>
      </div>
    </div>
    <div class="grade-row">
      ${s.flipped ? `
        <button class="grade-btn again" id="grade-again">Again</button>
        <button class="grade-btn good" id="grade-good">Got it</button>
      ` : `<button class="btn" id="reveal-btn">Show answer</button>`}
    </div>
  `;
  document.getElementById('flip-target').addEventListener('click', () => {
    s.flipped = !s.flipped;
    renderFlashcardSession();
  });
  const revealBtn = document.getElementById('reveal-btn');
  if (revealBtn) revealBtn.addEventListener('click', (e) => { e.stopPropagation(); s.flipped = true; renderFlashcardSession(); });
  const again = document.getElementById('grade-again');
  const good = document.getElementById('grade-good');
  if (again) again.addEventListener('click', (e) => { e.stopPropagation(); gradeCard(card, false); });
  if (good) good.addEventListener('click', (e) => { e.stopPropagation(); gradeCard(card, true); });
}

function gradeCard(card, gotIt) {
  const p = state.progress.cards[card.id] || { box: 0 };
  const box = gotIt ? Math.min((p.box || 0) + 1, 4) : 0;
  const intervalDays = [0, 1, 3, 7, 21][box];
  state.progress.cards[card.id] = { box, due: Date.now() + intervalDays * 86400000 };
  recordActivity();
  saveProgress();
  state.session.index += 1;
  state.session.flipped = false;
  renderFlashcardSession();
}

function renderSessionEmpty(msg) {
  ensureSessionMount();
  document.getElementById('flashcard-session').innerHTML = `<div class="empty-state">${msg}</div>`;
}

/* ---------- PROBLEM SETS ---------- */
function renderProblemsHub(app) {
  app.innerHTML = `
    <h1 class="hero">Problem Sets</h1>
    <p class="hero-sub">Multiple-choice practice with worked explanations. Formulas aren't named in the questions — tap Hint if you get stuck.</p>
    <div class="filter-row">
      <div>
        <span class="filter-group-label">Topic</span>
        <div class="filter-chips" id="topic-chips" style="margin-bottom:0;">
          <button class="chip active" data-topic="">All topics</button>
          <button class="chip" data-topic="mixed">Mixed PE</button>
          ${state.topics.map(t => `<button class="chip" data-topic="${t.id}">${t.name}</button>`).join('')}
        </div>
      </div>
      <div>
        <span class="filter-group-label">Difficulty</span>
        <div class="filter-chips" id="difficulty-chips" style="margin-bottom:0;">
          <button class="chip difficulty active" data-difficulty="">All levels</button>
          <button class="chip difficulty easy" data-difficulty="easy">Easy</button>
          <button class="chip difficulty medium" data-difficulty="medium">Medium</button>
          <button class="chip difficulty hard" data-difficulty="hard">Hard</button>
        </div>
      </div>
    </div>
    <div id="problem-session"></div>
  `;
  state.problemFilters = { topic: '', difficulty: '' };
  app.querySelectorAll('#topic-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      app.querySelectorAll('#topic-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.problemFilters.topic = chip.dataset.topic;
      startProblemSession(state.problemFilters.topic, state.problemFilters.difficulty);
    });
  });
  app.querySelectorAll('#difficulty-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      app.querySelectorAll('#difficulty-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.problemFilters.difficulty = chip.dataset.difficulty;
      startProblemSession(state.problemFilters.topic, state.problemFilters.difficulty);
    });
  });
  startProblemSession('', '');
}

function startProblemSession(topicId, difficulty) {
  let pool = state.problems.slice();
  if (topicId) pool = pool.filter(p => p.topic === topicId);
  if (difficulty) pool = pool.filter(p => p.difficulty === difficulty);
  if (state.view !== 'problems') setViewSilently('problems');
  let mount = document.getElementById('problem-session');
  if (!mount) { renderProblemsHub(document.getElementById('app')); mount = document.getElementById('problem-session'); }
  if (!pool.length) {
    mount.innerHTML = `<div class="empty-state">No problems match this filter yet.</div>`;
    return;
  }
  pool = pool.sort(() => Math.random() - 0.5);
  state.session = { type: 'problems', queue: pool, index: 0, answered: false, correctCount: 0, topicId, difficulty, hintShown: false };
  renderProblemSession();
}

function renderProblemSession() {
  const mount = document.getElementById('problem-session');
  const s = state.session;
  if (!mount || !s) return;
  if (s.index >= s.queue.length) {
    mount.innerHTML = `<div class="empty-state">Quiz complete — ${s.correctCount} / ${s.queue.length} correct.<br><br><button class="btn primary" id="restart-quiz">Try again</button></div>`;
    document.getElementById('restart-quiz').addEventListener('click', () => startProblemSession(s.topicId, s.difficulty));
    return;
  }
  const prob = s.queue[s.index];
  const t = topicById(prob.topic) || { id: 'mixed', name: 'Mixed PE', color: '#6B8494' };
  s.hintShown = false;
  mount.innerHTML = `
    <div class="session-bar"><span>Question ${s.index + 1} of ${s.queue.length} · <span style="text-transform:capitalize">${prob.difficulty || ''}</span></span><span>Score: ${s.correctCount}/${s.index}</span></div>
    <div class="problem-card" style="--accent:${t.color}">
      ${prob.mixed ? '<div class="eyebrow">Mixed PE — identify the method</div>' : `<div class="eyebrow">${t.name}</div>`}
      <div class="problem-question">${prob.question}</div>
      ${prob.choices.map((c, i) => `<button class="choice" data-index="${i}">${c}</button>`).join('')}
      <div id="hint-slot"></div>
      <div id="explanation-slot"></div>
      <div id="walkthrough-slot"></div>
    </div>
    <div class="session-controls" style="margin-top:16px;">
      ${prob.hint ? '<button class="btn small" id="hint-btn">💡 Hint</button>' : ''}
      <button class="btn" id="next-question" style="display:none;">Next question →</button>
    </div>
  `;
  mount.querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => answerProblem(prob, parseInt(btn.dataset.index, 10)));
  });
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      document.getElementById('hint-slot').innerHTML = `<div class="hint-box">💡 ${renderMath(prob.hint)}</div>`;
      hintBtn.style.display = 'none';
    });
  }
}

function answerProblem(prob, chosenIndex) {
  const s = state.session;
  if (s.answered) return;
  s.answered = true;
  const correct = chosenIndex === prob.answerIndex;
  if (correct) s.correctCount += 1;
  recordProblemResult(prob.topic, prob.difficulty || 'medium', correct);
  document.querySelectorAll('.choice').forEach((btn, i) => {
    btn.disabled = true;
    if (i === prob.answerIndex) btn.classList.add('correct');
    else if (i === chosenIndex) btn.classList.add('incorrect');
  });
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) hintBtn.style.display = 'none';
  document.getElementById('explanation-slot').innerHTML = `<div class="explanation">${renderMath(prob.explanation || '')}</div>`;
  if (!correct) {
    document.getElementById('explanation-slot').innerHTML += `
      <div class="mistake-box" style="margin-top:12px;">
        <strong>What caused the miss?</strong>
        <div class="mistake-options">
          ${['concept','method','units','arithmetic','misread','setup','careless'].map(x => `<button class="btn small mistake-choice" data-mistake="${x}">${({concept:'Didn\'t know concept',method:'Didn\'t recognize method',units:'Unit conversion',arithmetic:'Arithmetic/calculator',misread:'Misread question',setup:'Formula/setup',careless:'Careless mistake'})[x]}</button>`).join('')}
        </div>
      </div>`;
    document.querySelectorAll('.mistake-choice').forEach(btn => btn.addEventListener('click', () => {
      recordMistakeType(prob.id, btn.dataset.mistake);
      document.querySelectorAll('.mistake-choice').forEach(b => b.disabled = true);
      btn.classList.add('primary');
    }));
  }
  if (prob.steps && prob.steps.length) {
    document.getElementById('walkthrough-slot').innerHTML = `
      <button class="btn small" id="show-walkthrough" style="margin-top:12px;">Show step-by-step walkthrough</button>
      <div id="walkthrough-steps" style="margin-top:10px;"></div>
    `;
    document.getElementById('show-walkthrough').addEventListener('click', (e) => {
      e.target.style.display = 'none';
      startWalkthrough(prob);
    });
  }
  const nextBtn = document.getElementById('next-question');
  nextBtn.style.display = 'inline-block';
  nextBtn.addEventListener('click', () => {
    s.index += 1;
    s.answered = false;
    renderProblemSession();
  });
}

function renderMath(text) {
  if (!text) return '';
  const parts = String(text).split(/(\$[^$]+\$)/g);
  const html = parts.map(part => {
    if (part.length > 1 && part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      try {
        return (typeof katex !== 'undefined')
          ? katex.renderToString(latex, { throwOnError: false, displayMode: false })
          : latex;
      } catch (e) {
        return latex;
      }
    }
    return part
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }).join('');
  return html.replace(/\n/g, '<br>');
}

function startWalkthrough(prob) {
  let revealed = 0;
  const steps = prob.steps || [];
  const mount = document.getElementById('walkthrough-steps');

  let introHtml = '';
  if (prob.concept) introHtml += `<div class="walkthrough-concept">${renderMath(prob.concept)}</div>`;
  if (prob.diagram) {
    const trimmed = String(prob.diagram).trim();
    if (trimmed.toLowerCase().startsWith('<svg')) {
      introHtml += `<div class="walkthrough-diagram-svg">${trimmed}</div>`;
    } else {
      introHtml += `<pre class="walkthrough-diagram">${trimmed.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`;
    }
  }

  function draw() {
    let html = introHtml;
    html += steps.slice(0, revealed + 1).map((s, i) => `
      <div class="walkthrough-step">
        <div class="walkthrough-step-title">Step ${i + 1}: ${s.title}</div>
        <div class="walkthrough-step-detail">${renderMath(s.detail)}</div>
      </div>
    `).join('');
    if (revealed + 1 < steps.length) {
      html += `<button class="btn small" id="next-step" style="margin-top:10px;">Next step →</button>`;
    } else {
      if (prob.shortcut) html += `<div class="callout-box shortcut"><strong>Shortcut for next time:</strong> ${renderMath(prob.shortcut)}</div>`;
      if (prob.gotcha) html += `<div class="callout-box gotcha"><strong>Don't do this:</strong> ${renderMath(prob.gotcha)}</div>`;
    }
    mount.innerHTML = html;
    const nextStepBtn = document.getElementById('next-step');
    if (nextStepBtn) nextStepBtn.addEventListener('click', () => { revealed += 1; draw(); });
  }
  draw();
}

/* ---------- STUDY GUIDE ---------- */
function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let sectionIndex = 0;
  const toc = [];
  const inline = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  function closeList() { if (inList) { html += '</ul>'; inList = false; } }
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { closeList(); return; }
    if (line.startsWith('## ')) {
      closeList();
      const id = `sec-${sectionIndex++}`;
      const title = inline(line.slice(3));
      toc.push({ id, title });
      html += `<h3 id="${id}">${title}</h3>`;
      return;
    }
    if (line.startsWith('### ')) { closeList(); html += `<h4>${inline(line.slice(4))}</h4>`; return; }
    if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
      return;
    }
    closeList();
    html += `<p>${inline(line)}</p>`;
  });
  closeList();
  return { html, toc };
}

function renderGuideHub(app) {
  app.innerHTML = `
    <h1 class="hero">Study Guide</h1>
    <p class="hero-sub">Long-form explanations of concepts, principles, real-world application, and exam strategy for each topic — meant to be read straight through, not drilled like flashcards.</p>
    <div class="guide-topic-list" id="guide-topic-list"></div>
  `;
  const list = document.getElementById('guide-topic-list');
  state.topics.forEach(t => {
    const item = document.createElement('div');
    item.className = 'guide-topic-item';
    item.style.setProperty('--accent', t.color);
    item.innerHTML = `<span>${t.name}</span><span class="arrow">read \u2192</span>`;
    item.addEventListener('click', () => renderGuideArticle(t.id));
    list.appendChild(item);
  });
}

function renderGuideArticle(topicId) {
  const app = document.getElementById('app');
  const t = topicById(topicId);
  const md = state.guide[topicId] || 'No guide written for this topic yet.';
  const { html, toc } = mdToHtml(md);
  app.innerHTML = `
    <button class="btn small guide-back-btn" id="guide-back">\u2190 All topics</button>
    <h1 class="hero" style="color:${t.color}">${t.name}</h1>
    ${toc.length ? `
      <nav class="guide-toc" style="--accent:${t.color}">
        <span class="guide-toc-label">On this page</span>
        <div class="guide-toc-links">
          ${toc.map(s => `<button class="guide-toc-link" data-target="${s.id}">${s.title}</button>`).join('')}
        </div>
      </nav>
    ` : ''}
    <div class="guide-article">${html}</div>
  `;
  document.getElementById('guide-back').addEventListener('click', () => renderGuideHub(app));
  app.querySelectorAll('.guide-toc-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ---------- PROGRESS DASHBOARD ---------- */
function computeStreak() {
  const dates = new Set(state.progress.activityDates);
  if (dates.size === 0) return 0;
  const today = new Date();
  let streak = 0;
  let cursor = new Date(today);
  // allow the streak to still count if today has no activity yet, starting from yesterday
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderProgressHub(app) {
  const totalCardsSeen = Object.keys(state.progress.cards).length;
  const totalCards = state.flashcards.length;
  const masteredCards = Object.values(state.progress.cards).filter(c => c.box >= 3).length;

  let totalAttempted = 0, totalCorrect = 0;
  state.topics.forEach(t => {
    const byDiff = state.progress.problems[t.id] || {};
    Object.values(byDiff).forEach(d => { totalAttempted += d.attempted; totalCorrect += d.correct; });
  });
  const overallAccuracy = totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : null;
  const streak = computeStreak();
  const daysActive = state.progress.activityDates.length;

  app.innerHTML = `
    <h1 class="hero">Progress</h1>
    <p class="hero-sub">How you're doing across topics, and where to spend more time before the exam.</p>
    ${renderSyncBannerHtml()}
    <div class="progress-summary-row">
      <div class="progress-stat"><div class="value">${masteredCards}/${totalCards}</div><div class="label">Cards mastered</div></div>
      <div class="progress-stat"><div class="value">${totalAttempted}</div><div class="label">Problems attempted</div></div>
      <div class="progress-stat"><div class="value">${overallAccuracy === null ? '—' : overallAccuracy + '%'}</div><div class="label">Overall accuracy</div></div>
      <div class="progress-stat"><div class="value">${streak}</div><div class="label">Day streak</div></div>
      <div class="progress-stat"><div class="value">${daysActive}</div><div class="label">Days studied</div></div>
    </div>
    <div id="recommendations"></div>
    <h3 style="font-family:var(--serif); font-size:1.1rem; margin: 20px 0 10px;">By topic</h3>
    <div id="topic-progress-list"></div>
  `;

  // Build per-topic stats and recommendations
  const topicStats = state.topics.map(t => {
    const cardsInTopic = state.flashcards.filter(c => c.topic === t.id);
    const masteredInTopic = cardsInTopic.filter(c => (state.progress.cards[c.id]?.box || 0) >= 3).length;
    const cardPct = cardsInTopic.length ? Math.round((masteredInTopic / cardsInTopic.length) * 100) : 0;

    const byDiff = state.progress.problems[t.id] || {};
    let attempted = 0, correct = 0;
    ['easy', 'medium', 'hard'].forEach(d => { if (byDiff[d]) { attempted += byDiff[d].attempted; correct += byDiff[d].correct; } });
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : null;

    return { topic: t, cardPct, attempted, correct, accuracy, byDiff };
  });

  // Recommendations: lowest accuracy (min 3 attempts) first, then untouched topics
  const withAccuracy = topicStats.filter(s => s.attempted >= 3).sort((a, b) => a.accuracy - b.accuracy);
  const untouched = topicStats.filter(s => s.attempted === 0);
  const recEl = document.getElementById('recommendations');
  let recHtml = '';
  const weakest = withAccuracy.filter(s => s.accuracy < 70).slice(0, 2);
  weakest.forEach(s => {
    recHtml += `<div class="recommendation-card">📌 <strong>${s.topic.name}</strong> — ${s.accuracy}% accuracy over ${s.attempted} problems. Worth another pass before the exam.</div>`;
  });
  if (untouched.length) {
    recHtml += `<div class="recommendation-card">👀 You haven't tried any problems yet in: ${untouched.map(s => s.topic.name).join(', ')}.</div>`;
  }
  if (!weakest.length && !untouched.length && totalAttempted > 0) {
    const strongest = topicStats.filter(s => s.attempted >= 3).sort((a, b) => b.accuracy - a.accuracy)[0];
    recHtml += `<div class="recommendation-card good">✅ No major weak spots detected — accuracy is holding at 70%+ across topics you've practiced. Keep cycling through all difficulty levels to stay sharp.</div>`;
  }
  if (totalAttempted === 0) {
    recHtml = `<div class="recommendation-card">Try a few problem sets to start seeing personalized recommendations here.</div>`;
  }
  recEl.innerHTML = recHtml;

  const mistakeCounts = state.progress.mistakeTypes || {};
  const mistakeTotal = Object.values(mistakeCounts).reduce((a,b) => a+b, 0);
  if (mistakeTotal) {
    const labels = {concept:'Didn\'t know concept',method:'Didn\'t recognize method',units:'Unit conversion',arithmetic:'Arithmetic/calculator',misread:'Misread question',setup:'Formula/setup',careless:'Careless mistake'};
    const rows = Object.entries(mistakeCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `<div class="row between" style="margin:5px 0;"><span>${labels[k] || k}</span><span style="font-family:var(--mono);">${Math.round(v/mistakeTotal*100)}%</span></div>`).join('');
    recEl.innerHTML += `<div class="recommendation-card"><strong>Miss classification</strong><div style="margin-top:8px;">${rows}</div></div>`;
  }

  const list = document.getElementById('topic-progress-list');
  list.innerHTML = topicStats.map(s => `
    <div class="progress-topic-row" style="--accent:${s.topic.color}">
      <div class="row between"><h4>${s.topic.name}</h4><span style="font-family:var(--mono); font-size:0.72rem; color:#6B8494;">${s.attempted} problems attempted</span></div>
      <div class="progress-bar-row">
        <span class="label">Flashcards</span>
        <div class="progress-bar"><div class="progress-fill" style="width:${s.cardPct}%; background:${s.topic.color};"></div></div>
        <span class="pct">${s.cardPct}% mastered</span>
      </div>
      <div class="progress-bar-row">
        <span class="label">Quiz accuracy</span>
        <div class="progress-bar"><div class="progress-fill" style="width:${s.accuracy ?? 0}%; background:${s.topic.color};"></div></div>
        <span class="pct">${s.accuracy === null ? 'no data' : s.accuracy + '%'}</span>
      </div>
    </div>
  `).join('');

  const bannerSignInBtn = document.getElementById('sync-banner-signin');
  if (bannerSignInBtn) bannerSignInBtn.addEventListener('click', signIn);
}

function renderSyncBannerHtml() {
  if (!firebaseConfigured()) {
    return `<div class="sync-banner">📍 Progress is saved in this browser only. Ask whoever set up this site about enabling cross-device sync.</div>`;
  }
  if (state.user) {
    return `<div class="sync-banner">☁️ Signed in as <strong>${state.user.displayName || state.user.email}</strong> — your progress syncs automatically across any device you sign into.</div>`;
  }
  return `<div class="sync-banner"><span>📍 Progress is only saved in this browser right now.</span><button class="btn primary small" id="sync-banner-signin">Sign in to sync across devices</button></div>`;
}

/* ---------- INIT ---------- */
initAuth();
loadData().then(render);
