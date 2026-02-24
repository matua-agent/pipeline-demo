"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const STAGES = [
  { id: "extract", name: "Extract", emoji: "🔍", description: "Pull structured facts", color: "blue" },
  { id: "analyze", name: "Analyze", emoji: "⚡", description: "Identify risks & obligations", color: "amber" },
  { id: "synthesize", name: "Synthesize", emoji: "🧠", description: "Executive summary", color: "violet" },
  { id: "actions", name: "Action Items", emoji: "✅", description: "Next steps with owners", color: "emerald" },
] as const;

const SAMPLE_DOCS = [
  {
    label: "Employment Contract",
    content: `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of March 1, 2026, between Apex Technologies Inc. ("Company"), a Delaware corporation, and Sarah Chen ("Employee").

POSITION AND DUTIES
Employee will serve as Senior Product Manager, reporting to the VP of Product. Employee agrees to devote full working time to Company duties.

COMPENSATION
Base Salary: $145,000 CAD per year, paid bi-weekly.
Performance Bonus: Up to 15% of base salary, based on OKR attainment, paid annually in March.
Equity: 8,000 RSUs vesting over 4 years with a 1-year cliff.

START DATE AND PROBATION
Start Date: March 15, 2026. A 90-day probationary period applies.

CONFIDENTIALITY
Employee agrees to maintain strict confidentiality of all proprietary information during and for 2 years after employment.

NON-COMPETE
Employee agrees not to work for any direct competitor for 12 months following termination within a 100km radius of Vancouver, BC.

TERMINATION
Either party may terminate with 30 days written notice. Company may terminate without notice for cause including gross misconduct or material breach of this Agreement.

GOVERNING LAW
This Agreement shall be governed by the laws of British Columbia, Canada.

Signed: _________________________ Date: ___________
Apex Technologies Inc. (Authorized Signatory)

Signed: _________________________ Date: ___________
Sarah Chen`,
  },
  {
    label: "SaaS Partnership Proposal",
    content: `PARTNERSHIP PROPOSAL: STREAMLINE × DATAVAULT

Prepared by StreamLine Analytics for DataVault Inc.
Date: February 2026
Validity: 30 days

OVERVIEW
StreamLine proposes a technology integration partnership where DataVault's warehouse infrastructure connects natively to StreamLine's real-time analytics dashboard, creating a joint go-to-market offering for enterprise clients.

REVENUE SHARE
- Joint deals closed by either party: 70% to originating party, 30% to partner
- StreamLine's existing customers who upgrade: 85% StreamLine / 15% DataVault
- DataVault's existing customers who upgrade: 85% DataVault / 15% StreamLine
- Minimum quarterly payment: $8,000 USD per party regardless of deals closed

OBLIGATIONS — STREAMLINE
1. Deliver API integration within 60 days of agreement signing
2. Provide co-branded marketing materials within 30 days
3. Dedicate one Solutions Engineer for joint customer calls (up to 4 hours/month)

OBLIGATIONS — DATAVAULT
1. Provide sandbox API access within 14 days of signing
2. Feature StreamLine in one case study per quarter
3. Introduce StreamLine to minimum 3 enterprise prospects per quarter

EXCLUSIVITY
Non-exclusive. Both parties free to work with other analytics/warehouse vendors.

TERM
12 months, auto-renewing unless 60-day written notice of non-renewal provided.

TERMINATION FOR CAUSE
Either party may terminate with 30-day notice if the other fails to meet quarterly minimums for two consecutive quarters.`,
  },
  {
    label: "Research Paper Abstract",
    content: `RESEARCH ARTICLE

Title: Predicting Endurance Decoupling from Pre-Race Physiological Markers: A Longitudinal Cohort Study

Authors: H.J. Dudley-Rode, N.T. Maunder, A.E. Kilding
Institution: Auckland University of Technology, Sports Performance Research Institute
Journal: European Journal of Applied Physiology (2025)
DOI: 10.1007/s00421-025-05815-0

ABSTRACT
Background: Endurance decoupling — the progressive disconnect between cardiac output and mechanical power during prolonged exercise — is a key limiting factor in ultra-endurance events. Predicting individual susceptibility prior to competition has remained elusive.

Methods: 47 competitive cyclists (34M/13F, VO2max 62.4 ± 8.1 mL/kg/min) completed standardized pre-race testing including FTP assessment, 3-hour durability ride, and HRV measurement over 7 days. Decoupling magnitude was recorded during a subsequent 5-hour event using power:HR ratio analysis. Multiple regression and machine learning (gradient boosting) models were evaluated.

Results: The gradient boosting model predicted decoupling magnitude with r²=0.71 (RMSE=4.2%). The strongest predictors were: pre-race HRV coefficient of variation (β=0.44), CHO oxidation capacity at VT1 (β=0.38), and fatigue resistance index from durability ride (β=0.29). Sex, age, and absolute VO2max were not significant independent predictors.

Conclusions: Individual decoupling susceptibility can be meaningfully predicted from accessible pre-race markers. Practitioners can use HRV variability and nutritional assessment to identify athletes at elevated risk 48-72 hours before competition.

Limitations: Sample drawn from trained competitive cyclists; generalizability to recreational athletes unclear. Testing protocols required laboratory access.

Funding: This research received no specific funding. Authors declare no conflicts of interest.
Keywords: endurance, decoupling, HRV, lactate threshold, prediction model, cycling`,
  },
];

interface StageResult {
  output: string;
  timing: { ms: number; label: string };
  usage: { inputTokens: number; outputTokens: number; total: number };
  model: string;
}

type StageStatus = "idle" | "running" | "done" | "error";

interface StageState {
  status: StageStatus;
  result?: StageResult;
  error?: string;
}

const COLOR_MAP = {
  blue: { ring: "ring-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200", dot: "bg-blue-500" },
  amber: { ring: "ring-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  violet: { ring: "ring-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200", dot: "bg-violet-500" },
  emerald: { ring: "ring-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
};

export default function Home() {
  const [document, setDocument] = useState("");
  const [stages, setStages] = useState<StageState[]>(STAGES.map(() => ({ status: "idle" })));
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const resetPipeline = useCallback(() => {
    setStages(STAGES.map(() => ({ status: "idle" })));
    setActiveStage(null);
    setExpandedStage(null);
  }, []);

  const loadSample = (content: string) => {
    setDocument(content);
    resetPipeline();
  };

  const runPipeline = async () => {
    if (!document.trim() || running) return;
    setRunning(true);
    resetPipeline();

    const results: Record<string, string> = {};

    for (let i = 0; i < STAGES.length; i++) {
      setActiveStage(i);
      setStages((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s))
      );
      setExpandedStage(i);

      try {
        const res = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document: document.trim(),
            stageIndex: i,
            previousResults: results,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Stage failed");
        }

        const data: StageResult & { stageId: string } = await res.json();
        results[data.stageId] = data.output;

        setStages((prev) =>
          prev.map((s, idx) =>
            idx === i ? { status: "done", result: data } : s
          )
        );
      } catch (err) {
        setStages((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? { status: "error", error: err instanceof Error ? err.message : "Unknown error" }
              : s
          )
        );
        setRunning(false);
        setActiveStage(null);
        return;
      }
    }

    setRunning(false);
    setActiveStage(null);
  };

  const totalTokens = stages.reduce((sum, s) => sum + (s.result?.usage.total ?? 0), 0);
  const totalTime = stages.reduce((sum, s) => sum + (s.result?.timing.ms ?? 0), 0);
  const doneCount = stages.filter((s) => s.status === "done").length;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-bold">
              P
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Pipeline Demo</h1>
              <p className="text-xs text-gray-400">Multi-step LLM orchestration</p>
            </div>
          </div>
          {doneCount > 0 && (
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{doneCount}/{STAGES.length} stages</span>
              <span>{totalTokens.toLocaleString()} tokens</span>
              <span>{totalTime < 1000 ? `${totalTime}ms` : `${(totalTime / 1000).toFixed(1)}s`} total</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-gray-300 mb-2">Document Input</h2>
            <div className="flex gap-2 mb-3 flex-wrap">
              {SAMPLE_DOCS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => loadSample(s.content)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <textarea
              value={document}
              onChange={(e) => {
                setDocument(e.target.value);
                resetPipeline();
              }}
              placeholder="Paste any document — contract, research paper, email thread, proposal, policy..."
              className="w-full h-72 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {document.length > 0 ? `${document.length.toLocaleString()} chars` : "No document"}
              </span>
              {document && (
                <button
                  onClick={() => { setDocument(""); resetPipeline(); }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <button
            onClick={runPipeline}
            disabled={!document.trim() || running}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500
              text-white shadow-lg shadow-violet-900/30"
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Running pipeline...
              </span>
            ) : (
              "▶ Run Pipeline"
            )}
          </button>

          {/* Architecture callout */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-xs text-gray-400 space-y-1.5">
            <p className="font-medium text-gray-300 mb-2">How it works</p>
            <p>• Each stage is an independent LLM call with a specialized system prompt</p>
            <p>• Results flow forward — each stage receives context from all prior stages</p>
            <p>• Model: Claude Haiku (fast + cost-efficient for production pipelines)</p>
            <p>• No document storage — all context passed per-request</p>
          </div>
        </div>

        {/* Right: Pipeline stages */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-gray-300">Pipeline</h2>

          {STAGES.map((stage, i) => {
            const state = stages[i];
            const colors = COLOR_MAP[stage.color];
            const isExpanded = expandedStage === i;
            const isActive = activeStage === i;

            return (
              <div
                key={stage.id}
                className={`rounded-xl border transition-all ${
                  isActive
                    ? `border-gray-600 ${colors.ring} ring-1`
                    : state.status === "done"
                    ? "border-gray-700 hover:border-gray-600"
                    : "border-gray-800"
                } bg-gray-900`}
              >
                {/* Stage header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() =>
                    state.status === "done"
                      ? setExpandedStage(isExpanded ? null : i)
                      : null
                  }
                >
                  {/* Status icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                      state.status === "done"
                        ? colors.bg
                        : isActive
                        ? "bg-gray-800"
                        : "bg-gray-800/50"
                    }`}
                  >
                    {isActive ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-500 border-t-gray-200 animate-spin block" />
                    ) : state.status === "done" ? (
                      stage.emoji
                    ) : state.status === "error" ? (
                      "⚠️"
                    ) : (
                      <span className="text-gray-600">{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-sm ${
                          state.status === "done"
                            ? colors.text
                            : isActive
                            ? "text-gray-200"
                            : "text-gray-500"
                        }`}
                      >
                        {stage.name}
                      </span>
                      {state.status === "done" && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                          done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                  </div>

                  {/* Metrics */}
                  {state.result && (
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                      <span>{state.result.timing.label}</span>
                      <span>{state.result.usage.total.toLocaleString()}t</span>
                      <span className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </div>
                  )}
                </button>

                {/* Expanded output */}
                {isExpanded && state.result && (
                  <div className="border-t border-gray-800 p-4">
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-800">
                      <span>⏱ {state.result.timing.label}</span>
                      <span>📥 {state.result.usage.inputTokens.toLocaleString()} in</span>
                      <span>📤 {state.result.usage.outputTokens.toLocaleString()} out</span>
                      <span className="text-gray-600">· {state.result.model.split("/").pop()}</span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none text-gray-300 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-200 [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:mt-1 [&_li]:text-gray-400 [&_strong]:text-gray-200 [&_p]:text-gray-400 [&_p]:leading-relaxed overflow-auto max-h-72">
                      {stage.id === "extract" ? (
                        <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
                          {state.result.output}
                        </pre>
                      ) : (
                        <ReactMarkdown>{state.result.output}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                )}

                {/* Error state */}
                {state.status === "error" && (
                  <div className="border-t border-red-900/40 px-4 pb-4">
                    <p className="text-xs text-red-400 bg-red-950/30 rounded-lg p-3 mt-0">
                      ⚠️ {state.error}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pipeline connector dots between stages */}
          {doneCount === STAGES.length && (
            <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4 text-center">
              <p className="text-emerald-400 font-medium text-sm">Pipeline complete</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalTokens.toLocaleString()} tokens · {(totalTime / 1000).toFixed(1)}s ·{" "}
                {STAGES.length} stages
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-8 py-4 text-center text-xs text-gray-600">
        Built by{" "}
        <a href="https://dudleyrode.com" className="text-gray-500 hover:text-gray-300">
          Harrison Dudley-Rode
        </a>{" "}
        · Documents never stored · Context passed per-request
      </div>
    </main>
  );
}
