# System Architecture

The GPU Pricing Agent is designed as a modern, full-stack application that separates deterministic pricing calculations from AI-driven policy evaluation.

## High-Level Components

### 1. Frontend (React / Vite / Tailwind)
The visual "Deal Desk Dashboard" for students to interact with the LLM Agent.
- **Group-Namespaced Multi-Tenancy**: Students operate in isolated simulation groups via URL parameters (`group_id`), allowing a single deployment to concurrently serve an entire classroom without cross-interference.
- **Live Feed & Metrics**: Real-time visualization of incoming GPU lease requests, the agent's final decisions, and the "Glass-Box" explanations.
- **Policy Controls**: Functional interactive sliders and inputs for students to adjust the Agent's financial guardrails on the fly.

### 2. Backend (FastAPI)
The API layer wrapping the core simulation engine.
- **Tick Endpoint**: Steps the simulation forward, processing stochastic lease requests.
- **State Management**: Maintains isolated simulation variables, fleets, and ledgers for different student groups.
- **Settings API**: Receives live policy updates from the frontend to seamlessly alter Agent behavior during the simulation loop.

### 3. The Core Engine (Python)
- **The Calculator (`core/calculator.py`)**: Computes theoretical fair-market base prices using amortized base rates and standard discount modifiers (Duration, Volume, Spot workloads).
- **The Governor Agent (`core/agent.py`)**: The LangChain/LLM policy-enforcement layer. It evaluates real-time fleet health (supply/demand) against executive constraints (Margin Floors, Scarcity Surge, Eviction Deltas). It strictly dictates the final price and generates natural language explanations to ensure trust.
- **Chaos Monkey Simulator (`simulator/chaos_monkey.py`)**: Generates stochastic market conditions, injecting realistic load profiles and dynamically changing competitor pricing to stress-test the Agent's policies.
