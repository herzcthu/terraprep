"use strict";

const STORAGE_KEY = "terraprep-v1";
const DOCS = "https://developer.hashicorp.com";
const EXAM_SIZE = 54;
const questionMap = new Map();
let TOPICS = [];
let QUESTIONS = [];
const app = document.getElementById("app");
const freshState = () => ({ version: 1, bookmarks: [], stats: {}, history: [], active: null });
let state;
let result = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function notify(message) {
  const notice = document.getElementById("notice");
  notice.textContent = message;
  notice.hidden = false;
}

function validIds(ids) {
  return Array.isArray(ids) && ids.every(id => questionMap.has(id)) && new Set(ids).size === ids.length;
}

function validChoices(choices, ids) {
  return choices !== null && typeof choices === "object" && !Array.isArray(choices) &&
    Object.entries(choices).every(([id, selection]) => ids.includes(id) && Array.isArray(selection) &&
      new Set(selection).size === selection.length &&
      selection.every(index => Number.isInteger(index) && index >= 0 && index < questionMap.get(id).options.length));
}

function validSession(session, completed = false) {
  if (!session || !["learn", "exam"].includes(session.mode) || !validIds(session.ids) || !session.ids.length ||
    !validChoices(session.choices, session.ids) || !validIds(session.checked) ||
    !session.checked.every(id => session.ids.includes(id) && session.choices[id]?.length === questionMap.get(id).answers.length) ||
    (session.mode === "exam" && session.checked.length) ||
    !Number.isFinite(session.started) || session.started <= 0) return false;
  if (completed) return Number.isFinite(session.completed) && session.completed >= session.started;
  return Number.isInteger(session.index) && session.index >= 0 && session.index < session.ids.length &&
    (session.mode === "learn" ? session.deadline === null : Number.isFinite(session.deadline) && session.deadline > session.started);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || !validIds(saved.bookmarks) ||
      !saved.stats || typeof saved.stats !== "object" || Array.isArray(saved.stats) ||
      !Object.entries(saved.stats).every(([id, stat]) => questionMap.has(id) && stat &&
        Number.isSafeInteger(stat.attempts) && stat.attempts > 0 && Number.isSafeInteger(stat.correct) &&
        stat.correct >= 0 && stat.correct <= stat.attempts && typeof stat.lastCorrect === "boolean") ||
      !Array.isArray(saved.history) || saved.history.length > 10 || !saved.history.every(item => validSession(item, true)) ||
      (saved.active !== null && !validSession(saved.active))) {
      throw new Error("Saved progress has an unsupported or invalid format.");
    }
    return saved;
  } catch (error) {
    notify(`Could not restore progress: ${error.message} Starting with an empty study space. Reset progress to clear damaged saved data.`);
    return freshState();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    notify(`Progress could not be saved: ${error.message} You can keep practicing, but changes may be lost when you close this page.`);
    return false;
  }
}

function isCorrect(question, selection = []) {
  return selection.length === question.answers.length && question.answers.every(answer => selection.includes(answer));
}

function submitted(session, id) {
  return session.mode === "learn" ? session.checked.includes(id) : Boolean(session.choices[id]?.length);
}

function score(session) {
  return session.ids.filter(id => submitted(session, id) && isCorrect(questionMap.get(id), session.choices[id])).length;
}

function recordAnswer(id, selection) {
  const correct = isCorrect(questionMap.get(id), selection);
  const old = state.stats[id] || { attempts: 0, correct: 0 };
  state.stats[id] = { attempts: old.attempts + 1, correct: old.correct + Number(correct), lastCorrect: correct };
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function missedIds() {
  return QUESTIONS.filter(question => state.stats[question.id]?.lastCorrect === false).map(question => question.id);
}

function topicCards() {
  return TOPICS.map((topic, index) => {
    const questions = QUESTIONS.filter(question => question.topic === topic.id);
    const mastered = questions.filter(question => state.stats[question.id]?.lastCorrect).length;
    return `<article class="topic-card">
      <div class="topic-top"><span class="topic-icon color-${index % 4}" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="muted">${questions.length} questions</span></div>
      <h3>${topic.name}</h3><p>${topic.description}</p>
      <div class="topic-progress"><span>${mastered} / ${questions.length} last answered correctly</span><span>${Math.round(mastered / questions.length * 100)}%</span></div>
      <progress value="${mastered}" max="${questions.length}" aria-label="${topic.name} progress"></progress>
      <button class="text-button" data-action="topic" data-topic="${topic.id}">Practice topic <span aria-hidden="true">&rarr;</span></button>
    </article>`;
  }).join("");
}

function dashboard() {
  const stats = Object.values(state.stats);
  const attempts = stats.reduce((sum, stat) => sum + stat.attempts, 0);
  const correct = stats.reduce((sum, stat) => sum + stat.correct, 0);
  const accuracy = attempts ? `${Math.round(correct / attempts * 100)}%` : "--";
  return `<div class="page-heading"><div><span class="eyebrow">LESS GUESSWORK. MORE CONFIDENCE.</span><h1>Your certification journey</h1><p>A little practice today. A stronger foundation tomorrow.</p></div><span class="outline-badge">Terraform 1.12</span></div>
    <section class="hero"><div><span class="hero-tag">TERRAFORM ASSOCIATE (004)</span><h2>Turn infrastructure knowledge<br>into exam confidence.</h2><p>Practice real-world scenarios, understand every answer,<br>and build your skills one topic at a time.</p><div class="actions"><button class="button white" data-action="go-practice">Start practicing <span aria-hidden="true">&rarr;</span></button><button class="button ghost" data-action="start-exam">Take a timed test</button></div><span class="hero-meta">${QUESTIONS.length} original questions &nbsp; / &nbsp; 8 objective areas &nbsp; / &nbsp; No signup</span></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="code-tile"><span>infrastructure</span><b>as code<span class="code-dot">.</span></b><div class="code-lines">write &rarr; plan &rarr; apply</div><div class="tile-label">YOUR NEXT SKILL, UNLOCKED</div></div></div></section>
    ${state.active ? `<div class="resume-banner"><div><strong>You have a session in progress</strong><p>${state.active.mode === "exam" ? "Timed test" : "Learning session"} &middot; Question ${state.active.index + 1} of ${state.active.ids.length}${state.active.mode === "exam" ? ' &middot; The timer is still running.' : ""}</p></div><button class="button primary" data-action="resume">Resume session</button></div>` : ""}
    <section class="stats-grid" aria-label="Your progress">
      <article class="stat"><span>Questions explored</span><strong>${stats.length}<small> / ${QUESTIONS.length}</small></strong><p>Unique questions answered</p></article>
      <article class="stat"><span>Answer accuracy</span><strong>${accuracy}</strong><p>Across all submitted attempts</p></article>
      <article class="stat"><span>Needs another look</span><strong>${missedIds().length}</strong><button class="text-button" data-action="missed">Review missed questions &rarr;</button></article>
      <article class="stat"><span>Saved for later</span><strong>${state.bookmarks.length}</strong><button class="text-button" data-action="bookmarks">Practice bookmarks &rarr;</button></article>
    </section>
    <div class="section-heading"><div><h2>Build your foundation</h2><p>Eight objective areas. One clear path forward.</p></div><a href="#resources">Explore study resources &rarr;</a></div>
    <section class="topics-grid" aria-label="Exam objective areas">${topicCards()}</section>
    <section class="history"><div class="section-heading"><h2>Recent sessions</h2><button class="text-button muted" data-action="reset">Reset progress</button></div>
    ${state.history.length ? state.history.map((item, index) => `<div class="history-row"><div><strong>${item.mode === "exam" ? "Timed practice test" : "Learning session"}</strong><span>${new Date(item.completed).toLocaleDateString()} &middot; ${item.ids.length} questions</span></div><strong>${score(item)} / ${item.ids.length}</strong><button class="text-button" data-action="history" data-index="${index}">Review results &rarr;</button></div>`).join("") : '<p class="empty">Your completed sessions will appear here. Your first step starts with one question.</p>'}</section>`;
}

function setup() {
  return `<div class="page-heading"><div><span class="eyebrow">PRACTICE WITH PURPOSE</span><h1>Make the knowledge stick</h1><p>Choose a topic, work through a scenario, and learn why the answer is right.</p></div></div>
    <div class="setup-grid"><section class="panel"><span class="pill">LEARNING MODE</span><h2>Your practice, your pace.</h2><p>Instant feedback and source-linked explanations. No timer. Multiple-answer questions require every correct selection.</p>
      <form id="practice-form"><label for="topic">Objective area</label><select id="topic" name="topic"><option value="all">All objective areas</option>${TOPICS.map(item => `<option value="${item.id}">${item.objective}. ${item.name}</option>`).join("")}</select>
      <label for="pool">Question pool</label><select id="pool" name="pool"><option value="all">All questions</option><option value="missed">Last answered incorrectly</option><option value="bookmarks">Bookmarked questions</option></select>
      <label for="count">Session size</label><select id="count" name="count"><option value="10">Up to 10 questions</option><option value="20">Up to 20 questions</option><option value="all">All matching questions</option></select><button type="submit" class="button primary full">Start learning &rarr;</button></form>
    </section><section class="panel exam-panel"><span class="pill">TIMED PRACTICE</span><h2>Put it all together.</h2><p>Test yourself across all eight objectives. Answers and explanations stay hidden until you finish.</p><ul class="feature-list"><li>${Math.min(EXAM_SIZE, QUESTIONS.length)} questions sampled from ${QUESTIONS.length}, covering every objective area</li><li>60-minute countdown, including time away</li><li>Single answer, multiple answer, and true / false</li><li>Review and change answers before submitting</li><li>Unanswered questions count as incorrect</li></ul><button class="button primary full" data-action="start-exam">Start timed test &rarr;</button><p class="fine-print">This is a custom practice format, not a reproduction of the official exam's length, weighting, or passing score. Use learning mode to practice the entire bank.</p></section></div>
    <section class="panel info-panel"><h3>Practice isn't a substitute for hands-on experience.</h3><p>Use the linked tutorials to write configuration and run Terraform. Read the official objectives before scheduling your exam.</p><a href="#resources">Open the study library &rarr;</a></section>`;
}

function start(mode, topic = "all", pool = "all", count = "all") {
  if (state.active) {
    notify("Resume and finish your current session before starting another. Your answers have been kept.");
    result = null;
    location.hash = "practice";
    render();
    return;
  }
  let questions = QUESTIONS.filter(question => topic === "all" || question.topic === topic);
  if (mode === "exam") {
    const required = TOPICS.map(item => shuffle(QUESTIONS.filter(question => question.topic === item.id))[0]);
    const requiredIds = new Set(required.map(question => question.id));
    questions = [...required, ...shuffle(QUESTIONS.filter(question => !requiredIds.has(question.id)))
      .slice(0, Math.max(0, EXAM_SIZE - required.length))];
  }
  if (pool === "missed") questions = questions.filter(question => state.stats[question.id]?.lastCorrect === false);
  if (pool === "bookmarks") questions = questions.filter(question => state.bookmarks.includes(question.id));
  if (!questions.length) {
    notify("No questions match this selection yet. Try another topic or question pool.");
    return;
  }
  const ids = shuffle(questions.map(question => question.id)).slice(0, count === "all" ? questions.length : Number(count));
  const started = Date.now();
  state.active = { mode, ids, index: 0, choices: {}, checked: [], started, deadline: mode === "exam" ? started + 60 * 60 * 1000 : null };
  result = null;
  document.getElementById("notice").hidden = true;
  persist();
  location.hash = "practice";
  render(true);
}

function explanation(question) {
  return `<p>${escapeHtml(question.explanation)}</p><a href="${DOCS}${question.source}" target="_blank" rel="noopener noreferrer">Read the official documentation <span aria-hidden="true">&nearr;</span></a>`;
}

function sessionView() {
  const session = state.active;
  const question = questionMap.get(session.ids[session.index]);
  const selected = session.choices[question.id] || [];
  const checked = session.checked.includes(question.id);
  const topic = TOPICS.find(item => item.id === question.topic);
  const answered = session.ids.filter(id => submitted(session, id)).length;
  const correct = isCorrect(question, selected);
  return `<div class="session-heading"><a href="#dashboard">&larr; Overview</a><div><span class="pill">${session.mode === "exam" ? "TIMED TEST" : "LEARNING MODE"}</span>${session.mode === "exam" ? '<span class="timer" id="timer" role="timer" aria-label="Time remaining"></span>' : '<span class="muted">Take your time. Understand the why.</span>'}</div></div>
    <div class="question-layout"><section class="question-panel panel">
      <div class="question-meta"><span>OBJECTIVE ${question.objective} &middot; ${topic.name}</span><button class="bookmark" data-action="bookmark" aria-pressed="${state.bookmarks.includes(question.id)}">${state.bookmarks.includes(question.id) ? "Bookmarked" : "Bookmark"}</button></div>
      <span class="muted">Question ${session.index + 1} of ${session.ids.length}</span><h1 id="question-title" tabindex="-1">${escapeHtml(question.prompt)}</h1>
      ${question.code ? `<pre><code>${escapeHtml(question.code)}</code></pre>` : ""}
      <p class="answer-instruction">${question.answers.length > 1 ? `Select ${question.answers.length} answers. All must be correct; no partial credit.` : "Select one answer."}</p>
      <fieldset class="options"><legend class="sr-only">Answer choices</legend>${question.options.map((option, index) => `<label class="option ${selected.includes(index) ? "selected" : ""} ${checked && question.answers.includes(index) ? "correct" : ""} ${checked && selected.includes(index) && !question.answers.includes(index) ? "incorrect" : ""}"><input name="answer" type="${question.answers.length > 1 ? "checkbox" : "radio"}" value="${index}" ${selected.includes(index) ? "checked" : ""} ${checked ? "disabled" : ""}><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}${checked && question.answers.includes(index) ? '<small class="answer-tag">Correct answer</small>' : ""}</span></label>`).join("")}</fieldset>
      ${checked ? `<section class="feedback ${correct ? "success" : "retry"}" role="status"><strong>${correct ? "That's right. Nicely done!" : "Not quite. Here's the reasoning."}</strong>${explanation(question)}</section>` : ""}
      <div class="question-actions"><button class="button secondary" data-action="previous" ${session.index === 0 ? "disabled" : ""}>&larr; Previous</button><div class="actions">${session.mode === "learn" && !checked ? `<button class="button primary" id="check-answer" data-action="check" ${selected.length !== question.answers.length ? "disabled" : ""}>Check answer</button>` : ""}<button class="button ${checked || session.mode === "exam" ? "primary" : "secondary"}" data-action="next">${session.index === session.ids.length - 1 ? "Finish session" : "Next question &rarr;"}</button></div></div>
    </section><aside class="panel question-sidebar"><h3>Your session</h3><p>${answered} / ${session.ids.length} ${session.mode === "learn" ? "checked" : "answered"}</p><progress value="${answered}" max="${session.ids.length}" aria-label="Session completion"></progress><div class="question-map" aria-label="Jump to question">${session.ids.map((id, index) => `<button class="map-button ${submitted(session, id) ? "answered" : ""} ${index === session.index ? "current" : ""}" data-action="jump" data-index="${index}" aria-label="Question ${index + 1}${submitted(session, id) ? ", answered" : ", unanswered"}" ${index === session.index ? 'aria-current="step"' : ""}>${index + 1}</button>`).join("")}</div><p class="fine-print">${session.mode === "learn" ? "Check an answer to save it to your learning progress. You can skip ahead and return later." : "The timer continues if you leave or reload. Use the grid to revisit any question."}</p><button class="button secondary full" data-action="finish">Finish &amp; review</button></aside></div>`;
}

function finish() {
  const session = state.active;
  if (!session) return;
  if (session.mode === "exam") {
    session.ids.forEach(id => recordAnswer(id, session.choices[id] || []));
  }
  result = { ...session, completed: Date.now() };
  state.history.unshift(result);
  state.history = state.history.slice(0, 10);
  state.active = null;
  persist();
  document.getElementById("finish-dialog").close();
  location.hash = "practice";
  render(true);
}

function requestFinish() {
  const session = state.active;
  const remaining = session.ids.filter(id => !submitted(session, id)).length;
  document.getElementById("finish-message").textContent = remaining
    ? `${remaining} question${remaining === 1 ? " is" : "s are"} ${session.mode === "learn" ? "unchecked" : "unanswered"} and will count as incorrect in this session score.`
    : "All questions are answered. Your results and explanations are ready.";
  document.getElementById("finish-dialog").showModal();
}

function resultsView() {
  const correct = score(result);
  const percentage = Math.round(correct / result.ids.length * 100);
  const missed = result.ids.filter(id => !submitted(result, id) || !isCorrect(questionMap.get(id), result.choices[id]));
  return `<div class="page-heading"><div><span class="eyebrow">EVERY QUESTION IS A STEP FORWARD</span><h1 tabindex="-1">Session complete</h1><p>Review the reasoning, then give the tricky ones another try.</p></div></div>
    <section class="results-summary panel"><div><strong class="result-score">${percentage}%</strong><p>${correct} correct out of ${result.ids.length} questions</p></div><div><h2>${percentage === 100 ? "A strong session. Keep building." : "Progress, not perfection."}</h2><p>This is practice feedback, not an official pass / fail result.</p><div class="actions"><button class="button primary" data-action="retry" ${missed.length ? "" : "disabled"}>Retry ${missed.length} missed</button><button class="button secondary" data-action="new">New practice session</button></div></div></section>
    <section class="panel breakdown"><h2>By objective area</h2>${TOPICS.filter(topic => result.ids.some(id => questionMap.get(id).topic === topic.id)).map(topic => {
      const ids = result.ids.filter(id => questionMap.get(id).topic === topic.id);
      const count = ids.filter(id => submitted(result, id) && isCorrect(questionMap.get(id), result.choices[id])).length;
      return `<div class="breakdown-row"><span>${topic.name}</span><progress value="${count}" max="${ids.length}" aria-label="${topic.name} score"></progress><strong>${count} / ${ids.length}</strong></div>`;
    }).join("")}</section><div class="section-heading"><h2>Answers &amp; explanations</h2><span class="muted">Expand a question to review</span></div>
    <section class="reviews">${result.ids.map((id, index) => {
      const question = questionMap.get(id);
      const checked = submitted(result, id);
      const correct = checked && isCorrect(question, result.choices[id]);
      const selection = checked ? result.choices[id] : [];
      return `<details class="review-item"><summary><span class="review-status ${correct ? "good" : "bad"}">${correct ? "Correct" : checked ? "Incorrect" : "Unanswered"}</span><span>${index + 1}. ${escapeHtml(question.prompt)}</span></summary><div class="review-body">${question.code ? `<pre><code>${escapeHtml(question.code)}</code></pre>` : ""}<p><strong>Your answer:</strong> ${selection.length ? selection.map(answer => escapeHtml(question.options[answer])).join("; ") : "Not submitted"}</p><p><strong>Correct answer:</strong> ${question.answers.map(answer => escapeHtml(question.options[answer])).join("; ")}</p>${explanation(question)}</div></details>`;
    }).join("")}</section>`;
}

function resources() {
  const links = [
    ["Official certification overview", "Check the current exam version, registration, and certification policies.", "https://developer.hashicorp.com/certifications/terraform-associate"],
    ["Associate (004) study guide", "The official learning path. Targets Terraform 1.12 and HCP Terraform.", `${DOCS}/terraform/tutorials/certification-004/associate-study-004`],
    ["Exam objectives & content", "A detailed checklist of objectives and their documentation and tutorials.", `${DOCS}/terraform/tutorials/certification-004/associate-review-004`],
    ["Official sample questions", "HashiCorp's publicly released examples of the three question formats. These are not a live exam bank.", `${DOCS}/terraform/tutorials/certification-004/associate-questions-004`],
    ["Hands-on: get started with Docker", "Build, change, and destroy local infrastructure. Requires Docker and Terraform; no cloud account needed.", `${DOCS}/terraform/tutorials/docker-get-started`],
    ["Manage sensitive data", "Understand redaction, state exposure, ephemeral values, and write-only arguments.", `${DOCS}/terraform/language/manage-sensitive-data`],
    ["OpenExamPrep: additional practice", "Independent site advertising 215+ free Terraform Associate questions. Use it for extra practice; verify answers against official documentation. Its questions are not imported here.", "https://open-exam-prep.com/practice/terraform-associate"]
  ];
  return `<div class="page-heading"><div><span class="eyebrow">GO STRAIGHT TO THE SOURCE</span><h1>Your study library</h1><p>Official learning resources and independent practice to build your skills.</p></div></div>
    <div class="resource-note"><strong>Built for Associate (004)</strong><p>Exam version and Terraform 1.12 scope verified against HashiCorp's official study guide on November 7, 2026. Check the official site for changes before booking. This app's ${QUESTIONS.length} questions are original educational scenarios, not copied exam content.</p></div>
    <section class="resource-grid">${links.map(([title, description, url]) => `<a class="resource-card panel" href="${url}" target="_blank" rel="noopener noreferrer"><span class="eyebrow">${url.startsWith(`${DOCS}/`) ? "HASHICORP DEVELOPER" : "INDEPENDENT PRACTICE"} &nearr;</span><h2>${title}</h2><p>${description}</p><span class="text-button">Open resource &rarr;</span></a>`).join("")}</section>
    <section class="panel"><h2>A practical learning routine</h2><ol class="routine"><li>Read the official objectives and choose one area to focus on.</li><li>Complete its tutorial in a sandbox. Review costs before applying cloud resources and destroy them when finished.</li><li>Practice the topic here, then read the explanation and linked documentation.</li><li>Bookmark uncertain questions and revisit your missed-answer pool.</li><li>Take a timed practice test once you have covered every area.</li></ol><p class="fine-print">A local HTTP server can serve this app without internet access. External documentation needs internet access. Browser-local progress is not synced or sent to a server.</p></section>`;
}

function render(focus = false) {
  const route = location.hash.slice(1) || "dashboard";
  document.querySelectorAll("[data-nav]").forEach(link => {
    if (link.dataset.nav === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  app.innerHTML = route === "resources" ? resources() : route === "practice"
    ? state.active ? sessionView() : result ? resultsView() : setup() : dashboard();
  updateTimer();
  if (focus) {
    const heading = app.querySelector("h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }
}

function updateTimer() {
  if (!state.active || state.active.mode !== "exam") return;
  const seconds = Math.max(0, Math.ceil((state.active.deadline - Date.now()) / 1000));
  const timer = document.getElementById("timer");
  if (timer) {
    timer.textContent = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")} remaining`;
    timer.classList.toggle("urgent", seconds <= 300);
  }
  if (seconds === 0) {
    notify("Time is up. Your timed test has been submitted; unanswered questions count as incorrect.");
    finish();
  }
}

app.addEventListener("submit", event => {
  if (event.target.id !== "practice-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  start("learn", form.get("topic"), form.get("pool"), form.get("count"));
});

app.addEventListener("change", event => {
  if (event.target.name !== "answer" || !state.active) return;
  updateTimer();
  if (!state.active) return;
  const question = questionMap.get(state.active.ids[state.active.index]);
  if (state.active.checked.includes(question.id)) return;
  const selected = [...app.querySelectorAll('input[name="answer"]:checked')].map(input => Number(input.value));
  state.active.choices[question.id] = selected;
  persist();
  app.querySelectorAll(".option").forEach(label => label.classList.toggle("selected", label.querySelector("input").checked));
  const check = document.getElementById("check-answer");
  if (check) check.disabled = selected.length !== question.answers.length;
  // Keep the focused input mounted while updating the session's navigation status.
  const index = state.active.index;
  const mapButton = app.querySelector(`.map-button[data-index="${index}"]`);
  const answered = submitted(state.active, question.id);
  mapButton.classList.toggle("answered", answered);
  mapButton.setAttribute("aria-label", `Question ${index + 1}, ${answered ? "answered" : "unanswered"}`);
  const total = state.active.ids.filter(id => submitted(state.active, id)).length;
  app.querySelector(".question-sidebar > p").textContent = `${total} / ${state.active.ids.length} ${state.active.mode === "learn" ? "checked" : "answered"}`;
  app.querySelector(".question-sidebar progress").value = total;
});

app.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  updateTimer();
  const action = button.dataset.action;
  if (action === "go-practice" || action === "resume") {
    result = null; location.hash = "practice"; render(true);
  } else if (action === "start-exam") start("exam");
  else if (action === "topic") start("learn", button.dataset.topic);
  else if (action === "missed" || action === "bookmarks") start("learn", "all", action);
  else if (action === "reset") document.getElementById("reset-dialog").showModal();
  else if (action === "history") {
    result = state.history[Number(button.dataset.index)]; location.hash = "practice"; render(true);
  } else if (action === "new") {
    result = null; render(true);
  } else if (action === "retry" && result) {
    const ids = result.ids.filter(id => !submitted(result, id) || !isCorrect(questionMap.get(id), result.choices[id]));
    if (state.active) { notify("Finish your active session before retrying questions."); return; }
    if (!ids.length) return;
    state.active = { mode: "learn", ids: shuffle(ids), index: 0, choices: {}, checked: [], started: Date.now(), deadline: null };
    result = null; persist(); render(true);
  } else if (state.active) {
    const session = state.active;
    const id = session.ids[session.index];
    if (action === "bookmark") {
      state.bookmarks = state.bookmarks.includes(id) ? state.bookmarks.filter(item => item !== id) : [...state.bookmarks, id];
      persist(); render(); app.querySelector(".bookmark").focus();
    } else if (action === "check" && session.mode === "learn" && !session.checked.includes(id)) {
      if (session.choices[id]?.length !== questionMap.get(id).answers.length) return;
      session.checked.push(id); recordAnswer(id, session.choices[id]); persist(); render(true);
    } else if (action === "finish" || (action === "next" && session.index === session.ids.length - 1)) requestFinish();
    else if (["next", "previous", "jump"].includes(action)) {
      const index = action === "jump" ? Number(button.dataset.index) : session.index + (action === "next" ? 1 : -1);
      if (index < 0 || index >= session.ids.length) return;
      session.index = index; persist(); render(true);
    }
  }
});

document.getElementById("cancel-finish").addEventListener("click", () => document.getElementById("finish-dialog").close());
document.getElementById("confirm-finish").addEventListener("click", finish);
document.getElementById("cancel-reset").addEventListener("click", () => document.getElementById("reset-dialog").close());
document.getElementById("confirm-reset").addEventListener("click", () => {
  state = freshState();
  result = null;
  if (persist()) document.getElementById("notice").hidden = true;
  document.getElementById("reset-dialog").close();
  render(true);
});
async function initialize() {
  try {
    const response = await fetch("questions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Question data request failed (HTTP ${response.status}).`);
    const bank = validateQuestionBank(await response.json());
    TOPICS = bank.topics;
    QUESTIONS = bank.questions;
    QUESTIONS.forEach(question => questionMap.set(question.id, question));
    state = loadState();
  } catch (error) {
    notify(`Could not load practice questions: ${error.message} Check questions.json and reload. Your saved progress has not been changed.`);
    app.innerHTML = "<p>Practice is unavailable until the question data loads successfully.</p>";
    return;
  }
  window.addEventListener("hashchange", () => render(true));
  window.addEventListener("pageshow", updateTimer);
  document.addEventListener("visibilitychange", updateTimer);
  setInterval(updateTimer, 1000);
  render();
}

initialize();
