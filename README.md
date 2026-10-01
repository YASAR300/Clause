# Clause

Clause is a production-grade web application for analyzing legal contracts with mathematical and textual certainty. Users upload PDF and DOCX contracts and engage in conversational interrogation where every claim is backed by exact, server-verified quotations and offset matches anchored directly to the source document.

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 20+)
- PostgreSQL database (e.g. Neon)
- OpenAI-compatible AI API credentials
- Vercel Blob token for secure document storage

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment variables and fill in your secrets:
   ```bash
   cp .env.example .env
   ```

3. Run database migrations:
   ```bash
   npm run db:migrate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.
