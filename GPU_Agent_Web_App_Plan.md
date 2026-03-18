# GPU Pricing Agent - Web Application Architecture

## Overview
This document outlines the active architecture for the full-stack web application visualizing the GPU Pricing Agent.

## Goal Description
The web application visualizes the GPU Pricing Agent in action. It utilizes a FastAPI backend to run the simulation and serve AI pricing decisions, and a modern React frontend (using Vite + Tailwind) to display real-time fleet metrics, the simulated request feed, and the Glass-Box AI reasoning. Built-in multi-tenancy scales the simulation for multiple students via Group-Namespaced instances.

## Active Architecture

### Backend (FastAPI)
The backend wraps the deterministic computation layer and the AI Agent, serving as an API to control the simulation.

1. **Environment Setup**: Handled via `uvicorn`, `fastapi`, `pydantic`, `langchain-openai`.
2. **`backend/app.py`**: A FastAPI application that wraps the `ChaosMonkeySimulator`. It maps simulation states in a dictionary keyed by `group_id`.
3. **API Endpoints**:
   - `GET /api/tick?group_id={id}`: Runs one tick of the simulation for the specified group. Returns the resulting `GPUState`, incoming `LeaseRequest`, and the `AgentDecision` (including the Glass-Box reasoning).
   - `POST /api/settings?group_id={id}`: Accepts an updated payload of the agent's policy thresholds (e.g., Minimum Margin, Scarcity limits) to alter behavior dynamically.
   - `GET /api/metrics?group_id={id}`: Returns aggregated simulation metrics (Total Revenue, Trust Score, Number of Evictions, Rejected Deals).
   - `POST/PUT /api/bills`: Allows UI modification of bill items, quantity resets via the Splitter Table, and calculates taxes dynamically.
   - `POST /api/evaluations`: Evaluates QA interactions, analyzing customer service agent audio chunks and returning structured feedback.

### Frontend (React + Vite)
The frontend acts as the "Deal Desk Dashboard" for students to interact with the LLM Agent.

1. **Scaffolding**: React application using Vite in the `frontend/` directory. Styled with Tailwind CSS.
2. **Components**:
   - `src/App.jsx`: The main dashboard layout integrating all components. Appends the `group_id` query parameter to all outbound API calls.
   - `src/components/MetricCards.jsx`: Displays the high-level KPIs returned from `/api/metrics` (Revenue accrued, Current Fleet Utilization, Trust/SLA Score).
   - `src/components/LiveFeed.jsx`: A real-time, scrolling list of pricing decisions from `/api/tick`. It highlights the AI's "Glass-Box" explanation so users understand the reasoning behind surges or evictions.
   - `src/components/PolicyControls.jsx`: Sliders or input fields for students to adjust the GPU Pricing Agent's policies on the fly via `/api/settings`.
   - `src/components/AgentSidebar.jsx`: UI rendering active policies and simulation navigation.
   - `src/components/SplitterTable.jsx`: An advanced billing UI component for splitting costs, adjusting item rates, and resetting quantities across invoices.

## Deployment & Verification
1. FastAPI backend is started via `uvicorn app:app --reload` from `backend/`.
2. Vite React frontend is run via `npm run dev` from `frontend/`. 
3. Launch via `localhost:5173/?group_id=student_demo` to initialize a sandboxed environment for testing the policy loop.
