# Flow Monorepo

This project is organized as a monorepo for scaling and modularity.

## Directory Structure

- `backend/`: Rust workspace for backend services.
  - `api/`: Main REST API service (Axum).
- `frontend/`: Web application (Vite + React).
- `desktop/`: Desktop application (Electron).
- `cli/`: Command-line interface tools for database and Sui interaction.

## Getting Started

### Prerequisites

- Rust (stable)
- Node.js (v20+)
- Docker & Docker Compose
- Stellar/Soroban CLI (for contracts)

### Installation

```bash
# Install dependencies
npm install

# Build the backend
cd backend
cargo build
```

### Running with Docker

```bash
docker-compose up -d
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.
