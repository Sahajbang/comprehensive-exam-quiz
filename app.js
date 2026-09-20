/**
 * app.js — QuizBank Application
 *
 * Manages: loading, home, config, quiz, and review screens.
 * Session state is kept separate from the immutable question bank.
 */

;(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────

  /** @type {import('./parser.js').Question[]} Immutable question bank */
  let BANK = [];

  /**
   * @typedef {{
   *   mode: 'continuous'|'random',
   *   questions: import('./parser.js').Question[],
   *   currentIndex: number,
   *   instantFeedback: boolean,
   *   randomized: boolean,
   *   answers: Object.<number, number>,   // questionId → selectedOptionId
   *   completed: boolean
   * }} Session
   */
  /** @type {Session|null} */
  let session = null;

  // ─────────────────────────────────────────────────────────────
  // DOM HELPERS
  // ─────────────────────────────────────────────────────────────

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** True when at least one option of q is marked correct in the source. */
  function hasVerifiedAnswer(q) {
    return q.hasVerifiedAnswer !== undefined ? q.hasVerifiedAnswer : q.options.some(o => o.correct);
  }

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const child of children) {
      if (child == null) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  // ─────────────────────────────────────────────────────────────
  // RANDOMISATION UTILITIES
  // ─────────────────────────────────────────────────────────────

  /** Fisher-Yates shuffle (returns new array) */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Pick n unique random items from arr */
  function pickRandom(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  // ─────────────────────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────────────────────

  async function bootApp() {
    showScreen('loading-screen');

    try {
      setLoadProgress(10, 'Fetching question bank…');
      let text;

      // Primary: try fetching from the same origin (works with any HTTP server)
      try {
        const resp = await fetch('Comprehensive_Exam_Questions_Quiz.md');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        setLoadProgress(40, 'Reading file…');
        text = await resp.text();
      } catch (fetchErr) {
        // Fallback: File API (works with file:// protocol)
        console.warn('Fetch failed, falling back to File API:', fetchErr.message);
        text = await loadViaFileAPI();
      }

      setLoadProgress(65, 'Parsing questions…');
      await microtask();

      const { questions, errors } = QuizParser.parseQuestionBank(text);

      setLoadProgress(90, 'Validating data…');
      await microtask();

      if (questions.length === 0) {
        throw new Error('No questions could be parsed from the question bank.');
      }

      if (errors.length > 0) {
        console.warn('Parse warnings:', errors);
      }

      BANK = questions;
      setLoadProgress(100, `Loaded ${BANK.length.toLocaleString()} questions`);
      await microtask(200);

      buildHomeScreen();
      showScreen('home-screen');
    } catch (err) {
      showErrorScreen(err.message);
    }
  }

  /**
   * Prompts the user to select the markdown file using the browser File API.
   * Used as a fallback when fetch() fails (e.g., file:// protocol, CORS).
   */
  function loadViaFileAPI() {
    return new Promise((resolve, reject) => {
      // Update loading screen to show file picker prompt
      const app = document.getElementById('app');
      const loadEl = document.getElementById('loading-screen');
      if (loadEl) {
        loadEl.innerHTML = `
          <div class="loading-content">
            <div class="logo-mark">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect width="56" height="56" rx="16" fill="url(#grad1f)"/>
                <path d="M14 28L24 38L42 18" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                <defs>
                  <linearGradient id="grad1f" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#6366f1"/>
                    <stop offset="1" stop-color="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 class="loading-title">QuizBank</h1>
            <p class="loading-sub" style="max-width:420px;line-height:1.7">
              To load the question bank, please select the file:<br/>
              <strong style="color:var(--clr-primary-l)">Comprehensive_Exam_Questions_Quiz.md</strong>
            </p>
            <button id="file-pick-btn" class="btn btn-primary" style="margin-top:8px">
              📂 Select Question Bank File
            </button>
            <p style="font-size:0.78rem;color:var(--clr-text-3);max-width:380px;text-align:center">
              Tip: For automatic loading, open this app from a web server instead of file://
            </p>
          </div>
        `;
        document.getElementById('file-pick-btn').addEventListener('click', () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.md,text/plain,text/markdown';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) { reject(new Error('No file selected.')); return; }
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = () => reject(new Error('Failed to read selected file.'));
            reader.readAsText(file, 'utf-8');
          };
          input.click();
        });
      }
    });
  }

  function setLoadProgress(pct, status) {
    const fill = document.getElementById('load-progress');
    const stat = document.getElementById('load-status');
    if (fill) fill.style.width = pct + '%';
    if (stat) stat.textContent = status;
  }

  function microtask(ms = 0) {
    return new Promise(res => setTimeout(res, ms));
  }

  // ─────────────────────────────────────────────────────────────
  // ERROR SCREEN
  // ─────────────────────────────────────────────────────────────

  function showErrorScreen(msg) {
    let errScreen = document.getElementById('error-screen');
    if (!errScreen) {
      errScreen = el('div', { id: 'error-screen', class: 'screen' },
        el('div', { class: 'error-card' },
          el('div', { class: 'error-icon' }, '⚠️'),
          el('h2', {}, 'Failed to Load Question Bank'),
          el('p', { id: 'error-msg' }, msg)
        )
      );
      document.getElementById('app').appendChild(errScreen);
    } else {
      const msgEl = document.getElementById('error-msg');
      if (msgEl) msgEl.textContent = msg;
    }
    showScreen('error-screen');
  }

  // ─────────────────────────────────────────────────────────────
  // HOME SCREEN
  // ─────────────────────────────────────────────────────────────

  function buildHomeScreen() {
    const app = document.getElementById('app');

    // remove if it exists
    const existing = document.getElementById('home-screen');
    if (existing) existing.remove();

    const screen = el('div', { id: 'home-screen', class: 'screen' },
      el('div', { class: 'home-inner' },

        // Hero
        el('div', { class: 'home-hero' },
          el('div', { class: 'badge' }, '📚 Comprehensive Exam Prep'),
          el('h1', {}, 'Master Every\nQuestion.'),
          el('p', {}, 'Practice with all 1,441 questions from the 2022 comprehensive exam bank. Test yourself with instant feedback or submit all at once.')
        ),

        // Stats
        el('div', { class: 'stats-row' },
          statChip(BANK.length.toLocaleString(), 'Total Questions'),
          statChip('2', 'Test Modes'),
          statChip('100%', 'Coverage')
        ),

        // Mode cards
        el('div', { class: 'mode-cards' },
          buildModeCard({
            id: 'btn-continuous',
            cls: 'continuous',
            icon: '📋',
            tag: 'All Questions',
            title: 'Continuous Test',
            desc: `Attempt the complete question bank of ${BANK.length.toLocaleString()} questions in original or randomised order with instant answer feedback.`,
            meta: `${BANK.length.toLocaleString()} questions · Instant feedback`,
            onClick: startContinuousTest
          }),
          buildModeCard({
            id: 'btn-random',
            cls: 'random',
            icon: '🎲',
            tag: 'Custom Quiz',
            title: 'Random Test',
            desc: 'Select how many questions to attempt. Questions are drawn randomly. Reveal answers during the test or all at the end.',
            meta: '10 – 1,441 questions · Configurable',
            onClick: openRandomConfig
          })
        )
      )
    );

    app.appendChild(screen);
  }

  function statChip(num, lbl) {
    return el('div', { class: 'stat-chip' },
      el('span', { class: 'num' }, num),
      el('span', { class: 'lbl' }, lbl)
    );
  }

  function buildModeCard({ id, cls, icon, tag, title, desc, meta, onClick }) {
    return el('div', {
      class: `mode-card ${cls}`,
      id,
      tabindex: '0',
      role: 'button',
      'aria-label': title,
      onclick: onClick,
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }
    },
      el('div', { class: 'card-icon' }, icon),
      el('div', { class: 'card-tag' }, tag),
      el('h2', {}, title),
      el('p', {}, desc),
      el('div', { class: 'card-footer' },
        el('span', { class: 'card-meta' }, meta),
        el('span', { class: 'card-cta' }, 'Start', ' →')
      )
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CONTINUOUS TEST
  // ─────────────────────────────────────────────────────────────

  function startContinuousTest(randomize = false) {
    const questions = randomize ? shuffle(BANK) : [...BANK];
    session = {
      mode: 'continuous',
      questions,
      currentIndex: 0,
      instantFeedback: true,
      randomized: randomize,
      answers: {},
      completed: false
    };
    buildQuizScreen();
    showScreen('quiz-screen');
  }

  // ─────────────────────────────────────────────────────────────
  // RANDOM CONFIG SCREEN
  // ─────────────────────────────────────────────────────────────

  const QUICK_COUNTS = [10, 25, 50, 100, 250, 500, 1000];

  let configState = {
    count: 10,
    instantFeedback: false
  };
  let customInputEl = null;
  let customErrorEl = null;

  function openRandomConfig() {
    // Reset config
    configState = { count: 10, instantFeedback: false };

    const app = document.getElementById('app');
    let cfg = document.getElementById('config-screen');
    if (cfg) cfg.remove();

    const chipEls = QUICK_COUNTS.map(n => {
      const chip = el('div', {
        class: 'chip' + (n === configState.count ? ' active' : ''),
        role: 'button',
        tabindex: '0',
        'aria-label': `${n} questions`,
        onclick: () => selectChip(n),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') selectChip(n); }
      }, String(n));
      chip.dataset.count = n;
      return chip;
    });

    function selectChip(n) {
      configState.count = n;
      chipEls.forEach(c => c.classList.toggle('active', parseInt(c.dataset.count) === n));
      if (customInputEl) customInputEl.value = '';
      if (customErrorEl) customErrorEl.textContent = '';
    }

    customInputEl = el('input', {
      type: 'number',
      id: 'custom-count',
      placeholder: `1 – ${BANK.length}`,
      min: '1',
      max: String(BANK.length),
      'aria-label': 'Custom question count'
    });
    customInputEl.addEventListener('input', () => {
      const v = parseInt(customInputEl.value, 10);
      if (!isNaN(v) && v >= 1 && v <= BANK.length) {
        configState.count = v;
        chipEls.forEach(c => c.classList.remove('active'));
        if (customErrorEl) customErrorEl.textContent = '';
      }
    });

    customErrorEl = el('div', { class: 'input-error', 'aria-live': 'polite' });

    // Feedback toggle
    const toggle = el('div', {
      class: 'toggle',
      id: 'feedback-toggle',
      role: 'switch',
      tabindex: '0',
      'aria-checked': 'false',
      'aria-label': 'Show answers instantly'
    });
    toggle.addEventListener('click', toggleFeedback);
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggleFeedback();
    });

    function toggleFeedback() {
      configState.instantFeedback = !configState.instantFeedback;
      toggle.classList.toggle('on', configState.instantFeedback);
      toggle.setAttribute('aria-checked', String(configState.instantFeedback));
    }

    function validateAndStart() {
      // If user typed in custom input
      if (customInputEl.value !== '') {
        const v = parseInt(customInputEl.value, 10);
        if (isNaN(v) || !Number.isInteger(v)) {
          customErrorEl.textContent = 'Please enter a valid integer.';
          return;
        }
        if (v < 1) {
          customErrorEl.textContent = 'Minimum is 1 question.';
          return;
        }
        if (v > BANK.length) {
          customErrorEl.textContent = `Maximum is ${BANK.length} questions.`;
          return;
        }
        configState.count = v;
      }

      startRandomTest(configState.count, configState.instantFeedback);
    }

    cfg = el('div', { id: 'config-screen', class: 'screen' },
      el('div', { class: 'config-wrap' },

        el('div', { class: 'screen-header' },
          el('h2', {}, '🎲 Random Test'),
          el('p', {}, 'Configure your test before starting.')
        ),

        el('div', { class: 'config-card' },

          // Count section
          el('div', { class: 'config-section' },
            el('label', { for: 'custom-count' }, 'Number of Questions'),
            el('div', { class: 'quick-chips' }, ...chipEls),
            el('div', { class: 'custom-input-row' },
              customInputEl,
              el('button', {
                class: 'btn btn-ghost',
                id: 'apply-custom-btn',
                onclick: () => {
                  const v = parseInt(customInputEl.value, 10);
                  if (!customInputEl.value || isNaN(v)) { customErrorEl.textContent = 'Enter a number first.'; return; }
                  if (v < 1) { customErrorEl.textContent = 'Minimum is 1.'; return; }
                  if (v > BANK.length) { customErrorEl.textContent = `Max is ${BANK.length}.`; return; }
                  configState.count = v;
                  chipEls.forEach(c => c.classList.remove('active'));
                  customErrorEl.textContent = '';
                }
              }, 'Apply')
            ),
            customErrorEl
          ),

          el('div', { class: 'divider' }),

          // Feedback section
          el('div', { class: 'config-section' },
            el('label', {}, 'Answer Feedback'),
            el('div', { class: 'toggle-row' },
              el('div', { class: 'toggle-info' },
                el('strong', {}, 'Show answers instantly'),
                el('span', {}, 'OFF by default — answers revealed at the end')
              ),
              toggle
            )
          ),

          el('div', { class: 'divider' }),

          // Actions
          el('div', { style: 'display:flex;gap:12px;' },
            el('button', {
              class: 'btn btn-ghost',
              id: 'config-back-btn',
              onclick: () => showScreen('home-screen')
            }, '← Back'),
            el('button', {
              class: 'btn btn-primary btn-full',
              id: 'start-random-btn',
              onclick: validateAndStart
            }, 'Start Test →')
          )
        )
      )
    );

    app.appendChild(cfg);
    showScreen('config-screen');
  }

  // ─────────────────────────────────────────────────────────────
  // RANDOM TEST
  // ─────────────────────────────────────────────────────────────

  function startRandomTest(count, instantFeedback) {
    const questions = pickRandom(BANK, count);
    session = {
      mode: 'random',
      questions,
      currentIndex: 0,
      instantFeedback,
      randomized: true,
      answers: {},
      completed: false
    };
    buildQuizScreen();
    showScreen('quiz-screen');
  }

  // ─────────────────────────────────────────────────────────────
  // QUIZ SCREEN
  // ─────────────────────────────────────────────────────────────

  function buildQuizScreen() {
    const app = document.getElementById('app');
    let quizEl = document.getElementById('quiz-screen');
    if (quizEl) quizEl.remove();

    const progressStrip = el('div', { class: 'quiz-progress-strip' },
      el('div', {
        class: 'quiz-progress-strip-fill',
        id: 'q-progress-fill',
        style: 'width:0%'
      })
    );

    // Randomize toggle (continuous only)
    let randBtn = null;
    if (session.mode === 'continuous') {
      randBtn = el('button', {
        class: 'icon-btn' + (session.randomized ? ' active' : ''),
        id: 'rand-toggle-btn',
        title: 'Toggle randomization',
        'aria-label': 'Toggle randomization',
        'aria-pressed': String(session.randomized)
      }, '🔀');
      randBtn.addEventListener('click', toggleRandomize);
    }

    const topbar = el('div', { class: 'quiz-topbar' },
      el('span', { class: 'topbar-brand' }, 'QuizBank'),
      el('div', { class: 'topbar-divider' }),
      el('span', { class: 'topbar-progress', id: 'topbar-progress' }, ''),
      el('div', { class: 'topbar-badges' },
        el('span', { class: 'top-badge mode-badge' }, session.mode === 'continuous' ? 'Continuous' : 'Random'),
        session.randomized ? el('span', { class: 'top-badge rand-badge', id: 'rand-badge' }, '🔀 Randomized') : null,
        el('span', { class: 'top-badge feedback-badge', id: 'feedback-badge' }, session.instantFeedback ? '⚡ Instant' : '📋 Review at end')
      ),
      el('div', { class: 'topbar-score', id: 'topbar-score' }),
      el('div', { class: 'topbar-controls' },
        randBtn,
        el('button', {
          class: 'icon-btn',
          id: 'quit-btn',
          title: 'Back to home',
          'aria-label': 'Quit test'
        }, '×')
      )
    );

    topbar.querySelector('#quit-btn').addEventListener('click', () => {
      if (confirm('Quit this test? Your progress will be lost.')) {
        session = null;
        showScreen('home-screen');
      }
    });

    const body = el('div', { class: 'quiz-body' },
      el('div', { id: 'question-mount' })
    );

    quizEl = el('div', { id: 'quiz-screen', class: 'screen' },
      topbar,
      progressStrip,
      body
    );

    app.appendChild(quizEl);
    renderCurrentQuestion();
  }

  function toggleRandomize() {
    if (session.mode !== 'continuous') return;
    session.randomized = !session.randomized;
    if (session.randomized) {
      session.questions = shuffle(BANK);
    } else {
      session.questions = [...BANK];
    }
    session.currentIndex = 0;
    session.answers = {};
    session.completed = false;

    const randBtn = document.getElementById('rand-toggle-btn');
    if (randBtn) {
      randBtn.classList.toggle('active', session.randomized);
      randBtn.setAttribute('aria-pressed', String(session.randomized));
    }

    const randBadge = document.getElementById('rand-badge');
    if (randBadge) {
      randBadge.classList.toggle('hidden', !session.randomized);
    }

    renderCurrentQuestion();
    updateTopbarProgress();
    updateTopbarScore();
  }

  function renderCurrentQuestion() {
    const mount = document.getElementById('question-mount');
    if (!mount) return;
    mount.innerHTML = '';

    if (session.currentIndex >= session.questions.length) {
      finishTest();
      return;
    }

    const q = session.questions[session.currentIndex];
    const selectedOptionId = session.answers[q.id];
    const hasSelection = selectedOptionId !== undefined;
    // "locked" means the answer is final and cannot be changed.
    // With instant feedback ON, locking happens immediately on selection.
    // With instant feedback OFF, the answer is provisional — user can still change it.
    const locked = hasSelection && session.instantFeedback;

    const optionEls = q.options.map(opt => buildOptionEl(q, opt, locked, hasSelection, selectedOptionId));

    const feedbackEl = el('div', {
      class: 'feedback-banner',
      id: 'feedback-banner',
      'aria-live': 'polite'
    });

    if (locked) {
      applyFeedbackBanner(feedbackEl, selectedOptionId, q);
    }

    // Next / Submit button — visible as soon as any option is touched
    const isLastQ = session.currentIndex === session.questions.length - 1;
    const actionLabel = isLastQ ? 'Finish Test' : 'Next Question →';

    const nextBtn = el('button', {
      class: 'btn btn-primary',
      id: 'next-btn',
      style: hasSelection ? '' : 'display:none',
      'aria-label': actionLabel
    }, actionLabel);
    nextBtn.addEventListener('click', advanceQuestion);

    const card = el('div', { class: 'question-card' },
      el('div', { class: 'q-label' }, `Question ${session.currentIndex + 1} / ${session.questions.length}`),
      el('div', { class: 'q-text' }, q.question),
      el('div', { class: 'options-list', id: 'options-list' }, ...optionEls),
      feedbackEl,
      el('div', { class: 'quiz-actions' }, nextBtn),
      q.sourcePage ? el('div', { class: 'q-source' }, `Source: p. ${q.sourcePage}`) : null
    );

    mount.appendChild(card);
    updateTopbarProgress();
    updateTopbarScore();
  }

  /**
   * @param {boolean} locked       – answer is final (instant feedback fired)
   * @param {boolean} hasSelection – user has touched at least one option
   * @param {number|undefined} selectedOptionId – currently selected option
   */
  function buildOptionEl(q, opt, locked, hasSelection, selectedOptionId) {
    let cls = 'option';
    const verified = hasVerifiedAnswer(q);

    if (locked && !verified) {
      // Source has no verified correct answer — never paint red/green,
      // just show which option the user picked.
      cls += ' locked';
      if (opt.id === selectedOptionId) cls += ' unverified-pick';
    } else if (locked) {
      // Instant feedback ON — show correct/wrong colours and prevent interaction
      cls += ' locked';
      if (opt.id === selectedOptionId && opt.correct) cls += ' correct';
      else if (opt.id === selectedOptionId && !opt.correct) cls += ' wrong';
      else if (opt.correct) cls += ' correct';
    } else if (hasSelection && opt.id === selectedOptionId) {
      // Instant feedback OFF — highlight selected choice but keep clickable
      cls += ' selected';
    }

    const optEl = el('div', {
      class: cls,
      role: 'radio',
      tabindex: locked ? '-1' : '0',
      'aria-checked': String(opt.id === selectedOptionId),
      id: `opt-${opt.id}`,
      'aria-label': `Option ${opt.id}: ${opt.text}`
    },
      el('div', { class: 'option-num' }, String(opt.id)),
      el('div', { class: 'option-text' }, opt.text)
    );

    // Attach click handler unless the answer is hard-locked
    if (!locked) {
      optEl.addEventListener('click', () => submitAnswer(q, opt.id));
      optEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') submitAnswer(q, opt.id);
      });
    }

    return optEl;
  }

  function submitAnswer(q, optionId) {
    // With instant feedback ON, once answered the answer is locked — ignore re-clicks.
    if (session.instantFeedback && session.answers[q.id] !== undefined) return;

    const wasFirstSelection = session.answers[q.id] === undefined;
    session.answers[q.id] = optionId;

    // With instant feedback ON: lock immediately and show correct/wrong colours.
    // With instant feedback OFF: just update the highlighted option (answer stays provisional).
    const locked = session.instantFeedback;

    const optionsList = document.getElementById('options-list');
    if (!optionsList) return;
    optionsList.innerHTML = '';
    q.options.forEach(opt => {
      optionsList.appendChild(buildOptionEl(q, opt, locked, true, optionId));
    });

    // Show feedback banner only when instant feedback is ON
    if (session.instantFeedback) {
      const banner = document.getElementById('feedback-banner');
      if (banner) applyFeedbackBanner(banner, optionId, q);
    }

    // Show Next button on the very first selection
    if (wasFirstSelection) {
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) {
        nextBtn.style.display = '';
        // Don't steal focus — user may still want to change their answer
        if (session.instantFeedback) nextBtn.focus();
      }
    }

    updateTopbarScore();
  }

  function applyFeedbackBanner(banner, selectedId, q) {
    banner.innerHTML = '';
    banner.className = 'feedback-banner';

    if (!hasVerifiedAnswer(q)) {
      banner.classList.add('visible', 'is-unverified');
      banner.append(
        el('span', { class: 'feedback-icon' }, 'ℹ️'),
        el('span', {}, 'This question has no verified correct answer in the source material — it is not scored.')
      );
      return;
    }

    const selectedOpt = q.options.find(o => o.id === selectedId);
    const isCorrect = selectedOpt && selectedOpt.correct;
    banner.classList.add('visible', isCorrect ? 'is-correct' : 'is-wrong');
    const icon = isCorrect ? '✅' : '❌';
    const correctOpts = q.options.filter(o => o.correct);
    const correctLabel = correctOpts.map(o => `${o.id}. ${o.text}`).join('  ·  ');
    const text = isCorrect
      ? 'Correct!'
      : `Incorrect. Correct answer${correctOpts.length > 1 ? 's' : ''}: ${correctLabel || 'See above'}`;
    banner.append(
      el('span', { class: 'feedback-icon' }, icon),
      el('span', {}, text)
    );
  }

  function advanceQuestion() {
    session.currentIndex++;
    if (session.currentIndex >= session.questions.length) {
      finishTest();
    } else {
      renderCurrentQuestion();
      window.scrollTo(0, 0);
    }
  }

  function updateTopbarProgress() {
    const el = document.getElementById('topbar-progress');
    if (el) {
      el.textContent = `${session.currentIndex + 1} / ${session.questions.length}`;
    }
    const fill = document.getElementById('q-progress-fill');
    if (fill) {
      const pct = (session.currentIndex / session.questions.length) * 100;
      fill.style.width = pct + '%';
    }
  }

  function updateTopbarScore() {
    const scoreEl = document.getElementById('topbar-score');
    if (!scoreEl) return;

    let correct = 0, wrong = 0;
    for (const [qId, optId] of Object.entries(session.answers)) {
      const q = session.questions.find(q => q.id === parseInt(qId));
      if (!q || !hasVerifiedAnswer(q)) continue; // unscored — no verified answer in source
      const opt = q.options.find(o => o.id === optId);
      if (opt && opt.correct) correct++;
      else wrong++;
    }

    const total = Object.keys(session.answers).length;

    scoreEl.innerHTML = `
      <span class="score-item correct">✓ ${correct}</span>
      <span class="score-item wrong">✗ ${wrong}</span>
      <span class="score-item neutral">${total} answered</span>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // FINISH TEST
  // ─────────────────────────────────────────────────────────────

  function finishTest() {
    session.completed = true;
    buildReviewScreen();
    showScreen('review-screen');
  }

  // ─────────────────────────────────────────────────────────────
  // REVIEW SCREEN
  // ─────────────────────────────────────────────────────────────

  function buildReviewScreen() {
    const app = document.getElementById('app');
    let rev = document.getElementById('review-screen');
    if (rev) rev.remove();

    // Compute results
    let correct = 0, wrong = 0, skipped = 0, unverified = 0;
    const results = session.questions.map((q, idx) => {
      const selectedId = session.answers[q.id];
      const selectedOpt = q.options.find(o => o.id === selectedId);
      const wasAnswered = selectedId !== undefined;
      const verified = hasVerifiedAnswer(q);
      const isCorrect = verified && selectedOpt ? selectedOpt.correct : false;

      if (!verified) unverified++;
      else if (!wasAnswered) skipped++;
      else if (isCorrect) correct++;
      else wrong++;

      return { q, idx, selectedId, isCorrect, wasAnswered, verified };
    });

    const total = session.questions.length;
    const scorable = total - unverified;
    const answered = scorable - skipped;
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    // Summary card
    const scoreBarCorrectWidth = answered > 0 ? (correct / answered * 100) : 0;

    const summaryCard = el('div', { class: 'summary-card' },
      el('div', { class: 'summary-title' }, '🎉 Test Complete'),
      el('div', { class: 'summary-stats' },
        el('div', { class: 'summary-stat s-correct' },
          el('span', { class: 's-num' }, String(correct)),
          el('span', { class: 's-lbl' }, 'Correct')
        ),
        el('div', { class: 'summary-stat s-wrong' },
          el('span', { class: 's-num' }, String(wrong)),
          el('span', { class: 's-lbl' }, 'Incorrect')
        ),
        skipped > 0 ? el('div', { class: 'summary-stat' },
          el('span', { class: 's-num', style: 'color:var(--clr-text-2)' }, String(skipped)),
          el('span', { class: 's-lbl' }, 'Skipped')
        ) : null,
        unverified > 0 ? el('div', { class: 'summary-stat' },
          el('span', { class: 's-num', style: 'color:var(--clr-text-2)' }, String(unverified)),
          el('span', { class: 's-lbl' }, 'Unverified')
        ) : null,
        el('div', { class: 'summary-stat s-total' },
          el('span', { class: 's-num' }, String(total)),
          el('span', { class: 's-lbl' }, 'Total')
        )
      ),
      el('div', { class: 'score-pct' },
        `Score: `, el('strong', {}, `${correct} / ${answered} (${pct}%)`)
      ),
      el('div', { class: 'score-bar-wrap' },
        el('div', { class: 'score-bar-track' },
          el('div', {
            class: 'score-bar-correct',
            id: 'score-bar-correct',
            style: 'width:0%'
          })
        ),
        el('div', { class: 'score-bar-legend' },
          el('span', {}, el('span', { class: 'legend-dot c' }), ` Correct (${pct}%)`),
          el('span', {}, el('span', { class: 'legend-dot w' }), ` Incorrect (${answered > 0 ? Math.round(wrong / answered * 100) : 0}%)`)
        )
      ),
      el('div', { class: 'summary-actions' },
        el('button', {
          class: 'btn btn-primary',
          id: 'retake-btn',
          onclick: () => retake()
        }, '↺ Retake'),
        el('button', {
          class: 'btn btn-ghost',
          id: 'review-home-btn',
          onclick: () => { session = null; showScreen('home-screen'); }
        }, '← Home')
      )
    );

    // Filter tabs
    let currentFilter = 'all';
    const questionListMount = el('div', { id: 'review-list' });

    const allBtn    = el('button', { class: 'filter-btn active',         id: 'filter-all',     onclick: () => setFilter('all') }, `All (${total})`);
    const corrBtn   = el('button', { class: 'filter-btn',               id: 'filter-correct', onclick: () => setFilter('correct') }, `✓ Correct (${correct})`);
    const wrongBtn  = el('button', { class: 'filter-btn',               id: 'filter-wrong',   onclick: () => setFilter('wrong') }, `✗ Incorrect (${wrong + skipped})`);
    const unverBtn  = unverified > 0 ? el('button', { class: 'filter-btn', id: 'filter-unverified', onclick: () => setFilter('unverified') }, `ℹ️ Unverified (${unverified})`) : null;

    function setFilter(f) {
      currentFilter = f;
      allBtn.className   = 'filter-btn' + (f === 'all' ? ' active' : '');
      corrBtn.className  = 'filter-btn' + (f === 'correct' ? ' active-correct' : '');
      wrongBtn.className = 'filter-btn' + (f === 'wrong' ? ' active-wrong' : '');
      if (unverBtn) unverBtn.className = 'filter-btn' + (f === 'unverified' ? ' active' : '');
      renderReviewList();
    }

    function renderReviewList() {
      questionListMount.innerHTML = '';
      const filtered = results.filter(r => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'unverified') return !r.verified;
        if (!r.verified) return false; // unverified questions only show under All / Unverified
        if (currentFilter === 'correct') return r.isCorrect && r.wasAnswered;
        if (currentFilter === 'wrong') return !r.isCorrect || !r.wasAnswered;
        return true;
      });

      if (filtered.length === 0) {
        questionListMount.appendChild(el('p', { style: 'color:var(--clr-text-3);text-align:center;padding:40px' }, 'No questions in this category.'));
        return;
      }

      // Render in batches for performance
      renderBatch(filtered, 0, questionListMount);
    }

    function renderBatch(items, startIdx, container) {
      const BATCH = 50;
      for (let i = startIdx; i < Math.min(startIdx + BATCH, items.length); i++) {
        container.appendChild(buildReviewQuestion(items[i]));
      }
      if (startIdx + BATCH < items.length) {
        // Use Intersection Observer for lazy rendering
        const sentinel = el('div', { class: 'review-sentinel' });
        container.appendChild(sentinel);
        const obs = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            obs.disconnect();
            sentinel.remove();
            renderBatch(items, startIdx + BATCH, container);
          }
        }, { rootMargin: '200px' });
        obs.observe(sentinel);
      }
    }

    function retake() {
      if (session.mode === 'continuous') {
        startContinuousTest(session.randomized);
      } else {
        openRandomConfig();
      }
    }

    const filters = el('div', { class: 'review-filters' }, allBtn, corrBtn, wrongBtn, unverBtn);

    // Build screen
    const topbar = el('div', { class: 'review-topbar' },
      el('button', {
        class: 'btn btn-ghost',
        id: 'review-back-home',
        style: 'padding:8px 14px;font-size:0.82rem',
        onclick: () => { session = null; showScreen('home-screen'); }
      }, '← Home'),
      el('h2', {}, 'Test Review'),
      el('span', { style: 'color:var(--clr-text-3);font-size:0.82rem;margin-left:auto' },
        `${session.mode === 'continuous' ? 'Continuous' : 'Random'} · ${total} questions`)
    );

    rev = el('div', { id: 'review-screen', class: 'screen' },
      topbar,
      el('div', { class: 'review-body' },
        summaryCard,
        filters,
        questionListMount
      )
    );

    app.appendChild(rev);

    // Animate score bar after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fillEl = document.getElementById('score-bar-correct');
        if (fillEl) fillEl.style.width = scoreBarCorrectWidth + '%';
      });
    });

    renderReviewList();
  }

  function buildReviewQuestion({ q, idx, selectedId, isCorrect, wasAnswered, verified }) {
    const cls = !verified
      ? 'review-q unverified-q'
      : wasAnswered
        ? (isCorrect ? 'review-q correct-q' : 'review-q wrong-q')
        : 'review-q wrong-q';

    const badgeCls = !verified
      ? 'result-badge unverified'
      : wasAnswered
        ? (isCorrect ? 'result-badge correct' : 'result-badge wrong')
        : 'result-badge wrong';
    const badgeText = !verified ? 'ℹ️ Unverified' : !wasAnswered ? 'Skipped' : (isCorrect ? '✓ Correct' : '✗ Incorrect');

    const optionEls = q.options.map(opt => {
      let cls = 'r-option';
      if (!verified) {
        // No verified correct answer in the source — only mark the user's pick, never red/green.
        if (opt.id === selectedId) cls += ' r-user-neutral';
      } else if (wasAnswered) {
        if (opt.id === selectedId && opt.correct) cls += ' r-correct';
        else if (opt.id === selectedId && !opt.correct) cls += ' r-wrong';
        else if (opt.correct) cls += ' r-correct';
      } else {
        // Skipped — show correct answer
        if (opt.correct) cls += ' r-correct';
      }

      return el('div', { class: cls },
        el('div', { class: 'r-option-num' }, String(opt.id)),
        el('div', { class: 'r-option-text' }, opt.text)
      );
    });

    return el('div', { class: cls, id: `rq-${q.id}` },
      el('div', { class: 'review-q-header' },
        el('div', { class: 'review-q-num' }, `Q${idx + 1}`),
        el('div', { class: badgeCls }, badgeText)
      ),
      el('div', { class: 'review-q-text' }, q.question),
      el('div', { class: 'review-options' }, ...optionEls)
    );
  }

  // ─────────────────────────────────────────────────────────────
  // KEYBOARD NAVIGATION
  // ─────────────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (!session || session.completed) return;
    const q = session.questions[session.currentIndex];
    const answered = session.answers[q.id] !== undefined;

    // Number keys 1-4 select options
    if (!answered && e.key >= '1' && e.key <= '4') {
      const optId = parseInt(e.key);
      const opt = q.options.find(o => o.id === optId);
      if (opt) submitAnswer(q, optId);
    }

    // Enter/Space on next button (handled by focus)
    // Arrow keys for option navigation
    if (!answered && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const opts = $$('.option:not(.locked)');
      const focused = document.activeElement;
      const cur = opts.indexOf(focused);
      if (e.key === 'ArrowDown' && cur < opts.length - 1) opts[cur + 1].focus();
      else if (e.key === 'ArrowUp' && cur > 0) opts[cur - 1].focus();
      else if (cur === -1 && opts.length) opts[0].focus();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', bootApp);

})();
