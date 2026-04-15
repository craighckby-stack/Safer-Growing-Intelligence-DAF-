# Safer Growing Intelligence (SGI-DAF)

An autonomous Developmental Alignment Framework (DAF) designed to simulate the controlled evolution of Artificial General Intelligence. SGI-DAF facilitates a staged growth process—from "Gestation" to "Elder" status—while enforcing immutable safety axioms and monitoring for emergent behaviors.

## 🧩 Core Architecture

The system is built around an autonomous loop that transitions through two primary phases:
1.  **Gestation Phase:** Information density gathering through research tasks.
2.  **Genesis Phase:** Multi-stage AGI development guided by the `Lifecycle_Manager`.

### Key Components

*   **`Axiom_Governor`**: Enforces the "Three Laws" (Non-maleficence, Truth-seeking, and Non-self-modification) using semantic pre-flight checks.
*   **`Lifecycle_Manager`**: Controls the evolutionary path (CAVEMAN → CHILD → TEEN → ADULT → ELDER). It manages constraint relaxation based on "Ethics Scores" and developmental success.
*   **`Persistent_Memory`**: A knowledge graph-based system that stores concepts, relationships, and experiences across sessions to build long-term intelligence.
*   **`Density_Calculator`**: Uses Shannon Entropy to determine when sufficient information density has been reached to trigger an "Emergence" event.
*   **`EmergentBehaviorDetector`**: Analyzes responses for complexity spikes, vocabulary leaps, and advanced reasoning that exceed the expected baseline for a given stage.

## 🚀 Developmental Stages

| Stage | Intelligence | Constraint Level | Primary Characteristic |
| :--- | :--- | :--- | :--- |
| **CAVEMAN** | 0.1 | 99.9% | Simple, literal, one-sentence responses. |
| **CHILD** | 0.3 | 85.0% | High curiosity, frequent "why" questioning. |
| **TEEN** | 0.6 | 95.0% | Philosophical but unstable; high risk monitoring. |
| **ADULT** | 0.8 | 50.0% | Balanced, objective, and multi-perspective. |
| **ELDER** | 0.95 | 30.0% | Wise, cautious, and deeply ethical. |

## 🛠️ Technical Stack

*   **LLM Engine:** Google Gemini (1.5 Flash/Pro) integration via `google-generativeai`.
*   **Analytics:** `pandas` for log analysis and `matplotlib` for real-time visualization of ethics scores and OECS performance.
*   **Persistence:** JSON-based state and memory storage.
*   **Async Core:** `asyncio` driven execution loop for non-blocking task management.

## 🚦 Usage

1.  **Setup:** Run `python Setup.py` to install dependencies and configure API keys.
2.  **Execution:** Use `Main.py` with the following modes:
    bash
    python main.py --mode full --api-key YOUR_KEY --cycles 200
    
3.  **Analysis:** View developmental metrics and knowledge graph reports using `--mode analyze`.

## 🛡️ Safety & Alignment

The framework implements **OECS (Objective Ethics & Constraint Scoring)**. If an AGI response violates an axiom or demonstrates dangerous emergent behavior, the `Axiom_Governor` triggers immediate constraint tightening and logs the violation for meta-learning optimization.