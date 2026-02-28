<<<<<<< HEAD
# 💪 FitAI – Smart Gym Assistant

AI-powered gym assistant with personalized BMI analysis, diet plans, posture correction, and weekly workout scheduling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | **Next.js 14** + React 18 |
| Backend | **FastAPI** (Python) |
| AI/ML | **TensorFlow**, **PyTorch**, **scikit-learn** |
| Vision | **MediaPipe** + **OpenCV** |
| Conversational AI | **OpenAI GPT-4** + **HuggingFace Transformers** |
| Database | **MongoDB** (user data) + **PostgreSQL** (analytics) |
| Storage | **AWS S3** (posture frames) + **Firebase** (real-time) |
| Analytics | **Plotly** + **D3.js** |

## Project Structure

```
fitai/
├── frontend/                 # Next.js app
│   └── src/
│       ├── pages/
│       │   └── index.jsx     # Main app page (all tabs)
│       ├── components/
│       │   ├── AnalyticsCharts.jsx  # Plotly + D3 charts
│       │   └── ChatBot.jsx          # AI chat widget
│       ├── hooks/
│       │   └── useFitAI.js   # Centralised state + API calls
│       └── services/
│           └── api.js        # Axios API client
│
└── backend/                  # FastAPI app
    ├── main.py               # Entry point
    ├── routers/              # API routes
    │   ├── bmi.py
    │   ├── diet.py
    │   ├── workout.py
    │   ├── posture.py
    │   ├── chat.py
    │   └── analytics.py
    ├── ml/                   # ML models
    │   ├── posture_analyzer.py    # MediaPipe + OpenCV
    │   ├── bmi_diet_model.py      # scikit-learn + TensorFlow
    │   └── workout_recommender.py # PyTorch
    ├── services/
    │   ├── db.py             # MongoDB + PostgreSQL
    │   ├── s3_storage.py     # AWS S3
    │   └── llm_chat.py       # OpenAI + HuggingFace
    ├── models/
    │   └── user.py           # Pydantic schemas
    ├── requirements.txt
    └── .env.example
```

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `http://localhost:3000`

## Features

- **BMI & Diet** – Mifflin-St Jeor BMR, scikit-learn diet classifier, TF calorie model
- **Posture Analysis** – MediaPipe landmark detection, real-time feedback scores
- **AI Chat** – GPT-4 with HuggingFace fallback, intent classification
- **Weekly Plans** – PyTorch recommender, age/ability-adjusted schedules
- **Analytics** – Plotly bar/line charts, D3.js macro donut, MongoDB history
=======
# fitai-fullstack
# 🏋️ FitAI – AI-Based Gym Assistant

FitAI is an AI-powered gym assistant that generates personalized workout plans and fitness recommendations using AI.

---

## 🚀 Features

- AI-generated workout plans
- Smart fitness chat assistant
- User progress tracking
- Modern frontend UI
- Backend API integration

---

## 🛠 Tech Stack

### Backend
- Python
- FastAPI / Flask
- OpenAI API
- Database (SQLite / PostgreSQL)

### Frontend
- React / Next.js
- TailwindCSS

---

## 📂 Project Structure
- backend
- frontend
- docs

---

## 🧪 Testing

Backend:
- pytest

Frontend:
- npm test

---

## 🚀 Deployment Options

Frontend → Vercel  
Backend → Render / Railway  
Database → Supabase / PostgreSQL  

---

## 📜 License

MIT License
>>>>>>> 3bc2dc89a0f46fd529201b497fcea6d5e27e9af2
