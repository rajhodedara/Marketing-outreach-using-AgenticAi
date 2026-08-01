# Autonomous Account-Based Marketing Strategy & Outreach Orchestrator

## Overview
This project is an **Autonomous ABM Strategy & Outreach Orchestrator**, an AI-powered, multi-agent system designed for B2B enterprise sales. It ingests scattered enterprise data (CRM, call transcripts, emails, web data), synthesizes unified account intelligence, and orchestrates highly personalized, fact-grounded outreach strategies without the risk of AI hallucination.

The system uses a multi-agent architecture (Research Agent, Persona Mapping Agent, Intent Analysis Agent, Action Sequencing Agent, and Critic Agent) to provide a unified intelligence layer.

## Project Structure
Below is a detailed breakdown of the files and folders in this repository:

### Root Directory
- **`project_specification.md`**: The core specification document detailing the project's background, problem definition, product vision, user personas, requirements (functional, non-functional, AI, data), and technical architecture.
- **`download_screens.ps1`**: A PowerShell script presumably used to download screens/UI mockups for the frontend design.
- **`.gitignore`**: Global git ignore file for the project.

### `backend/`
The Python FastAPI backend that orchestrates the AI agents and processes data.
- **`app/`**: Core application directory.
  - **`api/`**: API routing and endpoint definitions.
  - **`agents/`**: Contains the logic for the various LangGraph/AutoGen AI agents (Research, Persona, Intent, Action, Critic).
  - **`core/`**: Core configuration and shared logic.
  - **`db/`**: Database integration and models (Vector DB for RAG, Relational DB for state).
  - **`ingestion/`**: Logic for ingesting and processing unstructured (transcripts, emails) and structured data.
  - **`prompts/`**: System prompts used by the LLMs to guide agent behavior.
  - **`rag/`**: Retrieval-Augmented Generation implementation, querying the vector database.
  - **`schemas/`**: Pydantic models for API request/response validation.
  - **`main.py`**: The FastAPI application entry point.
  - **`config.py`**: Configuration loading (from environment variables).
- **`data/`**: Directory for storing data assets.
- **`sample_data/`**: Contains mock data used for the MVP (CRM JSON, transcripts, etc.).
- **`tests/`**: Unit and integration tests for the backend.
- **`test_db.py`**: A script to test database connectivity.
- **`verify_phase1.py` & `verify_phase2.py`**: Scripts to verify the completion and functionality of different development phases of the hackathon/MVP.
- **`requirements.txt` & `pyproject.toml`**: Python dependency management files.
- **`.env` & `.env.example`**: Environment variable configurations.

### `frontend/`
The Next.js (React) frontend application, built with Tailwind CSS and Shadcn UI. This serves as the primary dashboard for users to interact with the system.
- **`src/`**: Source code for the Next.js app.
  - **`app/`**: Next.js App Router definitions. Includes pages for account views (`accounts/[id]`), uploading data (`upload`), and the global layout.
  - **`components/`**: React components.
    - **`ui/`**: Reusable Shadcn UI components (buttons, cards, inputs, tables, tabs, etc.).
  - **`lib/`**: Library code and utilities (e.g., `utils.ts`).
  - **`utils/`**: General utilities, including Supabase integrations (`supabase/client.ts`, `supabase/server.ts`, etc.).
  - **`middleware.ts`**: Next.js middleware (often used for authentication/routing checks).
- **`public/`**: Static assets (icons, SVGs).
- **Configuration Files**: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `components.json`, `eslint.config.mjs`.
- **`AGENTS.md` & `CLAUDE.md`**: AI-specific instructions or configurations for the frontend.

### `frontend_old/`
A legacy or backup version of the frontend application containing a similar structure (Next.js, UI components). It has been superseded by the `frontend/` directory.

## Technology Stack
- **Frontend**: Next.js (React), Tailwind CSS, Shadcn UI
- **Backend**: Python, FastAPI
- **Agent Framework**: LangGraph / AutoGen
- **Database**: PostgreSQL / SQLite (State), Pinecone / Qdrant (Vector DB for RAG)
- **AI Models**: OpenAI (GPT-4o) / Anthropic (Claude 3.5 Sonnet)

## Getting Started
*(Add specific instructions here on how to run the backend and frontend servers, set up environment variables, and run tests.)*
