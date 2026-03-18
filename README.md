# GPU Leasing Pricing Agent 🤖🚀

An educational, "Glass-Box" Agentic AI dynamic pricing engine for B2B GPU leasing. Designed to maximize revenue and fleet utilization by applying semantic business policies over deterministic baseline quotes.

## 📖 Documentation
- [Executive Summary & Educational Narrative](./docs/executive_summary.md)
- [System Architecture](./docs/architecture.md)
- [Pricing Strategy Details](./pricing_strategy.md)
- [Design Document](./Design\ Document.md)

## ✨ Latest Features
- **Full-Stack Application**: A modern React frontend combined with a FastAPI backend to visualize real-time agent decisions.
- **Group-Namespaced Deployment**: Support for multiple isolated student groups using a single backend deployment via `group_id` routing.
- **Realistic GPU Simulation**: Enhanced simulation handling varying fleet sizes for different GPU architectures (H100, A100, L40S, etc.).
- **Glass-Box Explainability**: The LLM agent generates real-time, transparent explanations justifying every financial decision and eviction calculation.
- **Strict Guardrails**: Refined AI persona locking to ensure the agent acts purely as a pricing negotiator, never breaking character as a customer service agent.
- **Bill and Ledger Management**: Track accrued revenue, evaluate automated QA/QC metrics, and split or refund specific bill items directly in the UI.

## ⚙️ Setup & Run Instructions

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Configure Environment:**
Create a `.env` file in the `backend` directory:
```env
OPENAI_API_KEY="your-sk-key"
```

**Run the API Server:**
```bash
uvicorn app:app --reload
```
*(The backend runs on http://localhost:8000)*

### 2. Frontend Setup
```bash
cd frontend
npm install
```

**Configure Environment:**
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL="http://localhost:8000"
```

**Run the Dashboard:**
```bash
npm run dev
```
*(The frontend runs on http://localhost:5173)*

### 3. Usage
Navigate to the frontend URL. You can use the `?group_id=YOUR_GROUP_NAME` query parameter to launch an isolated simulation namespace for your team or students. Watch as the agent dynamically approves, overrides margins, or evicts spot instances while explaining exactly *why* it made the financial choice!
