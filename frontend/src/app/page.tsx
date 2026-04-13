"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { uploadCodebase, uploadFromGit, getCommitLog, queryCodebase, getFileContent, clearSessionHistory } from "@/services/api";
import DependencyGraph from "../components/DependencyGraph";
import Heatmap from "../components/Heatmap";
import AutoDocs from "../components/AutoDocs";
/* ══════════════════════════════════════════════════════════════
   GLOBAL STYLES
══════════════════════════════════════════════════════════════ */
const CSS = `

@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --void:   #03030a;
  --ink:    #06060f;
  --base:   #09091a;
  --layer:  #0e0e1e;
  --card:   #111124;
  --raised: #161630;
  --lift:   #1c1c38;
  --hover:  #222244;
  --edge:   rgba(255,255,255,0.05);
  --edgeM:  rgba(255,255,255,0.09);
  --edgeH:  rgba(255,255,255,0.14);
  --vi:   #7c5cfc;
  --viL:  #9b7ffe;
  --viD:  #5138d4;
  --cyan: #06b6d4;
  --blue: #3b82f6;
  --green:#10b981;
  --amber:#f59e0b;
  --red:  #ef4444;
  --vg:  rgba(124,92,252,0.15);
  --vgs: rgba(124,92,252,0.07);
  --t1: #f0f0ff;
  --t2: #8888aa;
  --t3: #50507a;
  --t4: #28284a;
  --ui:   'Syne', sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --r1:6px; --r2:10px; --r3:16px; --r4:24px;
}

html,body{height:100%;font-family:var(--ui);background:var(--void);color:var(--t1);overflow:hidden;}

::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:99px;}

@keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.93);}to{opacity:1;transform:scale(1);}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.45;transform:scale(.75);}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--vg);}50%{box-shadow:0 0 50px rgba(124,92,252,.45),0 0 90px rgba(124,92,252,.15);}}
@keyframes ringExp{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.5);opacity:0;}}
@keyframes gridAnim{from{background-position:0 0;}to{background-position:60px 60px;}}
@keyframes particleUp{0%{transform:translateY(0);opacity:.6;}100%{transform:translateY(-200px);opacity:0;}}
@keyframes chatOpen{from{opacity:0;transform:translateY(16px) scale(.96);}to{opacity:1;transform:translateY(0) scale(1);}}
@keyframes typing{0%,60%,100%{opacity:.2;transform:translateY(0);}30%{opacity:1;transform:translateY(-4px);}}
@keyframes toastIn{from{opacity:0;transform:translateX(110%);}to{opacity:1;transform:translateX(0);}}
@keyframes codeSlide{from{opacity:0;transform:translateX(36px);}to{opacity:1;transform:translateX(0);}}
@keyframes checkPop{0%{transform:scale(0);}60%{transform:scale(1.25);}100%{transform:scale(1);}}
@keyframes borderDash{0%,100%{border-color:rgba(124,92,252,.3);}50%{border-color:rgba(124,92,252,.75);}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
@keyframes heroEnter{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}
@keyframes gradText{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}

.glass {
  background: linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.01));
  backdrop-filter: blur(20px);
  border: 1px solid var(--edge);
}
.glass-md {
  background: linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
  border: 1px solid var(--edgeM);
}
.hist-row {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:var(--r2);
  cursor:pointer; border:1px solid transparent; transition:all .15s;
}
.hist-row:hover{background:var(--raised);border-color:var(--edge);}
.hist-row.act{background:var(--vgs);border-color:rgba(124,92,252,.25);}
.code-ln{display:flex;min-height:21px;transition:background .1s;}
.code-ln:hover{background:rgba(255,255,255,.02);}
.code-ln.hl{background:rgba(124,92,252,.11);box-shadow:inset 3px 0 0 var(--vi);}
.msg-u{
  background:linear-gradient(135deg,rgba(124,92,252,.2),rgba(59,130,246,.1));
  border:1px solid rgba(124,92,252,.25);border-radius:16px 16px 4px 16px;
  padding:10px 14px;font-size:13.5px;line-height:1.65;color:var(--t1);
  max-width:88%;animation:fadeUp .2s ease;
}
.msg-ai{
  background:var(--raised);border:1px solid var(--edgeM);
  border-radius:16px 16px 16px 4px;padding:12px 16px;
  font-size:13.5px;line-height:1.75;color:var(--t2);max-width:94%;
  animation:fadeUp .2s ease;
}
.feat-card {
  background:var(--card);border:1px solid var(--edge);border-radius:var(--r3);
  padding:22px 18px;transition:all .2s;cursor:default;
}
.feat-card:hover{border-color:rgba(124,92,252,.25);transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.4);}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;
  font-size:10px;font-weight:700;letter-spacing:.05em;font-family:var(--mono);}
.kw{color:#a78bfa;} .str{color:#86efac;} .num{color:#fdba74;}
.cm{color:#4b5563;font-style:italic;} .cls{color:#67e8f9;}
.fn2{color:#f472b6;} .dec{color:#c084fc;} .slf{color:#fb923c;font-style:italic;}
`;

/* ══════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════ */
interface IconProps { d: string; s?: number; col?: string; style?: React.CSSProperties; }
const Ic = ({ d, s = 16, col, style: sx = {} }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={col || "currentColor"} strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...sx }}><path d={d} /></svg>
);
const P: Record<string, string> = {
  Upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  Zap:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  Code:   "M10 20l4-16M18 12l4-4-4-4M6 16l-4-4 4-4",
  Chat:   "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  Send:   "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  Check:  "M20 6L9 17l-5-5",
  X:      "M18 6L6 18M6 6l12 12",
  Clock:  "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  Folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  Search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  Spark:  "M12 3l1.88 5.47L19 10l-5.12 1.53L12 17l-1.88-5.47L5 10l5.12-1.53L12 3z",
  Copy:   "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  File:   "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  Hash:   "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  Eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  User:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  Term:   "M4 17l6-6-6-6M12 19h8",
  ChevD:  "M6 9l6 6 6-6",
};

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
interface Repo { id: number; name: string; files: number; fns: number; ts: number; }
interface Msg  { role: "u" | "a"; content: string; file?: string | null; start_line?: number; end_line?: number; }
interface Toast{ id: number; message: string; type: "success"|"error"|"info"; }

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const Spin = ({ s = 18, col = "#7c5cfc" }: { s?: number; col?: string }) => (
  <div style={{ width:s, height:s, borderRadius:"50%",
    border:`2px solid ${col}22`, borderTop:`2px solid ${col}`,
    animation:"spin .65s linear infinite", flexShrink:0 }} />
);

function hlCode(c: string): string {
  const e = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return e(c)
    .replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,'<span class="str">$1</span>')
    .replace(/(#[^\n]*)/g,'<span class="cm">$1</span>')
    .replace(/(@[\w.]+)/g,'<span class="dec">$1</span>')
    .replace(/\b(async|await|def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|pass|break|continue|lambda|yield|and|or|not|in|is|None|True|False|raise)\b/g,'<span class="kw">$1</span>')
    .replace(/\b([A-Z][A-Za-z0-9_]*)\b/g,'<span class="cls">$1</span>')
    .replace(/\b(self|cls)\b/g,'<span class="slf">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g,'<span class="num">$1</span>')
    .replace(/\b(print|len|range|type|str|int|float|list|dict|bool|open|super|Depends|select)\b/g,'<span class="fn2">$1</span>');
}

function ago(ts: number): string {
  const d=Date.now()-ts, m=Math.floor(d/6e4), h=Math.floor(d/36e5);
  if(m<1)return"just now"; if(m<60)return`${m}m ago`;
  if(h<24)return`${h}h ago`; return`${Math.floor(h/24)}d ago`;
}

/* ══════════════════════════════════════════════════════════════
   MOCK DATA
══════════════════════════════════════════════════════════════ */
const INIT_HIST: Repo[] = [
  {id:1, name:"fastapi-backend.zip",  files:18, fns:52,  ts:Date.now()-7200000},
  {id:2, name:"react-dashboard.zip",  files:34, fns:120, ts:Date.now()-86400000},
  {id:3, name:"auth-service.zip",     files:9,  fns:31,  ts:Date.now()-172800000},
];

const CODE_SAMPLES: Record<string,{lang:string;name:string;code:string}> = {
  "auth/service.py": { lang:"Python", name:"login_user", code:
`async def login_user(
    username: str,
    password: str,
    db: AsyncSession = Depends(get_db)
) -> AuthResponse:
    """Authenticate user and issue JWT tokens."""
    user = await db.execute(
        select(User).where(User.username == username)
    )
    user = user.scalar_one_or_none()
    if not user or not verify_password(
        password, user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    user.last_login = datetime.utcnow()
    await db.commit()
    return AuthResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
        token_type="bearer"
    )` },
  "db/session.py": { lang:"Python", name:"get_db", code:
`async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async DB session (dependency injection)."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError:
            await session.rollback()
            raise
        finally:
            await session.close()` },
};

const REPLIES = [
  {q:/auth|login|password|jwt/i, a:"The **authentication system** is in 3 files:\n\n- `auth/service.py` — `login_user()` validates credentials and issues JWTs\n- `auth/utils.py` — `verify_password()` uses bcrypt\n- `middleware.py` — `require_auth` validates tokens on protected routes\n\nUses **FastAPI dependency injection** — sessions composed as `Depends()` callables.", file:"auth/service.py"},
  {q:/db|database|session|sql/i,  a:"Database connections are managed in **`db/session.py`** via the `get_db()` async generator.\n\nWraps each request in try/commit/rollback using SQLAlchemy 2.0 async. Prevents connection leaks. Injected via `Depends(get_db)` in route handlers.", file:"db/session.py"},
  {q:/api|endpoint|route/i,       a:"**API endpoints** in `main.py`:\n\n- `POST /upload` — accepts ZIP, triggers indexing\n- `POST /query` — semantic search over embeddings\n- `GET /health` — liveness check\n\nAll use async handlers with DI for DB and auth.", file:null},
  {q:/.*/,                        a:"I found **3 relevant functions** matching your query. The codebase uses FastAPI for routing, SQLAlchemy async for persistence, and FAISS for vector search.\n\nClick any retrieved function to view its full implementation.", file:"auth/service.py"},
];

const STARTERS = [
  {icon:P.Code,   text:"Explain the authentication system"},
  {icon:P.Hash,   text:"Where is the database connection?"},
  {icon:P.Folder, text:"Summarize this repository"},
  {icon:P.Search, text:"Find all API endpoints"},
];

const FEATURES = [
  {icon:P.Code,  title:"Semantic Search",  desc:"Find functions by meaning, not just keywords"},
  {icon:P.Spark, title:"AI Explanations",  desc:"Natural language answers about your code"},
  {icon:P.Zap,   title:"Smart Retrieval",  desc:"Vector embeddings for accurate code matching"},
  {icon:P.Term,  title:"Any Language",     desc:"Python, JS, Go, Rust and more supported"},
];

/* ══════════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════ */
function Toasts({ list, remove }: { list: Toast[]; remove: (id:number)=>void }) {
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {list.map(t => {
        const c = {
          success:{bg:"rgba(16,185,129,.1)", border:"rgba(16,185,129,.3)", color:"#10b981"},
          error:  {bg:"rgba(239,68,68,.1)",  border:"rgba(239,68,68,.3)",  color:"#ef4444"},
          info:   {bg:"rgba(124,92,252,.1)", border:"rgba(124,92,252,.3)", color:"#9b7ffe"},
        }[t.type];
        return (
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",
            background:c.bg,border:`1px solid ${c.border}`,borderRadius:"var(--r3)",
            boxShadow:"0 8px 32px rgba(0,0,0,.6)",fontSize:13,color:c.color,fontWeight:600,
            animation:"toastIn .3s cubic-bezier(.16,1,.3,1)",minWidth:260,backdropFilter:"blur(20px)"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c.color,flexShrink:0}}/>
            <span style={{flex:1}}>{t.message}</span>
            <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",
              cursor:"pointer",color:c.color,opacity:.6,display:"flex",padding:0}}>
              <Ic d={P.X} s={12}/>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CODE PANEL
══════════════════════════════════════════════════════════════ */
function CodePanel({
  repoName,
  file,
  highlight,
  onClose
}: {
  repoName: string
  file: string
  highlight?: { start: number; end: number } | null
  onClose: () => void
}) {

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {

    async function loadFile() {
      try {

        const data = await getFileContent(repoName,file)

        setCode(data.content || data.code || "")

      } catch (err) {

        console.error("File load error:", err)
        setCode("Could not load file.")

      }

      setLoading(false)
    }

    loadFile()

  }, [file])

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split("\n")
  const highlightedRef = useRef<HTMLDivElement | null>(null)

useEffect(() => {
  if (highlightedRef.current) {
    highlightedRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })
  }
}, [code])

  return (
    <div style={{
      position: "fixed",
      right: 0,
      top: 0,
      bottom: 0,
      width: 500,
      background: "var(--ink)",
      borderLeft: "1px solid var(--edgeM)",
      display: "flex",
      flexDirection: "column",
      zIndex: 500
    }}>

      {/* HEADER */}

      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--edge)",
        background: "var(--base)",
        display: "flex",
        alignItems: "center"
      }}>

        <div style={{ flex: 1 }}>
          <b>{file}</b>
        </div>

        <button onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>

        <button onClick={onClose}>
          ✕
        </button>

      </div>

      {/* CODE VIEW */}

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px"
      }}>

        {loading && (
          <div>Loading file...</div>
        )}

        {!loading && lines.map((line, i) => {

          const lineNumber = i + 1

          const isHighlighted =
            highlight &&
            lineNumber >= highlight.start &&
            lineNumber <= highlight.end

          return (

            <div
              key={i}
              ref={isHighlighted ? highlightedRef : null}
              
              style={{
                display: "flex",
                background: isHighlighted
                  ? "rgba(124,92,252,.25)"
                  : "transparent"
              }}
            >

              {/* LINE NUMBER */}

              <span style={{
                width: 40,
                color: "#666",
                userSelect: "none"
              }}>
                {lineNumber}
              </span>

              {/* CODE */}

              <span style={{
                whiteSpace: "pre",
                fontFamily: "monospace"
              }}>
                {line}
              </span>

            </div>

          )

        })}

      </div>

    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   CHAT WIDGET
══════════════════════════════════════════════════════════════ */
function ChatWidget({
  active,
  activeRepo,
  onViewCode,
  setGraphData,
  setRightPanel,
  sessionId
}: {
  active: boolean
  activeRepo: Repo | null
  onViewCode: (f: string, start?:number, end?:number) => void
  setGraphData: (data:any)=>void
  setRightPanel: (panel: "chat" | "code" | "graph" | "heatmap" | null) => void
  sessionId: string
}) {
  const [open, setOpen]   = useState(false);
  const [msgs, setMsgs]   = useState<Msg[]>([]);
  const [inp,  setInp]    = useState("");
  const [busy, setBusy]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,busy]);

  const send = useCallback(async () => {
  if (!inp.trim() || busy || !active) return;

  const q = inp.trim();

  setInp("");

  if (taRef.current) taRef.current.style.height = "auto";

  setMsgs((m) => [...m, { role: "u", content: q }]);

  setBusy(true);

  try {
    if (!activeRepo) return;

    
    const response = await queryCodebase(q, activeRepo.name.replace(".zip",""), 3, sessionId);
    if (response.mode === "graph") {
      setGraphData(response.graph)
      setRightPanel("graph") 
    }  


    /*
    backend response example:

    {
      answer: "Explanation...",
      file: "auth/service.py"
    }
    */

    setMsgs((m) => [
      ...m,
      {
        role: "a",
        content: response.answer || "No response from AI.",
        file: response.file || null,
        start_line: response.start_line,
        end_line: response.end_line
      },
    ]);

    if (response.mode === "finder" && response.file){
      onViewCode(
        response.file,
        response.start_line??1,
        response.end_line??10
      );
    }

  } catch (err) {

    setMsgs((m) => [
      ...m,
      {
        role: "a",
        content: "⚠️ Could not reach AI backend.",
      },
    ]);

  }

  setBusy(false);

}, [inp, busy, active, activeRepo, onViewCode, setGraphData, sessionId]);

  const renderAI = (text: string) =>
    text.split("\n").map((ln,i)=>(
      <p key={i} style={{margin:ln===""?"5px 0":"1.5px 0"}}>
        {ln.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((seg,j)=>{
          if(seg.startsWith("**")&&seg.endsWith("**"))
            return <strong key={j} style={{color:"var(--t1)",fontWeight:700}}>{seg.slice(2,-2)}</strong>;
          if(seg.startsWith("`")&&seg.endsWith("`"))
            return <code key={j} style={{background:"var(--lift)",padding:"1px 6px",
              borderRadius:4,fontFamily:"var(--mono)",fontSize:11.5,
              color:"#9b7ffe",border:"1px solid var(--edgeM)"}}>{seg.slice(1,-1)}</code>;
          return seg;
        })}
      </p>
    ));

  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:400,
      display:"flex",flexDirection:"column",alignItems:"flex-end",gap:12}}>
      {open && (
        <div style={{width:390,height:560,background:"var(--ink)",
          border:"1px solid var(--edgeM)",borderRadius:22,
          display:"flex",flexDirection:"column",overflow:"hidden",
          animation:"chatOpen .3s cubic-bezier(.16,1,.3,1)",
          boxShadow:"0 24px 80px rgba(0,0,0,.75),0 0 0 1px rgba(124,92,252,.12)"}}>
          {/* Header */}
          <div style={{padding:"13px 16px",borderBottom:"1px solid var(--edge)",
            background:"var(--base)",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:10,flexShrink:0,
              background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 0 14px var(--vg)"}}>
              <Ic d={P.Spark} s={14} col="white"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5,fontWeight:700,color:"var(--t1)",letterSpacing:"-.02em"}}>AI Assistant</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
                <div style={{width:5,height:5,borderRadius:"50%",
                  background:active?"var(--green)":"var(--t4)",
                  animation:active?"pulse 2s infinite":"none"}}/>
                <span style={{fontSize:9.5,color:active?"var(--green)":"var(--t3)",
                  fontWeight:700,fontFamily:"var(--mono)"}}>
                  {active?"CODEBASE READY":"UPLOAD REQUIRED"}
                </span>
              </div>
            </div>
            {msgs.length>0 && (
              <button onClick={()=>setMsgs([])} style={{padding:"3px 8px",borderRadius:6,
                background:"var(--layer)",border:"1px solid var(--edge)",
                color:"var(--t3)",fontSize:10,cursor:"pointer",fontFamily:"var(--ui)"}}>Clear</button>
            )}
            <button onClick={()=>setOpen(false)} style={{width:26,height:26,borderRadius:8,
              background:"var(--layer)",border:"1px solid var(--edge)",cursor:"pointer",
              color:"var(--t3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic d={P.ChevD} s={12}/>
            </button>
          </div>
          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:14}}>
            {msgs.length===0 ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",height:"100%",gap:18,textAlign:"center"}}>
                <div style={{position:"relative",width:60,height:60}}>
                  <div style={{position:"absolute",inset:0,borderRadius:"50%",
                    background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    animation:"glow 3s ease infinite"}}>
                    <Ic d={P.Spark} s={24} col="white"/>
                  </div>
                  {[1,2].map(i=>(
                    <div key={i} style={{position:"absolute",inset:`-${i*10}px`,borderRadius:"50%",
                      border:"1px solid rgba(124,92,252,.2)",
                      animation:`ringExp ${1.4+i*.5}s ease ${i*.3}s infinite`}}/>
                  ))}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--t2)",marginBottom:5}}>
                    {active?"Ask about your codebase":"Upload a codebase first"}
                  </div>
                  <div style={{fontSize:12,color:"var(--t3)",lineHeight:1.7,maxWidth:250}}>
                    {active?"I can explain functions, find patterns, and map dependencies":"Upload a ZIP repository to unlock AI analysis"}
                  </div>
                </div>
                {active && (
                  <div style={{display:"flex",flexDirection:"column",gap:5,width:"100%",maxWidth:290}}>
                    {STARTERS.map((s,i)=>(
                      <button key={i} onClick={()=>setInp(s.text)} style={{
                        display:"flex",alignItems:"center",gap:9,padding:"9px 12px",
                        borderRadius:"var(--r2)",background:"var(--layer)",
                        border:"1px solid var(--edge)",color:"var(--t3)",fontSize:12,
                        cursor:"pointer",textAlign:"left",fontFamily:"var(--ui)",transition:"all .15s"}}
                        onMouseEnter={e=>{const b=e.currentTarget as HTMLButtonElement;b.style.background="var(--raised)";b.style.borderColor="rgba(124,92,252,.25)";b.style.color="var(--t1)";b.style.transform="translateX(2px)";}}
                        onMouseLeave={e=>{const b=e.currentTarget as HTMLButtonElement;b.style.background="var(--layer)";b.style.borderColor="var(--edge)";b.style.color="var(--t3)";b.style.transform="translateX(0)";}}>
                        <div style={{width:20,height:20,borderRadius:6,flexShrink:0,
                          background:"var(--vgs)",border:"1px solid rgba(124,92,252,.2)",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Ic d={s.icon} s={10} col="#9b7ffe"/>
                        </div>
                        {s.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {msgs.map((m,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",
                    alignItems:m.role==="u"?"flex-end":"flex-start",gap:4}}>
                    {m.role==="u" ? (
                      <div style={{display:"flex",alignItems:"flex-end",gap:7,flexDirection:"row-reverse"}}>
                        <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                          background:"var(--raised)",border:"1px solid var(--edgeM)",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Ic d={P.User} s={11}/>
                        </div>
                        <div className="msg-u">{m.content}</div>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"flex-start",gap:7}}>
                        <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                          background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Ic d={P.Spark} s={11} col="white"/>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:5,maxWidth:"95%"}}>
                          <div className="msg-ai">{renderAI(m.content)}</div>
                          {m.file && (
                            <button onClick={()=>onViewCode(m.file!,(m as any).start_line,(m as any).end_line )} style={{
                              display:"flex",alignItems:"center",gap:5,padding:"4px 9px",
                              borderRadius:8,background:"var(--vgs)",
                              border:"1px solid rgba(124,92,252,.2)",color:"#9b7ffe",
                              fontSize:11,cursor:"pointer",fontFamily:"var(--ui)",
                              fontWeight:500,width:"fit-content",transition:"all .15s"}}
                              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(124,92,252,.14)";}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="var(--vgs)";}}>
                              <Ic d={P.Eye} s={10} col="#9b7ffe"/>View {m.file}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {busy && (
                  <div style={{display:"flex",alignItems:"flex-start",gap:7}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                      background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ic d={P.Spark} s={11} col="white"/>
                    </div>
                    <div className="msg-ai" style={{paddingTop:14,paddingBottom:14}}>
                      <div style={{display:"flex",gap:5}}>
                        {[0,1,2].map(i=>(
                          <div key={i} style={{width:6,height:6,borderRadius:"50%",
                            background:"var(--vi)",animation:`typing 1.2s ease ${i*.2}s infinite`}}/>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef}/>
          </div>
          {/* Input */}
          <div style={{padding:"10px 12px",borderTop:"1px solid var(--edge)",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,background:"var(--layer)",
              borderRadius:16,border:`1px solid ${inp?"rgba(124,92,252,.4)":"var(--edgeM)"}`,
              padding:"8px 8px 8px 13px",transition:"all .2s",
              boxShadow:inp?"0 0 0 3px rgba(124,92,252,.07)":"none"}}>
              <textarea ref={taRef} value={inp}
                onChange={e=>setInp(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                onInput={e=>{const t=e.target as HTMLTextAreaElement;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,88)+"px";}}
                disabled={!active||busy}
                placeholder={active?"Ask anything about your codebase…":"Upload a codebase first…"}
                rows={1}
                style={{flex:1,background:"transparent",border:"none",outline:"none",
                  resize:"none",fontFamily:"var(--ui)",fontSize:13,
                  color:"var(--t1)",lineHeight:1.5,maxHeight:88,caretColor:"var(--vi)"}}/>
              <button onClick={send} disabled={!inp.trim()||!active||busy}
                style={{width:32,height:32,borderRadius:"var(--r2)",flexShrink:0,
                  background:inp.trim()&&active?"linear-gradient(135deg,#7c5cfc,#5138d4)":"var(--raised)",
                  border:"none",display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:inp.trim()&&active?"pointer":"default",transition:"all .2s",
                  opacity:!active||(!inp.trim()&&!busy)?0.4:1,
                  boxShadow:inp.trim()&&active?"0 0 14px var(--vg)":"none"}}>
                {busy?<Spin s={13}/>:<Ic d={P.Send} s={13} col="white"/>}
              </button>
            </div>
            <div style={{textAlign:"center",fontSize:10,color:"var(--t4)",marginTop:5,fontFamily:"var(--mono)"}}>
              ↵ send · shift+↵ newline
            </div>
          </div>
        </div>
      )}
      {/* FAB */}
      <button onClick={()=>setOpen(o=>!o)} style={{
        display:"flex",alignItems:"center",gap:10,padding:"12px 22px 12px 14px",
        borderRadius:99,background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
        border:"none",cursor:"pointer",color:"white",fontFamily:"var(--ui)",
        fontSize:14,fontWeight:700,letterSpacing:"-.01em",
        boxShadow:"0 8px 32px rgba(124,92,252,.45),0 0 0 1px rgba(124,92,252,.25)",
        transition:"all .2s",animation:"glow 3s ease infinite"}}
        onMouseEnter={e=>{const b=e.currentTarget as HTMLButtonElement;b.style.transform="translateY(-2px)";b.style.boxShadow="0 14px 44px rgba(124,92,252,.55),0 0 0 1px rgba(124,92,252,.35)";}}
        onMouseLeave={e=>{const b=e.currentTarget as HTMLButtonElement;b.style.transform="translateY(0)";b.style.boxShadow="0 8px 32px rgba(124,92,252,.45),0 0 0 1px rgba(124,92,252,.25)";}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.15)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {open?<Ic d={P.X} s={13} col="white"/>:<Ic d={P.Chat} s={13} col="white"/>}
        </div>
        {open?"Close assistant":"Ask anything about your codebase"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════ */
function Sidebar({ items, active, onLoad }: { items: Repo[]; active: Repo|null; onLoad: (r:Repo)=>void }) {
  const [q, setQ] = useState("");
  const list = items.filter(i=>i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{width:270,flexShrink:0,height:"100vh",background:"var(--ink)",
      borderRight:"1px solid var(--edge)",display:"flex",flexDirection:"column",
      overflow:"hidden",position:"relative",zIndex:10}}>
      {/* Logo */}
      <div style={{padding:"18px 16px 14px",borderBottom:"1px solid var(--edge)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:30,height:30,borderRadius:9,flexShrink:0,
            background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 0 16px var(--vg)"}}>
            <Ic d={P.Zap} s={14} col="white"/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:"var(--t1)",letterSpacing:"-.03em"}}>CodeLens AI</div>
            <div style={{fontSize:9,color:"var(--t4)",fontFamily:"var(--mono)",letterSpacing:".07em"}}>CODEBASE ASSISTANT</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
          <Ic d={P.Clock} s={13} col="var(--t3)"/>
          <span style={{fontSize:12.5,fontWeight:700,color:"var(--t2)"}}>Codebase History</span>
          <span style={{marginLeft:"auto",padding:"2px 7px",borderRadius:99,
            background:"var(--vgs)",border:"1px solid rgba(124,92,252,.18)",
            fontSize:9.5,color:"#9b7ffe",fontWeight:700,fontFamily:"var(--mono)"}}>
            {items.length}
          </span>
        </div>
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--t4)"}}>
            <Ic d={P.Search} s={11}/>
          </div>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search repositories…"
            style={{width:"100%",padding:"7px 10px 7px 29px",background:"var(--layer)",
              border:"1px solid var(--edge)",borderRadius:"var(--r2)",color:"var(--t1)",
              fontSize:12,fontFamily:"var(--ui)",outline:"none",transition:"border .2s"}}
            onFocus={e=>{(e.target as HTMLInputElement).style.borderColor="rgba(124,92,252,.4)";}}
            onBlur={e=>{(e.target as HTMLInputElement).style.borderColor="var(--edge)";}}/>
        </div>
      </div>
      {/* List */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
        {list.length===0 ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",height:"100%",gap:10,textAlign:"center",padding:20}}>
            <div style={{width:44,height:44,borderRadius:"var(--r3)",background:"var(--layer)",
              border:"1px solid var(--edge)",display:"flex",alignItems:"center",
              justifyContent:"center",animation:"float 4s ease infinite"}}>
              <Ic d={P.Folder} s={20} col="var(--t4)"/>
            </div>
            <div style={{fontSize:12,color:"var(--t3)",fontWeight:600}}>
              {q?"No matches":"No codebases yet"}
            </div>
            <div style={{fontSize:11,color:"var(--t4)",lineHeight:1.6}}>
              {q?"Try different search":"Upload your first repository"}
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {list.map(item=>(
              <div key={item.id}
                className={`hist-row${active?.id===item.id?" act":""}`}
                onClick={()=>onLoad(item)}>
                <div style={{width:34,height:34,borderRadius:"var(--r2)",flexShrink:0,
                  background:active?.id===item.id?"var(--vgs)":"var(--layer)",
                  border:`1px solid ${active?.id===item.id?"rgba(124,92,252,.25)":"var(--edge)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                  <Ic d={P.Folder} s={15} col={active?.id===item.id?"#9b7ffe":"var(--t3)"}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>
                    {item.name}
                  </div>
                  <div style={{fontSize:10,color:"var(--t4)",fontFamily:"var(--mono)"}}>
                    {item.files}f · {item.fns}fn · {ago(item.ts)}
                  </div>
                </div>
                {active?.id===item.id && (
                  <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,
                    background:"var(--vi)",animation:"pulse 2s infinite",
                    boxShadow:"0 0 6px var(--vi)"}}/>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* User */}
      <div style={{padding:"11px 14px",borderTop:"1px solid var(--edge)",flexShrink:0,
        display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
          background:"linear-gradient(135deg,#7c5cfc,#5138d4)",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic d={P.User} s={12} col="white"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11.5,fontWeight:600,color:"var(--t1)"}}>Developer</div>
          <div style={{fontSize:9.5,color:"var(--t4)"}}>Pro Plan</div>
        </div>
        <span className="tag" style={{background:"var(--vgs)",color:"#9b7ffe",
          border:"1px solid rgba(124,92,252,.2)"}}>PRO</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════════════ */
function Hero({ activeRepo, onUpload, onOpenHeatMap, onOpenAutoDocs }: { activeRepo: Repo|null; onUpload: (info:Omit<Repo,"id">)=>void; onOpenHeatMap: ()=>void; onOpenAutoDocs: ()=>void; }){
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag,      setDrag]      = useState(false);
  const [stage,     setStage]     = useState<"idle"|"uploading"|"done">("idle");
  const [prog,      setProg]      = useState(0);
  const [fname,     setFname]     = useState("");
  const [sLabel,    setSLabel]    = useState("");
  const [tab,       setTab]       = useState<"zip"|"git">("zip");
  const [gitUrl,    setGitUrl]    = useState("");
  const [gitError,  setGitError]  = useState("");
  const [commitLog, setCommitLog] = useState<any[]>([]);

  // ── ZIP upload ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file?: File) => {
    if (!file || !file.name.endsWith(".zip")) return;
    try {
      setFname(file.name);
      setStage("uploading");
      setProg(10);
      setSLabel("Uploading ZIP...");
      const result = await uploadCodebase(file);
      setProg(60); setSLabel("Indexing codebase...");
      setProg(100); setSLabel("Complete!");
      setStage("done");
      await new Promise((r) => setTimeout(r, 700));
      onUpload({ name: file.name, files: result.vectors_stored || 0, fns: result.functions_found || 0, ts: Date.now() });
      setStage("idle"); setProg(0);
    } catch (err) {
      console.error("Upload error:", err);
      setStage("idle");
    }
  }, [onUpload]);

  // ── Git URL clone ───────────────────────────────────────────────────────
  const handleGitClone = useCallback(async () => {
    if (!gitUrl.trim()) { setGitError("Please enter a Git URL"); return; }
    if (!gitUrl.startsWith("http")) { setGitError("URL must start with https://"); return; }
    setGitError("");
    const repoName = gitUrl.trim().split("/").pop()?.replace(".git","") || "repo";
    try {
      setFname(repoName);
      setStage("uploading");
      setProg(5);  setSLabel("Cloning repository...");
      const result = await uploadFromGit(gitUrl.trim(), repoName);
      setProg(50); setSLabel("Parsing and embedding...");
      setProg(90); setSLabel("Building dependency graph...");
      setProg(100); setSLabel("Complete!");
      setStage("done");
      setCommitLog(result.commit_log || []);
      await new Promise((r) => setTimeout(r, 700));
      onUpload({ name: repoName, files: result.vectors_stored || 0, fns: result.functions_found || 0, ts: Date.now() });
      setStage("idle"); setProg(0);
    } catch (err: any) {
      console.error("Git clone error:", err);
      setGitError(err?.response?.data?.detail || "Clone failed — check the URL and try again");
      setStage("idle");
    }
  }, [gitUrl, onUpload]);

  return (
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",position:"relative"}}>
      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,
          backgroundImage:"linear-gradient(rgba(124,92,252,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,252,.04) 1px,transparent 1px)",
          backgroundSize:"60px 60px",animation:"gridAnim 14s linear infinite"}}/>
        <div style={{position:"absolute",top:"-5%",left:"50%",transform:"translateX(-50%)",
          width:900,height:500,
          background:"radial-gradient(ellipse,rgba(124,92,252,.12) 0%,transparent 65%)",
          filter:"blur(50px)"}}/>
        <div style={{position:"absolute",bottom:0,right:"15%",width:500,height:400,
          background:"radial-gradient(circle,rgba(6,182,212,.06) 0%,transparent 70%)",
          filter:"blur(40px)"}}/>
        {[...Array(10)].map((_,i)=>(
          <div key={i} style={{position:"absolute",left:`${5+i*9.5}%`,bottom:`${10+i*2}%`,
            width:i%3===0?3:2,height:i%3===0?3:2,borderRadius:"50%",
            background:i%2===0?"#7c5cfc":"#06b6d4",opacity:.35,
            animation:`particleUp ${6+i*1.3}s ease-in ${i*.9}s infinite`}}/>
        ))}
      </div>

      <div style={{position:"relative",zIndex:5,display:"flex",flexDirection:"column",
        alignItems:"center",minHeight:"100vh",padding:"0 24px 80px"}}>

        {/* Navbar */}
        <nav style={{width:"100%",maxWidth:900,display:"flex",alignItems:"center",
          justifyContent:"flex-end",padding:"18px 0 0",marginBottom:0,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 13px",
              borderRadius:99,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",
                animation:"pulse 2s infinite",boxShadow:"0 0 6px var(--green)"}}/>
              <span style={{fontSize:11,color:"var(--green)",fontWeight:700,fontFamily:"var(--mono)"}}>API ONLINE</span>
            </div>
            <span style={{fontSize:11.5,color:"var(--t4)",fontFamily:"var(--mono)"}}>v2.4.1</span>
          </div>
        </nav>

        {/* Active banner */}
        {activeRepo && (
          <div style={{width:"100%",maxWidth:660,marginTop:20,animation:"slideDown .3s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",
              background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:"var(--r2)"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",
                animation:"pulse 2s infinite",boxShadow:"0 0 7px var(--green)"}}/>
              <span style={{fontSize:12.5,color:"var(--green)",fontWeight:700}}>Active: {activeRepo.name}</span>
              <span style={{fontSize:11,color:"rgba(16,185,129,.55)"}}>
                {activeRepo.files} files · {activeRepo.fns} functions
              </span>
              <button onClick={()=>onOpenHeatMap()}
                style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,
                  padding:"4px 12px",borderRadius:99,border:"none",cursor:"pointer",
                  background:"rgba(239,68,68,.1)",color:"#ef8644",
                  fontFamily:"var(--ui)",fontSize:11,fontWeight:700,
                  transition:"all .15s"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(239,68,68,.18)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(239,68,68,.1)";}}>
                🔥 Heatmap
              </button>
              <button onClick={()=>onOpenAutoDocs()}
               style={{display:"flex", alignItems:"center", gap:5,
                 padding:"4px 12px", borderRadius:99, border:"none", cursor:"pointer",
                 background:"rgba(124,92,252,.1)", color:"#9b7ffe",
                 fontFamily:"var(--ui)", fontSize:11, fontWeight:700, transition:"all .15s"}}
               onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(124,92,252,.2)";}}
               onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(124,92,252,.1)";}}>
                📚 Auto Docs
              </button>


            </div>
          </div>
        )}

        {/* Hero headline */}
        <div style={{textAlign:"center",marginTop:activeRepo?32:56,marginBottom:40,
          animation:"heroEnter .7s cubic-bezier(.16,1,.3,1)"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",
            borderRadius:99,marginBottom:28,background:"rgba(124,92,252,.1)",
            border:"1px solid rgba(124,92,252,.25)"}}>
            <Ic d={P.Spark} s={11} col="#9b7ffe"/>
            <span style={{fontSize:11,color:"#9b7ffe",fontWeight:700,letterSpacing:".05em",fontFamily:"var(--mono)"}}>
              POWERED BY FAISS + LLM EMBEDDINGS
            </span>
          </div>
          <h1 style={{fontSize:"clamp(38px,5.5vw,72px)",fontWeight:800,
            lineHeight:1.05,letterSpacing:"-.04em",marginBottom:20}}>
            <span style={{color:"var(--t1)",display:"block"}}>Understand any</span>
            <span style={{display:"block",
              background:"linear-gradient(135deg,#9b7ffe 0%,#7c5cfc 35%,#06b6d4 100%)",
              backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              animation:"gradText 4s ease infinite"}}>codebase</span>
            <span style={{display:"block",
              background:"linear-gradient(135deg,#06b6d4 0%,#3b82f6 60%,#9b7ffe 100%)",
              backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              animation:"gradText 4s ease .5s infinite"}}>instantly</span>
          </h1>
          <p style={{fontSize:15,color:"var(--t3)",lineHeight:1.75,maxWidth:520,margin:"0 auto",fontWeight:400}}>
            Upload your ZIP archive and ask questions in plain English.
            CodeLens AI retrieves the exact functions, explains logic, and maps dependencies.
          </p>
        </div>

        {/* Upload card */}
        <div style={{width:"100%",maxWidth:660,
          animation:"heroEnter .7s .15s cubic-bezier(.16,1,.3,1) both",marginBottom:48}}>
          <input ref={inputRef} type="file" accept=".zip" style={{display:"none"}}
            onChange={e=>handleFile(e.target.files?.[0])}/>

          {stage==="idle" && (
            <>
              {/* Tab switcher */}
              <div style={{display:"flex",marginBottom:0,background:"var(--card)",
                border:"1px solid var(--edgeM)",borderRadius:"16px 16px 0 0",overflow:"hidden"}}>
                {(["zip","git"] as const).map(t=>(
                  <button key={t} onClick={()=>{setTab(t);setGitError("");}}
                    style={{flex:1,padding:"12px",border:"none",cursor:"pointer",
                      fontFamily:"var(--ui)",fontSize:13,fontWeight:700,transition:"all .15s",
                      background:tab===t?"var(--raised)":"transparent",
                      color:tab===t?"var(--t1)":"var(--t3)",
                      borderBottom:tab===t?"2px solid var(--vi)":"2px solid transparent"}}>
                    {t==="zip" ? "📦  ZIP Archive" : "🔗  Git URL"}
                  </button>
                ))}
              </div>

              {/* ZIP tab */}
              {tab==="zip" && (
                <div
                  onClick={()=>inputRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDrag(true);}}
                  onDragLeave={()=>setDrag(false)}
                  onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files?.[0]);}}
                  style={{border:`2px dashed ${drag?"#7c5cfc":"rgba(124,92,252,.28)"}`,
                    borderTop:"none",borderRadius:"0 0 22px 22px",padding:"44px 36px",
                    textAlign:"center",cursor:"pointer",transition:"all .2s",
                    background:drag?"rgba(124,92,252,.08)":"linear-gradient(135deg,rgba(124,92,252,.04),rgba(6,182,212,.02))",
                    animation:drag?"borderDash 1s ease infinite":"none",
                    position:"relative",overflow:"hidden"}}>
                  <div style={{position:"relative",display:"inline-flex",alignItems:"center",
                    justifyContent:"center",marginBottom:20}}>
                    <div style={{width:70,height:70,borderRadius:"50%",
                      background:"linear-gradient(135deg,rgba(124,92,252,.28),rgba(81,56,212,.18))",
                      border:"1px solid rgba(124,92,252,.35)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      animation:drag?"glow 1s ease infinite":"float 4s ease infinite",
                      boxShadow:"0 0 30px rgba(124,92,252,.2)"}}>
                      <Ic d={P.Upload} s={28} col={drag?"#c4b5fd":"#9b7ffe"}/>
                    </div>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:"var(--t1)",marginBottom:8,letterSpacing:"-.03em"}}>
                    {drag?"Release to upload":"Drop your ZIP file here"}
                  </div>
                  <div style={{fontSize:13.5,color:"var(--t3)",marginBottom:18}}>
                    or <span style={{color:"#9b7ffe",textDecoration:"underline",textUnderlineOffset:3}}>browse files</span> on your computer
                  </div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 16px",
                    borderRadius:99,background:"var(--layer)",border:"1px solid var(--edgeM)"}}>
                    <span style={{fontSize:11,color:"var(--t4)",fontFamily:"var(--mono)"}}>
                      .zip archives only · any size
                    </span>
                  </div>
                </div>
              )}

              {/* Git URL tab */}
              {tab==="git" && (
                <div style={{background:"linear-gradient(135deg,rgba(124,92,252,.04),rgba(6,182,212,.02))",
                  border:"1px solid rgba(124,92,252,.28)",borderTop:"none",
                  borderRadius:"0 0 22px 22px",padding:"36px 32px"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
                    <div style={{width:64,height:64,borderRadius:"50%",
                      background:"linear-gradient(135deg,rgba(6,182,212,.2),rgba(59,130,246,.12))",
                      border:"1px solid rgba(6,182,212,.3)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      animation:"float 4s ease infinite",boxShadow:"0 0 24px rgba(6,182,212,.15)"}}>
                      <Ic d={P.Term} s={26} col="#06b6d4"/>
                    </div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:"var(--t1)",textAlign:"center",
                    marginBottom:6,letterSpacing:"-.03em"}}>Clone from GitHub / GitLab</div>
                  <div style={{fontSize:13,color:"var(--t3)",textAlign:"center",marginBottom:24}}>
                    Paste any public repo URL. We'll clone it and index every function with git blame metadata.
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <input
                      value={gitUrl}
                      onChange={e=>{setGitUrl(e.target.value);setGitError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleGitClone()}
                      placeholder="https://github.com/owner/repository"
                      style={{flex:1,padding:"11px 14px",background:"var(--layer)",
                        border:`1px solid ${gitError?"rgba(239,68,68,.5)":"rgba(124,92,252,.3)"}`,
                        borderRadius:"var(--r2)",color:"var(--t1)",fontSize:13,
                        fontFamily:"var(--mono)",outline:"none",transition:"border .2s"}}
                      onFocus={e=>{(e.target as HTMLInputElement).style.borderColor="rgba(124,92,252,.6)";}}
                      onBlur={e=>{(e.target as HTMLInputElement).style.borderColor=gitError?"rgba(239,68,68,.5)":"rgba(124,92,252,.3)";}}
                    />
                    <button onClick={handleGitClone}
                      disabled={!gitUrl.trim()}
                      style={{padding:"11px 22px",borderRadius:"var(--r2)",
                        background:gitUrl.trim()?"linear-gradient(135deg,#06b6d4,#3b82f6)":"var(--raised)",
                        border:"none",color:"white",fontFamily:"var(--ui)",fontSize:13,
                        fontWeight:700,cursor:gitUrl.trim()?"pointer":"default",
                        opacity:gitUrl.trim()?1:0.4,transition:"all .2s",
                        boxShadow:gitUrl.trim()?"0 0 18px rgba(6,182,212,.3)":"none"}}>
                      Clone
                    </button>
                  </div>
                  {gitError && (
                    <div style={{fontSize:11.5,color:"var(--red)",fontFamily:"var(--mono)",
                      marginBottom:12,padding:"7px 12px",background:"rgba(239,68,68,.08)",
                      borderRadius:"var(--r1)",border:"1px solid rgba(239,68,68,.2)"}}>
                      {gitError}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14,justifyContent:"center"}}>
                    {["Blame per function","Commit history","Author metadata","All languages"].map(tag=>(
                      <div key={tag} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 11px",
                        borderRadius:99,fontSize:10.5,fontFamily:"var(--mono)",
                        background:"rgba(6,182,212,.07)",border:"1px solid rgba(6,182,212,.2)",color:"#06b6d4"}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:"#06b6d4"}}/>
                        {tag}
                      </div>
                    ))}
                  </div>
                  {commitLog.length > 0 && (
                    <div style={{marginTop:22,borderTop:"1px solid var(--edge)",paddingTop:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--t3)",
                        fontFamily:"var(--mono)",letterSpacing:".06em",marginBottom:10}}>
                        RECENT COMMITS
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
                        {commitLog.slice(0,8).map((c:any,i:number)=>(
                          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,
                            padding:"7px 10px",borderRadius:"var(--r1)",background:"var(--layer)",
                            border:"1px solid var(--edge)"}}>
                            <code style={{fontSize:10,color:"#7c5cfc",fontFamily:"var(--mono)",
                              flexShrink:0,marginTop:1}}>{c.sha}</code>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11.5,color:"var(--t1)",fontWeight:600,
                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                {c.message}
                              </div>
                              <div style={{fontSize:10,color:"var(--t4)",fontFamily:"var(--mono)",marginTop:1}}>
                                {c.author} · {c.date}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}  



          {stage==="uploading" && (
            <div className="glass-md" style={{borderRadius:22,padding:"44px 36px",
              textAlign:"center",animation:"scaleIn .3s ease"}}>
              <div style={{position:"relative",display:"inline-flex",alignItems:"center",
                justifyContent:"center",width:96,height:96,marginBottom:24}}>
                {[0,1].map(i=>(
                  <div key={i} style={{position:"absolute",inset:i===0?0:14,borderRadius:"50%",
                    border:"1px solid rgba(124,92,252,.2)",
                    animation:`ringExp ${1.6+i*.5}s ease ${i*.4}s infinite`}}/>
                ))}
                <div style={{width:56,height:56,borderRadius:"50%",
                  background:"rgba(124,92,252,.12)",border:"1px solid rgba(124,92,252,.3)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Spin s={24}/>
                </div>
              </div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--t1)",marginBottom:5,letterSpacing:"-.02em"}}>
                {tab==="git" ? "Cloning " : "Indexing "}<span style={{color:"#9b7ffe"}}>{fname}</span>
                
              </div>
              <div style={{fontSize:12.5,color:"var(--t3)",marginBottom:24,
                fontFamily:"var(--mono)",minHeight:18}}>{sLabel}</div>
              <div style={{background:"rgba(255,255,255,.05)",borderRadius:99,height:5,
                overflow:"hidden",maxWidth:440,margin:"0 auto 7px"}}>
                <div style={{height:"100%",width:`${prog}%`,borderRadius:99,
                  background:"linear-gradient(90deg,#7c5cfc,#5138d4,#06b6d4)",
                  transition:"width .2s ease",boxShadow:"0 0 10px rgba(124,92,252,.5)"}}/>
              </div>
              <div style={{fontSize:11,color:"var(--t4)",fontFamily:"var(--mono)",
                textAlign:"right",maxWidth:440,margin:"0 auto 22px"}}>{Math.round(prog)}%</div>
              <div style={{display:"flex",justifyContent:"center",gap:7,flexWrap:"wrap"}}>
                {(tab==="git"
                  ? ["Clone","Parse","Blame","Embed","Index"]
                  : ["Extract","Parse","Embed","Index"]
                ).map((l,i)=>{
                  const thresholds = tab==="git" ? [10,35,55,80,95] : [20,50,75,95];
                  const done = prog >= thresholds[i];  
                  return (
                    <div key={l} style={{display:"flex",alignItems:"center",gap:5,
                      padding:"4px 12px",borderRadius:99,fontSize:10.5,fontFamily:"var(--mono)",
                      background:done?"rgba(16,185,129,.1)":"var(--layer)",
                      border:`1px solid ${done?"rgba(16,185,129,.25)":"var(--edge)"}`,
                      color:done?"var(--green)":"var(--t4)",transition:"all .4s"}}>
                      {done?<Ic d={P.Check} s={10} col="var(--green)"/>
                           :<div style={{width:9,height:9,borderRadius:"50%",background:"var(--edge)"}}/>}
                      {l}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stage==="done" && (
            <div style={{borderRadius:22,padding:"44px",textAlign:"center",
              border:"1px solid rgba(16,185,129,.3)",background:"rgba(16,185,129,.05)",
              animation:"scaleIn .3s ease"}}>
              <div style={{width:68,height:68,borderRadius:"50%",
                background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 16px",boxShadow:"0 0 30px rgba(16,185,129,.2)"}}>
                <Ic d={P.Check} s={28} col="var(--green)" style={{animation:"checkPop .4s ease"}}/>
              </div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--green)",marginBottom:4}}>
                Codebase ready to explore
              </div>
              <div style={{fontSize:13,color:"rgba(16,185,129,.55)"}}>Loading workspace…</div>
            </div>
          )}
        </div>

        {/* Feature cards */}
        <div style={{width:"100%",maxWidth:700,display:"grid",
          gridTemplateColumns:"repeat(4,1fr)",gap:12,
          animation:"heroEnter .7s .3s cubic-bezier(.16,1,.3,1) both"}}>
          {FEATURES.map((f,i)=>(
            <div key={i} className="feat-card">
              <div style={{width:34,height:34,borderRadius:"var(--r2)",
                background:"var(--vgs)",border:"1px solid rgba(124,92,252,.2)",
                display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
                <Ic d={f.icon} s={15} col="#9b7ffe"/>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:5}}>{f.title}</div>
              <div style={{fontSize:11.5,color:"var(--t4)",lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{marginTop:40,display:"flex",alignItems:"center",gap:12,
          animation:"heroEnter .7s .45s cubic-bezier(.16,1,.3,1) both"}}>
          <span style={{fontSize:11.5,color:"var(--t4)"}}>Built with FAISS · FastAPI · Next.js</span>
          <div style={{width:4,height:4,borderRadius:"50%",background:"var(--t4)"}}/>
          <span style={{fontSize:11.5,color:"var(--t4)"}}>Your code never leaves your machine</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [history, setHistory] = useState<Repo[]>(INIT_HIST);
  const [activeRepo, setActiveRepo] = useState<Repo | null>(null);
  const [codeFile, setCodeFile] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ start: number; end: number } | null>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [rightPanel, setRightPanel] = useState<"chat"|"code"|"graph"|"heatmap"|"docs"|null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(id);
    }, []);


  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = Date.now();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    },
    []
  );

  const handleUpload = useCallback(
    (info: Omit<Repo, "id">) => {
      const r: Repo = { id: Date.now(), ...info };
      setHistory((h) => [r, ...h]);
      setActiveRepo(r);
      addToast(`✓ Indexed ${info.fns} functions from ${info.files} files`, "success");
    },
    [addToast]
  );

  const handleLoad = useCallback(
    (repo: Repo) => {
      setActiveRepo(repo);
      addToast(`Loaded: ${repo.name}`, "info");
    },
    [addToast]
  );

  return (
    <>
      <style>{CSS}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: "var(--void)",
        }}
      >
        <Sidebar items={history} active={activeRepo} onLoad={handleLoad} />

        <div style={{ flex: 1, display: "flex" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Hero
            activeRepo={activeRepo}
  onUpload={handleUpload}
  onOpenHeatMap={()=>setRightPanel("heatmap")}
  onOpenAutoDocs={()=>setRightPanel("docs")}
/>
          </div>

          {rightPanel && (
            <div
              style={{
                width: 520,
                height: "100vh",
                background: "var(--ink)",
                borderLeft: "1px solid var(--edge)",
                display: "flex",
                flexDirection: "column",
                zIndex: 100,
              }}
            
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--edge)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <b>{rightPanel}</b>
                <button onClick={() => setRightPanel(null)}>✕</button>
              </div>

              <div style={{ flex: 1, overflow: "hidden" }}>
                {rightPanel === "chat" && (
                  <ChatWidget
                    active={!!activeRepo}
                    activeRepo={activeRepo}
                    sessionId={sessionId}
                    setGraphData={(g: any) => {
                      setGraphData(g);
                      setRightPanel("graph");
                    }}
                    setRightPanel={setRightPanel}
                    onViewCode={(file: string, start?: number, end?: number) => {
                      setCodeFile(file);
                      setHighlight({
                        start: start ?? 1,
                        end: end ?? 50,
                      });
                      setRightPanel("code");
                    }}
                  />
                )}

                {rightPanel === "graph" && graphData && (
                  <DependencyGraph graph={graphData} />
                )}
                {rightPanel === "heatmap" && activeRepo && (
                  <Heatmap
                    repoName={activeRepo.name.replace(".zip", "")}
                    onViewCode={(file, start, end) => {
                      setCodeFile(file);
                      setHighlight({ start, end });
                      setRightPanel("code");
                    }}
                  />
                )}
                {rightPanel === "docs" && activeRepo && (
                  <AutoDocs
                    repoName={activeRepo.name.replace(".zip", "")}
                    onViewCode={(file, start, end) => {
                      setCodeFile(file);
                      setHighlight({ start, end });
                      setRightPanel("code");
                    }}
                  />
                )}
                {rightPanel === "docs" && activeRepo && (
                  <AutoDocs
                    repoName={activeRepo.name.replace(".zip", "")}
                    onViewCode={(file, start, end) => {
                      setCodeFile(file);
                      setHighlight({ start, end });
                      setRightPanel("code");
                    }}
                  />
                )}

                )

              </div>
            </div>
          )}
        </div>
      </div>

      {codeFile && (
        <CodePanel
          repoName={activeRepo?.name.replace(".zip", "") || ""}
          file={codeFile}
          highlight={highlight}
          onClose={() => setCodeFile(null)}
        />
      )}

      <ChatWidget
        active={!!activeRepo}
        activeRepo={activeRepo}
        sessionId={sessionId}
        setGraphData={setGraphData}
        setRightPanel={setRightPanel}
        onViewCode={(file: string, start?: number, end?: number) => {
          setCodeFile(file);
          setHighlight({
            start: start ?? 1,
            end: end ?? 50,
          });
        }}
      />

      <Toasts
        list={toasts}
        remove={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    </>
  );
}