/**
 * parser.js — Markdown Question Bank Parser
 *
 * Parses `Comprehensive_Exam_Questions_Quiz.md` into structured quiz data.
 * Grammar handled:
 *   ### Q{n}. {text}
 *   <!-- Source page(s): {pages} -->
 *   - **{n}.** [**[CORRECT — HIGHLIGHTED]**] {option text}
 *
 * Returns an array of question objects.
 */

;(function (global) {
  'use strict';

  /**
   * @param {string} markdown - Raw markdown content
   * @returns {{ questions: Question[], errors: string[] }}
   *
   * @typedef {{ id: number, question: string, options: Option[], sourcePage: string }} Question
   * @typedef {{ id: number, text: string, correct: boolean }} Option
   */
  function parseQuestionBank(markdown) {
    const lines = markdown.split('\n');
    const questions = [];
    const errors = [];

    let i = 0;
    let currentQ = null;

    function pushCurrentQ() {
      if (!currentQ) return;
      if (!currentQ.question.trim()) {
        errors.push(`Q${currentQ.id}: empty question text`);
        currentQ = null;
        return;
      }
      // Drop options whose text is blank — these are extraction artifacts,
      // never real answer choices, and must not be rendered as clickable options.
      currentQ.options = currentQ.options.filter(o => o.text.trim());
      if (currentQ.options.length === 0) {
        errors.push(`Q${currentQ.id}: no options found`);
        currentQ = null;
        return;
      }
      const correctCount = currentQ.options.filter(o => o.correct).length;
      currentQ.hasVerifiedAnswer = correctCount > 0;
      if (correctCount === 0) {
        errors.push(`Q${currentQ.id}: no option is marked correct in the source (unverified question)`);
      } else if (correctCount > 1) {
        errors.push(`Q${currentQ.id}: multiple options (${correctCount}) are marked correct in the source`);
      }
      questions.push(currentQ);
      currentQ = null;
    }

    while (i < lines.length) {
      const line = lines[i];

      // ── Question header: ### Q{n}. {text}
      const qMatch = line.match(/^###\s+Q(\d+)\.\s+(.+)/);
      if (qMatch) {
        pushCurrentQ();
        currentQ = {
          id: parseInt(qMatch[1], 10),
          question: qMatch[2].trim(),
          options: [],
          sourcePage: ''
        };
        i++;
        continue;
      }

      if (!currentQ) { i++; continue; }

      // ── Source page comment: <!-- Source page(s): {p} -->
      const srcMatch = line.match(/<!--\s*Source page\(s\):\s*([^-]+?)\s*-->/);
      if (srcMatch) {
        currentQ.sourcePage = srcMatch[1].trim();
        i++;
        continue;
      }

      // ── Option line:
      //    - **{n}.** **[CORRECT — HIGHLIGHTED]** {text}
      //    - **{n}.** {text}
      const optMatch = line.match(/^-\s+\*\*(\d+)\.\*\*\s+(.*)/);
      if (optMatch) {
        const optNum = parseInt(optMatch[1], 10);
        let rest = optMatch[2];

        // Check for correct marker (may appear anywhere in rest)
        const CORRECT_MARKER = '[CORRECT — HIGHLIGHTED]';
        const isCorrect = rest.includes(CORRECT_MARKER);

        // Strip all bold markers and the CORRECT marker
        rest = rest
          .replace(/\*\*\[CORRECT\s*[—–-]+\s*HIGHLIGHTED\]\*\*/g, '')
          .replace(/\[CORRECT\s*[—–-]+\s*HIGHLIGHTED\]/g, '')
          .replace(/\*\*/g, '')
          .trim();

        currentQ.options.push({
          id: optNum,
          text: rest,
          correct: isCorrect
        });

        i++;
        continue;
      }

      i++;
    }

    // Don't forget the last question
    pushCurrentQ();

    return { questions, errors };
  }

  global.QuizParser = { parseQuestionBank };
})(window);
