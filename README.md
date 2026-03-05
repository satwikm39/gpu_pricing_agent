# GPU Leasing Pricing Agent 🤖🚀

An educational, "Glass-Box" Agentic AI dynamic pricing engine for B2B GPU leasing. Designed to maximize revenue and fleet utilization by applying semantic business policies over deterministic baseline quotes.

## 🏗️ Architecture
1. **The Calculator (`core/calculator.py`)**: Computes theoretical fair-market base price and margins.
2. **The Governor (`core/agent.py`)**: A LangChain-powered LLM Agent that evaluates real-time fleet health (supply/demand) against hard financial constraints (Margin Floors, Eviction Policies). It outputs a final price and a Transparent Explanation for the customer.
3. **The Simulator (`simulator/chaos_monkey.py`)**: A stochastic event generator that continuously feeds random market conditions and requests to the Agent to test its policies.

## ⚙️ How to Run the Simulator

1. **Set up Python Environment**
```bash
cd /Users/satwik/Developer/aznext/gpu_pricing_agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Configure API Keys**
Create a `.env` file in the root directory (or export the variable):
```bash
OPENAI_API_KEY="your-sk-key"
```

3. **Run the Chaos Monkey! 🐒**
Execute the interactive terminal simulator:
```bash
PYTHONPATH=. python simulator/chaos_monkey.py
```

Watch as the agent dynamically approves, overrides margins, or evicts spot instances while explaining exactly *why* it made the financial choice.
