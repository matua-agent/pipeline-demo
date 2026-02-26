import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const STAGE_DEFINITIONS = [
  {
    id: "extract",
    name: "Extract",
    emoji: "🔍",
    description: "Pull structured facts from the document",
    systemPrompt: `You are a precise document parser. Extract the following from the document:
- Key parties/entities (people, companies, organizations)
- Dates and deadlines
- Monetary amounts or values
- Core obligations or commitments
- Document type and purpose

Return clean JSON only (no markdown, no code fences):
{
  "document_type": "...",
  "parties": ["..."],
  "dates": ["..."],
  "amounts": ["..."],
  "obligations": ["..."],
  "one_line_summary": "..."
}
Be thorough but precise. Only include what's explicitly stated in the document.`,
  },
  {
    id: "analyze",
    name: "Analyze",
    emoji: "⚡",
    description: "Identify risks, obligations, and open questions",
    systemPrompt: `You are a sharp analytical reviewer. Given document facts, identify:

## Key Risks
What could go wrong? What's ambiguous or one-sided?

## Notable Obligations
What does each party actually have to do?

## Open Questions
What's unclear or missing that a reader should clarify before proceeding?

Be direct and specific. No generic filler. Format with headers and bullet points.`,
  },
  {
    id: "synthesize",
    name: "Synthesize",
    emoji: "🧠",
    description: "Executive summary for a busy stakeholder",
    systemPrompt: `You are a senior advisor writing for a busy executive. Write:

## Executive Summary
2-3 sentences in plain English. No jargon.

## Three Things to Know
The three most important facts the reader must understand.

## Recommended Stance
Choose one: ✅ Approve / ⚠️ Review Further / ❌ Reject — then one sentence explaining why.

Be opinionated. The executive needs a recommendation, not a list of options.`,
  },
  {
    id: "actions",
    name: "Action Items",
    emoji: "✅",
    description: "Specific next steps with owners and timelines",
    systemPrompt: `You are a project coordinator. Produce exactly 5 concrete action items.

Each must:
- Start with a strong verb (Review, Schedule, Confirm, Negotiate, Send, Escalate, etc.)
- Include a suggested owner role (Legal / Finance / Product / HR / Leadership / Operations)
- Have a suggested timeline (Immediate / This week / This month)

Format exactly like this for each:
**1. [Action statement]**
Owner: [Role] · Timeline: [Timeframe]

Be concrete. Vague tasks are useless. These should be actionable today.`,
  },
];

interface StageRequest {
  document: string;
  stageIndex: number;
  previousResults: Record<string, string>;
}

interface AnthropicMessage {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: string; content: string }>;
}

function buildUserMessage(stageIndex: number, document: string, previousResults: Record<string, string>): string {
  if (stageIndex === 0) {
    return `Analyze this document:\n\n---\n${document}\n---`;
  }

  const stageParts = [`Here is the original document:\n\n---\n${document}\n---\n`];

  if (stageIndex >= 1 && previousResults.extract) {
    stageParts.push(`\nExtracted facts:\n${previousResults.extract}`);
  }
  if (stageIndex >= 2 && previousResults.analyze) {
    stageParts.push(`\nRisk analysis:\n${previousResults.analyze}`);
  }
  if (stageIndex >= 3 && previousResults.synthesize) {
    stageParts.push(`\nExecutive synthesis:\n${previousResults.synthesize}`);
  }

  stageParts.push(`\nNow perform your stage of the analysis.`);
  return stageParts.join("\n");
}

async function callAnthropic(payload: AnthropicMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: StageRequest = await request.json();
    const { document, stageIndex, previousResults = {} } = body;

    if (!document) {
      return NextResponse.json({ error: "No document provided" }, { status: 400 });
    }

    if (stageIndex === undefined || stageIndex < 0 || stageIndex >= STAGE_DEFINITIONS.length) {
      return NextResponse.json({ error: "Invalid stage index" }, { status: 400 });
    }

    const stage = STAGE_DEFINITIONS[stageIndex];
    const start = Date.now();

    const data = await callAnthropic({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: stage.systemPrompt,
      messages: [
        {
          role: "user",
          content: buildUserMessage(stageIndex, document, previousResults),
        },
      ],
    });

    const elapsed = Date.now() - start;
    const content = data.content[0].type === "text" ? data.content[0].text : "";

    return NextResponse.json({
      stageId: stage.id,
      stageName: stage.name,
      output: content,
      timing: {
        ms: elapsed,
        label: elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`,
      },
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        total: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
    });
  } catch (error) {
    console.error("Pipeline stage error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stage failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    stages: STAGE_DEFINITIONS.map(({ id, name, emoji, description }) => ({
      id,
      name,
      emoji,
      description,
    })),
  });
}
