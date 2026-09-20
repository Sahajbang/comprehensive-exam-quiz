# QuizBank — Comprehensive Exam Quiz App

A premium quiz application built for the 2022 Comprehensive Exam question bank (1,441 questions).

## How to Start

Open a terminal in this folder (`e:\quiz-maker`) and run **one** of the following:

### Option A — Python (recommended)
```bash
python -m http.server 3000
```
Then open: **http://localhost:3000**

### Option B — Node.js
```bash
node server.js
```
Then open: **http://localhost:9000**

### Option C — npx serve
```bash
npx serve . -p 3000
```
Then open: **http://localhost:3000**

### Option D — Open directly (no server needed)
Open `index.html` in your browser directly. When the app starts, it will ask you to select `Comprehensive_Exam_Questions_Quiz.md` using a file picker.

---

## Features

### Home Screen
- **Continuous Test** — All 1,441 questions in original or randomised order
- **Random Test** — Pick a custom number of questions with configurable feedback

### Continuous Test
- All 1,441 questions, one at a time
- Instant answer feedback ON by default (correct = green, incorrect = red)
- Randomize Questions toggle in the header
- Progress bar and live score counter
- Full review at end of test

### Random Test
- Quick-select: 10, 25, 50, 100, 250, 500, or 1,000 questions
- Custom number input (1–1,441)
- Instant feedback OFF by default (reveal at end)
- Toggle to turn instant feedback ON
- Full review at the end with score breakdown

### Review Screen
- All questions with correct/incorrect status
- Filter: All / Correct / Incorrect
- Score bar and percentage
- Color-coded answers: green (correct), red (incorrect)

### Keyboard Shortcuts
- **1–4**: Select option 1, 2, 3, or 4
- **↑/↓**: Navigate between options
- **Enter**: Select focused option or click Next

---

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML entry point |
| `style.css` | Premium dark-mode design system |
| `parser.js` | Markdown question bank parser |
| `app.js` | Full application logic |
| `server.js` | Simple Node.js server (port 9000) |
| `Comprehensive_Exam_Questions_Quiz.md` | Source question bank (1,441 questions) |
