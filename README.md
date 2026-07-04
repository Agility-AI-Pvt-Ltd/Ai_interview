# AI Recruitment System

A clickable MVP prototype demonstrating an AI-powered recruitment workflow with resume screening and automated interview assessment.

## Features

- **HR Login** — Mock authentication (hr@company.com / hr123)
- **Dashboard** — Stats cards, charts, recent candidates
- **Create Job** — Define job title, department, skills, and description
- **Resume Upload** — Upload PDF/DOCX resumes with AI-powered screening
- **Candidate Ranking** — Scored and ranked by AI with skills match analysis
- **Interview Links** — Generate unique interview URLs for shortlisted candidates
- **AI Interview** — 5–8 role-specific questions with progress tracking
- **AI Evaluation** — Technical, communication, and overall scores with recommendations
- **HR Review** — Select, reject, or hold candidates with full reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| AI | Groq API (Llama 3.3, with mock fallback) |
| File Upload | Multer |
| Parsing | pdf-parse, mammoth |

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment (optional)

Copy `backend/.env.example` to `backend/.env`. Configure:

```
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
GROQ_API_KEY=gsk-your-key-here
GROQ_MODEL=llama-3.3-70b-versatile
USE_MOCK_AI=false
```

### 3. Start the servers

**Terminal 1 — Backend:**
```bash
npm run dev:backend
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```

Open **http://localhost:5173** in your browser.

**Quick demo:** Click **Load Demo Data** on the dashboard to populate sample jobs and candidates instantly.

## Demo Workflow

1. **Login** with `hr@company.com` / `hr123`
2. **Create a Job** — e.g. "Senior Frontend Developer" with skills like React, TypeScript, Node.js
3. **Upload Resumes** — Select the job, upload PDF/DOCX files, click "Analyze with AI"
4. **Review Results** — Candidates ranked by score with matched/missing skills
5. **Shortlist** — Click "Shortlist & Copy Link" to generate an interview URL
6. **Interview** — Open the link in a new tab/browser as the candidate
7. **Submit** — Answer all questions and submit for AI evaluation
8. **HR Review** — Go to Candidates → Review to see scores and make a decision

## Project Structure

```
├── frontend/          # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/   # UI components & layout
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API client
│   │   └── lib/          # Utilities
├── backend/           # Express API
│   └── src/
│       ├── routes/       # API endpoints
│       ├── services/     # AI & resume parsing
│       └── database/     # SQLite setup
├── database/          # Legacy folder (data now in PostgreSQL)
└── uploads/           # Uploaded resume files
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | HR login |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET/POST | /api/jobs | List/create jobs |
| POST | /api/candidates/upload/:jobId | Upload & analyze resumes |
| GET | /api/candidates | List candidates |
| PATCH | /api/candidates/:id/status | Update candidate status |
| POST | /api/candidates/:id/shortlist | Generate interview link |
| GET | /api/interview/:token | Get interview session |
| POST | /api/interview/:token/submit | Submit & evaluate interview |

## Notes

This is a **prototype/MVP** — mock authentication, mock AI fallback, and simplified parsing are intentional. The architecture supports swapping in real auth, production AI, and advanced resume parsing later.
