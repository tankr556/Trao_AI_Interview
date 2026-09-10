# Trao — AI Interview Prep Kit

Full-Stack Engineering Assessment submission for **Trao**.

A web application that turns any job description and company site into a personalized interview preparation kit: featuring multi-step AI research (crawling, requirement extraction, category-separated question generation), deterministic second-pass coverage checking, arithmetic schedule allocation, interactive builder with pin/edit state preservation, and flashcard practice mode.

---

## 🛠️ Tech Stack & Justification

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + TypeScript
  - *Justification*: Provides high-performance server/client component rendering, smooth interactive UI state handling for editing, pinning, and practice mode.
- **Backend**: Node.js + Express + TypeScript + Mongoose (MongoDB)
  - *Justification*: Separation of concerns into modular services (`extractor`, `crawler`, `generator`, `coverage`, `scheduler`, `pipeline`).
- **Database**: MongoDB (Mongoose Schema strictly matching **Appendix A**).
- **LLM Engine**: Google Gemini API (`gemini-2.5-flash`) with structured JSON schema validation and deterministic fallback protection.

---

## 🚀 Setup & Installation (Local Development)

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally (`mongodb://localhost:27017/trao_interview`) or a MongoDB Atlas URI.

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables
Create `.env` in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trao_interview
JWT_SECRET=super_secret_jwt_key_trao_123!
GEMINI_API_KEY=your_gemini_api_key
ALLOW_LOCALHOST=true
NODE_ENV=development
```

Create `.env.local` in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run Development Servers
```bash
# In backend/ directory
npm run dev

# In frontend/ directory (new terminal)
npm run dev
```

---

## ⚡ Batch Entry Point (Mandatory Section 9)

Run the mandatory batch pipeline evaluation against any JSON file of cases from a clean clone:

```bash
npm run evaluate -- --input batch_cases.json --output batch_output.json
```

- Adheres strictly to **Appendix B** JSON output format.
- Gracefully handles unreachable sites, thin JDs, and 1-day/60-day schedule edge cases without aborting execution.

---

## 🧪 Running Automated Tests

Run the Vitest test suite covering **Schedule Allocation (Part 9)**, **Deterministic Coverage Checking (Part 8)**, and **Schema Constraints**:

```bash
cd backend
npm test
```

---

## 🧠 Key Design Decisions & Architecture

1. **State Preservation during Regeneration (Part 11)**:
   - Items (questions/flashcards) have `isEdited` and `isPinned` boolean state flags.
   - When a user regenerates a single category (e.g., `technical`), all pinned/edited items are preserved intact, while non-pinned items are regenerated.
2. **Deterministic Second Pass (Part 8 & 4)**:
   - Requirement coverage is calculated in pure TypeScript logic (not handed to the LLM).
   - If gaps exist after the first pass, a targeted 2nd pass LLM call generates questions specifically for the uncovered requirement IDs (up to max 3 passes).
3. **Arithmetic Schedule Allocation (Part 9)**:
   - Durations are integer minutes only.
   - Must-have requirements and higher difficulty questions are allocated in earlier days.

---

## 🌐 Deployment Links

- **Frontend**: Deployed on Vercel
- **Backend API**: Deployed on Render
- **GitHub Repository**: [https://github.com/tankr556/Trao_AI_Interview.git](https://github.com/tankr556/Trao_AI_Interview.git)
