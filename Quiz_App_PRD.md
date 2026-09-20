# PRD — Comprehensive Examination Quiz Application

## 1. Product Overview

Build a quiz application using the question bank contained in:

`Comprehensive_Exam_Questions_Quiz.md`

The source contains **1,441 questions**, each with its answer options and source-highlighted correct answer information.

The application has two primary test modes:

1. **Continuous Test** — intended to run through the complete question bank.
2. **Random Test** — allows the user to select how many randomly chosen questions to attempt.

The application must make question answering simple, fast, and clear. Correctness must be visually obvious, and the user must be able to review all attempted questions after a test.

---

## 2. Source of Truth

### Question Bank

Use the file:

`Comprehensive_Exam_Questions_Quiz.md`

Do not manually hard-code the questions in UI components.

The MD file is the source of truth for:

- Question text
- Option text
- Option numbering
- Correct-answer markings
- Question ordering
- Total number of questions

The current question bank contains 1,441 questions.

### Parsing Requirements

The application must parse the Markdown question bank into structured quiz data.

Each question should become an object conceptually equivalent to:

```js
{
  id: 1,
  question: "Question text",
  options: [
    { id: 1, text: "Option 1", correct: false },
    { id: 2, text: "Option 2", correct: true },
    { id: 3, text: "Option 3", correct: false },
    { id: 4, text: "Option 4", correct: false }
  ],
  sourcePage: 1
}
```

The actual implementation may use a different structure, but it must preserve the same information.

The parser must recognize the existing marker:

`[CORRECT — HIGHLIGHTED]`

as the source indication that an option was highlighted as correct in the PDF.

Do not silently change, normalize, rewrite, or replace question wording or option wording. Preserve the source content as represented in the MD file.

---

# 3. Home Page

The home page is the main entry point.

It must clearly present two choices:

### Option A — Continuous Test

Description:

> Attempt the complete question bank of 1,441 questions.

Selecting this opens the Continuous Test configuration/start screen or directly starts the test with the default settings.

### Option B — Random Test

Description:

> Select a number of questions and attempt a randomly generated test.

Selecting this opens the Random Test configuration screen.

The two test modes should be visually distinct and easy to understand.

---

# 4. Continuous Test

## 4.1 Purpose

The Continuous Test is the full-question-bank mode.

By default, all **1,441 questions** are presented in the original order from the Markdown file.

The user answers one question at a time.

## 4.2 Default Behavior

Default settings:

- Number of questions: **1,441**
- Question order: **Original order**
- Instant answer feedback: **ON**
- End-of-test review: **OFF until the test is completed**, with review available after completion

## 4.3 Question Screen

Only one question should be the primary focus of the screen at a time.

The screen must contain:

- Question number, e.g. `Question 127 / 1441`
- Question text
- All available answer options
- The current test settings relevant to the session, where appropriate
- A way to proceed to the next question after answering

The UI should be clean and optimized for repeatedly answering questions.

## 4.4 Selecting an Answer

The user selects exactly one option for the current question.

When instant feedback is enabled, selecting an option immediately evaluates the answer.

### Correct answer selected

If the selected answer is correct:

- The selected option is shown in **green**.
- A clear `Correct` state is shown.
- The correct answer is visible immediately.

### Incorrect answer selected

If the selected answer is incorrect:

- The user's selected option is shown in **red**.
- The correct option is shown in **green**.
- A clear `Incorrect` state is shown.
- The correct answer remains visible.

The color treatment must not rely on color alone; the UI should also provide text/status indication such as `Correct` or `Incorrect`.

After an answer has been submitted, the answer for that question should be locked so the user cannot submit multiple different answers for the same question.

## 4.5 Original Order vs Randomized Order

The Continuous Test must include a **Randomize Questions** control somewhere clearly accessible from the test UI, such as the top bar or test menu.

### Default

Randomization is **OFF**.

Questions therefore appear in this order:

`Q1 → Q2 → Q3 → ... → Q1441`

### Randomization ON

When enabled, the application should create a randomized ordering of the complete 1,441-question set for that test session.

Every question must still appear exactly once in that session.

Randomization must not alter the question's internal option order unless explicitly implemented later; only question ordering needs to be randomized.

The randomized ordering should remain stable for the current test session. It must not reshuffle after every answer.

---

# 5. Random Test

## 5.1 Purpose

The Random Test allows the user to select a smaller number of questions from the complete 1,441-question bank.

Questions should be selected randomly without replacement for that test session.

## 5.2 Number Selection

The user must have both:

### Predefined choices

Provide convenient predefined values including at least:

- 10
- 50
- 100

Additional convenient choices may be included, such as 25, 250, 500, or 1000.

### Custom number

Provide an input field allowing the user to enter a custom number of questions.

Validation:

- Minimum: `1`
- Maximum: `1441`
- Only valid numeric values may be accepted.
- The user must not be able to request more than the available number of questions.

## 5.3 Answer Feedback Setting

The Random Test must provide a setting such as:

**Show answers instantly**

Two modes are required:

### Instant Feedback ON

The behavior must match the Continuous Test:

- Correct selected → selected option becomes green.
- Incorrect selected → selected option becomes red and correct option becomes green.
- Correctness is shown immediately.

### Instant Feedback OFF

The user answers questions without being shown whether the answer was correct or incorrect during the test.

The application records the user's selected answer for every question.

The correct answers are revealed only after the test is completed.

### Default

For Random Test:

**Instant Feedback = OFF**

This is the default because Random Test is intended to support an answer-at-the-end testing mode.

---

# 6. End-of-Test Review

The user must be able to review all questions after completing a test.

This requirement applies to **both test modes**.

## 6.1 Review Contents

The review screen must contain every question attempted in the current test.

For every question, show:

- Question number within the current test
- Question text
- All options
- User's selected answer
- Correct answer
- Correct/Incorrect status

## 6.2 Correct Question in Review

For a correct response:

- User's selected answer is shown as correct/green.
- The question is marked `Correct`.

## 6.3 Incorrect Question in Review

For an incorrect response:

- User's selected answer is shown as incorrect/red.
- Correct answer is shown as correct/green.
- The question is marked `Incorrect`.

This must work even when the test was configured with instant feedback OFF.

## 6.4 Continuous Test Review Default

For Continuous Test, end-of-test review should not be the default visible state during the test.

After the user completes all questions, provide access to the complete review.

## 6.5 Random Test Review Default

For Random Test, the user should automatically reach the results/review flow after submitting the final question because answer-at-end mode is ON by default.

---

# 7. Test Session Flow

## Continuous Test — Default

```text
Home
  ↓
Continuous Test
  ↓
Q1 / 1441
  ↓
Select option
  ↓
Immediate correctness feedback
  ↓
Next question
  ↓
...
  ↓
Q1441 / 1441
  ↓
Complete Test
  ↓
Review all attempted questions
```

## Continuous Test — Randomized

```text
Home
  ↓
Continuous Test
  ↓
Enable Randomize Questions
  ↓
Start
  ↓
Randomized Q1 / 1441
  ↓
...
  ↓
Randomized Q1441 / 1441
  ↓
Review
```

## Random Test — Answer at End

```text
Home
  ↓
Random Test
  ↓
Choose question count
  ↓
Instant Feedback OFF
  ↓
Start Test
  ↓
Random question selection
  ↓
Answer each question
  ↓
Final question
  ↓
Submit Test
  ↓
Review all questions
```

## Random Test — Instant Feedback

```text
Home
  ↓
Random Test
  ↓
Choose question count
  ↓
Instant Feedback ON
  ↓
Start Test
  ↓
Random question
  ↓
Immediate feedback
  ↓
Next question
  ↓
...
  ↓
Review all questions
```

---

# 8. Navigation and Progress

The test UI should clearly show the user's current position.

Examples:

- `1 / 1441`
- `127 / 1441`
- `10 / 50`

The Next/Continue action must not allow the user to accidentally skip submitting an answer unless a deliberately designed unanswered state is supported.

The core requirement is that every attempted question has a recorded answer before it is considered completed.

---

# 9. Scoring and Status

The application must track, for the current test session:

- Total questions
- Questions answered
- Correct answers
- Incorrect answers
- User's selected answer for each question
- Correct answer for each question

At the end of the test, the application should make the correct/incorrect outcome available as part of the review.

A simple summary such as `Correct: X | Incorrect: Y | Total: Z` may be shown at the top of the review screen because it directly describes the completed test result.

---

# 10. Randomization Rules

Randomization must follow these rules:

1. Never duplicate a question within the same test session.
2. Never omit a requested question count when enough questions are available.
3. For Continuous Test randomization, all 1,441 questions must appear exactly once.
4. For Random Test, exactly the requested number of unique questions must be selected.
5. Once the test session starts, its question order must remain stable.
6. Starting a new Random Test should generate a new random selection/order.

---

# 11. Data and State Model

The implementation should maintain a test-session state conceptually similar to:

```js
{
  mode: "continuous" | "random",
  questions: [...selectedQuestionsInSessionOrder],
  currentIndex: 0,
  instantFeedback: true | false,
  randomized: true | false,
  answers: {
    [questionId]: selectedOptionId
  },
  completed: false
}
```

The exact implementation can differ depending on the existing application architecture.

Important requirement: the source question bank should remain immutable during normal quiz operation.

---

# 12. UI Requirements

## Home

Show two obvious primary actions:

- `Continuous Test`
- `Random Test`

## Test Header

Show enough context to understand the current session, including:

- Test mode
- Current question / total
- Randomization state where applicable
- Instant feedback state where applicable

## Answer Options

Each option should be presented as a distinct clickable control.

The selected answer should be visually obvious.

Feedback states:

- Normal/unanswered
- Selected
- Correct / green
- Incorrect / red

For an incorrect answer, the user's chosen option and the correct option must both remain visible simultaneously.

## Review Screen

Every attempted question should be visible with its answer state.

The review must clearly distinguish:

- Correct
- Incorrect

and must show both the user's choice and the correct answer for incorrect questions.

---

# 13. Accessibility and Usability Requirements

The application should remain understandable without relying exclusively on color.

For example:

- Use `Correct` / `Incorrect` text in addition to green/red.
- Maintain readable contrast.
- Make answer options large enough to click comfortably.
- Ensure the primary quiz controls are keyboard accessible where practical.

These requirements should not change the quiz functionality or add unrelated features.

---

# 14. Error Handling and Validation

The application must handle:

### Invalid custom question count

Show a clear validation message if the entered number is:

- Empty
- Non-numeric
- Less than 1
- Greater than 1441

### Question-bank loading failure

If the Markdown file cannot be loaded or parsed, do not start a test with incomplete data.

Show a clear error state instead.

### Invalid question data

If a question is missing required question text or options, the application must not silently invent replacement data.

The error should identify the affected question where possible.

---

# 15. Performance Requirements

The application needs to handle the full 1,441-question dataset without noticeably slow interaction during normal quiz use.

Important considerations:

- Loading the question bank should happen efficiently.
- Selecting an answer should feel immediate.
- Moving between questions should not trigger unnecessary full application reloads.
- Randomization of 1,441 questions should be performed efficiently.
- Review of all attempted questions should remain usable for a 1,441-question Continuous Test.

---

# 16. Functional Acceptance Criteria

The implementation is complete only when all of the following are true:

### Home

- [ ] Home page exists.
- [ ] Continuous Test is available.
- [ ] Random Test is available.

### Continuous Test

- [ ] Starts with all 1,441 questions.
- [ ] Default order is the source-file order.
- [ ] Randomize Questions control exists.
- [ ] Randomization is OFF by default.
- [ ] Randomized mode uses all 1,441 questions exactly once.
- [ ] One question is presented at a time.
- [ ] User can select an option.
- [ ] Instant correctness is ON by default.
- [ ] Correct selection is shown in green.
- [ ] Incorrect selection is shown in red.
- [ ] Correct option is shown in green when the selected answer is wrong.
- [ ] Test progresses through the entire question set.
- [ ] End-of-test review contains all attempted questions.

### Random Test

- [ ] User can choose a predefined number of questions.
- [ ] At least 10, 50, and 100 are available as predefined choices.
- [ ] User can enter a custom number.
- [ ] Custom number is restricted to 1–1441.
- [ ] Questions are selected randomly without duplication.
- [ ] User can choose instant feedback ON/OFF.
- [ ] Instant feedback is OFF by default.
- [ ] When instant feedback is OFF, answers are not revealed during the test.
- [ ] After submission, every question can be reviewed.
- [ ] Review shows selected answer, correct answer, and correctness.

### Data Integrity

- [ ] All 1,441 questions from `Comprehensive_Exam_Questions_Quiz.md` are available.
- [ ] Each question has its source options intact.
- [ ] Correct-answer markers from the MD are respected.
- [ ] The application does not silently rewrite the source question bank.

---

# 17. Implementation Guidance for Codex

Implement this as a complete, working application rather than a static mockup.

Before coding:

1. Inspect the existing repository structure and identify the current framework/build setup.
2. Reuse the existing application architecture where possible instead of introducing an unnecessary second framework.
3. Inspect `Comprehensive_Exam_Questions_Quiz.md` and implement parsing based on its actual structure.
4. Verify that the parser detects all 1,441 questions.
5. Verify that each question has its expected options and correct-answer information before wiring the quiz UI.

During implementation:

- Keep quiz state separate from the immutable source question data.
- Do not hard-code the question bank into JSX/HTML components.
- Keep randomization deterministic for a running session: randomize once when the session starts, then retain that order.
- Prevent duplicate questions in Random Test.
- Prevent accidental answer changes after a question has been submitted.
- Keep the question and option rendering generic so the full dataset can be used without special cases for individual questions.

After implementation, test at minimum:

1. Continuous Test with default order.
2. Continuous Test with randomization ON.
3. Continuous Test with a correct answer.
4. Continuous Test with an incorrect answer.
5. Random Test with 10 questions.
6. Random Test with 50 questions.
7. Random Test with 100 questions.
8. Random Test with a custom count.
9. Random Test with instant feedback ON.
10. Random Test with instant feedback OFF.
11. Review of a mixed correct/incorrect test.
12. Full 1,441-question dataset loading and parsing.

---

# 18. Definition of Done

The quiz application is considered done when a user can start from the Home page and complete either test type end-to-end using the 1,441-question Markdown bank, with the requested ordering/randomization controls, immediate or end-of-test answer feedback, and complete question-by-question review of correct and incorrect answers.

No question should be omitted, duplicated within a session, or have its source answer marking changed by the application.
