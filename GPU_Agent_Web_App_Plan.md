# GPU Pricing Agent - Web Application Implementation Plan

## Overview
This document outlines the architecture and implementation steps to build a full-stack web application to visualize the GPU Pricing Agent.

## Goal Description
We need to build a full-stack web application to visualize the GPU Pricing Agent in action. The application will consist of a FastAPI backend to run the simulation and serve AI pricing decisions, and a modern React frontend (using Vite + Tailwind) to display real-time fleet metrics, the simulated request feed, and the Glass-Box AI reasoning.

## Proposed Architecture

### Backend (FastAPI)
The backend will wrap the existing deterministic computation layer and the AI Agent, serving as an API to control the simulation.

1. **`backend/requirements.txt`**: Add dependencies: `fastapi`, `uvicorn`, `pydantic`, `langchain-openai`, `python-dotenv`.
2. **`backend/app.py`**: A FastAPI application that wraps the `ChaosMonkeySimulator` from the previous project phase.
3. **API Endpoints**:
   - `GET /api/tick`: Runs one tick of the simulation. Returns the resulting `GPUState`, incoming `LeaseRequest`, and the `AgentDecision` (including the Glass-Box reasoning).
   - `POST /api/settings`: Accepts an updated payload of the agent's policy thresholds (e.g., Minimum Margin, Scarcity limits) to alter behavior dynamically.
   - `GET /api/metrics`: Returns aggregated simulation metrics (Total Revenue, Trust Score, Number of Evictions, Rejected Deals).

### Frontend (React + Vite)
The frontend will act as the "Deal Desk Dashboard" for students to interact with the LLM Agent.

1. **Scaffolding**: Initialize a new React application using Vite in a `frontend/` directory. Configure Tailwind CSS for styling.
2. **Components**:
   - `src/App.jsx`: The main dashboard layout integrating all components.
   - `src/components/MetricCards.jsx`: Displays the high-level KPIs returned from `/api/metrics` (Revenue accrued, Current Fleet Utilization, Trust/SLA Score).
   - `src/components/LiveFeed.jsx`: A real-time, scrolling list of pricing decisions from `/api/tick`. It must highlight the AI's "Glass-Box" explanation so users understand the reasoning behind surges or evictions.
   - `src/components/PolicyControls.jsx`: Sliders or input fields for students to adjust the GPU Pricing Agent's policies on the fly via `/api/settings`.

## Verification Steps
### Manual Verification
1. Start the FastAPI backend via `uvicorn backend.app:app --reload` and verify the `/api/tick` endpoint successfully runs an AI decision cycle and returns valid JSON.
2. Start the Vite React frontend via `npm run dev` and ensure it successfully fetches data from the backend without CORS issues.
3. Validate the interactive loop: Adjust a policy threshold in the frontend UI, submit it, and verify that subsequent simulation ticks reflect the new agent behavior.
