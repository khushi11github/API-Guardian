# 🛡️ API Guardian

> **Production-grade API monitoring, automated synthetic testing, contract-drift detection, and AI-powered root-cause analysis platform for developers.**

![API Guardian](https://img.shields.io/badge/Status-Production--Ready-emerald?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Postgres%20%7C%20BullMQ%20%7C%20Redis-blue?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-SSRF%20Guarded%20%7C%20Argon2id%20%7C%20HMAC-violet?style=for-the-badge)

---

## 🌟 Core Features

- ⚡ **Automated Synthetic Testing Engine** — Define HTTP requests (GET, POST, PUT, PATCH, DELETE), headers, query params, payloads, and timeout thresholds.
- 🕒 **Decoupled BullMQ Scheduler & Worker** — Background monitoring jobs run outside Express request cycles on scalable BullMQ workers with Redis queues.
- 📊 **Executive & Endpoint Dashboards** — Real-time health gauges, response-time percentiles, 7-day uptime SLAs, and Recharts interactive graphs.
- 🤖 **AI-Powered Root-Cause Analysis (RCA)** — Pluggable `AIService` abstraction supporting Mock AI, OpenAI GPT-4o, and Anthropic Claude 3.5. Formats structured diagnostics with evidence, probable cause, confidence scores, and action items.
- 📑 **API Contract & Schema Drift Detection** — Automatically detects removed fields, type changes (e.g. `id: int` → `id: string`), and missing required fields against OpenAPI baselines.
- 🚨 **Automated Incident Lifecycle** — Creates incidents after $N$ consecutive check failures with severity grading (CRITICAL, HIGH, MEDIUM, LOW) and automatically resolves them when health returns.
- 🔔 **Multi-Channel Alerting & Signed Webhooks** — Webhook delivery with HMAC SHA-256 signatures (`X-AG-Signature`) and email notifications.
- 🔒 **Enterprise-Grade SSRF Protection** — Resolves DNS before outbound execution and blocks private IPv4/IPv6 CIDRs, loopbacks, and cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).

---

## 🏗️ Architecture

```
api-guardian/
├── apps/
│   ├── web/                    # React 18 + Vite + TypeScript + Tailwind CSS + Recharts
│   └── api/                    # Express + TypeScript + Prisma ORM REST API Server
├── worker/                     # BullMQ Background Monitoring Workers
├── packages/
│   └── shared/                 # Shared Types, TestRunner Engine, SSRF Guard & Differ
├── docker-compose.yml          # Local Dev (Postgres 16 + Redis 7)
├── docker-compose.prod.yml     # Production Multi-Service Stack
└── README.md
```

### Flow Architecture

```
[ Developer Web Dashboard ]
           │ (REST / JWT)
           ▼
[ Express API Server ] ──────────► [ PostgreSQL ] (Prisma ORM)
           │
           │ (Queue Cron Repeatable Jobs)
           ▼
[ Redis / BullMQ Queue ]
           │
           ▼
[ Monitoring Worker Process ]
           │
     [ SSRF Validation Guard ]
           │
     [ Shared TestRunner ] ──────► [ Target API Endpoint ]
           │
     [ Assertion & Contract Differ ]
           │
     [ Auto-Incidents & AI RCA ] ──► [ Webhook / Email Alerts ]
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20+`
- **pnpm**: `v9+`
- **Docker & Docker Compose**

### 2. Clone & Install
```bash
git clone https://github.com/your-org/api-guardian.git
cd api-guardian
pnpm install
```

### 3. Start Database & Redis
```bash
docker-compose up -d
```

### 4. Configure Environment
```bash
cp .env.example .env
```

### 5. Setup Database & Seed Demo Data
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

> **Demo Workspace Credentials:**
> - Email: `demo@apiguardian.dev`
> - Password: `Demo12345!`
> *(Or click "Try Demo" on the login screen for 1-click access!)*

### 6. Start Development Servers
```bash
pnpm dev
```
- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Worker**: Running and connected to Redis

---

## 🧪 Testing Suite

Run all unit and integration tests across packages:

```bash
# Run shared engine tests (SSRF, Assertions, Contract Differ)
pnpm --filter @api-guardian/shared test

# Run all workspace tests
pnpm test
```

---

## 🛡️ Security Implementation

| Layer | Threat Model | Mitigation |
|---|---|---|
| **Outbound HTTP** | SSRF & Cloud Metadata Extraction | Pre-request DNS resolution checking against RFC 1918 private CIDRs, loopbacks, and AWS/GCP metadata endpoints (`169.254.169.254`). |
| **Authentication** | Credential Stuffing & Rainbow Tables | Argon2id password hashing with memory and time cost parameters. JWT access & refresh token rotation. |
| **Data Isolation** | Multi-tenant Data Leaks | Strict project ownership verification middleware on every route. |
| **Assertions** | Remote Code Execution (RCE) | Safe deterministic JSON path traversal and Ajv schema compilation — never uses `eval()`. |
| **Webhooks** | Spoofing & Tampering | Signed with HMAC-SHA256 headers (`X-AG-Signature`). |

---

## 📦 Deployment Guide

### Deploying Frontend to Vercel
1. Set root directory to `apps/web`
2. Build command: `pnpm build`
3. Output directory: `dist`
4. Deploy with provided [`vercel.json`](file:///d:/myfolders/API%20Guardian/apps/web/vercel.json)

### Deploying Backend & Worker to Railway / Render
1. Build context: repository root
2. API Service Dockerfile: `apps/api/Dockerfile`
3. Worker Service Dockerfile: `worker/Dockerfile`
4. Set environment variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `AI_PROVIDER`.

---

## 📄 License
MIT License. Built for engineering teams who care about API reliability.
