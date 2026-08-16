import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot,
} from "recharts";
import {
  Home, PlusCircle, TrendingUp, Settings as SettingsIcon, ChevronDown, ChevronUp,
  Pencil, Trash2, Download, Upload, Target, Sparkles, X, Check, Plus, Minus, BookOpen,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  TOKENS — ledger / mark-sheet aesthetic                                 */
/* ---------------------------------------------------------------------- */
const C = {
  bg: "#FAF6EC",
  bgWash: "#F3EDDC",
  surface: "#FFFFFF",
  ink: "#232F4B",
  inkSoft: "#6C7488",
  inkFaint: "#9CA3B4",
  rule: "#E4DCC4",
  ruleFaint: "rgba(35,47,75,0.07)",
  gold: "#C0983B",
  goldSoft: "#F1E2BC",
  green: "#2E6B4E",
  greenSoft: "#E1EEE4",
  red: "#AE4130",
  redSoft: "#F5E3DE",
  amber: "#B8801F",
  amberSoft: "#F3E7CC",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');";

const F = {
  display: "'Fraunces', serif",
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

const DEFAULT_SUBJECTS = ["Computer Science", "Physics", "Chemistry", "English", "Maths"];
const SUBJECT_SHORT = {
  "Computer Science": "CS", Physics: "Phy", Chemistry: "Chem", English: "Eng", Maths: "Math",
};
const shortName = (s) => SUBJECT_SHORT[s] || s.slice(0, 4);

const STORAGE_KEYS = { exams: "mark-register:exams", settings: "mark-register:settings" };

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULT_SETTINGS = {
  studentName: "",
  subjects: DEFAULT_SUBJECTS,
  defaultMax: 20,
  passPercentage: 33,
  decimals: 2,
};

function demoExams() {
  const mk = (name, date, marks) => ({
    id: uid(), name, date, demo: true,
    subjects: Object.fromEntries(
      DEFAULT_SUBJECTS.map((s, i) => [s, { obtained: marks[i], max: 20 }])
    ),
  });
  return [
    mk("Chapter Test 1", "2026-05-10", [18, 16, 15, 17, 14]),
    mk("Chapter Test 2", "2026-06-14", [19, 17, 16, 18, 16]),
  ];
}

/* ---------------------------------------------------------------------- */
/*  CALCULATIONS                                                           */
/* ---------------------------------------------------------------------- */
function examTotals(exam) {
  let obtained = 0, max = 0;
  Object.values(exam.subjects || {}).forEach((s) => {
    const o = Number(s.obtained), m = Number(s.max);
    if (!isNaN(o) && !isNaN(m) && m > 0) { obtained += o; max += m; }
  });
  const pct = max > 0 ? (obtained / max) * 100 : 0;
  return { obtained, max, pct };
}

function round(n, d) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

function fmtSigned(n, d) {
  const r = round(n, d);
  const sign = r > 0 ? "+" : r < 0 ? "" : "±";
  return `${sign}${r}`;
}

function feedbackFor(pct) {
  if (pct >= 90) return { label: "Excellent performance", emoji: "⭐", color: C.gold, bg: C.goldSoft };
  if (pct >= 75) return { label: "Good performance", emoji: "🟢", color: C.green, bg: C.greenSoft };
  if (pct >= 60) return { label: "Fair — try to improve", emoji: "🟡", color: C.amber, bg: C.amberSoft };
  if (pct >= 50) return { label: "Needs improvement", emoji: "🟠", color: C.amber, bg: C.amberSoft };
  return { label: "Needs serious improvement", emoji: "🔴", color: C.red, bg: C.redSoft };
}

function sortedByDate(exams) {
  return [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
}

/* ---------------------------------------------------------------------- */
/*  SMALL UI PIECES                                                        */
/* ---------------------------------------------------------------------- */
function GradeStamp({ pct, size = 92, decimals = 2 }) {
  const fb = feedbackFor(pct);
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2.5px solid ${fb.color}`, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: C.surface,
        transform: "rotate(-4deg)", boxShadow: `0 0 0 4px ${fb.bg}`,
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: F.mono, fontWeight: 600, fontSize: size * 0.24, color: fb.color, lineHeight: 1 }}>
        {round(pct, decimals)}%
      </span>
      <span style={{ fontSize: size * 0.16 }}>{fb.emoji}</span>
    </div>
  );
}

function RuledPanel({ children, style }) {
  return (
    <div
      style={{
        background: `repeating-linear-gradient(${C.surface}, ${C.surface} 27px, ${C.ruleFaint} 28px)`,
        borderRadius: 18, border: `1px solid ${C.rule}`, position: "relative",
        overflow: "hidden", ...style,
      }}
    >
      <div style={{ position: "absolute", left: 30, top: 0, bottom: 0, width: 1, background: "rgba(174,65,48,0.18)" }} />
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: C.bgWash, color: C.inkSoft },
    positive: { bg: C.greenSoft, color: C.green },
    negative: { bg: C.redSoft, color: C.red },
    gold: { bg: C.goldSoft, color: C.gold },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
      borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: F.body,
      background: t.bg, color: t.color, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function NumberField({ label, value, onChange, max, placeholder, style }) {
  return (
    <div style={{ flex: 1, ...style }}>
      {label && <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 4, fontFamily: F.body }}>{label}</div>}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10,
          border: `1.5px solid ${C.rule}`, fontFamily: F.mono, fontSize: 15, fontWeight: 600,
          color: C.ink, background: C.surface, outline: "none",
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  BOTTOM NAV                                                              */
/* ---------------------------------------------------------------------- */
function BottomNav({ view, setView }) {
  const items = [
    { id: "home", label: "Home", icon: Home },
    { id: "add", label: "Add Exam", icon: PlusCircle },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface,
      borderTop: `1px solid ${C.rule}`, display: "flex", zIndex: 40,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "9px 0 8px", background: "none", border: "none", cursor: "pointer",
              color: active ? C.gold : C.inkFaint,
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
            <span style={{ fontSize: 10.5, fontFamily: F.body, fontWeight: active ? 700 : 500 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  HEADER                                                                  */
/* ---------------------------------------------------------------------- */
function TopHeader({ title, subtitle }) {
  return (
    <div style={{ padding: "22px 20px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.gold, marginBottom: 2 }}>
        <BookOpen size={15} />
        <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>
          Mark Register
        </span>
      </div>
      <h1 style={{ fontFamily: F.display, fontWeight: 600, fontSize: 27, color: C.ink, margin: 0 }}>{title}</h1>
      {subtitle && <div style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkSoft, marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  HOME VIEW                                                              */
/* ---------------------------------------------------------------------- */
function HomeView({ exams, settings, onEdit, onDelete, onClearDemo, goAdd }) {
  const [expanded, setExpanded] = useState({});
  const sorted = useMemo(() => sortedByDate(exams), [exams]);
  const withStats = sorted.map((e) => ({ ...e, ...examTotals(e) }));
  const current = withStats[withStats.length - 1];
  const previous = withStats[withStats.length - 2];
  const avg = withStats.length ? withStats.reduce((a, e) => a + e.pct, 0) / withStats.length : 0;
  const hasDemo = exams.some((e) => e.demo);
  const d = settings.decimals;

  const improvement = current && previous ? current.pct - previous.pct : null;

  if (!exams.length) {
    return (
      <div>
        <TopHeader title={settings.studentName ? `Hi, ${settings.studentName}` : "Your marks, tracked"} subtitle="No exams recorded yet" />
        <div style={{ margin: "10px 20px", padding: "36px 20px", textAlign: "center", background: C.surface, border: `1.5px dashed ${C.rule}`, borderRadius: 18 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📘</div>
          <div style={{ fontFamily: F.display, fontSize: 18, color: C.ink, marginBottom: 6 }}>Nothing logged yet</div>
          <div style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkSoft, marginBottom: 16 }}>
            Add your first exam and this page fills itself in.
          </div>
          <button onClick={goAdd} style={primaryBtnStyle}>
            <PlusCircle size={16} /> Add Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopHeader
        title={settings.studentName ? `Hi, ${settings.studentName}` : "Overall Performance"}
        subtitle={`${exams.length} exam${exams.length === 1 ? "" : "s"} recorded`}
      />

      {/* Hero stat block */}
      <RuledPanel style={{ margin: "0 20px 16px" }}>
        <div style={{ padding: "20px 20px 18px 40px", display: "flex", alignItems: "center", gap: 16 }}>
          <GradeStamp pct={current.pct} decimals={d} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.body, fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1 }}>Current</div>
            <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 600, color: C.ink, lineHeight: 1.05 }}>
              {round(current.pct, d)}%
            </div>
            {improvement !== null ? (
              <Pill tone={improvement >= 0 ? "positive" : "negative"}>
                {improvement >= 0 ? "📈" : "📉"} {fmtSigned(improvement, d)} pts vs previous
              </Pill>
            ) : (
              <Pill>First exam recorded</Pill>
            )}
          </div>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${C.rule}`, padding: "40px 40px 14px 40px", gap: 22, marginTop: -26 }}>
          <StatMini label="Previous" value={previous ? `${round(previous.pct, d)}%` : "—"} />
          <StatMini label="Average" value={`${round(avg, d)}%`} />
          <StatMini label="Exams" value={exams.length} />
        </div>
      </RuledPanel>

      {hasDemo && (
        <div style={{ margin: "0 20px 16px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClearDemo} style={ghostBtnStyle}>
            <X size={13} /> Clear demo data
          </button>
        </div>
      )}

      <div style={{ padding: "0 20px 6px", fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.6 }}>
        Exam History
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[...withStats].reverse().map((exam, revIdx) => {
          const idx = withStats.length - 1 - revIdx;
          const prev = withStats[idx - 1];
          const cmp = prev ? exam.pct - prev.pct : null;
          const isOpen = !!expanded[exam.id];
          return (
            <div key={exam.id} style={{ background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 14, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded((s) => ({ ...s, [exam.id]: !s[exam.id] }))}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: exam.pct >= settings.passPercentage ? C.green : C.red,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.display, fontSize: 15.5, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                    {exam.name}
                    {exam.demo && <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.inkFaint, background: C.bgWash, padding: "1px 6px", borderRadius: 6 }}>DEMO</span>}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>
                    {exam.date} · {exam.obtained}/{exam.max}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: F.mono, fontSize: 17, fontWeight: 700, color: C.ink }}>{round(exam.pct, d)}%</div>
                  {cmp !== null && (
                    <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: cmp >= 0 ? C.green : C.red }}>
                      {fmtSigned(cmp, 1)} pts
                    </div>
                  )}
                </div>
                {isOpen ? <ChevronUp size={17} color={C.inkFaint} /> : <ChevronDown size={17} color={C.inkFaint} />}
              </button>

              {isOpen && (
                <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.rule}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 14px", marginTop: 12 }}>
                    {Object.entries(exam.subjects).map(([subj, m]) => (
                      <div key={subj} style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontSize: 13 }}>
                        <span style={{ color: C.inkSoft }}>{shortName(subj)}</span>
                        <span style={{ fontFamily: F.mono, fontWeight: 600, color: C.ink }}>{m.obtained}/{m.max}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={() => onEdit(exam)} style={smallActionBtn}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => onDelete(exam)} style={{ ...smallActionBtn, color: C.red, borderColor: "rgba(174,65,48,0.35)" }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: C.ink }}>{value}</div>
    </div>
  );
}

const primaryBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 20px",
  borderRadius: 12, border: "none", background: C.ink, color: "#fff",
  fontFamily: F.body, fontWeight: 600, fontSize: 14, cursor: "pointer",
};
const ghostBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px",
  borderRadius: 9, border: `1px solid ${C.rule}`, background: C.surface,
  color: C.inkSoft, fontFamily: F.body, fontWeight: 600, fontSize: 12, cursor: "pointer",
};
const smallActionBtn = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px",
  borderRadius: 9, border: `1px solid ${C.rule}`, background: C.surface,
  color: C.ink, fontFamily: F.body, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
};

/* ---------------------------------------------------------------------- */
/*  ADD / EDIT EXAM VIEW                                                    */
/* ---------------------------------------------------------------------- */
function AddExamView({ settings, editing, onSave, onCancel }) {
  const blankSubjects = () =>
    Object.fromEntries(settings.subjects.map((s) => [s, { obtained: "", max: String(settings.defaultMax) }]));

  const [name, setName] = useState(editing ? editing.name : "");
  const [date, setDate] = useState(editing ? editing.date : todayISO());
  const [subjects, setSubjects] = useState(() => {
    if (!editing) return blankSubjects();
    const merged = blankSubjects();
    Object.entries(editing.subjects).forEach(([k, v]) => {
      merged[k] = { obtained: String(v.obtained), max: String(v.max) };
    });
    return merged;
  });
  const [error, setError] = useState("");

  const update = (subj, field, val) => {
    setSubjects((s) => {
      const next = { ...s, [subj]: { ...s[subj], [field]: val } };
      // clamp obtained to max
      const m = Number(next[subj].max);
      const o = Number(next[subj].obtained);
      if (!isNaN(m) && !isNaN(o) && o > m) next[subj].obtained = String(m);
      return next;
    });
  };

  const totals = examTotals({ subjects });

  const handleSave = () => {
    if (!name.trim()) { setError("Give this exam a name."); return; }
    const cleaned = {};
    let anyValid = false;
    for (const [k, v] of Object.entries(subjects)) {
      const o = Number(v.obtained), m = Number(v.max);
      if (v.obtained === "" && v.max === "") continue;
      if (isNaN(o) || isNaN(m) || m <= 0 || o < 0) { setError(`Check the marks entered for ${shortName(k)}.`); return; }
      if (o > m) { setError(`${shortName(k)}: marks obtained can't exceed the maximum.`); return; }
      cleaned[k] = { obtained: o, max: m };
      anyValid = true;
    }
    if (!anyValid) { setError("Enter marks for at least one subject."); return; }
    setError("");
    onSave({ id: editing ? editing.id : uid(), name: name.trim(), date, subjects: cleaned, demo: false });
  };

  return (
    <div>
      <TopHeader title={editing ? "Edit Exam" : "Add Exam"} subtitle="Enter marks — everything else is automatic" />
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Exam name</div>
            <input
              value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chapter Test 3"
              style={textInputStyle}
            />
          </div>
          <div>
            <div style={fieldLabel}>Exam date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={textInputStyle} />
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16 }}>
          <div style={{ ...fieldLabel, marginBottom: 12 }}>Marks by subject</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {settings.subjects.map((subj) => (
              <div key={subj} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 84, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, paddingBottom: 10 }}>
                  {shortName(subj)}
                </div>
                <NumberField label="Obtained" value={subjects[subj].obtained} onChange={(v) => update(subj, "obtained", v)} placeholder="0" />
                <div style={{ paddingBottom: 10, color: C.inkFaint, fontFamily: F.mono }}>/</div>
                <NumberField label="Max" value={subjects[subj].max} onChange={(v) => update(subj, "max", v)} placeholder="20" />
              </div>
            ))}
          </div>
        </div>

        {totals.max > 0 && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 14, background: C.bgWash, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft }}>Total {totals.obtained}/{totals.max}</div>
            <div style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 700, color: C.ink }}>{round(totals.pct, settings.decimals)}%</div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: C.redSoft, color: C.red, fontFamily: F.body, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={handleSave} style={{ ...primaryBtnStyle, flex: 1, justifyContent: "center" }}>
            <Check size={16} /> Save Exam
          </button>
          <button onClick={onCancel} style={{ ...ghostBtnStyle, padding: "11px 18px" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const fieldLabel = { fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.inkSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 };
const textInputStyle = {
  width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10,
  border: `1.5px solid ${C.rule}`, fontFamily: F.body, fontSize: 15, color: C.ink, outline: "none", background: C.surface,
};

/* ---------------------------------------------------------------------- */
/*  PROGRESS VIEW                                                          */
/* ---------------------------------------------------------------------- */
function ProgressView({ exams, settings }) {
  const sorted = useMemo(() => sortedByDate(exams).map((e) => ({ ...e, ...examTotals(e) })), [exams]);
  const latest = sorted[sorted.length - 1];
  const d = settings.decimals;

  const chartData = sorted.map((e) => ({ name: e.name, pct: round(e.pct, 1) }));

  // subject performance from latest exam
  const subjPerf = latest
    ? settings.subjects
        .filter((s) => latest.subjects[s] && latest.subjects[s].max > 0)
        .map((s) => ({ subject: s, pct: (latest.subjects[s].obtained / latest.subjects[s].max) * 100 }))
    : [];
  const strongest = subjPerf.length ? subjPerf.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  const weakest = subjPerf.length ? subjPerf.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

  const prevExam = sorted[sorted.length - 2];

  // target calculator
  const [target, setTarget] = useState(80);
  const avgPct = sorted.length ? sorted.reduce((a, e) => a + e.pct, 0) / sorted.length : 0;
  const n = sorted.length;
  const neededPct = n === 0 ? target : target * (n + 1) - avgPct * n;
  const defaultMaxTotal = settings.subjects.length * settings.defaultMax;
  const neededMarks = Math.max(0, (neededPct / 100) * defaultMaxTotal);
  const unreachable = neededPct > 100.0001;

  if (!exams.length) {
    return (
      <div>
        <TopHeader title="Progress" subtitle="Add an exam to see your trend" />
      </div>
    );
  }

  return (
    <div>
      <TopHeader title="Progress" subtitle="Trend across all recorded exams" />

      {/* Line graph */}
      <div style={{ margin: "0 20px 18px", background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: "18px 10px 8px" }}>
        <div style={{ padding: "0 10px 10px", fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.inkSoft }}>Exam → Percentage</div>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={chartData} margin={{ top: 6, right: 16, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={C.ruleFaint} vertical={false} />
            <XAxis dataKey="name" tick={{ fontFamily: F.body, fontSize: 10, fill: C.inkFaint }} interval={0} angle={-18} textAnchor="end" height={40} />
            <YAxis domain={[0, 100]} tick={{ fontFamily: F.mono, fontSize: 10, fill: C.inkFaint }} width={34} />
            <Tooltip
              contentStyle={{ fontFamily: F.body, fontSize: 12, borderRadius: 10, border: `1px solid ${C.rule}` }}
              formatter={(v) => [`${v}%`, "Score"]}
            />
            <Line type="monotone" dataKey="pct" stroke={C.gold} strokeWidth={2.5} dot={{ r: 4, fill: C.gold, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subject performance */}
      <SectionLabel>Subject Performance</SectionLabel>
      <div style={{ margin: "0 20px 14px", background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16 }}>
        {subjPerf.map((s) => {
          const fb = feedbackFor(s.pct);
          const prevPct = prevExam && prevExam.subjects[s.subject]
            ? (prevExam.subjects[s.subject].obtained / prevExam.subjects[s.subject].max) * 100 : null;
          return (
            <div key={s.subject} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontSize: 13.5, marginBottom: 4 }}>
                <span style={{ color: C.ink, fontWeight: 600 }}>{shortName(s.subject)}</span>
                <span style={{ fontFamily: F.mono, fontWeight: 700, color: fb.color }}>{round(s.pct, d)}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 6, background: C.bgWash, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, s.pct)}%`, background: fb.color, borderRadius: 6 }} />
              </div>
              {prevPct !== null && (
                <div style={{ fontFamily: F.body, fontSize: 11, color: s.pct - prevPct >= 0 ? C.green : C.red, marginTop: 3 }}>
                  {round(prevPct, 0)}% → {round(s.pct, 0)}% {s.pct - prevPct >= 0 ? "📈" : "📉"} {fmtSigned(s.pct - prevPct, 1)} pts
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          {strongest && (
            <div style={{ flex: 1, background: C.greenSoft, borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.green, fontWeight: 700, textTransform: "uppercase" }}>Strongest</div>
              <div style={{ fontFamily: F.display, fontSize: 15, color: C.ink, fontWeight: 600 }}>{shortName(strongest.subject)} — {round(strongest.pct, 0)}%</div>
            </div>
          )}
          {weakest && (
            <div style={{ flex: 1, background: C.redSoft, borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.red, fontWeight: 700, textTransform: "uppercase" }}>Needs work</div>
              <div style={{ fontFamily: F.display, fontSize: 15, color: C.ink, fontWeight: 600 }}>{shortName(weakest.subject)} — {round(weakest.pct, 0)}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback per subject */}
      <SectionLabel>Improvement Feedback</SectionLabel>
      <div style={{ margin: "0 20px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {subjPerf.map((s) => {
          const fb = feedbackFor(s.pct);
          return (
            <div key={s.subject} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 12, padding: "10px 14px" }}>
              <span style={{ fontSize: 18 }}>{fb.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{shortName(s.subject)}</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: fb.color }}>{fb.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pass mark */}
      <SectionLabel>Pass / Fail — {settings.passPercentage}% required</SectionLabel>
      <div style={{ margin: "0 20px 14px", background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16 }}>
        {subjPerf.map((s) => {
          const data = latest.subjects[s.subject];
          const passed = s.pct >= settings.passPercentage;
          const needMarks = Math.max(0, Math.ceil((settings.passPercentage / 100) * data.max - data.obtained));
          return (
            <div key={s.subject} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.ruleFaint}` }}>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{shortName(s.subject)}</div>
                <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.inkSoft }}>{data.obtained}/{data.max}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Pill tone={passed ? "positive" : "negative"}>{passed ? "✅ Passed" : "❌ Failed"}</Pill>
                {!passed && <div style={{ fontFamily: F.body, fontSize: 11, color: C.red, marginTop: 3 }}>Need {needMarks} more mark{needMarks === 1 ? "" : "s"}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Target calculator */}
      <SectionLabel>Target Calculator</SectionLabel>
      <div style={{ margin: "0 20px 100px", background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {[50, 60, 70, 80, 90, 95, 100].map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              style={{
                padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${target === t ? C.gold : C.rule}`,
                background: target === t ? C.goldSoft : C.surface, color: target === t ? C.gold : C.inkSoft,
                fontFamily: F.mono, fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              {t}%
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Target size={26} color={C.gold} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.inkSoft }}>
              Current average: <b style={{ color: C.ink }}>{round(avgPct, 1)}%</b>
            </div>
            {unreachable ? (
              <div style={{ fontFamily: F.body, fontSize: 13, color: C.red, marginTop: 3 }}>
                One exam can't get you to {target}% yet — aim high and build up over a few exams.
              </div>
            ) : (
              <div style={{ fontFamily: F.body, fontSize: 13.5, color: C.ink, marginTop: 3 }}>
                You need approximately <b style={{ fontFamily: F.mono }}>{Math.round(neededMarks)}/{defaultMaxTotal}</b> in the next test to reach {target}%.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: "6px 20px 8px", fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.6 }}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SETTINGS VIEW                                                          */
/* ---------------------------------------------------------------------- */
function SettingsView({ settings, setSettings, exams, setExams }) {
  const [local, setLocal] = useState(settings);
  const [newSubject, setNewSubject] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => setLocal(settings), [settings]);

  const save = (next) => {
    setLocal(next);
    setSettings(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name || local.subjects.includes(name)) return;
    save({ ...local, subjects: [...local.subjects, name] });
    setNewSubject("");
  };
  const removeSubject = (s) => {
    if (local.subjects.length <= 1) return;
    save({ ...local, subjects: local.subjects.filter((x) => x !== s) });
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ exams, settings: local }, null, 2)], { type: "application/json" });
    downloadBlob(blob, "mark-register-export.json");
  };
  const exportCSV = () => {
    const subjNames = local.subjects;
    const header = ["Exam", "Date", ...subjNames.flatMap((s) => [`${s} Obtained`, `${s} Max`]), "Total", "Max Total", "Percentage"];
    const rows = sortedByDate(exams).map((e) => {
      const t = examTotals(e);
      const cells = subjNames.flatMap((s) => [e.subjects[s]?.obtained ?? "", e.subjects[s]?.max ?? ""]);
      return [e.name, e.date, ...cells, t.obtained, t.max, round(t.pct, local.decimals)];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "mark-register-export.csv");
  };
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const fileInputRef = React.useRef(null);
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.exams)) setExams(data.exams);
        if (data.settings) save({ ...local, ...data.settings });
      } catch {
        alert("Couldn't read that file — make sure it's a Mark Register JSON export.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <TopHeader title="Settings" subtitle="Keep it minimal — tweak only what you need" />
      <div style={{ padding: "0 20px 110px", display: "flex", flexDirection: "column", gap: 14 }}>

        <SettingsCard title="Student name">
          <input
            value={local.studentName}
            onChange={(e) => save({ ...local, studentName: e.target.value })}
            placeholder="Your name"
            style={textInputStyle}
          />
        </SettingsCard>

        <SettingsCard title="Subjects">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {local.subjects.map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bgWash, borderRadius: 10, padding: "8px 12px" }}>
                <span style={{ fontFamily: F.body, fontSize: 13.5, color: C.ink }}>{s}</span>
                <button onClick={() => removeSubject(s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red }}>
                  <Minus size={15} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Add a subject" style={{ ...textInputStyle, flex: 1 }} />
            <button onClick={addSubject} style={{ ...primaryBtnStyle, padding: "0 14px" }}><Plus size={16} /></button>
          </div>
        </SettingsCard>

        <SettingsCard title="Default maximum marks per subject">
          <input type="number" value={local.defaultMax} onChange={(e) => save({ ...local, defaultMax: Number(e.target.value) || 0 })} style={textInputStyle} />
        </SettingsCard>

        <SettingsCard title="Passing percentage">
          <input type="number" value={local.passPercentage} onChange={(e) => save({ ...local, passPercentage: Number(e.target.value) || 0 })} style={textInputStyle} />
        </SettingsCard>

        <SettingsCard title="Percentage decimal places">
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2].map((d) => (
              <button key={d} onClick={() => save({ ...local, decimals: d })}
                style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1.5px solid ${local.decimals === d ? C.gold : C.rule}`, background: local.decimals === d ? C.goldSoft : C.surface, color: local.decimals === d ? C.gold : C.inkSoft, fontFamily: F.mono, fontWeight: 700, cursor: "pointer" }}>
                {d}
              </button>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title="Export data">
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={{ ...ghostBtnStyle, flex: 1, justifyContent: "center", padding: "10px 0" }}><Download size={14} /> CSV</button>
            <button onClick={exportJSON} style={{ ...ghostBtnStyle, flex: 1, justifyContent: "center", padding: "10px 0" }}><Download size={14} /> JSON</button>
          </div>
        </SettingsCard>

        <SettingsCard title="Import data">
          <button onClick={() => fileInputRef.current.click()} style={{ ...ghostBtnStyle, width: "100%", justifyContent: "center", padding: "10px 0" }}>
            <Upload size={14} /> Choose JSON file
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImport} style={{ display: "none" }} />
        </SettingsCard>

        {savedFlash && (
          <div style={{ textAlign: "center", fontFamily: F.body, fontSize: 12.5, color: C.green, fontWeight: 600 }}>
            <Check size={13} style={{ verticalAlign: -2 }} /> Saved
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.rule}`, borderRadius: 16, padding: 16 }}>
      <div style={fieldLabel}>{title}</div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  APP ROOT                                                               */
/* ---------------------------------------------------------------------- */
export default function App() {
  const [view, setView] = useState("home");
  const [exams, setExams] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [editingExam, setEditingExam] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      let loadedExams = null, loadedSettings = null;
      try { const r = await window.storage.get(STORAGE_KEYS.exams); if (r) loadedExams = JSON.parse(r.value); } catch {}
      try { const r = await window.storage.get(STORAGE_KEYS.settings); if (r) loadedSettings = JSON.parse(r.value); } catch {}
      setExams(loadedExams && loadedExams.length ? loadedExams : demoExams());
      setSettings(loadedSettings || DEFAULT_SETTINGS);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set(STORAGE_KEYS.exams, JSON.stringify(exams)).catch(() => {});
  }, [exams, loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set(STORAGE_KEYS.settings, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  const handleSaveExam = useCallback((exam) => {
    setExams((prev) => {
      const exists = prev.some((e) => e.id === exam.id);
      return exists ? prev.map((e) => (e.id === exam.id ? exam : e)) : [...prev, exam];
    });
    setEditingExam(null);
    setView("home");
  }, []);

  const handleDelete = useCallback((exam) => {
    if (window.confirm(`Delete "${exam.name}"? This can't be undone.`)) {
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    }
  }, []);

  const handleClearDemo = useCallback(() => {
    setExams((prev) => prev.filter((e) => !e.demo));
  }, []);

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: F.body, color: C.inkSoft }}>
        Loading your marks…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 78, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{FONT_IMPORT}</style>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        input:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.goldSoft}; }
        button:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
      `}</style>

      {view === "home" && (
        <HomeView
          exams={exams} settings={settings}
          onEdit={(e) => { setEditingExam(e); setView("add"); }}
          onDelete={handleDelete}
          onClearDemo={handleClearDemo}
          goAdd={() => { setEditingExam(null); setView("add"); }}
        />
      )}
      {view === "add" && (
        <AddExamView
          settings={settings} editing={editingExam}
          onSave={handleSaveExam}
          onCancel={() => { setEditingExam(null); setView("home"); }}
        />
      )}
      {view === "progress" && <ProgressView exams={exams} settings={settings} />}
      {view === "settings" && <SettingsView settings={settings} setSettings={setSettings} exams={exams} setExams={setExams} />}

      <BottomNav view={view === "add" ? "add" : view} setView={(v) => { setEditingExam(null); setView(v); }} />
    </div>
  );
}
