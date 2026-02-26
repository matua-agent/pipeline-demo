# Pipeline Demo

**Multi-step LLM orchestration for document analysis.**

A working demonstration of chained AI calls — four specialized LLM stages that process any document sequentially, with each stage receiving full context from prior stages. Built to show what AI *workflows* look like in practice, as opposed to single-shot AI *features*.

🔗 **Live:** [pipeline-demo-beta.vercel.app](https://pipeline-demo-beta.vercel.app)

---

## What It Does

Paste any document (contract, research paper, proposal, policy, email thread) and run the pipeline:

| Stage | What It Does |
|-------|-------------|
| 🔍 **Extract** | Parses structured facts — parties, dates, monetary amounts, core obligations — as clean JSON |
| ⚡ **Analyze** | Identifies risks, notable obligations, and open questions |
| 🧠 **Synthesize** | Produces a 3-sentence executive summary + opinionated stance (Approve/Review/Reject) |
| ✅ **Action Items** | Generates 5 concrete next steps with owner roles and timelines |

Each stage runs as an independent LLM call. Results flow forward — the Analyze stage receives the extraction JSON; Synthesize receives both extraction + analysis; Action Items gets all three.

---

## Architecture

### Why chained calls, not one big prompt?

A single prompt asking for all four outputs at once produces worse results than specialized calls. Each stage uses a focused system prompt optimized for one task — the model performs better when it's not juggling extraction + risk analysis + executive framing + action planning simultaneously.

### Context threading

```
Document
  → Stage 1 (Extract): raw document only
  → Stage 2 (Analyze): raw document + JSON facts
  → Stage 3 (Synthesize): raw document + JSON facts + risk analysis
  → Stage 4 (Actions): all of the above + executive synthesis
```

No document storage. All context is passed per-request. Documents never leave the client between stages.

### Model choice

Claude Haiku (`claude-haiku-4-5`) — fast and cost-efficient for production document processing pipelines. Haiku is appropriate here because these are structured extraction and summarization tasks, not open-ended reasoning.

### No SDK dependency

The Anthropic SDK has [known streaming issues on Vercel's edge runtime](https://github.com/anthropic-ai/sdk-node/issues/XXX). This app uses raw `fetch` to the Anthropic API directly — no SDK, no `ReadableStream` compatibility issues, zero runtime surprises.

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({ model, max_tokens, system, messages }),
});
```

---

## Sample Documents

Three built-in samples to demo without pasting your own:

- **Employment Contract** — compensation, equity, non-compete, termination clauses
- **SaaS Partnership Proposal** — revenue share, obligations, exclusivity, term
- **Research Paper Abstract** — Harrison's own published paper on endurance decoupling prediction

---

## Getting Started

```bash
git clone https://github.com/matua-agent/pipeline-demo
cd pipeline-demo
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy

Works on Vercel out of the box. Set `ANTHROPIC_API_KEY` as an environment variable.

```bash
vercel deploy --prod
```

---

## Tech Stack

- **Next.js 16** — App Router
- **Tailwind CSS v4** — Dark-mode UI
- **React Markdown** — Renders stage outputs
- **Anthropic API** — Direct fetch (no SDK)
- **TypeScript**

---

## Why This Matters

The difference between "AI features" and "AI workflows" is orchestration. A feature answers a question. A workflow processes information through a series of specialized steps, each producing output that the next stage uses to do something better.

This app is a minimal example of that pattern. The same architecture applies to:
- Legal document review pipelines
- Customer ticket triage and routing
- Research paper summarization
- Code review and PR analysis
- Sales proposal scoring

---

Built by [Harrison Dudley-Rode](https://dudleyrode.com)
