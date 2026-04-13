"use client";

import React, { useState, useRef } from "react";

/* ════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════ */
interface FunctionDoc {
  file: string;
  function_name: string;
  language: string;
  documentation: string;
  complexity: number;
  risk: string;
  start_line: number;
  end_line: number;
}

interface EndpointDoc {
  function_name: string;
  file: string;
  documentation: string;
}

interface AutoDocsProps {
  repoName: string;
  onViewCode?: (file: string, start: number, end: number) => void;
}

type DocTab = "readme" | "functions" | "api";
type LoadState = "idle" | "loading" | "done" | "error";

/* ════════════════════════════════════════════════════════════
   API HELPERS
════════════════════════════════════════════════════════════ */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchDoc(endpoint: string, body: object) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
function riskColor(risk: string): string {
  return { low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" }[risk] ?? "#6b7280";
}

function riskEmoji(risk: string): string {
  return { low: "🟢", medium: "🟡", high: "🔴", critical: "💀" }[risk] ?? "⚪";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function downloadMd(filename: string, content: string) {
  const blob = new URL(
    URL.createObjectURL(new Blob([content], { type: "text/markdown" }))
  );
  const a = document.createElement("a");
  a.href = blob.href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blob.href);
}

/* ════════════════════════════════════════════════════════════
   MARKDOWN RENDERER (lightweight, no dependencies)
════════════════════════════════════════════════════════════ */
function MdLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} style={{ color: "#f0f0ff" }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} style={{
              background: "#1c1c38", padding: "1px 6px", borderRadius: 4,
              fontFamily: "JetBrains Mono, monospace", fontSize: 11.5,
              color: "#9b7ffe", border: "1px solid rgba(255,255,255,.08)"
            }}>{p.slice(1, -1)}</code>
          );
        if (p.startsWith("*") && p.endsWith("*"))
          return <em key={i} style={{ color: "#8888aa" }}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function MarkdownView({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let key = 0;

  const flushCode = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={key++} style={{
          background: "#06060f", border: "1px solid rgba(255,255,255,.07)",
          borderRadius: 8, padding: "12px 14px", overflowX: "auto",
          fontFamily: "JetBrains Mono, monospace", fontSize: 12,
          color: "#a5b4fc", margin: "8px 0", lineHeight: 1.6,
        }}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      codeLines = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
        codeLang = "";
      } else {
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("# "))
      elements.push(<h1 key={key++} style={{ fontSize: 22, fontWeight: 800, color: "#f0f0ff", margin: "20px 0 10px", letterSpacing: "-.03em" }}><MdLine text={line.slice(2)} /></h1>);
    else if (line.startsWith("## "))
      elements.push(<h2 key={key++} style={{ fontSize: 16, fontWeight: 700, color: "#c4b5fd", margin: "18px 0 8px", letterSpacing: "-.02em" }}><MdLine text={line.slice(3)} /></h2>);
    else if (line.startsWith("### "))
      elements.push(<h3 key={key++} style={{ fontSize: 14, fontWeight: 700, color: "#9b7ffe", margin: "14px 0 6px" }}><MdLine text={line.slice(4)} /></h3>);
    else if (line.startsWith("- ") || line.startsWith("* "))
      elements.push(<li key={key++} style={{ fontSize: 13, color: "#8888aa", lineHeight: 1.7, marginLeft: 16, marginBottom: 2 }}><MdLine text={line.slice(2)} /></li>);
    else if (line.startsWith("> "))
      elements.push(<blockquote key={key++} style={{ borderLeft: "3px solid #7c5cfc", paddingLeft: 12, margin: "8px 0", color: "#8888aa", fontSize: 13 }}><MdLine text={line.slice(2)} /></blockquote>);
    else if (line.startsWith("---"))
      elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,.07)", margin: "16px 0" }} />);
    else if (line.trim() === "")
      elements.push(<div key={key++} style={{ height: 6 }} />);
    else
      elements.push(<p key={key++} style={{ fontSize: 13, color: "#8888aa", lineHeight: 1.75, margin: "3px 0" }}><MdLine text={line} /></p>);
  }

  if (inCode) flushCode();

  return <div style={{ padding: "4px 0" }}>{elements}</div>;
}

/* ════════════════════════════════════════════════════════════
   SPINNER
════════════════════════════════════════════════════════════ */
const Spin = ({ s = 18 }: { s?: number }) => (
  <div style={{
    width: s, height: s, borderRadius: "50%",
    border: "2px solid rgba(124,92,252,.2)",
    borderTop: "2px solid #7c5cfc",
    animation: "docSpin .65s linear infinite", flexShrink: 0,
  }} />
);

/* ════════════════════════════════════════════════════════════
   COPY BUTTON
════════════════════════════════════════════════════════════ */
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} style={{
      padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)",
      background: copied ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)",
      color: copied ? "#10b981" : "#8888aa",
      fontSize: 11, cursor: "pointer", fontWeight: 600,
      transition: "all .15s", fontFamily: "inherit",
    }}>
      {copied ? "✓ Copied" : label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function AutoDocs({ repoName, onViewCode }: AutoDocsProps) {
  const [activeTab, setActiveTab] = useState<DocTab>("readme");
  const [states, setStates]       = useState<Record<DocTab, LoadState>>({ readme: "idle", functions: "idle", api: "idle" });
  const [data, setData]           = useState<Record<DocTab, any>>({ readme: null, functions: null, api: null });
  const [errors, setErrors]       = useState<Record<DocTab, string>>({ readme: "", functions: "", api: "" });
  const [filter, setFilter]       = useState("");
  const [expandedFn, setExpandedFn] = useState<string | null>(null);

  const setTabState = (tab: DocTab, state: LoadState) =>
    setStates(s => ({ ...s, [tab]: state }));
  const setTabData = (tab: DocTab, d: any) =>
    setData(s => ({ ...s, [tab]: d }));
  const setTabError = (tab: DocTab, e: string) =>
    setErrors(s => ({ ...s, [tab]: e }));

  const generate = async (tab: DocTab) => {
    setTabState(tab, "loading");
    setTabError(tab, "");
    try {
      const endpoints: Record<DocTab, string> = {
        readme:    "/docs/readme",
        functions: "/docs/functions",
        api:       "/docs/api",
      };
      const body: any = { repo_name: repoName };
      if (tab === "functions" && filter) body.file_filter = filter;

      const result = await fetchDoc(endpoints[tab], body);
      setTabData(tab, result);
      setTabState(tab, "done");
    } catch (e: any) {
      setTabError(tab, e.message || "Generation failed");
      setTabState(tab, "error");
    }
  };

  const TABS: { key: DocTab; label: string; icon: string; desc: string }[] = [
    { key: "readme",    label: "README",    icon: "📋", desc: "Project overview & setup guide" },
    { key: "functions", label: "Functions", icon: "⚙️", desc: "Per-function docstrings & params" },
    { key: "api",       label: "API Docs",  icon: "🔌", desc: "Endpoint reference with payloads" },
  ];

  const tabState  = states[activeTab];
  const tabData   = data[activeTab];
  const tabError  = errors[activeTab];

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "#06060f", fontFamily: "Syne, sans-serif",
    }}>
      <style>{`
        @keyframes docSpin { to { transform: rotate(360deg); } }
        @keyframes docFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .doc-fn-card:hover { border-color: rgba(124,92,252,.3) !important; background: rgba(124,92,252,.05) !important; }
        .doc-tab-btn:hover { background: rgba(255,255,255,.04) !important; }
        .doc-ep-card:hover { border-color: rgba(6,182,212,.3) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg,#7c5cfc,#5138d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(124,92,252,.3)", fontSize: 15,
          }}>📚</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f0f0ff", letterSpacing: "-.02em" }}>
              Auto Documentation
            </div>
            <div style={{ fontSize: 10.5, color: "#50507a", fontFamily: "JetBrains Mono, monospace" }}>
              {repoName}
            </div>
          </div>
        </div>

        {/* Tab pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map(t => {
            const isActive  = activeTab === t.key;
            const isDone    = states[t.key] === "done";
            const isLoading = states[t.key] === "loading";
            return (
              <button
                key={t.key}
                className="doc-tab-btn"
                onClick={() => setActiveTab(t.key)}
                style={{
                  flex: 1, padding: "8px 6px", borderRadius: 8, border: "none",
                  background: isActive ? "rgba(124,92,252,.15)" : "transparent",
                  color: isActive ? "#c4b5fd" : "#50507a",
                  cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                  fontFamily: "inherit", transition: "all .15s",
                  outline: isActive ? "1px solid rgba(124,92,252,.3)" : "1px solid transparent",
                  position: "relative",
                }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <div style={{ marginTop: 2 }}>{t.label}</div>
                {isDone && (
                  <div style={{
                    position: "absolute", top: 4, right: 4, width: 6, height: 6,
                    borderRadius: "50%", background: "#10b981",
                  }} />
                )}
                {isLoading && (
                  <div style={{ position: "absolute", top: 4, right: 4 }}>
                    <Spin s={8} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

        {/* Description + generate button */}
        {tabState === "idle" || tabState === "error" ? (
          <div style={{ animation: "docFadeUp .25s ease" }}>
            {/* Description card */}
            <div style={{
              background: "rgba(124,92,252,.06)", border: "1px solid rgba(124,92,252,.15)",
              borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd", marginBottom: 4 }}>
                {TABS.find(t => t.key === activeTab)?.icon}{" "}
                {TABS.find(t => t.key === activeTab)?.label} Generator
              </div>
              <div style={{ fontSize: 12, color: "#50507a", lineHeight: 1.6 }}>
                {TABS.find(t => t.key === activeTab)?.desc}
              </div>
            </div>

            {/* File filter for functions tab */}
            {activeTab === "functions" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#50507a", marginBottom: 6, fontFamily: "JetBrains Mono, monospace" }}>
                  OPTIONAL FILE FILTER
                </div>
                <input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="e.g. services/auth  or  components/ui"
                  style={{
                    width: "100%", padding: "9px 12px",
                    background: "#0e0e1e", border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 8, color: "#f0f0ff", fontSize: 12,
                    fontFamily: "JetBrains Mono, monospace", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {tabError && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                color: "#ef4444", fontSize: 12,
              }}>
                ⚠️ {tabError}
              </div>
            )}

            <button
              onClick={() => generate(activeTab)}
              style={{
                width: "100%", padding: "12px",
                borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#7c5cfc,#5138d4)",
                color: "white", fontSize: 13, fontWeight: 700,
                cursor: "pointer", letterSpacing: "-.01em",
                boxShadow: "0 4px 20px rgba(124,92,252,.3)",
                transition: "all .2s",
                fontFamily: "inherit",
              }}
            >
              ✨ Generate {TABS.find(t => t.key === activeTab)?.label}
            </button>
          </div>
        ) : tabState === "loading" ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 16, paddingTop: 60,
            animation: "docFadeUp .2s ease",
          }}>
            <div style={{ position: "relative", width: 56, height: 56 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(124,92,252,.1)", border: "1px solid rgba(124,92,252,.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 22 }}>
                  {TABS.find(t => t.key === activeTab)?.icon}
                </span>
              </div>
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "2px solid rgba(124,92,252,.15)",
                borderTop: "2px solid #7c5cfc",
                animation: "docSpin .8s linear infinite",
              }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#c4b5fd", marginBottom: 4 }}>
                Generating documentation…
              </div>
              <div style={{ fontSize: 11.5, color: "#50507a" }}>
                The LLM is reading your code. This may take 15–60 seconds.
              </div>
            </div>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 8 }}>
              {["Reading code", "Analyzing", "Writing docs"].map((label, i) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                  borderRadius: 99, background: "rgba(124,92,252,.07)",
                  border: "1px solid rgba(124,92,252,.15)",
                  fontSize: 10, color: "#9b7ffe",
                  animation: `docFadeUp .3s ease ${i * 0.15}s both`,
                }}>
                  <Spin s={8} /> {label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // ── Done — render results ──
          <div style={{ animation: "docFadeUp .25s ease" }}>

            {/* Toolbar: copy + download + regenerate */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, fontSize: 12, color: "#50507a" }}>
                {activeTab === "readme"    && `${tabData?.word_count ?? 0} words · ${tabData?.sections?.length ?? 0} sections`}
                {activeTab === "functions" && `${tabData?.total ?? 0} functions documented`}
                {activeTab === "api"       && `${tabData?.total ?? 0} endpoints documented`}
              </div>
              <CopyBtn text={tabData?.markdown || tabData?.content || ""} label="Copy MD" />
              <button
                onClick={() => downloadMd(
                  `${repoName}_${activeTab}.md`,
                  tabData?.markdown || tabData?.content || ""
                )}
                style={{
                  padding: "4px 12px", borderRadius: 6,
                  border: "1px solid rgba(255,255,255,.1)",
                  background: "rgba(255,255,255,.04)", color: "#8888aa",
                  fontSize: 11, cursor: "pointer", fontWeight: 600,
                  transition: "all .15s", fontFamily: "inherit",
                }}
              >
                ↓ Download
              </button>
              <button
                onClick={() => { setTabState(activeTab, "idle"); setTabData(activeTab, null); }}
                style={{
                  padding: "4px 12px", borderRadius: 6,
                  border: "1px solid rgba(255,255,255,.07)",
                  background: "transparent", color: "#50507a",
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ↺ Regenerate
              </button>
            </div>

            {/* README tab */}
            {activeTab === "readme" && tabData?.content && (
              <div style={{
                background: "#09091a", border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 12, padding: "20px",
              }}>
                <MarkdownView content={tabData.content} />
              </div>
            )}

            {/* Functions tab */}
            {activeTab === "functions" && tabData?.docs && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(tabData.docs as FunctionDoc[]).map((doc, i) => {
                  const key  = `${doc.file}::${doc.function_name}`;
                  const open = expandedFn === key;
                  return (
                    <div
                      key={i}
                      className="doc-fn-card"
                      style={{
                        background: "#09091a",
                        border: "1px solid rgba(255,255,255,.06)",
                        borderRadius: 10, overflow: "hidden",
                        transition: "all .15s",
                      }}
                    >
                      {/* Card header */}
                      <div
                        onClick={() => setExpandedFn(open ? null : key)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "11px 14px", cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{riskEmoji(doc.risk)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12.5, fontWeight: 700, color: "#c4b5fd",
                            fontFamily: "JetBrains Mono, monospace",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {doc.function_name}
                          </div>
                          <div style={{
                            fontSize: 10.5, color: "#50507a",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {doc.file}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {doc.complexity > 0 && (
                            <span style={{
                              padding: "2px 7px", borderRadius: 99, fontSize: 10,
                              fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
                              background: `${riskColor(doc.risk)}18`,
                              color: riskColor(doc.risk),
                              border: `1px solid ${riskColor(doc.risk)}33`,
                            }}>
                              cc:{doc.complexity}
                            </span>
                          )}
                          <span style={{ color: "#50507a", fontSize: 12 }}>
                            {open ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* Expanded doc */}
                      {open && (
                        <div style={{
                          borderTop: "1px solid rgba(255,255,255,.05)",
                          padding: "14px 16px",
                          animation: "docFadeUp .15s ease",
                        }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <CopyBtn text={doc.documentation} label="Copy doc" />
                            {onViewCode && doc.start_line > 0 && (
                              <button
                                onClick={() => onViewCode(doc.file, doc.start_line, doc.end_line)}
                                style={{
                                  padding: "4px 12px", borderRadius: 6,
                                  border: "1px solid rgba(124,92,252,.2)",
                                  background: "rgba(124,92,252,.07)", color: "#9b7ffe",
                                  fontSize: 11, cursor: "pointer", fontWeight: 600,
                                  fontFamily: "inherit",
                                }}
                              >
                                👁 View code
                              </button>
                            )}
                          </div>
                          <MarkdownView content={doc.documentation} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* API Docs tab */}
            {activeTab === "api" && (
              <>
                {!tabData?.has_endpoints ? (
                  <div style={{
                    textAlign: "center", padding: "40px 20px",
                    color: "#50507a", fontSize: 13,
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔌</div>
                    No API endpoints detected in this repository.
                    <div style={{ fontSize: 11, marginTop: 6 }}>
                      Supported: FastAPI, Flask, Express, NestJS decorators
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(tabData.endpoints as EndpointDoc[]).map((ep, i) => (
                      <div
                        key={i}
                        className="doc-ep-card"
                        style={{
                          background: "#09091a",
                          border: "1px solid rgba(255,255,255,.06)",
                          borderRadius: 10, padding: "16px",
                          transition: "all .15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{
                            padding: "3px 8px", borderRadius: 4, fontSize: 10,
                            fontFamily: "JetBrains Mono, monospace", fontWeight: 800,
                            background: "rgba(6,182,212,.1)", color: "#06b6d4",
                            border: "1px solid rgba(6,182,212,.2)",
                          }}>ENDPOINT</span>
                          <span style={{
                            fontSize: 12.5, fontWeight: 700, color: "#c4b5fd",
                            fontFamily: "JetBrains Mono, monospace",
                          }}>
                            {ep.function_name}
                          </span>
                          <span style={{ fontSize: 10.5, color: "#50507a", marginLeft: "auto" }}>
                            {ep.file}
                          </span>
                        </div>
                        <MarkdownView content={ep.documentation} />
                        <div style={{ marginTop: 10 }}>
                          <CopyBtn text={ep.documentation} label="Copy doc" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
