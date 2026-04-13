"use client";

import { useState, useEffect, useCallback } from "react";
import { getHeatmap } from "@/services/api";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface FnItem {
  file:          string;
  function_name: string;
  complexity:    number;
  risk:          "low" | "medium" | "high" | "critical" | "unknown";
  start_line:    number;
  end_line:      number;
  lines:         number;
  language:      string;
}

interface FileItem {
  file:           string;
  avg_complexity: number;
  max_complexity: number;
  risk:           string;
  function_count: number;
}

interface Summary {
  total_functions:   number;
  low_count:         number;
  medium_count:      number;
  high_count:        number;
  critical_count:    number;
  avg_complexity:    number;
  max_complexity:    number;
  most_complex_fn:   string;
  most_complex_file: string;
}

interface HeatmapData {
  functions: FnItem[];
  by_file:   FileItem[];
  summary:   Summary;
  error?:    string;
}

// ─────────────────────────────────────────────────────────────
// Colour helpers — match the app CSS variables
// ─────────────────────────────────────────────────────────────

const RISK_COLOR = {
  low:      { bg: "rgba(16,185,129,.15)",  border: "rgba(16,185,129,.3)",  text: "#10b981", label: "LOW"      },
  medium:   { bg: "rgba(245,158,11,.12)",  border: "rgba(245,158,11,.3)",  text: "#f59e0b", label: "MEDIUM"   },
  high:     { bg: "rgba(239,130,68,.12)",  border: "rgba(239,130,68,.3)",  text: "#ef8644", label: "HIGH"     },
  critical: { bg: "rgba(239,68,68,.14)",   border: "rgba(239,68,68,.35)",  text: "#ef4444", label: "CRITICAL" },
  unknown:  { bg: "rgba(100,100,120,.12)", border: "rgba(100,100,120,.3)", text: "#6b7280", label: "N/A"      },
};

// Bar fill as a fraction of max — capped at 100%
function barWidth(score: number, max: number): string {
  return `${Math.min(100, Math.round((score / Math.max(max, 1)) * 100))}%`;
}

function riskColor(risk: string) {
  return RISK_COLOR[risk as keyof typeof RISK_COLOR] ?? RISK_COLOR.unknown;
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: string }) {
  const c = riskColor(risk);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99,
      fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
      fontFamily: "var(--mono)",
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {c.label}
    </span>
  );
}

function ScoreBar({ score, max, risk }: { score: number; max: number; risk: string }) {
  const c = riskColor(risk);
  return (
    <div style={{
      height: 4, background: "rgba(255,255,255,.06)",
      borderRadius: 99, overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        height: "100%", width: barWidth(score, max),
        background: c.text, borderRadius: 99,
        transition: "width .4s cubic-bezier(.16,1,.3,1)",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface HeatmapProps {
  repoName: string;
  onViewCode?: (file: string, start: number, end: number) => void;
}

type View = "functions" | "files";
type Filter = "all" | "low" | "medium" | "high" | "critical";

export default function Heatmap({ repoName, onViewCode }: HeatmapProps) {
  const [data,    setData]    = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [view,    setView]    = useState<View>("functions");
  const [filter,  setFilter]  = useState<Filter>("all");
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    if (!repoName) return;
    setLoading(true);
    setError("");
    try {
      const d = await getHeatmap(repoName);
      if (d.error) {
        setError(d.error);
      } else {
        setData(d);
      }
    } catch {
      setError("Failed to load heatmap — make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [repoName]);

  useEffect(() => { load(); }, [load]);

  // ── Derived lists ──────────────────────────────────────────
  const maxScore = data ? Math.max(...data.functions.map(f => f.complexity), 1) : 1;

  const filteredFns = (data?.functions ?? []).filter(fn => {
    const matchFilter = filter === "all" || fn.risk === filter;
    const matchSearch = !search ||
      fn.function_name.toLowerCase().includes(search.toLowerCase()) ||
      fn.file.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filteredFiles = (data?.by_file ?? []).filter(f => {
    const matchFilter = filter === "all" || f.risk === filter;
    const matchSearch = !search || f.file.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const s = data?.summary;

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", gap: 16,
        color: "var(--t3)", fontFamily: "var(--ui)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "2px solid rgba(124,92,252,.2)",
          borderTop: "2px solid #7c5cfc",
          animation: "spin .65s linear infinite",
        }} />
        <span style={{ fontSize: 13 }}>Analysing complexity…</span>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", gap: 12,
        padding: 32, textAlign: "center", fontFamily: "var(--ui)",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "var(--r3)",
          background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>⚠</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--t1)" }}>No heatmap data</div>
        <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.7, maxWidth: 320 }}>{error}</div>
        <button onClick={load} style={{
          padding: "8px 20px", borderRadius: "var(--r2)",
          background: "var(--vgs)", border: "1px solid rgba(124,92,252,.3)",
          color: "#9b7ffe", fontFamily: "var(--ui)", fontSize: 12,
          fontWeight: 700, cursor: "pointer",
        }}>Retry</button>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden",
      fontFamily: "var(--ui)", color: "var(--t1)",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 18px 12px",
        borderBottom: "1px solid var(--edge)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg,rgba(239,68,68,.25),rgba(245,158,11,.15))",
            border: "1px solid rgba(239,68,68,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15,
          }}>🔥</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em" }}>
              Complexity Heatmap
            </div>
            <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)" }}>
              {repoName} · cyclomatic complexity
            </div>
          </div>
        </div>

        {/* Summary stat cards */}
        {s && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Functions", val: s.total_functions, col: "#9b7ffe" },
              { label: "Low",       val: s.low_count,       col: "#10b981" },
              { label: "Medium",    val: s.medium_count,    col: "#f59e0b" },
              { label: "High+",     val: s.high_count + s.critical_count, col: "#ef4444" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "var(--layer)", border: "1px solid var(--edge)",
                borderRadius: "var(--r2)", padding: "8px 10px", textAlign: "center",
              }}>
                <div style={{
                  fontSize: 18, fontWeight: 800, color: stat.col,
                  letterSpacing: "-.03em",
                }}>{stat.val}</div>
                <div style={{ fontSize: 9, color: "var(--t4)", fontFamily: "var(--mono)", marginTop: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Most complex callout */}
        {s && s.most_complex_fn && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", marginBottom: 12,
            background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)",
            borderRadius: "var(--r2)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>Most complex: </span>
              <code style={{ fontSize: 11, color: "#ef4444", fontFamily: "var(--mono)" }}>
                {s.most_complex_fn}
              </code>
              <span style={{ fontSize: 11, color: "var(--t4)" }}> — score </span>
              <strong style={{ fontSize: 11, color: "var(--t1)" }}>{s.max_complexity}</strong>
            </div>
            <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)", flexShrink: 0 }}>
              avg {s.avg_complexity}
            </div>
          </div>
        )}

        {/* View toggle + filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {(["functions", "files"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 12px", borderRadius: 99, border: "none",
              fontFamily: "var(--ui)", fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: view === v ? "linear-gradient(135deg,#7c5cfc,#5138d4)" : "var(--layer)",
              color: view === v ? "white" : "var(--t3)",
              boxShadow: view === v ? "0 0 12px var(--vg)" : "none",
            }}>
              {v === "functions" ? "By Function" : "By File"}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {(["all", "low", "medium", "high", "critical"] as Filter[]).map(f => {
            const c = f === "all" ? { text: "var(--t3)", bg: "var(--layer)", border: "var(--edge)" }
              : { text: riskColor(f).text, bg: riskColor(f).bg, border: riskColor(f).border };
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "4px 10px", borderRadius: 99,
                fontSize: 9.5, fontWeight: 700, letterSpacing: ".04em",
                fontFamily: "var(--mono)", cursor: "pointer",
                border: `1px solid ${filter === f ? c.border : "var(--edge)"}`,
                background: filter === f ? c.bg : "transparent",
                color: filter === f ? c.text : "var(--t4)",
              }}>
                {f.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search function or file…"
          style={{
            width: "100%", padding: "7px 12px",
            background: "var(--layer)", border: "1px solid var(--edgeM)",
            borderRadius: "var(--r2)", color: "var(--t1)",
            fontSize: 12, fontFamily: "var(--mono)", outline: "none",
          }}
        />
      </div>

      {/* ── List body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>

        {/* BY FUNCTION */}
        {view === "functions" && (
          filteredFns.length === 0
            ? <Empty />
            : filteredFns.map((fn, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: "column", gap: 6,
                padding: "11px 13px", marginBottom: 6,
                background: "var(--card)", border: "1px solid var(--edge)",
                borderRadius: "var(--r2)", transition: "border-color .15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--edgeM)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--edge)")}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Score circle */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: riskColor(fn.risk).bg,
                    border: `1px solid ${riskColor(fn.risk).border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: riskColor(fn.risk).text,
                    fontFamily: "var(--mono)",
                  }}>
                    {fn.complexity}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <code style={{
                        fontSize: 12, fontWeight: 700, color: "var(--t1)",
                        fontFamily: "var(--mono)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {fn.function_name}
                      </code>
                      <RiskBadge risk={fn.risk} />
                    </div>
                    <div style={{
                      fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {fn.file} · L{fn.start_line}–{fn.end_line} · {fn.lines} lines
                    </div>
                  </div>
                  {/* View code button */}
                  {onViewCode && (
                    <button
                      onClick={() => onViewCode(fn.file, fn.start_line, fn.end_line)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, flexShrink: 0,
                        background: "var(--vgs)", border: "1px solid rgba(124,92,252,.2)",
                        color: "#9b7ffe", fontSize: 10, fontFamily: "var(--ui)",
                        fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  )}
                </div>
                {/* Score bar */}
                <ScoreBar score={fn.complexity} max={maxScore} risk={fn.risk} />
              </div>
            ))
        )}

        {/* BY FILE */}
        {view === "files" && (
          filteredFiles.length === 0
            ? <Empty />
            : filteredFiles.map((f, i) => {
              const maxFile = Math.max(...filteredFiles.map(x => x.max_complexity), 1);
              return (
                <div key={i} style={{
                  padding: "12px 13px", marginBottom: 6,
                  background: "var(--card)", border: "1px solid var(--edge)",
                  borderRadius: "var(--r2)", transition: "border-color .15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--edgeM)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--edge)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "var(--r1)", flexShrink: 0,
                      background: riskColor(f.risk).bg,
                      border: `1px solid ${riskColor(f.risk).border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: riskColor(f.risk).text,
                      fontFamily: "var(--mono)",
                    }}>
                      {f.max_complexity}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: "var(--t1)",
                          fontFamily: "var(--mono)", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {f.file}
                        </div>
                        <RiskBadge risk={f.risk} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)" }}>
                        {f.function_count} functions · avg {f.avg_complexity} · max {f.max_complexity}
                      </div>
                    </div>
                  </div>
                  {/* Row of mini complexity blocks — one per function in the file (conceptual) */}
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
                    {Array.from({ length: f.function_count }).map((_, idx) => (
                      <div key={idx} style={{
                        width: 10, height: 10, borderRadius: 2,
                        background: riskColor(f.risk).text,
                        opacity: 0.25 + (idx / Math.max(f.function_count - 1, 1)) * 0.75,
                      }} />
                    ))}
                  </div>
                  <ScoreBar score={f.max_complexity} max={maxFile} risk={f.risk} />
                </div>
              );
            })
        )}
      </div>

      {/* ── Legend footer ── */}
      <div style={{
        padding: "10px 18px",
        borderTop: "1px solid var(--edge)",
        flexShrink: 0,
        display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)" }}>RISK:</span>
        {(["low", "medium", "high", "critical"] as const).map(r => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: riskColor(r).text,
            }} />
            <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)" }}>
              {r === "low" ? "1–5" : r === "medium" ? "6–10" : r === "high" ? "11–20" : "21+"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: 200, gap: 10,
      color: "var(--t4)", fontFamily: "var(--ui)", fontSize: 13,
    }}>
      <div style={{ fontSize: 28 }}>🔍</div>
      No results match your filter
    </div>
  );
}
