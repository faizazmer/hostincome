import { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, CalendarRange, BarChart3, FileText, Wallet, Settings as SettingsIcon,
  Activity, Clock, DollarSign, TrendingUp, CheckCircle2, Lock, Download,
  Printer, Share2, ChevronLeft, ChevronRight, Menu, X, Coins,
  Calendar, CircleDashed, ListChecks, Plus, Trash2, Tag,
  Building2, Store, Pencil, ReceiptText, Search, MapPin, Phone, Mail,
  Landmark, Upload, Image as ImageIcon, ShieldCheck, LogOut, LogIn, UserPlus, Users, Eye, Copy
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, AreaChart, Area, CartesianGrid, LineChart, Line
} from "recharts";

/* ============================================================
   HostIncome — SaaS untuk Freelance Live Host (Malaysia)
   Brand registry + Claim form (pilih brand + julat tarikh) → invoice.
   ============================================================ */

const PURPLE = "#6D28D9", PURPLE_LT = "#7C3AED", LAV = "#F5F3FF", INK = "#1E1B2E", SUB = "#6B7280";
const CARD_THEMES = {
  purple: { bg: "#FAF5FF", chip: "#EDE9FE", icon: "#7C3AED" }, blue: { bg: "#EFF6FF", chip: "#DBEAFE", icon: "#2563EB" },
  green: { bg: "#F0FDF4", chip: "#DCFCE7", icon: "#16A34A" }, orange: { bg: "#FFF7ED", chip: "#FFEDD5", icon: "#EA580C" },
  pink: { bg: "#FDF2F8", chip: "#FCE7F3", icon: "#DB2777" }, teal: { bg: "#F0FDFA", chip: "#CCFBF1", icon: "#0D9488" },
};
const PALETTE = ["#8B5CF6", "#F472B6", "#FBBF24", "#34D399", "#60A5FA", "#FB7185", "#A78BFA", "#F59E0B"];

const DAYS_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const DAYS_SHORT = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"];
const MONTHS_MS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
const MONTHS_FULL = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
function nowMYT() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })); }
function todayMYT() { const n = nowMYT(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
const TODAY = todayMYT(); // tarikh sebenar mengikut Waktu Malaysia
function sessionStartDate(s) { const d = parseISO(s.date); const [h, m] = s.start.split(":").map(Number); d.setHours(h, m, 0, 0); return d; }

function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function parseISO(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDate(s) { const d = parseISO(s); return `${d.getDate()} ${MONTHS_MS[d.getMonth()]} ${d.getFullYear()}`; }
function fmtDateShort(s) { const d = parseISO(s); return `${d.getDate()} ${MONTHS_MS[d.getMonth()]}`; }
function getMonday(d) { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() + ((day === 0 ? -6 : 1) - day)); return x; }
function fmtTime(hhmm) { let [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; let hr = h % 12 || 12; return `${hr}:${String(m).padStart(2, "0")} ${ap}`; }
function fmtTimeShort(hhmm) { let [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "p" : "a"; let hr = h % 12 || 12; return m ? `${hr}.${String(m).padStart(2, "0")}${ap}` : `${hr}${ap}`; }
function RM(n) { return `RM${Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function H(n) { return parseFloat((Math.round((Number(n) || 0) * 100) / 100).toFixed(2)); }
function pad(n) { return String(n).padStart(2, "0"); }
function durHours(s, e) { const a = s.split(":").map(Number), b = e.split(":").map(Number); return Math.max(0, (b[0] * 60 + b[1] - (a[0] * 60 + a[1])) / 60); }
function brandSlug(b) { return ((b || "SESI").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4)) || "SESI"; }
const isDone = (s) => s.status === "Selesai";
function cycleStart(dateStr, weekStart) { const d = parseISO(dateStr); const diff = (d.getDay() - weekStart + 7) % 7; return iso(addDays(d, -diff)); }
function rangeLabel(start, end) { return `${fmtDateShort(start)} – ${fmtDateShort(end)} ${parseISO(start).getFullYear()}`; }
function rateForDate(brand, dateStr) {
  const hist = (brand && brand.rates && brand.rates.length) ? brand.rates : [{ from: "2000-01-01", rate: (brand && brand.rate) || 0 }];
  const sorted = [...hist].sort((a, b) => a.from.localeCompare(b.from));
  let r = sorted[0].rate;
  for (const e of sorted) { if (e.from <= dateStr) r = e.rate; }
  return Number(r) || 0;
}
// Kira komisen ikut struktur brand. Pulangkan null jika 'manual' (user isi sendiri).
function computeCommission(brand, sales) {
  const c = brand && brand.commission; const s = Number(sales || 0);
  if (!c || c.type === "manual" || !c.type) return null;
  if (c.type === "percent") return s * (Number(c.percent) || 0) / 100;
  if (c.type === "kpi") { const th = Number(c.threshold) || 0; return s > th ? (s - th) * (Number(c.percent) || 0) / 100 : 0; }
  if (c.type === "tiered") {
    const tiers = [...(c.tiers || [])].map((t) => ({ min: Number(t.min) || 0, percent: Number(t.percent) || 0 })).sort((a, b) => a.min - b.min);
    let pct = 0; for (const t of tiers) { if (s >= t.min) pct = t.percent; }
    return s * pct / 100;
  }
  return null;
}
function commissionRuleLabel(c) {
  if (!c || c.type === "manual" || !c.type) return "Manual";
  if (c.type === "percent") return `${c.percent || 0}% × sales`;
  if (c.type === "kpi") return `baki > ${RM(c.threshold || 0)} × ${c.percent || 0}%`;
  if (c.type === "tiered") return `berperingkat`;
  return "";
}

/* ---------- SEED ---------- */
const SEED_BRANDS = [
  { id: "b1", name: "Glow Skincare Sdn Bhd", rate: 25, weekStart: 1, color: "#8B5CF6", phone: "+60 3-7890 1234", address: "No. 12, Jalan PJU 5/1, Kota Damansara, 47810 Petaling Jaya, Selangor", logo: "" },
  { id: "b2", name: "Aura Beauty Enterprise", rate: 25, weekStart: 1, color: "#F472B6", phone: "+60 3-5566 7788", address: "Lot 8, Jalan SS2/24, 47300 Petaling Jaya, Selangor", logo: "" },
  { id: "b3", name: "Luxe Cosmetic Sdn Bhd", rate: 25, weekStart: 3, color: "#FBBF24", phone: "+60 3-2201 9090", address: "Suite 22-3, Menara Luxe, Jalan Ampang, 50450 Kuala Lumpur", logo: "" },
  { id: "b4", name: "Bloom Care Resources", rate: 30, weekStart: 1, color: "#34D399", phone: "+60 6-7654 3210", address: "No. 5, Jalan Seremban 2, 70300 Seremban, Negeri Sembilan", logo: "" },
  { id: "b5", name: "Nova Skin Trading", rate: 28, weekStart: 3, color: "#60A5FA", phone: "+60 12-998 7766", address: "B-3-9, Plaza Nova, Cyberjaya, 63000 Selangor", logo: "" },
];
const WEEKDAY_TEMPLATE = {
  1: [[10, 3, 0, 0], [16, 2, 20, 1], [20, 3, 80, 2]],
  2: [[10, 3, 0, 0], [16, 2, 15, 1], [20, 2, 50, 2]],
  3: [[10, 3, 0, 0], [16, 2, 20, 1], [20, 3, 80, 2]],
  4: [[10, 2, 0, 0], [15, 3, 30, 1], [20, 3, 90, 2]],
  5: [[10, 3, 0, 0], [16, 2, 10, 1], [20, 2, 40, 2]],
  6: [[10, 3, 20, 0], [20, 3, 100, 2]],
  0: [[20, 2, 30, 2]],
};
function buildSeedSessions() {
  const out = []; let id = 1;
  for (let day = 1; day <= 24; day++) {
    const date = new Date(2026, 5, day); if (date > TODAY) continue;
    const ds = iso(date);
    (WEEKDAY_TEMPLATE[date.getDay()] || []).forEach(([startH, hours, commission, bi]) => {
      const b = SEED_BRANDS[bi];
      out.push({ id: id++, date: ds, brandId: b.id, brand: b.name, start: `${pad(startH)}:00`, end: `${pad(startH + hours)}:00`, hours, rate: b.rate, commission, sales: hours * 1800 + commission * 10, kpi: commission > 0, note: "", income: hours * b.rate + commission, status: "Selesai" });
    });
  }
  // live akan datang (Belum Live) untuk peringatan + countdown
  const planned = [
    ["2026-06-24", "b4", "21:00", "23:00"],
    ["2026-06-25", "b1", "10:00", "13:00"],
    ["2026-06-25", "b2", "16:00", "18:00"],
    ["2026-06-26", "b3", "20:00", "23:00"],
  ];
  planned.forEach(([date, bid, st, en]) => {
    const b = SEED_BRANDS.find((x) => x.id === bid); const hours = durHours(st, en);
    out.push({ id: id++, date, brandId: b.id, brand: b.name, start: st, end: en, hours, rate: b.rate, commission: 0, sales: 0, kpi: false, note: "", income: hours * b.rate, status: "Belum Live" });
  });
  return out;
}
// seed paid claims for completed cycles ending on/before cutoff
const SEED_PAID_CUTOFF = "2026-06-14";
function aggregateOf(list) {
  const hours = list.reduce((a, s) => a + s.hours, 0);
  const hourlyIncome = list.reduce((a, s) => a + s.hours * s.rate, 0);
  const commission = list.reduce((a, s) => a + s.commission, 0);
  return { sessions: list.length, hours, hourlyIncome, commission, total: hourlyIncome + commission };
}
function buildSeedClaims(sessions, brands) {
  const bById = Object.fromEntries(brands.map((b) => [b.id, b]));
  const groups = {};
  sessions.filter(isDone).forEach((s) => {
    const b = bById[s.brandId]; if (!b) return;
    const cs = cycleStart(s.date, b.weekStart), ce = iso(addDays(parseISO(cs), 6));
    if (ce > SEED_PAID_CUTOFF) return;
    const k = `${s.brandId}|${cs}`;
    (groups[k] ||= { brandId: s.brandId, brand: b.name, color: b.color, start: cs, end: ce, list: [] }).list.push(s);
  });
  return Object.values(groups).map((g, i) => {
    const agg = aggregateOf(g.list);
    return { id: "seed" + i, brandId: g.brandId, brand: g.brand, color: g.color, start: g.start, end: g.end, invoiceNo: `INV-${g.start.replace(/-/g, "")}-${brandSlug(g.brand)}`, sessionIds: g.list.map((s) => s.id), ...agg, paid: true, paidDate: iso(addDays(parseISO(g.end), 2)), ref: `TRX-${brandSlug(g.brand)}-${g.start.slice(5, 7)}${g.start.slice(8, 10)}` };
  });
}

/* ---------- DEMO DATA (relatif kepada hari ini, penuh untuk tunjuk client) ---------- */
function buildDemoData() {
  const monthFirst = iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const brands = [
    { id: "d1", name: "Glow Beauty Sdn Bhd", weekStart: 1, color: "#8B5CF6", phone: "+60 3-7788 1122", address: "No. 12, Jalan PJU 5/1, Kota Damansara, 47810 PJ, Selangor", logo: "", rates: [{ from: "2000-01-01", rate: 40 }, { from: monthFirst, rate: 45 }], rate: 45, commission: { type: "percent", percent: 10 } },
    { id: "d2", name: "Aura Cosmetics", weekStart: 1, color: "#F472B6", phone: "+60 3-5566 7788", address: "Lot 8, Jalan SS2/24, 47300 PJ, Selangor", logo: "", rates: [{ from: "2000-01-01", rate: 45 }], rate: 45, commission: { type: "kpi", threshold: 800, percent: 20 } },
    { id: "d3", name: "Luxe Skincare", weekStart: 3, color: "#FBBF24", phone: "+60 3-2201 9090", address: "Suite 22-3, Menara Luxe, Jalan Ampang, 50450 KL", logo: "", rates: [{ from: "2000-01-01", rate: 50 }], rate: 50, commission: { type: "tiered", tiers: [{ min: 1000, percent: 5 }, { min: 2000, percent: 7 }] } },
    { id: "d4", name: "Bloom Care", weekStart: 1, color: "#34D399", phone: "+60 6-7654 3210", address: "No. 5, Jalan Seremban 2, 70300 Seremban, N9", logo: "", rates: [{ from: "2000-01-01", rate: 35 }], rate: 35, commission: { type: "manual" } },
  ];
  const slots = []; let id = 1;
  const tmpl = [[10, 2, 0, 1100], [14, 2, 1, 950], [20, 3, 2, 1900], [16, 2, 3, 600]];
  for (let off = 28; off >= 1; off--) {
    const d = addDays(TODAY, -off); if (d.getDay() === 0) continue;
    const ds = iso(d); const n = off % 3 === 0 ? 3 : off % 2 === 0 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const [sh, hrs, bi, sb] = tmpl[k % tmpl.length]; const b = brands[bi];
      const sales = sb + ((off * 37) % 700); const rate = rateForDate(b, ds);
      const comm = computeCommission(b, sales); const commission = comm != null ? Math.round(comm) : Math.round(sales * 0.05);
      slots.push({ id: "s" + (id++), date: ds, brandId: b.id, brand: b.name, start: pad(sh) + ":00", end: pad(sh + hrs) + ":00", hours: hrs, rate, commission, sales, kpi: sales > 800, note: "", income: hrs * rate + commission, status: "Selesai" });
    }
  }
  [[1, 10, 2, 0], [1, 20, 3, 2], [2, 14, 2, 1], [3, 20, 3, 2]].forEach(([off, sh, hrs, bi], i) => {
    const d = addDays(TODAY, off); const ds = iso(d); const b = brands[bi]; const rate = rateForDate(b, ds);
    slots.push({ id: "sp" + i, date: ds, brandId: b.id, brand: b.name, start: pad(sh) + ":00", end: pad(sh + hrs) + ":00", hours: hrs, rate, commission: 0, sales: 0, kpi: false, note: "", income: hrs * rate, status: "Belum Live" });
  });
  const claims = buildDemoClaims(slots, brands);
  const settings = { ...DEFAULT_SETTINGS, hostName: "Nur Aisyah" };
  return { brands, sessions: slots, claims, settings };
}
function buildDemoClaims(sessions, brands) {
  const bById = Object.fromEntries(brands.map((b) => [b.id, b]));
  const groups = {}; const todayStr = iso(TODAY);
  sessions.filter(isDone).forEach((s) => {
    const b = bById[s.brandId]; if (!b) return;
    const cs = cycleStart(s.date, b.weekStart), ce = iso(addDays(parseISO(cs), 6));
    if (ce >= todayStr) return; // biar kitaran semasa belum dibil (untuk demo Claim)
    const k = s.brandId + "|" + cs;
    (groups[k] ||= { brandId: s.brandId, brand: b.name, color: b.color, start: cs, end: ce, list: [] }).list.push(s);
  });
  const paidCutoff = iso(addDays(TODAY, -10));
  return Object.values(groups).map((g, i) => {
    const agg = aggregateOf(g.list); const paid = g.end < paidCutoff;
    return { id: "dc" + i, brandId: g.brandId, brand: g.brand, color: g.color, start: g.start, end: g.end, invoiceNo: `INV-${g.start.replace(/-/g, "")}-${brandSlug(g.brand)}`, sessionIds: g.list.map((s) => s.id), ...agg, paid, paidDate: paid ? iso(addDays(parseISO(g.end), 2)) : null, ref: paid ? `TRX-${brandSlug(g.brand)}-${g.start.slice(5, 7)}${g.start.slice(8, 10)}` : null };
  });
}

/* ---------- PRIMITIVES ---------- */
function Pill({ tone, children }) {
  const map = { green: { bg: "#DCFCE7", fg: "#15803D" }, amber: { bg: "#FEF3C7", fg: "#B45309" }, gray: { bg: "#F1F5F9", fg: "#64748B" }, purple: { bg: "#EDE9FE", fg: "#6D28D9" }, red: { bg: "#FEE2E2", fg: "#DC2626" }, blue: { bg: "#DBEAFE", fg: "#1D4ED8" } };
  const c = map[tone] || map.gray;
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: c.bg, color: c.fg }}>{children}</span>;
}
function StatCard({ theme, label, value, sub, Icon }) {
  const t = CARD_THEMES[theme];
  return (
    <div className="rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ background: t.bg, borderColor: "rgba(0,0,0,0.04)", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
      <div className="flex items-start justify-between"><p className="text-sm font-medium" style={{ color: SUB }}>{label}</p><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: t.chip }}><Icon size={18} style={{ color: t.icon }} /></span></div>
      <p className="mt-3 text-2xl font-bold tracking-tight" style={{ color: INK }}>{value}</p>{sub && <p className="mt-1.5 text-xs font-medium" style={{ color: SUB }}>{sub}</p>}
    </div>
  );
}
function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 ${className}`} style={{ borderColor: "#EEF0F4", boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}>
      {(title || action) && (<div className="mb-5 flex items-center justify-between gap-2">{title && <h3 className="text-base font-bold tracking-tight" style={{ color: INK }}>{title}</h3>}{action}</div>)}
      {children}
    </section>
  );
}
function Dot({ color, size = 10 }) { return <span className="shrink-0 rounded-full" style={{ background: color, width: size, height: size }} />; }
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold" style={{ color: "#52525B" }}>{label}</span>{children}</label>; }
function Input({ value, onChange, type = "text", placeholder }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition-all" style={{ borderColor: "#E6E6EE" }}
    onFocus={(e) => { e.target.style.borderColor = PURPLE; e.target.style.boxShadow = `0 0 0 3px ${LAV}`; }} onBlur={(e) => { e.target.style.borderColor = "#E6E6EE"; e.target.style.boxShadow = "none"; }} />;
}
function Select({ value, onChange, children }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none" style={{ borderColor: "#E6E6EE" }}>{children}</select>; }
function Modal({ children, onClose, wide, xl }) {
  const w = xl ? "sm:max-w-3xl" : wide ? "sm:max-w-2xl" : "sm:max-w-md";
  return (
    <div className="hi-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="hi-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`hi-card relative w-full ${w} max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl`} style={{ animation: "pop .18s ease-out" }}>{children}</div>
    </div>
  );
}
function ImageUpload({ value, onChange, label = "Muat Naik Imej", round, size = 72, fallback, bg = "#7C3AED" }) {
  const ref = useRef(null);
  function handle(e) {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    if (file.size > 2_500_000) { onChange(value); alert("Saiz imej terlalu besar (maks ~2.5MB)."); return; }
    const r = new FileReader(); r.onload = () => onChange(r.result); r.readAsDataURL(file);
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center overflow-hidden border" style={{ width: size, height: size, borderRadius: round ? "9999px" : 14, borderColor: "#EEE", background: value ? "#fff" : bg }}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-white">{fallback || <ImageIcon size={22} />}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <input type="file" accept="image/*" hidden ref={ref} onChange={handle} />
        <button onClick={() => ref.current && ref.current.click()} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "#EEF0F4", color: PURPLE }}><Upload size={13} /> {label}</button>
        {value && <button onClick={() => onChange("")} className="text-left text-[11px] font-semibold" style={{ color: "#DC2626" }}>Buang imej</button>}
      </div>
    </div>
  );
}
function LogoBox({ src, name, color, size = 44, round }) {
  return (
    <div className="flex items-center justify-center overflow-hidden" style={{ width: size, height: size, borderRadius: round ? "9999px" : 12, background: src ? "#fff" : color, border: src ? "1px solid #EEE" : "none" }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="font-bold text-white" style={{ fontSize: size * 0.34 }}>{(name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

/* ============================================================ AUTH + ADMIN UI */
function FullLoader({ text }) {
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }} className="flex flex-col items-center justify-center gap-3">
      <span className="h-9 w-9 animate-spin rounded-full border-4" style={{ borderColor: "#EDE9FE", borderTopColor: PURPLE }} />
      <p className="text-sm font-bold" style={{ color: PURPLE }}>{text}</p>
    </div>
  );
}
function prettyAuthErr(e) {
  const c = (e && e.code) || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Email atau kata laluan salah.";
  if (c.includes("email-already-in-use")) return "Email sudah didaftarkan.";
  if (c.includes("weak-password")) return "Kata laluan terlalu pendek (min 6 aksara).";
  if (c.includes("invalid-email")) return "Format email tidak sah.";
  if (c.includes("network")) return "Masalah rangkaian. Cuba lagi.";
  return "Ralat: " + ((e && e.message) || c || "cuba lagi");
}
function AuthScreen({ onLogin, onRegister, onDemo }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit() {
    setErr(""); setBusy(true);
    try {
      if (mode === "login") await onLogin(email.trim(), pw);
      else await onRegister(email.trim(), pw, name.trim());
    } catch (e) { setErr(prettyAuthErr(e)); setBusy(false); }
  }
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: INK }} className="flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-7 shadow-xl" style={{ borderColor: "#EEF0F4" }}>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><Activity size={20} className="text-white" /></span>
          <span className="text-xl font-extrabold tracking-tight">Host<span style={{ color: PURPLE }}>Income</span></span>
        </div>
        <h1 className="text-lg font-bold">{mode === "login" ? "Log Masuk" : "Daftar Akaun"}</h1>
        <p className="mb-5 text-xs" style={{ color: SUB }}>{mode === "login" ? "Masuk untuk akses tracker anda." : "Cipta akaun host baru."}</p>
        <div className="flex flex-col gap-3">
          {mode === "register" && <Field label="Nama"><Input value={name} onChange={setName} placeholder="Nama anda" /></Field>}
          <Field label="Email"><Input value={email} onChange={setEmail} placeholder="nama@email.com" /></Field>
          <Field label="Kata Laluan"><Input type="password" value={pw} onChange={setPw} placeholder="Minimum 6 aksara" /></Field>
          {err && <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{err}</p>}
          <button disabled={busy} onClick={submit} className="mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all" style={{ background: busy ? "#CBD5E1" : "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: busy ? "none" : "0 8px 18px rgba(109,40,217,0.28)" }}>
            {busy ? "Sebentar…" : (mode === "login" ? <><LogIn size={16} /> Log Masuk</> : <><UserPlus size={16} /> Daftar</>)}
          </button>
        </div>
        <p className="mt-5 text-center text-xs" style={{ color: SUB }}>
          {mode === "login" ? "Belum ada akaun? " : "Dah ada akaun? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }} className="font-bold" style={{ color: PURPLE }}>{mode === "login" ? "Daftar di sini" : "Log Masuk"}</button>
        </p>
        {onDemo && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: "#F1F0F6" }}>
            <button onClick={onDemo} className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-colors" style={{ borderColor: "#E4E0F5", color: PURPLE, background: LAV }}><Eye size={16} /> Lihat Demo (Data Penuh)</button>
            <p className="mt-1.5 text-center text-[11px]" style={{ color: SUB }}>Tiada login diperlukan · sesuai untuk tunjuk client</p>
          </div>
        )}
      </div>
    </div>
  );
}
function SuspendedScreen({ onLogout, email }) {
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: INK }} className="flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-7 text-center shadow-xl" style={{ borderColor: "#EEF0F4" }}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#FEE2E2" }}><Lock size={22} style={{ color: "#DC2626" }} /></span>
        <h1 className="mt-4 text-lg font-bold">Akaun Digantung</h1>
        <p className="mt-1 text-sm" style={{ color: SUB }}>Akaun <b>{email}</b> telah digantung oleh admin. Sila hubungi admin untuk pengaktifan semula.</p>
        <button onClick={onLogout} className="mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4", color: PURPLE }}><LogOut size={15} /> Log Keluar</button>
      </div>
    </div>
  );
}
function VerifyEmailScreen({ email, onResend, onReload, onLogout }) {
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: INK }} className="flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-7 text-center shadow-xl" style={{ borderColor: "#EEF0F4" }}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: LAV }}><Mail size={22} style={{ color: PURPLE }} /></span>
        <h1 className="mt-4 text-lg font-bold">Sahkan Email Anda</h1>
        <p className="mt-1 text-sm" style={{ color: SUB }}>Kami hantar pautan pengesahan ke <b>{email}</b>. Klik pautan itu, kemudian tekan butang di bawah.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={onReload} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><CheckCircle2 size={15} /> Saya Dah Sahkan</button>
          <button onClick={onResend} className="rounded-xl border py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4", color: PURPLE }}>Hantar Semula Email</button>
          <button onClick={onLogout} className="text-xs font-semibold" style={{ color: SUB }}>Log Keluar</button>
        </div>
      </div>
    </div>
  );
}
function PendingScreen({ email, onLogout }) {
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: INK }} className="flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-7 text-center shadow-xl" style={{ borderColor: "#EEF0F4" }}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#FEF3C7" }}><Lock size={22} style={{ color: "#B45309" }} /></span>
        <h1 className="mt-4 text-lg font-bold">Menunggu Kelulusan</h1>
        <p className="mt-1 text-sm" style={{ color: SUB }}>Akaun <b>{email}</b> sedang menunggu kelulusan admin. Halaman ini akan terbuka automatik sebaik diluluskan.</p>
        <button onClick={onLogout} className="mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4", color: PURPLE }}><LogOut size={15} /> Log Keluar</button>
      </div>
    </div>
  );
}
function Tutorial({ onDone, setPage }) {
  const steps = [
    { icon: Activity, title: "Selamat datang ke HostIncome 👋", body: "Aplikasi untuk rekod sesi live, kira pendapatan & komisen, dan jana invois untuk setiap brand. Jom lihat 4 langkah asas." },
    { icon: Store, title: "1. Daftar Brand", body: "Pergi ke halaman Brand. Daftar company dengan rate per jam (boleh ikut tarikh) dan struktur komisen (peratus / selepas KPI / berperingkat / manual)." },
    { icon: CalendarRange, title: "2. Isi Jadual", body: "Di halaman Jadual, klik hari untuk tambah slot live. Isi masa, sales & komisen. Tandakan Selesai bila dah siap buat live. Boleh salin slot ke hari lain." },
    { icon: ReceiptText, title: "3. Buat Claim", body: "Di halaman Claim, pilih brand + julat tarikh. Sistem auto-kira jumlah (slot Selesai sahaja) dan jana invois rasmi." },
    { icon: FileText, title: "4. Invois & Bayaran", body: "Di halaman Invoice, buka invois, muat turun PDF atau hantar WhatsApp, dan tandakan bila dah dibayar. Siap!" },
  ];
  const [i, setI] = useState(0);
  const S = steps[i]; const Icon = S.icon; const last = i === steps.length - 1;
  return (
    <Modal onClose={onDone}>
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: LAV }}><Icon size={26} style={{ color: PURPLE }} /></span>
        <h3 className="mt-4 text-lg font-bold">{S.title}</h3>
        <p className="mt-2 text-sm" style={{ color: "#475569" }}>{S.body}</p>
      </div>
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {steps.map((_, idx) => <span key={idx} className="h-1.5 rounded-full transition-all" style={{ width: idx === i ? 20 : 6, background: idx === i ? PURPLE : "#E4E0F5" }} />)}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <button onClick={onDone} className="text-sm font-semibold" style={{ color: SUB }}>Langkau</button>
        <div className="flex gap-2">
          {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4", color: SUB }}>Kembali</button>}
          {!last ? (
            <button onClick={() => setI(i + 1)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}>Seterusnya</button>
          ) : (
            <button onClick={() => { onDone(); setPage("brand"); }} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><CheckCircle2 size={15} /> Mula Guna</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
function AdminPage({ ctx }) {
  const { users, authUser, setUserRole, setUserStatus, deleteUserRecord } = ctx;
  const [q, setQ] = useState("");
  const list = users.filter((u) => `${u.name || ""} ${u.email || ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const admins = users.filter((u) => u.role === "admin").length;
  const active = users.filter((u) => u.status === "active").length;
  const pending = users.filter((u) => u.status === "pending").length;
  return (
    <>
      <PageHead title="Admin Panel" subtitle="Urus pengguna, role & status akaun." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard theme="purple" Icon={Users} label="Jumlah User" value={`${users.length}`} sub="berdaftar" />
        <StatCard theme="orange" Icon={CircleDashed} label="Menunggu" value={`${pending}`} sub="perlu lulus" />
        <StatCard theme="green" Icon={CheckCircle2} label="Aktif" value={`${active}`} sub="boleh akses" />
        <StatCard theme="pink" Icon={ShieldCheck} label="Admin" value={`${admins}`} sub="pentadbir" />
      </div>
      <Panel className="mt-6" title="Senarai Pengguna"
        action={<div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "#EEF0F4" }}><Search size={14} style={{ color: SUB }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / email…" className="w-44 text-sm outline-none" /></div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: SUB }}><th className="pb-3 font-semibold">User</th><th className="pb-3 font-semibold">Role</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Daftar</th><th className="pb-3"></th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="py-6 text-center" style={{ color: SUB }}>Tiada pengguna.</td></tr>}
              {list.map((u) => {
                const me = u.uid === authUser?.uid;
                return (
                  <tr key={u.uid} className="border-t" style={{ borderColor: "#F1F0F6" }}>
                    <td className="py-3"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#C084FC,#7C3AED)" }}>{(u.name || u.email || "?").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold">{u.name}{me && <span className="ml-1 text-[10px]" style={{ color: PURPLE }}>(anda)</span>}</p><p className="truncate text-xs" style={{ color: SUB }}>{u.email}</p></div></div></td>
                    <td className="py-3"><select value={u.role} disabled={me} onChange={(e) => setUserRole(u.uid, e.target.value)} className="rounded-lg border px-2 py-1 text-xs font-semibold outline-none" style={{ borderColor: "#EEF0F4", opacity: me ? 0.5 : 1 }}><option value="host">Host</option><option value="admin">Admin</option></select></td>
                    <td className="py-3"><Pill tone={u.status === "active" ? "green" : u.status === "pending" ? "amber" : "red"}>{u.status === "active" ? "Aktif" : u.status === "pending" ? "Menunggu" : "Digantung"}</Pill></td>
                    <td className="py-3 text-xs" style={{ color: SUB }}>{u.createdAt || "-"}</td>
                    <td className="py-3 text-right">
                      {!me && (
                        <div className="flex justify-end gap-1.5">
                          {u.status === "pending" && <button onClick={() => setUserStatus(u.uid, "active")} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-white" style={{ background: "#16A34A" }}>Luluskan</button>}
                          {u.status === "active" && <button onClick={() => setUserStatus(u.uid, "suspended")} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold" style={{ borderColor: "#FECACA", color: "#DC2626" }}>Gantung</button>}
                          {u.status === "suspended" && <button onClick={() => setUserStatus(u.uid, "active")} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold" style={{ borderColor: "#BBF7D0", color: "#15803D" }}>Aktifkan</button>}
                          <button onClick={() => { if (confirm("Padam rekod & data user ini? (Akaun login kekal — perlu Admin SDK untuk padam penuh)")) deleteUserRecord(u.uid); }} className="rounded-lg border px-2 py-1.5" style={{ borderColor: "#EEF0F4" }}><Trash2 size={13} style={{ color: "#DC2626" }} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs" style={{ color: SUB }}>Nota: "Gantung" menghalang akses serta-merta. Memadam akaun log masuk sepenuhnya perlu Firebase Admin SDK (server) — butang padam di sini hanya buang rekod & data RTDB.</p>
      </Panel>
    </>
  );
}

/* ============================================================ FIREBASE (opt-in)
   Isi config di bawah untuk realtime sync (multi-peranti). Biar kosong = mod demo.
   Cara dapat: Firebase Console > Project Settings > SDK setup & config.
   Wajib enable "Realtime Database" & letak databaseURL.
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAumnbT9iC58ZQ1liMH2sz7BKez0n8OIz0",
  authDomain: "hostincome-60c92.firebaseapp.com",
  databaseURL: "https://hostincome-60c92-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hostincome-60c92",
  storageBucket: "hostincome-60c92.firebasestorage.app",
  messagingSenderId: "262657817298",
  appId: "1:262657817298:web:109281f66128c309e08b0b",
  measurementId: "G-690D7TB1K6",
};
const USE_FB = !!FIREBASE_CONFIG.databaseURL;
const FB_ROOT = "hostincome";
// Email yang auto jadi admin. Pengguna PERTAMA yang daftar juga auto-admin.
const ADMIN_EMAILS = [];

const DEFAULT_SETTINGS = {
  hostName: "Nur Aisyah",
  phone: "+60 12-345 6789",
  email: "nuraisyah.live@gmail.com",
  address: "No. 27, Jalan Melati 3, Taman Seremban Jaya, 70450 Seremban, Negeri Sembilan",
  bankName: "Maybank",
  bankAccount: "5123 4567 8901",
  photo: "",
  maxSlots: 4, commissionType: "Manual", currency: "RM",
};
const toArr = (obj) => (obj ? Object.values(obj) : []);

/* ============================================================ MAIN APP */
export default function HostIncome() {
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brands, setBrands] = useState(() => (USE_FB ? [] : SEED_BRANDS.map((b) => ({ ...b }))));
  const [sessions, setSessions] = useState(() => (USE_FB ? [] : buildSeedSessions()));
  const [claims, setClaims] = useState(() => (USE_FB ? [] : buildSeedClaims(buildSeedSessions(), SEED_BRANDS)));
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [cloud, setCloud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(!USE_FB);
  const [authUser, setAuthUser] = useState(null);   // { uid, email, name }
  const [profile, setProfile] = useState(null);      // { name, email, role, status, createdAt }
  const [users, setUsers] = useState([]);            // admin: semua pengguna
  const [demo, setDemo] = useState(false);
  const fb = useRef(null);
  const [toast, setToast] = useState(null);
  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }
  const isAdmin = profile?.role === "admin";

  // --- Init Firebase + Auth listener ---
  useEffect(() => {
    if (!USE_FB) return;
    let offAuth = null;
    (async () => {
      try {
        const appMod = await import("firebase/app");
        const dbMod = await import("firebase/database");
        const authMod = await import("firebase/auth");
        const { initializeApp } = appMod;
        const { getDatabase, ref, onValue, set, update, remove, get } = dbMod;
        const { getAuth, onAuthStateChanged } = authMod;
        const app = initializeApp(FIREBASE_CONFIG);
        const database = getDatabase(app);
        const auth = getAuth(app);
        fb.current = {
          authMod, auth, database, ref, onValue, set, update, remove, get,
          dataPath: (uid, p) => ref(database, `${FB_ROOT}/data/${uid}/${p}`),
          usersPath: (p) => ref(database, `${FB_ROOT}/users${p ? "/" + p : ""}`),
        };
        offAuth = onAuthStateChanged(auth, (u) => {
          setAuthUser(u ? { uid: u.uid, email: u.email, name: u.displayName, emailVerified: u.emailVerified } : null);
          setAuthReady(true);
        });
      } catch (e) {
        console.error("Firebase init error:", e);
        flash("Gagal init Firebase — semak config.");
        setAuthReady(true);
      }
    })();
    return () => { if (offAuth) offAuth(); };
  }, []);

  async function ensureUser(uid, email, name) {
    const { get, set, usersPath } = fb.current;
    const uref = usersPath(uid);
    const snap = await get(uref);
    if (snap.exists()) return snap.val();
    const allSnap = await get(usersPath());
    const usersEmpty = !allSnap.exists();
    const isAdminEmail = usersEmpty || ADMIN_EMAILS.map((e) => e.toLowerCase()).includes((email || "").toLowerCase());
    const role = isAdminEmail ? "admin" : "host";
    const status = isAdminEmail ? "active" : "pending"; // user baru perlu kelulusan admin
    const rec = { name: name || (email || "User").split("@")[0], email, role, status, createdAt: iso(new Date()) };
    await set(uref, rec);
    return rec;
  }

  // --- Load/subscribe profile bila login ---
  useEffect(() => {
    if (!USE_FB || !authUser || !fb.current) { setProfile(null); return; }
    let off = null;
    (async () => {
      try {
        await ensureUser(authUser.uid, authUser.email, authUser.name);
        off = fb.current.onValue(fb.current.usersPath(authUser.uid), (s) => setProfile(s.val()));
      } catch (e) { console.error(e); flash("Gagal muat profil."); }
    })();
    return () => { if (off) off(); };
  }, [authUser]);

  // --- Subscribe data (skop per-uid) bila profil aktif ---
  useEffect(() => {
    if (!USE_FB || !authUser || !profile || profile.status !== "active" || !fb.current) return;
    const { get, set, onValue, dataPath } = fb.current;
    const uid = authUser.uid;
    const p = (x) => dataPath(uid, x);
    let offs = []; setLoading(true);
    (async () => {
      // user baru = data kosong (tiada seed). Hanya set tetapan asas (nama) jika belum ada.
      const sset = await get(p("settings"));
      if (!sset.exists()) await set(p("settings"), { ...DEFAULT_SETTINGS, hostName: profile.name || DEFAULT_SETTINGS.hostName, photo: "", phone: "", email: profile.email || "", address: "", bankAccount: "" });
      offs.push(onValue(p("brands"), (s) => setBrands(toArr(s.val()))));
      offs.push(onValue(p("sessions"), (s) => setSessions(toArr(s.val()))));
      offs.push(onValue(p("claims"), (s) => setClaims(toArr(s.val()).map((c) => ({ ...c, sessionIds: c.sessionIds || [] })))));
      offs.push(onValue(p("settings"), (s) => { const v = s.val(); if (v) setSettings(v); }));
      fb.current.path = (x) => dataPath(uid, x);
      setCloud(true); setLoading(false);
    })();
    return () => offs.forEach((o) => o && o());
  }, [authUser, profile?.status]);

  // --- Admin: subscribe semua pengguna ---
  useEffect(() => {
    if (!USE_FB || !isAdmin || !fb.current) { setUsers([]); return; }
    const off = fb.current.onValue(fb.current.usersPath(), (s) => {
      const v = s.val() || {};
      setUsers(Object.entries(v).map(([uid, u]) => ({ uid, ...u })));
    });
    return () => off && off();
  }, [isAdmin]);

  // --- Auth actions ---
  async function login(email, password) {
    const { signInWithEmailAndPassword } = fb.current.authMod;
    await signInWithEmailAndPassword(fb.current.auth, email, password);
  }
  async function register(email, password, name) {
    const { createUserWithEmailAndPassword, updateProfile } = fb.current.authMod;
    const cred = await createUserWithEmailAndPassword(fb.current.auth, email, password);
    if (name) { try { await updateProfile(cred.user, { displayName: name }); } catch (e) {} }
    await ensureUser(cred.user.uid, email, name);
    try { const { sendEmailVerification } = fb.current.authMod; await sendEmailVerification(cred.user); } catch (e) {}
  }
  async function resendVerification() {
    const { sendEmailVerification } = fb.current.authMod;
    if (fb.current.auth.currentUser) await sendEmailVerification(fb.current.auth.currentUser);
    flash("Email pengesahan dihantar semula.");
  }
  async function reloadUser() {
    const u = fb.current.auth.currentUser;
    if (u) { await u.reload(); const c = fb.current.auth.currentUser; setAuthUser({ uid: c.uid, email: c.email, name: c.displayName, emailVerified: c.emailVerified }); }
  }
  async function logout() {
    try { const { signOut } = fb.current.authMod; await signOut(fb.current.auth); } catch (e) {}
    setProfile(null); setCloud(false); setBrands([]); setSessions([]); setClaims([]); setPage("dashboard");
  }
  // --- Admin actions ---
  function setUserRole(uid, role) { fb.current.update(fb.current.usersPath(uid), { role }); flash("Role dikemaskini."); }
  function setUserStatus(uid, status) { fb.current.update(fb.current.usersPath(uid), { status }); flash(status === "active" ? "Akaun diaktifkan." : "Akaun digantung."); }
  function deleteUserRecord(uid) { fb.current.remove(fb.current.usersPath(uid)); fb.current.remove(fb.current.ref(fb.current.database, `${FB_ROOT}/data/${uid}`)); flash("Rekod & data dipadam."); }

  const data = useMemo(() => deriveAll(sessions, brands, claims), [sessions, brands, claims]);

  function upsertSession(s) {
    if (cloud && fb.current) {
      const id = s.id ?? ("s" + Date.now() + Math.floor(Math.random() * 100000));
      fb.current.set(fb.current.path(`sessions/${id}`), { ...s, id });
      return;
    }
    setSessions((prev) => {
      const id = s.id ?? (Math.max(0, ...prev.map((p) => (typeof p.id === "number" ? p.id : 0))) + 1);
      const ns = { ...s, id }; const idx = prev.findIndex((p) => p.id === id);
      if (idx >= 0) { const list = [...prev]; list[idx] = ns; return list; }
      return [ns, ...prev];
    });
  }
  function deleteSession(id) {
    if (cloud && fb.current) {
      fb.current.remove(fb.current.path(`sessions/${id}`));
      claims.forEach((c) => { if ((c.sessionIds || []).includes(id)) fb.current.update(fb.current.path(`claims/${c.id}`), { sessionIds: c.sessionIds.filter((x) => x !== id) }); });
      flash("Slot dipadam."); return;
    }
    setSessions((prev) => prev.filter((p) => p.id !== id));
    setClaims((prev) => prev.map((c) => ({ ...c, sessionIds: c.sessionIds.filter((x) => x !== id) })));
    flash("Slot dipadam.");
  }
  function addBrand(b) {
    const id = "b" + (Date.now() % 1000000);
    const nb = { ...b, id, color: PALETTE[brands.length % PALETTE.length] };
    if (cloud && fb.current) { fb.current.set(fb.current.path(`brands/${id}`), nb); flash("Brand didaftarkan."); return; }
    setBrands((prev) => [...prev, nb]); flash("Brand didaftarkan.");
  }
  function updateBrand(b) {
    if (cloud && fb.current) { fb.current.update(fb.current.path(`brands/${b.id}`), b); flash("Brand dikemaskini."); return; }
    setBrands((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...b } : x))); flash("Brand dikemaskini.");
  }
  function deleteBrand(id) {
    if (sessions.some((s) => s.brandId === id)) { flash("Tak boleh padam — brand ini ada slot direkodkan."); return; }
    if (cloud && fb.current) { fb.current.remove(fb.current.path(`brands/${id}`)); flash("Brand dipadam."); return; }
    setBrands((prev) => prev.filter((x) => x.id !== id)); flash("Brand dipadam.");
  }

  function createClaim(brandId, start, end) {
    const b = brands.find((x) => x.id === brandId); if (!b) { flash("Sila pilih brand."); return false; }
    if (start > end) { flash("Tarikh akhir mesti selepas tarikh mula."); return false; }
    const claimed = new Set(claims.flatMap((c) => c.sessionIds || []));
    const q = sessions.filter((s) => isDone(s) && s.brandId === brandId && s.date >= start && s.date <= end && !claimed.has(s.id));
    if (q.length === 0) { flash("Tiada slot 'Selesai' belum dibil dalam julat ini."); return false; }
    const agg = aggregateOf(q);
    const id = "c" + Date.now();
    const claim = { id, brandId, brand: b.name, color: b.color, start, end, invoiceNo: `INV-${start.replace(/-/g, "")}-${brandSlug(b.name)}`, sessionIds: q.map((s) => s.id), ...agg, paid: false, paidDate: null, ref: null };
    if (cloud && fb.current) { fb.current.set(fb.current.path(`claims/${id}`), claim); flash(`Invoice ${b.name} dijana (${RM(agg.total)}).`); return true; }
    setClaims((prev) => [claim, ...prev]); flash(`Invoice ${b.name} dijana (${RM(agg.total)}).`); return true;
  }
  function markClaimPaid(id, ref) {
    const patch = { paid: true, paidDate: iso(TODAY), ref: ref || null };
    if (cloud && fb.current) { fb.current.update(fb.current.path(`claims/${id}`), patch); flash("Bayaran direkodkan."); return; }
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))); flash("Bayaran direkodkan.");
  }
  function reopenClaim(id) {
    const c = claims.find((x) => x.id === id); if (!c) return;
    if (c.paid && !isAdmin) { flash("Hanya admin boleh buka semula invois yang sudah dibayar."); return; }
    if (cloud && fb.current) { fb.current.remove(fb.current.path(`claims/${id}`)); }
    else { setClaims((prev) => prev.filter((x) => x.id !== id)); }
    flash("Invois dibuka semula. Slot kini boleh diedit di Jadual.");
  }
  function saveSettings(s) {
    if (cloud && fb.current) fb.current.set(fb.current.path("settings"), s);
    setSettings(s); flash("Tetapan disimpan.");
  }
  function enterDemo() {
    const d = buildDemoData();
    setBrands(d.brands); setSessions(d.sessions); setClaims(d.claims); setSettings(d.settings);
    setCloud(false); setDemo(true); setPage("dashboard");
  }
  function exitDemo() {
    setDemo(false); setBrands([]); setSessions([]); setClaims([]); setSettings({ ...DEFAULT_SETTINGS }); setPage("dashboard");
  }
  function markTutorialSeen() {
    if (cloud && fb.current) fb.current.update(fb.current.path("settings"), { tutorialSeen: true });
    setSettings((s) => ({ ...s, tutorialSeen: true }));
  }

  const NAV = [
    { id: "dashboard", label: "Dashboard", Icon: Home },
    { id: "jadual", label: "Jadual Mingguan", Icon: CalendarRange },
    { id: "claim", label: "Claim / Bil", Icon: ReceiptText },
    { id: "brand", label: "Brand", Icon: Store },
    { id: "bulanan", label: "Analitik", Icon: BarChart3 },
    { id: "invoice", label: "Invoice", Icon: FileText },
    { id: "pembayaran", label: "Pembayaran", Icon: Wallet },
    { id: "tetapan", label: "Tetapan", Icon: SettingsIcon },
    ...(isAdmin ? [{ id: "admin", label: "Admin", Icon: ShieldCheck }] : []),
  ];
  const ctx = { brands, sessions, claims, data, settings, setSettings, saveSettings, cloud, upsertSession, deleteSession, addBrand, updateBrand, deleteBrand, createClaim, markClaimPaid, reopenClaim, setPage, flash, isAdmin, authUser, profile, users, markTutorialSeen, demo, exitDemo, login, register, logout, setUserRole, setUserStatus, deleteUserRecord, resendVerification, reloadUser };

  if (USE_FB && !demo) {
    if (!authReady) return <FullLoader text="Memuatkan…" />;
    if (!authUser) return <AuthScreen onLogin={login} onRegister={register} onDemo={enterDemo} />;
    if (authUser && !profile) return <FullLoader text="Menyediakan akaun…" />;
    if (authUser && !authUser.emailVerified && !isAdmin) return <VerifyEmailScreen email={authUser.email} onResend={resendVerification} onReload={reloadUser} onLogout={logout} />;
    if (profile && profile.status === "suspended") return <SuspendedScreen onLogout={logout} email={authUser.email} />;
    if (profile && profile.status === "pending") return <PendingScreen onLogout={logout} email={authUser.email} />;
    if (loading) return <FullLoader text="Menyambung ke data…" />;
  }

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: INK }}>
      <style>{`
        @media print {
          html, body { background:#fff !important; }
          .no-print, .hi-backdrop { display:none !important; }
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          .hi-overlay { position: static !important; display: block !important; }
          .hi-card { position: static !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; border: none !important; box-shadow: none !important; background: #fff !important; }
        }
        @keyframes pop { from { transform: translateY(8px) scale(.98); opacity:0 } to { transform:none; opacity:1 } }
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#E2E0EC;border-radius:8px}
        input,select,button{font-family:inherit}
      `}</style>

      {demo && (
        <div className="no-print flex items-center justify-between px-4 py-2 text-xs font-bold text-white" style={{ background: "linear-gradient(90deg,#F59E0B,#EA580C)" }}>
          <span className="flex items-center gap-1.5"><Eye size={14} /> MOD DEMO — data contoh sahaja, tidak disimpan.</span>
          <button onClick={exitDemo} className="rounded-lg bg-white/25 px-2.5 py-1 font-bold">Log Masuk / Keluar Demo</button>
        </div>
      )}
      <div className="no-print sticky top-0 z-40 flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur lg:hidden" style={{ borderColor: "#EEF0F4" }}>
        <Brand /><button onClick={() => setMobileOpen(true)} className="rounded-xl border p-2" style={{ borderColor: "#EEF0F4" }}><Menu size={20} style={{ color: PURPLE }} /></button>
      </div>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r bg-white px-4 py-6 lg:flex" style={{ borderColor: "#EEF0F4" }}>
          <Sidebar NAV={NAV} page={page} setPage={setPage} settings={settings} data={data} ctx={ctx} />
        </aside>
        {mobileOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[280px] overflow-y-auto bg-white px-4 py-6">
              <div className="mb-2 flex justify-end"><button onClick={() => setMobileOpen(false)} className="rounded-lg p-1"><X size={20} /></button></div>
              <Sidebar NAV={NAV} page={page} setPage={(p) => { setPage(p); setMobileOpen(false); }} settings={settings} data={data} ctx={ctx} />
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {page === "dashboard" && <Dashboard ctx={ctx} />}
          {page === "jadual" && <JadualMingguan ctx={ctx} />}
          {page === "claim" && <ClaimPage ctx={ctx} />}
          {page === "brand" && <BrandPage ctx={ctx} />}
          {page === "bulanan" && <Bulanan ctx={ctx} />}
          {page === "invoice" && <Invoice ctx={ctx} />}
          {page === "pembayaran" && <Pembayaran ctx={ctx} />}
          {page === "tetapan" && <Tetapan ctx={ctx} />}
          {page === "admin" && isAdmin && <AdminPage ctx={ctx} />}
        </main>
      </div>

      {toast && <div className="no-print fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-6" style={{ background: INK }}><span className="inline-flex items-center gap-2"><CheckCircle2 size={16} style={{ color: "#86EFAC" }} />{toast}</span></div>}

      {/* MOBILE BOTTOM NAV */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-white/95 px-1 py-1.5 backdrop-blur lg:hidden" style={{ borderColor: "#EEF0F4" }}>
        {NAV.filter((n) => ["dashboard", "jadual", "claim", "invoice", "tetapan"].includes(n.id)).map(({ id, label, Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-colors" style={{ color: active ? PURPLE : "#94A3B8" }}>
              <Icon size={21} style={{ color: active ? PURPLE : "#94A3B8" }} />{label.split(" ")[0]}
            </button>
          );
        })}
      </nav>

      {USE_FB && !demo && profile && profile.status === "active" && !loading && !settings.tutorialSeen && <Tutorial onDone={markTutorialSeen} setPage={setPage} />}
    </div>
  );
}

/* ============================================================ DERIVATION */
function deriveAll(sessions, brands, claims) {
  const todayStr = iso(TODAY), monStr = iso(getMonday(TODAY));
  const monthIdx = TODAY.getMonth(), year = TODAY.getFullYear();
  const bById = Object.fromEntries(brands.map((b) => [b.id, b]));
  const sumD = (arr, f) => arr.filter(isDone).reduce((a, x) => a + f(x), 0);
  const cntD = (arr) => arr.filter(isDone).length;

  const today = sessions.filter((s) => s.date === todayStr).sort((a, b) => a.start.localeCompare(b.start));
  const calWeek = sessions.filter((s) => iso(getMonday(parseISO(s.date))) === monStr);
  const thisMonth = sessions.filter((s) => { const d = parseISO(s.date); return d.getMonth() === monthIdx && d.getFullYear() === year; });

  const claimedSessionIds = new Set(claims.flatMap((c) => c.sessionIds));
  const invoices = claims.map((c) => ({ ...c, color: c.color || bById[c.brandId]?.color || PURPLE, label: rangeLabel(c.start, c.end) }))
    .sort((a, b) => b.start.localeCompare(a.start) || (b.id > a.id ? 1 : -1));
  const pendingInvoices = invoices.filter((c) => !c.paid);

  return {
    todayStr, monthLabel: `${MONTHS_FULL[monthIdx]} ${year}`,
    today, todayDone: today.filter(isDone), todayIncome: sumD(today, (x) => x.income), todayHours: sumD(today, (x) => x.hours),
    weekIncome: sumD(calWeek, (x) => x.income), weekSessions: cntD(calWeek), weekHours: sumD(calWeek, (x) => x.hours),
    monthIncome: sumD(thisMonth, (x) => x.income), monthSessions: cntD(thisMonth), monthHours: sumD(thisMonth, (x) => x.hours), monthCommission: sumD(thisMonth, (x) => x.commission), monthHourly: sumD(thisMonth, (x) => x.hours * x.rate),
    invoices, pendingInvoices, claimedSessionIds, lockedSessionIds: claimedSessionIds, bById,
  };
}

/* ============================================================ SIDEBAR */
function Brand() { return <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><Activity size={18} className="text-white" /></span><span className="text-lg font-extrabold tracking-tight">Host<span style={{ color: PURPLE }}>Income</span></span></div>; }
function Sidebar({ NAV, page, setPage, settings, data, ctx }) {
  return (
    <>
      <Brand />
      <div className="mt-7 flex flex-col items-center text-center">
        <div className="h-16 w-16 overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 4px ${LAV}` }}>
          {settings.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white" style={{ background: "linear-gradient(135deg,#C084FC,#7C3AED)" }}>{settings.hostName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>}
        </div>
        <p className="mt-3 text-sm font-bold">{settings.hostName}</p><p className="text-xs" style={{ color: SUB }}>{ctx?.profile ? (ctx.profile.role === "admin" ? "Admin" : "Host") : "Host Live"}</p>
      </div>
      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map(({ id, label, Icon }) => { const active = page === id; return (
          <button key={id} onClick={() => setPage(id)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all" style={active ? { background: PURPLE, color: "#fff", boxShadow: "0 6px 16px rgba(109,40,217,0.28)" } : { color: "#52525B", background: "transparent" }} onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = LAV; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}><Icon size={18} style={{ color: active ? "#fff" : PURPLE }} />{label}</button>); })}
      </nav>
      <div className="mt-auto rounded-2xl p-4" style={{ background: LAV }}>
        <p className="text-xs font-bold" style={{ color: PURPLE }}>Ringkasan Bulanan</p><p className="text-[11px]" style={{ color: SUB }}>{data.monthLabel}</p>
        <p className="mt-3 text-[11px] font-medium" style={{ color: SUB }}>Jumlah Pendapatan</p><p className="text-xl font-extrabold" style={{ color: INK }}>{RM(data.monthIncome)}</p>
        <div className="mt-3 flex justify-between border-t pt-3" style={{ borderColor: "#E4E0F5" }}><div><p className="text-[10px]" style={{ color: SUB }}>Jam</p><p className="text-sm font-bold">{H(data.monthHours)} jam</p></div><div><p className="text-[10px]" style={{ color: SUB }}>Sesi</p><p className="text-sm font-bold">{data.monthSessions} sesi</p></div></div>
      </div>
      {ctx?.profile && <button onClick={ctx.logout} className="mt-3 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors" style={{ borderColor: "#EEF0F4", color: "#DC2626" }}><LogOut size={15} /> Log Keluar</button>}
    </>
  );
}
function PageHead({ title, subtitle, right }) { return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>{subtitle && <p className="mt-1 text-sm" style={{ color: SUB }}>{subtitle}</p>}</div>{right}</div>; }
function PrimaryBtn({ children, onClick, Icon }) { return <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 8px 18px rgba(109,40,217,0.30)" }}>{Icon && <Icon size={16} />}{children}</button>; }
function MiniStat({ Icon, chip, color, label, value }) { return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: chip }}><Icon size={17} style={{ color }} /></span><div><p className="text-xs" style={{ color: SUB }}>{label}</p><p className="text-sm font-bold">{value}</p></div></div>; }

/* ============================================================ 1. DASHBOARD */
function fmtCountdown(ms) {
  let t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400); t %= 86400;
  const h = Math.floor(t / 3600); t %= 3600;
  const m = Math.floor(t / 60); const s = t % 60;
  return (d > 0 ? `${d}h ` : "") + `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function NextLiveBar({ next, now, ctx }) {
  if (!next) return (
    <div className="flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: "#EEF0F4", background: "#fff" }}>
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: LAV }}><CalendarRange size={18} style={{ color: PURPLE }} /></span><div><p className="text-sm font-bold">Tiada live dijadualkan</p><p className="text-xs" style={{ color: SUB }}>Tambah slot di Jadual untuk peringatan.</p></div></div>
      <button onClick={() => ctx.setPage("jadual")} className="rounded-xl px-3.5 py-2 text-sm font-bold text-white" style={{ background: PURPLE }}>Jadual</button>
    </div>
  );
  const s = next.s;
  const dateLbl = s.date === ctx.data.todayStr ? "Hari Ini" : s.date === iso(addDays(TODAY, 1)) ? "Esok" : fmtDateShort(s.date);
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 text-white sm:p-5" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 12px 30px rgba(109,40,217,0.30)" }}>
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-90"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Live Seterusnya</p>
          <p className="mt-1 truncate text-lg font-extrabold sm:text-xl">{s.brand}</p>
          <p className="text-xs opacity-90">{dateLbl} · {fmtTime(s.start)}–{fmtTime(s.end)}</p>
        </div>
        <div className="shrink-0 rounded-xl px-3 py-2 text-center sm:text-right" style={{ background: "rgba(255,255,255,0.15)" }}>
          <p className="text-[10px] uppercase tracking-wide opacity-90">bermula dalam</p>
          <p className="font-mono text-2xl font-extrabold tabular-nums sm:text-3xl">{fmtCountdown(next.dt - now)}</p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ ctx }) {
  const { data, sessions, setPage } = ctx;
  const [now, setNow] = useState(() => nowMYT());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMYT()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => {
    const up = sessions.filter((s) => s.status === "Belum Live").map((s) => ({ s, dt: sessionStartDate(s) })).filter((x) => x.dt.getTime() > now.getTime()).sort((a, b) => a.dt - b.dt);
    return up[0] || null;
  }, [sessions, now]);

  const donut = data.todayDone.map((s, i) => ({ name: s.brand, value: s.income, color: data.bById[s.brandId]?.color || PALETTE[i % PALETTE.length] }));
  const hh = pad(now.getHours()), mm = pad(now.getMinutes()), ss = pad(now.getSeconds());

  return (
    <>
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">Hai, {ctx.settings.hostName.split(" ")[0]}! <span className="inline-block">👋</span></h1>
          <p className="text-xs sm:text-sm" style={{ color: SUB }}>{fmtDate(data.todayStr)}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 sm:flex" style={{ borderColor: "#EEF0F4" }}>
          <Clock size={15} style={{ color: PURPLE }} /><span className="font-mono text-sm font-bold tabular-nums">{hh}:{mm}<span style={{ color: SUB }}>:{ss}</span></span><span className="text-[10px] font-bold" style={{ color: SUB }}>MYT</span>
        </div>
      </div>

      {/* NEXT LIVE COUNTDOWN */}
      <NextLiveBar next={next} now={now} ctx={ctx} />

      {/* STAT CARDS (3) */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1"><StatCard theme="purple" Icon={Wallet} label="Pendapatan Hari Ini" value={RM(data.todayIncome)} sub={`${data.todayDone.length} sesi selesai`} /></div>
        <StatCard theme="green" Icon={TrendingUp} label="Minggu Ini" value={RM(data.weekIncome)} sub={`${data.weekSessions} sesi`} />
        <StatCard theme="orange" Icon={DollarSign} label="Bulan Ini" value={RM(data.monthIncome)} sub={`${data.monthSessions} sesi`} />
      </div>

      {/* TODAY + CHART */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Sesi Hari Ini" action={<button onClick={() => setPage("jadual")} className="text-sm font-bold" style={{ color: PURPLE }}>Jadual</button>}>
          {data.today.length === 0 ? <p className="py-6 text-center text-sm" style={{ color: SUB }}>Tiada sesi hari ini.</p> : (
            <div className="flex flex-col gap-2">
              {data.today.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border p-2.5" style={{ borderColor: "#F1F0F6", background: isDone(s) ? "#FCFBFE" : "#FFFDF5" }}>
                  <div className="flex min-w-0 items-center gap-2.5"><Dot color={data.bById[s.brandId]?.color || PURPLE} /><div className="min-w-0"><p className="truncate text-sm font-bold">{s.brand}</p><p className="text-xs" style={{ color: SUB }}>{fmtTime(s.start)}–{fmtTime(s.end)} · {H(s.hours)}j</p></div></div>
                  <div className="flex shrink-0 items-center gap-2"><span className="text-sm font-extrabold" style={{ color: PURPLE }}>{isDone(s) ? RM(s.income) : "—"}</span><Pill tone={isDone(s) ? "green" : "amber"}>{s.status}</Pill></div>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between rounded-xl px-3.5 py-3" style={{ background: LAV }}><span className="text-sm font-bold">Jumlah Hari Ini</span><span className="text-base font-extrabold" style={{ color: PURPLE }}>{RM(data.todayIncome)}</span></div>
            </div>
          )}
        </Panel>

        <Panel title="Carta Hari Ini" className="hidden xl:block">
          {donut.length === 0 ? <div className="flex h-48 items-center justify-center text-sm" style={{ color: SUB }}>Tiada data.</div> : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-44 w-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donut} dataKey="value" innerRadius={54} outerRadius={78} paddingAngle={3} stroke="none">{donut.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip formatter={(v) => RM(v)} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-extrabold">{RM(data.todayIncome)}</span><span className="text-[11px]" style={{ color: SUB }}>Jumlah</span></div></div>
              <div className="flex w-full flex-col gap-2">{donut.map((d, i) => <div key={i} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2" style={{ color: SUB }}><Dot color={d.color} size={8} />{d.name}</span><span className="font-bold">{RM(d.value)}</span></div>)}</div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ============================================================ 2. JADUAL — CALENDAR */
function JadualMingguan({ ctx }) {
  const { brands, sessions, data, settings, upsertSession, deleteSession, setPage, flash } = ctx;
  const maxSlots = settings.maxSlots || 4;
  const [mode, setMode] = useState("week"); // week | 2week | month
  const [cursor, setCursor] = useState(() => new Date(TODAY));
  const [modal, setModal] = useState(null);    // add/edit slot
  const [dayView, setDayView] = useState(null); // popup senarai slot 1 hari
  const [copyTo, setCopyTo] = useState("");
  const [copyFrom, setCopyFrom] = useState("");

  const compact = mode !== "week";
  const monthIdx = cursor.getMonth();
  let gridStart, count;
  if (mode === "month") { gridStart = getMonday(new Date(cursor.getFullYear(), cursor.getMonth(), 1)); count = 42; }
  else { gridStart = getMonday(cursor); count = mode === "2week" ? 14 : 7; }

  const days = Array.from({ length: count }, (_, i) => {
    const d = addDays(gridStart, i), ds = iso(d);
    const list = sessions.filter((s) => s.date === ds).sort((a, b) => a.start.localeCompare(b.start));
    const done = list.filter(isDone), planned = list.filter((s) => !isDone(s));
    return { date: ds, d, dow: d.getDay(), today: ds === data.todayStr, inMonth: d.getMonth() === monthIdx, sessions: list, doneCount: done.length, plannedCount: planned.length, hours: done.reduce((a, x) => a + x.hours, 0), income: done.reduce((a, x) => a + x.income, 0) };
  });
  const first = days[0].d, last = days[days.length - 1].d;
  const label = mode === "month" ? `${MONTHS_FULL[monthIdx]} ${cursor.getFullYear()}` : `${fmtDateShort(iso(first))} – ${fmtDateShort(iso(last))} ${last.getFullYear()}`;

  function shift(dir) {
    if (mode === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else setCursor(addDays(cursor, dir * (mode === "2week" ? 14 : 7)));
  }
  function openEdit(s) { if (data.lockedSessionIds.has(s.id)) { flash("Slot dikunci (dalam invois). Buka semula invois di halaman Invoice untuk edit."); return; } setDayView(null); setModal({ date: s.date, session: s }); }
  function openAdd(date) {
    if (brands.length === 0) { flash("Daftar brand dahulu di halaman Brand."); return; }
    const list = sessions.filter((s) => s.date === date);
    if (list.length >= maxSlots) { flash(`Maksimum ${maxSlots} slot sehari.`); return; }
    const lastS = [...list].sort((a, b) => a.start.localeCompare(b.start)).pop();
    const startH = lastS ? parseInt(lastS.end) : 10;
    setDayView(null);
    setModal({ date, session: null, start: `${pad(Math.min(22, startH))}:00`, end: `${pad(Math.min(23, startH + 2))}:00` });
  }
  function copyDayTo(srcDate, tgtDate) {
    if (!tgtDate) { flash("Pilih tarikh sasaran dahulu."); return; }
    if (tgtDate === srcDate) { flash("Tarikh sama — pilih hari lain."); return; }
    const srcList = sessions.filter((s) => s.date === srcDate);
    if (srcList.length === 0) { flash("Tiada slot untuk disalin."); return; }
    const existing = sessions.filter((s) => s.date === tgtDate).length;
    let added = 0;
    srcList.forEach((s, idx) => {
      if (existing + added >= maxSlots) return;
      const b = brands.find((x) => x.id === s.brandId); const r = rateForDate(b, tgtDate);
      upsertSession({ id: "s" + Date.now() + "_" + idx, date: tgtDate, brandId: s.brandId, brand: s.brand, start: s.start, end: s.end, hours: s.hours, rate: r, commission: 0, sales: 0, kpi: s.kpi, note: s.note, income: s.hours * r, status: "Belum Live" });
      added++;
    });
    flash(`${added} slot disalin ke ${fmtDateShort(tgtDate)}.`); setCopyTo(""); setDayView(null);
  }
  function copyOneSlot(s, tgtDate) {
    const existing = sessions.filter((x) => x.date === tgtDate).length;
    if (existing >= maxSlots) { flash(`Maksimum ${maxSlots} slot sehari.`); return; }
    const b = brands.find((x) => x.id === s.brandId); const r = rateForDate(b, tgtDate);
    upsertSession({ id: "s" + Date.now() + "_" + Math.floor(Math.random() * 1000), date: tgtDate, brandId: s.brandId, brand: s.brand, start: s.start, end: s.end, hours: s.hours, rate: r, commission: 0, sales: 0, kpi: s.kpi, note: s.note, income: s.hours * r, status: "Belum Live" });
    flash("1 slot disalin.");
  }

  const Seg = ({ id, t }) => (
    <button onClick={() => setMode(id)} className="rounded-lg px-3 py-1.5 text-xs font-bold transition-colors" style={mode === id ? { background: PURPLE, color: "#fff" } : { color: SUB }}>{t}</button>
  );

  return (
    <>
      <PageHead title="Jadual Host" subtitle="Klik hari untuk lihat / tambah slot"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border bg-white p-1" style={{ borderColor: "#EEF0F4" }}><Seg id="week" t="Minggu" /><Seg id="2week" t="2 Minggu" /><Seg id="month" t="Bulan" /></div>
            <button onClick={() => shift(-1)} className="rounded-xl border bg-white p-2.5" style={{ borderColor: "#EEF0F4" }}><ChevronLeft size={16} style={{ color: PURPLE }} /></button>
            <div className="min-w-[140px] rounded-xl border bg-white px-3 py-2 text-center text-sm font-semibold" style={{ borderColor: "#EEF0F4" }}>{label}</div>
            <button onClick={() => shift(1)} className="rounded-xl border bg-white p-2.5" style={{ borderColor: "#EEF0F4" }}><ChevronRight size={16} style={{ color: PURPLE }} /></button>
            <button onClick={() => setCursor(new Date(TODAY))} className="rounded-xl px-3 py-2 text-sm font-bold text-white" style={{ background: PURPLE }}>Hari Ini</button>
          </div>
        } />

      {!compact && (
        <div className="mb-3 flex items-center gap-4 text-[11px] font-semibold" style={{ color: "#475569" }}>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-1 rounded" style={{ background: "#16A34A" }} /> Selesai</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-1 rounded" style={{ background: "#F59E0B" }} /> Belum Live</span>
        </div>
      )}
      {compact && (
        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
          {["Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Ahd"].map((d) => <div key={d} className="px-1 text-center text-[11px] font-bold" style={{ color: SUB }}>{d}</div>)}
        </div>
      )}

      {compact ? (
        /* ===== MOD RINGKAS (2 minggu / bulan): ringkasan sahaja, tekan untuk popup ===== */
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const faded = mode === "month" && !day.inMonth;
            const empty = day.sessions.length === 0;
            return (
              <button key={day.date} onClick={() => setDayView(day.date)}
                className="flex flex-col rounded-xl border bg-white p-2 text-left transition-all hover:shadow-md"
                style={{ borderColor: day.today ? "#C4B5FD" : "#EEF0F4", boxShadow: day.today ? "0 4px 12px rgba(109,40,217,0.12)" : "none", minHeight: mode === "month" ? 88 : 104, opacity: faded ? 0.5 : 1 }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: day.today ? PURPLE : INK }}>{day.d.getDate()}</span>
                  {day.today && <span className="rounded-full px-1.5 text-[9px] font-bold text-white" style={{ background: PURPLE }}>Kini</span>}
                </div>
                {empty ? (
                  <div className="flex flex-1 items-center justify-center"><Plus size={16} style={{ color: "#CBD5E1" }} /></div>
                ) : (
                  <div className="mt-auto flex flex-col gap-1">
                    <span className="text-sm font-extrabold leading-none" style={{ color: PURPLE }}>{RM(day.income).replace(".00", "")}</span>
                    <span className="text-[10px] font-semibold" style={{ color: SUB }}>{day.sessions.length} slot</span>
                    <div className="flex flex-wrap gap-1">
                      {day.doneCount > 0 && <span className="rounded px-1 text-[9px] font-bold" style={{ background: "#DCFCE7", color: "#15803D" }}>{day.doneCount} ✓</span>}
                      {day.plannedCount > 0 && <span className="rounded px-1 text-[9px] font-bold" style={{ background: "#FEF3C7", color: "#B45309" }}>{day.plannedCount} •</span>}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* ===== MOD MINGGU: penuh ===== */
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
          {days.map((day) => {
            const atMax = day.sessions.length >= maxSlots;
            return (
              <div key={day.date} className="flex flex-col rounded-xl border bg-white p-2.5" style={{ borderColor: day.today ? "#C4B5FD" : "#EEF0F4", boxShadow: day.today ? "0 6px 16px rgba(109,40,217,0.12)" : "none", minHeight: 150 }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold" style={{ color: day.today ? PURPLE : INK }}>{DAYS_SHORT[day.dow]} <span className="font-normal" style={{ color: SUB }}>{day.d.getDate()}</span></p>
                  <div className="flex items-center gap-1">{day.today && <span className="h-1.5 w-1.5 rounded-full" style={{ background: PURPLE }} />}<button onClick={() => setDayView(day.date)} title="Salin / lihat hari" className="rounded p-0.5" style={{ color: SUB }}><Copy size={12} /></button></div>
                </div>
                <div className="mt-2 flex flex-1 flex-col gap-1.5">
                  {day.sessions.map((s) => {
                    const locked = data.lockedSessionIds.has(s.id); const col = data.bById[s.brandId]?.color || PURPLE;
                    return (
                      <button key={s.id} onClick={() => openEdit(s)} className="rounded-lg border p-1.5 pl-2 text-left transition-all" style={{ borderColor: isDone(s) ? "#BBF7D0" : "#FDE68A", borderLeft: `3px solid ${isDone(s) ? "#16A34A" : "#F59E0B"}`, background: isDone(s) ? "#F0FDF4" : "#FFFBEB" }}>
                        <div className="flex items-center gap-1"><Dot color={col} size={7} /><span className="truncate text-[11px] font-semibold leading-tight">{s.brand}</span>{locked && <Lock size={9} style={{ color: SUB }} />}</div>
                        <div className="mt-0.5 flex items-center justify-between text-[11px]"><span style={{ color: "#475569" }}>{fmtTimeShort(s.start)}-{fmtTimeShort(s.end)}</span>{isDone(s) ? <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: "#15803D" }}><CheckCircle2 size={10} />{RM(s.income).replace(".00", "")}</span> : <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: "#B45309" }}><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#F59E0B" }} />Live</span>}</div>
                      </button>
                    );
                  })}
                  {!atMax && (
                    <button onClick={() => openAdd(day.date)} className="flex items-center justify-center gap-1 rounded-lg border border-dashed py-1.5 text-[11px] font-semibold" style={{ borderColor: "#E4E0F5", color: PURPLE }}><Plus size={12} /> Slot</button>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between border-t pt-1.5 text-[11px]" style={{ borderColor: "#F1F0F6" }}><span className="flex items-center gap-1.5">{day.doneCount > 0 && <span className="font-bold" style={{ color: "#15803D" }}>{day.doneCount}✓</span>}{day.plannedCount > 0 && <span className="font-bold" style={{ color: "#B45309" }}>{day.plannedCount}•</span>}</span><span className="font-bold" style={{ color: INK }}>{RM(day.income).replace(".00", "")}</span></div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5" style={{ borderColor: "#EEF0F4" }}>
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: LAV }}><ReceiptText size={20} style={{ color: PURPLE }} /></span><div><p className="text-sm font-bold">Dah siap buat live?</p><p className="text-xs" style={{ color: SUB }}>Buat claim ikut brand & julat tarikh untuk jana invoice.</p></div></div>
        <PrimaryBtn Icon={ReceiptText} onClick={() => setPage("claim")}>Pergi ke Claim / Bil</PrimaryBtn>
      </div>

      {dayView && (() => {
        const day = days.find((x) => x.date === dayView) || { date: dayView, sessions: sessions.filter((s) => s.date === dayView), income: 0, hours: 0, doneCount: 0, plannedCount: 0 };
        const list = [...day.sessions].sort((a, b) => a.start.localeCompare(b.start));
        const atMax = list.length >= maxSlots;
        return (
          <Modal onClose={() => setDayView(null)} wide>
            <div className="flex items-center justify-between">
              <div><h3 className="text-base font-bold">{fmtDate(dayView)}</h3><p className="text-xs" style={{ color: SUB }}>{day.doneCount} selesai · {day.plannedCount} belum live · {H(day.hours)}j</p></div>
              <button onClick={() => setDayView(null)} className="rounded-lg p-1.5" style={{ color: SUB }}><X size={18} /></button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {list.length === 0 && <p className="py-6 text-center text-sm" style={{ color: SUB }}>Tiada slot pada hari ini.</p>}
              {list.map((s) => {
                const locked = data.lockedSessionIds.has(s.id); const col = data.bById[s.brandId]?.color || PURPLE;
                return (
                  <button key={s.id} onClick={() => openEdit(s)} className="flex items-center justify-between gap-3 rounded-xl border p-3 pl-3.5 text-left transition-all hover:shadow-sm" style={{ borderColor: isDone(s) ? "#BBF7D0" : "#FDE68A", borderLeft: `4px solid ${isDone(s) ? "#16A34A" : "#F59E0B"}`, background: isDone(s) ? "#F0FDF4" : "#FFFBEB" }}>
                    <div className="flex min-w-0 items-center gap-2.5"><Dot color={col} /><div className="min-w-0"><p className="truncate text-sm font-bold">{s.brand}{locked && <Lock size={11} className="ml-1 inline" style={{ color: SUB }} />}</p><p className="text-xs" style={{ color: "#475569" }}>{fmtTime(s.start)} – {fmtTime(s.end)} · {H(s.hours)}j</p></div></div>
                    <div className="flex shrink-0 items-center gap-2"><span className="text-sm font-extrabold" style={{ color: isDone(s) ? "#15803D" : "#B45309" }}>{isDone(s) ? RM(s.income) : "—"}</span>{isDone(s) ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "#DCFCE7", color: "#15803D" }}><CheckCircle2 size={12} />Selesai</span> : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "#FEF3C7", color: "#B45309" }}><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#F59E0B" }} />Belum Live</span>}</div>
                  </button>
                );
              })}
              <div className="mt-1 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: LAV }}><span className="text-sm font-bold">Total Earning (Selesai)</span><span className="text-base font-extrabold" style={{ color: PURPLE }}>{RM(day.income)}</span></div>
            </div>
            <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "#EEF0F4" }}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold" style={{ color: SUB }}><Copy size={13} style={{ color: PURPLE }} /> Salin dari hari lain ke sini</p>
              <input type="date" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} />
              {copyFrom && copyFrom !== dayView && (() => {
                const srcList = sessions.filter((s) => s.date === copyFrom).sort((a, b) => a.start.localeCompare(b.start));
                if (srcList.length === 0) return <p className="mt-2 text-xs" style={{ color: SUB }}>Tiada slot pada {fmtDateShort(copyFrom)}.</p>;
                return (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <button onClick={() => copyDayTo(copyFrom, dayView)} className="rounded-xl px-3 py-2 text-sm font-bold text-white" style={{ background: PURPLE }}>Salin semua ({srcList.length} slot)</button>
                    {srcList.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-2" style={{ borderColor: "#F1F0F6" }}>
                        <span className="flex min-w-0 items-center gap-2 text-xs"><Dot color={data.bById[s.brandId]?.color || PURPLE} size={7} /><span className="truncate">{s.brand} · {fmtTimeShort(s.start)}-{fmtTimeShort(s.end)}</span></span>
                        <button onClick={() => copyOneSlot(s, dayView)} className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold" style={{ borderColor: "#EEF0F4", color: PURPLE }}>Salin</button>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <p className="mt-1.5 text-[11px]" style={{ color: SUB }}>Slot disalin sebagai "Belum Live" (sales/komisen kosong).</p>
            </div>
            {!atMax && <button onClick={() => openAdd(dayView)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 8px 18px rgba(109,40,217,0.28)" }}><Plus size={16} /> Tambah Slot</button>}
          </Modal>
        );
      })()}

      {modal && <SlotModal init={modal} brands={brands} settings={settings} onClose={() => setModal(null)} onSave={(o) => { upsertSession(o); flash("Laporan slot disimpan!"); setModal(null); }} onDelete={(id) => { deleteSession(id); setModal(null); }} onDuplicate={(o) => { upsertSession(o); flash("Slot diduplikat ke " + fmtDateShort(o.date) + "."); setModal(null); }} flash={flash} />}
    </>
  );
}
function SlotModal({ init, brands, settings, onClose, onSave, onDelete, onDuplicate, flash }) {
  const editing = !!init.session;
  const [f, setF] = useState(() => ({
    id: init.session?.id, date: init.date, brandId: init.session?.brandId ?? brands[0]?.id ?? "",
    start: init.session?.start || init.start || "10:00", end: init.session?.end || init.end || "12:00",
    sales: init.session?.sales ?? "", kpi: init.session?.kpi ?? true, commission: init.session?.commission ?? "",
    note: init.session?.note ?? "", status: init.session?.status ?? "Belum Live",
  }));
  const [dupTo, setDupTo] = useState(() => iso(addDays(parseISO(init.date), 1)));
  const brand = brands.find((b) => b.id === f.brandId) || brands[0];
  const rate = rateForDate(brand, f.date);
  const hours = useMemo(() => durHours(f.start, f.end), [f.start, f.end]);
  const autoComm = computeCommission(brand, f.sales);
  const commissionVal = autoComm != null ? autoComm : Number(f.commission || 0);
  const hourly = hours * rate, total = hourly + commissionVal;

  function save() {
    if (!brand) { flash("Sila pilih brand."); return; }
    if (hours <= 0) { flash("Masa tamat mesti selepas masa mula."); return; }
    onSave({ id: f.id, date: f.date, brandId: brand.id, brand: brand.name, start: f.start, end: f.end, hours, rate, commission: commissionVal, sales: Number(f.sales || 0), kpi: f.kpi, note: f.note, income: total, status: f.status });
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: LAV }}><Tag size={18} style={{ color: PURPLE }} /></span><div><h3 className="text-base font-bold">{editing ? "Kemaskini Slot" : "Tambah Slot"}</h3><p className="text-xs" style={{ color: SUB }}>{fmtDate(f.date)}</p></div></div>
        <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: SUB }}><X size={18} /></button>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Company / Brand">
          <Select value={f.brandId} onChange={(v) => setF({ ...f, brandId: v })}>
            {brands.length === 0 && <option value="">— tiada brand, sila daftar —</option>}
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field></div>
        <Field label="Tarikh"><Input type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} /></Field>
        <Field label="Status (tandakan Selesai bila laporan siap)">
          <div className="flex gap-2">{["Selesai", "Belum Live"].map((val) => (<button key={val} onClick={() => setF({ ...f, status: val })} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all" style={f.status === val ? { background: val === "Selesai" ? "#DCFCE7" : "#FEF3C7", color: val === "Selesai" ? "#15803D" : "#B45309", borderColor: "transparent" } : { borderColor: "#EEF0F4", color: SUB }}>{val}</button>))}</div>
        </Field>
        <Field label="Masa Mula"><Input type="time" value={f.start} onChange={(v) => setF({ ...f, start: v })} /></Field>
        <Field label="Masa Tamat"><Input type="time" value={f.end} onChange={(v) => setF({ ...f, end: v })} /></Field>
        <Field label="Jumlah Sales (pilihan)"><Input type="number" placeholder="0.00" value={f.sales} onChange={(v) => setF({ ...f, sales: v })} /></Field>
        {autoComm != null ? (
          <Field label="Komisen (auto ikut struktur brand)"><div className="flex items-center justify-between rounded-xl border px-3.5 py-2.5" style={{ borderColor: "#E4E0F5", background: LAV }}><span className="text-sm font-extrabold" style={{ color: PURPLE }}>{RM(autoComm)}</span><span className="text-[11px] font-semibold" style={{ color: SUB }}>{commissionRuleLabel(brand.commission)}</span></div></Field>
        ) : (
          <Field label="Komisen (isi sendiri)"><Input type="number" placeholder="0.00" value={f.commission} onChange={(v) => setF({ ...f, commission: v })} /></Field>
        )}
        <Field label="KPI Achieved"><div className="flex gap-2">{[true, false].map((val) => (<button key={String(val)} onClick={() => setF({ ...f, kpi: val })} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all" style={f.kpi === val ? { background: val ? "#DCFCE7" : "#FEE2E2", color: val ? "#15803D" : "#DC2626", borderColor: "transparent" } : { borderColor: "#EEF0F4", color: SUB }}>{val ? "Yes" : "No"}</button>))}</div></Field>
        <div><Field label="Rate / Jam (auto ikut tarikh)"><div className="flex items-center justify-between rounded-xl border px-3.5 py-2.5" style={{ borderColor: "#E4E0F5", background: LAV }}><span className="text-sm font-extrabold" style={{ color: PURPLE }}>{RM(rate)}</span><span className="text-[11px] font-semibold" style={{ color: SUB }}>ikut {fmtDateShort(f.date)}</span></div></Field></div>
        <div className="sm:col-span-2"><Field label="Nota (pilihan)"><Input value={f.note} placeholder="Contoh: Live promosi produk baru" onChange={(v) => setF({ ...f, note: v })} /></Field></div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl p-4" style={{ background: LAV }}>
        <div><p className="text-xs" style={{ color: SUB }}>Tempoh</p><p className="text-sm font-bold">{H(hours)} jam</p></div>
        <div><p className="text-xs" style={{ color: SUB }}>Pendapatan Jam</p><p className="text-sm font-bold">{RM(hourly)}</p></div>
        <div><p className="text-xs" style={{ color: SUB }}>Total Income</p><p className="text-sm font-extrabold" style={{ color: PURPLE }}>{RM(total)}</p></div>
      </div>
      <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "#EEF0F4", background: "#FCFBFE" }}>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold" style={{ color: SUB }}><Copy size={13} style={{ color: PURPLE }} /> Duplikat slot ini ke hari lain (Belum Live)</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={dupTo} onChange={(e) => setDupTo(e.target.value)} className="rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} />
          <button onClick={() => setDupTo(iso(addDays(parseISO(f.date), 1)))} className="rounded-lg border px-2.5 py-2 text-xs font-semibold" style={{ borderColor: "#EEF0F4", color: PURPLE }}>Esok</button>
          <button onClick={() => setDupTo(iso(addDays(parseISO(f.date), 7)))} className="rounded-lg border px-2.5 py-2 text-xs font-semibold" style={{ borderColor: "#EEF0F4", color: PURPLE }}>+7 hari</button>
          <button onClick={() => { if (!brand) { flash("Pilih brand."); return; } if (!dupTo) { flash("Pilih tarikh."); return; } const r = rateForDate(brand, dupTo); onDuplicate({ date: dupTo, brandId: brand.id, brand: brand.name, start: f.start, end: f.end, hours, rate: r, commission: 0, sales: 0, kpi: f.kpi, note: f.note, income: hours * r, status: "Belum Live" }); }} className="rounded-xl px-3.5 py-2 text-sm font-bold text-white" style={{ background: PURPLE }}>Duplikat</button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {editing && <button onClick={() => onDelete(f.id)} className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold" style={{ borderColor: "#FECACA", color: "#DC2626" }}><Trash2 size={15} /> Padam</button>}
        <div className="ml-auto flex gap-3"><button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4", color: SUB }}>Cancel</button><button onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 8px 18px rgba(109,40,217,0.28)" }}><CheckCircle2 size={15} /> Save Report</button></div>
      </div>
    </Modal>
  );
}

/* ============================================================ 3. CLAIM / BIL */
function ClaimPage({ ctx }) {
  const { brands, sessions, data, createClaim, markClaimPaid, setPage, flash } = ctx;
  const first = brands[0];
  const [brandId, setBrandId] = useState(first?.id || "");
  const [start, setStart] = useState(first ? cycleStart(data.todayStr, first.weekStart) : data.todayStr);
  const [end, setEnd] = useState(first ? iso(addDays(parseISO(cycleStart(data.todayStr, first.weekStart)), 6)) : data.todayStr);
  const [refMap, setRefMap] = useState({});

  function pickBrand(id) {
    setBrandId(id);
    const b = brands.find((x) => x.id === id);
    if (b) { const cs = cycleStart(data.todayStr, b.weekStart); setStart(cs); setEnd(iso(addDays(parseISO(cs), 6))); }
  }

  // live preview of claimable (Selesai, not yet billed)
  const preview = useMemo(() => {
    const claimed = data.claimedSessionIds;
    const list = sessions.filter((s) => isDone(s) && s.brandId === brandId && s.date >= start && s.date <= end && !claimed.has(s.id)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    return { list, agg: aggregateOf(list) };
  }, [sessions, brandId, start, end, data.claimedSessionIds]);

  const brand = brands.find((b) => b.id === brandId);
  const unpaid = data.invoices.filter((c) => !c.paid);

  return (
    <>
      <PageHead title="Claim / Bil" subtitle="Pilih brand & julat tarikh, sistem kira auto. Hanya slot Selesai dikira." />
      {brands.length === 0 ? (
        <Panel><div className="py-8 text-center text-sm" style={{ color: SUB }}>Belum ada brand. <button onClick={() => setPage("brand")} className="font-bold" style={{ color: PURPLE }}>Daftar brand dahulu →</button></div></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          {/* FORM */}
          <Panel title="Buat Claim">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3"><Field label="Brand / Company"><Select value={brandId} onChange={pickBrand}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field></div>
              <Field label="Tarikh Mula"><Input type="date" value={start} onChange={setStart} /></Field>
              <Field label="Tarikh Akhir"><Input type="date" value={end} onChange={setEnd} /></Field>
              <div><Field label="Kitaran Brand"><div className="rounded-xl border px-3.5 py-2.5 text-sm font-semibold" style={{ borderColor: "#E6E6EE", background: "#F8FAFC", color: SUB }}>{brand ? DAYS_MS[brand.weekStart] : "-"}</div></Field></div>
            </div>

            <div className="mt-5 rounded-2xl p-5" style={{ background: LAV }}>
              <p className="text-xs font-medium" style={{ color: SUB }}>Auto jumlah bayaran ({rangeLabel(start, end)})</p>
              <p className="mt-1 text-3xl font-extrabold" style={{ color: PURPLE }}>{RM(preview.agg.total)}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: SUB }}>
                <span><b style={{ color: INK }}>{preview.agg.sessions}</b> sesi Selesai</span>
                <span><b style={{ color: INK }}>{preview.agg.hours}</b> jam</span>
                <span>Pendapatan jam <b style={{ color: INK }}>{RM(preview.agg.hourlyIncome)}</b></span>
                <span>Komisen <b style={{ color: INK }}>{RM(preview.agg.commission)}</b></span>
              </div>
            </div>

            <button disabled={preview.list.length === 0} onClick={() => { if (createClaim(brandId, start, end)) { /* keep */ } }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all"
              style={preview.list.length === 0 ? { background: "#CBD5E1", cursor: "not-allowed" } : { background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 8px 18px rgba(109,40,217,0.28)" }}>
              <Lock size={16} /> Tutup & Jana Invoice
            </button>
            {preview.list.length === 0 && <p className="mt-2 text-center text-xs" style={{ color: SUB }}>Tiada slot Selesai (belum dibil) dalam julat ini.</p>}
          </Panel>

          {/* PREVIEW LIST + UNPAID */}
          <div className="flex flex-col gap-6">
            <Panel title="Slot Dalam Julat">
              {preview.list.length === 0 ? <p className="py-6 text-center text-sm" style={{ color: SUB }}>Tiada slot untuk dipaparkan.</p> : (
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "#F1F0F6" }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: "#FAFAFE", color: SUB }}><th className="px-3 py-2.5 text-left font-semibold">Tarikh</th><th className="px-3 py-2.5 text-left font-semibold">Masa</th><th className="px-3 py-2.5 text-right font-semibold">Jam</th><th className="px-3 py-2.5 text-right font-semibold">Jumlah</th></tr></thead>
                    <tbody>{preview.list.map((s) => <tr key={s.id} className="border-t" style={{ borderColor: "#F1F0F6" }}><td className="px-3 py-2.5">{fmtDateShort(s.date)}</td><td className="px-3 py-2.5">{fmtTime(s.start)}–{fmtTime(s.end)}</td><td className="px-3 py-2.5 text-right">{s.hours}</td><td className="px-3 py-2.5 text-right font-semibold">{RM(s.income)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Invoice Belum Dibayar">
              {unpaid.length === 0 ? <p className="py-4 text-center text-sm" style={{ color: SUB }}>Semua invoice dah dibayar 🎉</p> : (
                <div className="flex flex-col gap-2">
                  {unpaid.map((c) => (
                    <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><Dot color={c.color} />{c.brand}</span><span className="text-sm font-extrabold" style={{ color: PURPLE }}>{RM(c.total)}</span></div>
                      <p className="mt-0.5 text-[11px]" style={{ color: SUB }}>{c.invoiceNo} · {c.label}</p>
                      <div className="mt-2 flex gap-2">
                        <input value={refMap[c.id] || ""} onChange={(e) => setRefMap({ ...refMap, [c.id]: e.target.value })} placeholder="Ref (pilihan)" className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none" style={{ borderColor: "#E6E6EE" }} />
                        <button onClick={() => markClaimPaid(c.id, refMap[c.id])} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white" style={{ background: "#16A34A" }}>Dibayar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================ 4. BRAND REGISTRY */
function BrandPage({ ctx }) {
  const { brands, sessions, addBrand, updateBrand, deleteBrand } = ctx;
  const blank = { name: "", weekStart: 1, phone: "", address: "", logo: "", rates: [{ from: iso(TODAY), rate: 25 }], commission: { type: "manual" } };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);

  function setRate(i, key, val) { const r = form.rates.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)); setForm({ ...form, rates: r }); }
  function addRate() { const lastRate = form.rates[form.rates.length - 1]?.rate || 25; setForm({ ...form, rates: [...form.rates, { from: iso(TODAY), rate: lastRate }] }); }
  function removeRate(i) { setForm({ ...form, rates: form.rates.filter((_, idx) => idx !== i) }); }

  const comm = form.commission || { type: "manual" };
  function setCommType(t) {
    const base = { type: t };
    if (t === "percent") base.percent = comm.percent ?? 5;
    if (t === "kpi") { base.threshold = comm.threshold ?? 800; base.percent = comm.percent ?? 10; }
    if (t === "tiered") base.tiers = comm.tiers ?? [{ min: 1000, percent: 5 }, { min: 2000, percent: 6 }];
    setForm({ ...form, commission: base });
  }
  function setComm(key, val) { setForm({ ...form, commission: { ...comm, [key]: val } }); }
  function setTier(i, key, val) { const t = (comm.tiers || []).map((x, idx) => (idx === i ? { ...x, [key]: val } : x)); setForm({ ...form, commission: { ...comm, tiers: t } }); }
  function addTier() { setForm({ ...form, commission: { ...comm, tiers: [...(comm.tiers || []), { min: 0, percent: 0 }] } }); }
  function removeTier(i) { setForm({ ...form, commission: { ...comm, tiers: (comm.tiers || []).filter((_, idx) => idx !== i) } }); }

  function submit() {
    if (!form.name.trim()) { ctx.flash("Sila isi nama brand."); return; }
    let rates = form.rates.map((r) => ({ from: r.from, rate: Number(r.rate || 0) })).filter((r) => r.from).sort((a, b) => a.from.localeCompare(b.from));
    if (rates.length === 0) rates = [{ from: iso(TODAY), rate: 0 }];
    const current = rateForDate({ rates }, iso(TODAY));
    const ct = comm.type || "manual";
    let commission = { type: ct };
    if (ct === "percent") commission.percent = Number(comm.percent || 0);
    if (ct === "kpi") { commission.threshold = Number(comm.threshold || 0); commission.percent = Number(comm.percent || 0); }
    if (ct === "tiered") commission.tiers = (comm.tiers || []).map((t) => ({ min: Number(t.min || 0), percent: Number(t.percent || 0) })).sort((a, b) => a.min - b.min);
    const payload = { name: form.name.trim(), weekStart: Number(form.weekStart), phone: form.phone.trim(), address: form.address.trim(), logo: form.logo, rate: current, rates, commission };
    if (editId) { updateBrand({ id: editId, ...payload }); setEditId(null); }
    else addBrand(payload);
    setForm(blank);
  }
  function edit(b) {
    setEditId(b.id);
    const rates = (b.rates && b.rates.length) ? b.rates.map((r) => ({ ...r })) : [{ from: iso(TODAY), rate: b.rate }];
    const commission = b.commission ? { ...b.commission, tiers: b.commission.tiers ? b.commission.tiers.map((t) => ({ ...t })) : undefined } : { type: "manual" };
    setForm({ name: b.name, weekStart: b.weekStart, phone: b.phone || "", address: b.address || "", logo: b.logo || "", rates, commission });
  }
  return (
    <>
      <PageHead title="Brand / Company" subtitle="Daftar brand, rate ikut tarikh, kitaran bil, logo & maklumat syarikat." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Senarai Brand">
          <div className="flex flex-col gap-3">
            {brands.length === 0 && <p className="py-6 text-center text-sm" style={{ color: SUB }}>Belum ada brand. Daftar di sebelah.</p>}
            {brands.map((b) => {
              const count = sessions.filter((s) => s.brandId === b.id).length;
              const tiers = (b.rates && b.rates.length > 1);
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border p-3.5" style={{ borderColor: "#F1F0F6" }}>
                  <div className="flex min-w-0 items-center gap-3"><LogoBox src={b.logo} name={b.name} color={b.color} size={40} /><div className="min-w-0"><p className="truncate text-sm font-bold">{b.name}</p><p className="truncate text-xs" style={{ color: SUB }}>{RM(b.rate)}/jam{tiers ? " (berperingkat)" : ""} · kitaran {DAYS_MS[b.weekStart]} · {count} slot</p>{tiers && <p className="truncate text-[11px]" style={{ color: PURPLE }}>{[...b.rates].sort((a, c) => a.from.localeCompare(c.from)).map((r) => `${RM(r.rate)} dari ${fmtDateShort(r.from)}`).join(" → ")}</p>}</div></div>
                  <div className="flex shrink-0 items-center gap-1.5"><button onClick={() => edit(b)} className="rounded-lg border p-2" style={{ borderColor: "#EEF0F4" }}><Pencil size={14} style={{ color: PURPLE }} /></button><button onClick={() => deleteBrand(b.id)} className="rounded-lg border p-2" style={{ borderColor: "#FECACA" }}><Trash2 size={14} style={{ color: "#DC2626" }} /></button></div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title={editId ? "Kemaskini Brand" : "Daftar Brand Baru"} className="self-start">
          <div className="flex flex-col gap-4">
            <Field label="Logo Company"><ImageUpload value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} label="Muat Naik Logo" fallback={form.name ? form.name[0] : "?"} bg={PURPLE} /></Field>
            <Field label="Nama Brand / Company"><Input value={form.name} placeholder="cth: Glow Skincare Sdn Bhd" onChange={(v) => setForm({ ...form, name: v })} /></Field>
            <Field label="Rate Per Hour (RM) — ikut tarikh">
              <div className="flex flex-col gap-2">
                {form.rates.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border px-2.5" style={{ borderColor: "#E6E6EE" }}><span className="text-xs" style={{ color: SUB }}>RM</span><input type="number" value={r.rate} onChange={(e) => setRate(i, "rate", e.target.value)} className="w-14 bg-transparent py-2.5 text-sm outline-none" /></div>
                    <span className="text-xs" style={{ color: SUB }}>dari</span>
                    <input type="date" value={r.from} onChange={(e) => setRate(i, "from", e.target.value)} className="min-w-0 flex-1 rounded-xl border px-2.5 py-2.5 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} />
                    {form.rates.length > 1 && <button onClick={() => removeRate(i)} className="rounded-lg border p-2" style={{ borderColor: "#FECACA" }}><Trash2 size={13} style={{ color: "#DC2626" }} /></button>}
                  </div>
                ))}
                <button onClick={addRate} className="inline-flex items-center gap-1 self-start text-xs font-bold" style={{ color: PURPLE }}><Plus size={13} /> Tambah kenaikan rate</button>
              </div>
            </Field>
            <p className="-mt-2 text-xs" style={{ color: SUB }}>Slot guna rate mengikut tarikhnya. Cth: RM45 mulai 1 Julai — slot Jun kekal RM40.</p>
            <Field label="Hari Mula Bil"><Select value={form.weekStart} onChange={(v) => setForm({ ...form, weekStart: Number(v) })}>{[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DAYS_MS[d]}</option>)}</Select></Field>

            <div className="rounded-xl border p-3" style={{ borderColor: "#EEF0F4", background: "#FCFBFE" }}>
              <Field label="Struktur Komisen">
                <Select value={comm.type} onChange={setCommType}>
                  <option value="manual">Manual — isi sendiri setiap slot</option>
                  <option value="percent">Peratus dari jumlah sales</option>
                  <option value="kpi">Selepas KPI — baki × %</option>
                  <option value="tiered">Berperingkat — capai RM, dapat %</option>
                </Select>
              </Field>
              {comm.type === "percent" && (
                <div className="mt-3"><Field label="Peratus dari sales (%)"><Input type="number" value={comm.percent ?? ""} onChange={(v) => setComm("percent", v)} placeholder="cth: 10" /></Field><p className="mt-1 text-[11px]" style={{ color: SUB }}>Komisen = sales × %. Cth sales RM100 × 10% = RM10.</p></div>
              )}
              {comm.type === "kpi" && (
                <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Sasaran KPI (RM)"><Input type="number" value={comm.threshold ?? ""} onChange={(v) => setComm("threshold", v)} placeholder="cth: 800" /></Field><Field label="Peratus baki (%)"><Input type="number" value={comm.percent ?? ""} onChange={(v) => setComm("percent", v)} placeholder="cth: 20" /></Field><p className="col-span-2 -mt-1 text-[11px]" style={{ color: SUB }}>Komisen = (sales − sasaran) × %. Cth sales RM1000, sasaran RM800 → RM200 × 20% = RM40. Bawah sasaran = RM0.</p></div>
              )}
              {comm.type === "tiered" && (
                <div className="mt-3">
                  <div className="mb-1 flex flex-col gap-2">
                    {(comm.tiers || []).map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: SUB }}>≥ RM</span>
                        <input type="number" value={t.min} onChange={(e) => setTier(i, "min", e.target.value)} className="w-20 rounded-xl border px-2.5 py-2 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} />
                        <span className="text-xs" style={{ color: SUB }}>dapat</span>
                        <input type="number" value={t.percent} onChange={(e) => setTier(i, "percent", e.target.value)} className="w-16 rounded-xl border px-2.5 py-2 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} />
                        <span className="text-xs" style={{ color: SUB }}>%</span>
                        {(comm.tiers || []).length > 1 && <button onClick={() => removeTier(i)} className="rounded-lg border p-1.5" style={{ borderColor: "#FECACA" }}><Trash2 size={12} style={{ color: "#DC2626" }} /></button>}
                      </div>
                    ))}
                  </div>
                  <button onClick={addTier} className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: PURPLE }}><Plus size={13} /> Tambah peringkat</button>
                  <p className="mt-1 text-[11px]" style={{ color: SUB }}>Komisen = sales × % peringkat tertinggi yang dicapai. Cth ≥RM1000 → 5%, ≥RM2000 → 6%.</p>
                </div>
              )}
            </div>
            <Field label="No. Telefon"><Input value={form.phone} placeholder="+60 3-0000 0000" onChange={(v) => setForm({ ...form, phone: v })} /></Field>
            <Field label="Alamat"><Input value={form.address} placeholder="Alamat penuh syarikat" onChange={(v) => setForm({ ...form, address: v })} /></Field>
            <div className="flex gap-2">
              {editId && <button onClick={() => { setEditId(null); setForm(blank); }} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4", color: SUB }}>Batal</button>}
              <button onClick={submit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 8px 18px rgba(109,40,217,0.28)" }}><CheckCircle2 size={16} /> {editId ? "Simpan" : "Daftar Brand"}</button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ============================================================ 5. ANALITIK (filter) */
function Bulanan({ ctx }) {
  const { sessions, data } = ctx;
  const brands = ctx.brands;
  const [preset, setPreset] = useState("30d");
  const [fromD, setFromD] = useState(iso(addDays(TODAY, -29)));
  const [toD, setToD] = useState(data.todayStr);
  const [brandF, setBrandF] = useState("all");

  let from, to = data.todayStr;
  if (preset === "7d") from = iso(addDays(TODAY, -6));
  else if (preset === "30d") from = iso(addDays(TODAY, -29));
  else if (preset === "month") { from = iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)); to = iso(new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0)); }
  else if (preset === "3m") from = iso(addDays(TODAY, -89));
  else if (preset === "year") { from = iso(new Date(TODAY.getFullYear(), 0, 1)); }
  else if (preset === "all") from = "2000-01-01";
  else { from = fromD || "2000-01-01"; to = toD || data.todayStr; }

  const inRange = sessions.filter((s) => isDone(s) && s.date >= from && s.date <= to && (brandF === "all" || s.brandId === brandF));
  const income = inRange.reduce((a, s) => a + s.income, 0);
  const hours = inRange.reduce((a, s) => a + s.hours, 0);
  const commission = inRange.reduce((a, s) => a + s.commission, 0);
  const hourly = inRange.reduce((a, s) => a + s.hours * s.rate, 0);
  const activeDays = new Set(inRange.map((s) => s.date)).size;

  const spanDays = Math.round((parseISO(to) - parseISO(from)) / 86400000);
  const byWeek = spanDays > 45;
  const buckets = {};
  inRange.forEach((s) => { const key = byWeek ? iso(getMonday(parseISO(s.date))) : s.date; (buckets[key] ||= { income: 0, comm: 0 }); buckets[key].income += s.income; buckets[key].comm += s.commission; });
  const series = Object.keys(buckets).sort().map((k) => ({ name: fmtDateShort(k), Pendapatan: Math.round(buckets[k].income), Komisen: Math.round(buckets[k].comm) }));

  const byBrand = {};
  inRange.forEach((s) => { const b = (byBrand[s.brandId] ||= { name: s.brand, income: 0, sessions: 0, hours: 0, color: data.bById[s.brandId]?.color || PURPLE }); b.income += s.income; b.sessions++; b.hours += s.hours; });
  const brandArr = Object.values(byBrand).sort((a, b) => b.income - a.income);

  const presets = [["7d", "7 Hari"], ["30d", "30 Hari"], ["month", "Bulan Ini"], ["3m", "3 Bulan"], ["year", "Tahun Ini"], ["all", "Semua"], ["custom", "Pilih Tarikh"]];

  return (
    <>
      <PageHead title="Analitik" subtitle="Prestasi & pendapatan — tapis ikut tarikh & brand." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
        {/* FILTER PANEL */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Panel title="Penapis">
            <p className="mb-2 text-xs font-bold" style={{ color: SUB }}>Tempoh</p>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map(([id, t]) => (
                <button key={id} onClick={() => setPreset(id)} className="rounded-lg px-2 py-2 text-xs font-bold transition-colors" style={preset === id ? { background: PURPLE, color: "#fff" } : { background: "#F1F0F6", color: "#475569" }}>{t}</button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="mt-3 flex flex-col gap-2">
                <Field label="Dari"><Input type="date" value={fromD} onChange={setFromD} /></Field>
                <Field label="Hingga"><Input type="date" value={toD} onChange={setToD} /></Field>
              </div>
            )}
            <div className="mt-4"><p className="mb-2 text-xs font-bold" style={{ color: SUB }}>Brand</p>
              <Select value={brandF} onChange={setBrandF}><option value="all">Semua Brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
            </div>
            <div className="mt-4 rounded-xl p-3" style={{ background: LAV }}>
              <p className="text-[11px] font-semibold" style={{ color: SUB }}>Julat dipilih</p>
              <p className="text-xs font-bold">{fmtDateShort(from)} – {fmtDateShort(to)}</p>
              <p className="mt-1 text-[11px]" style={{ color: SUB }}>{inRange.length} sesi · {activeDays} hari aktif</p>
            </div>
          </Panel>
        </div>

        {/* CONTENT */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard theme="purple" Icon={Wallet} label="Pendapatan" value={RM(income)} sub={`${inRange.length} sesi`} />
            <StatCard theme="blue" Icon={Clock} label="Jam" value={`${H(hours)}`} sub="jam" />
            <StatCard theme="green" Icon={ListChecks} label="Purata / Hari" value={RM(income / Math.max(1, activeDays))} sub={`${activeDays} hari aktif`} />
            <StatCard theme="pink" Icon={Coins} label="Komisen" value={RM(commission)} sub={`Rate: ${RM(hourly)}`} />
          </div>

          <Panel title={byWeek ? "Pendapatan Mingguan" : "Pendapatan Harian"}>
            {series.length === 0 ? <div className="flex h-52 items-center justify-center text-sm" style={{ color: SUB }}>Tiada data dalam julat ini.</div> : (
              <ResponsiveContainer width="100%" height={260}><AreaChart data={series} margin={{ left: -18, right: 6 }}><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PURPLE_LT} stopOpacity={0.35} /><stop offset="100%" stopColor={PURPLE_LT} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#F1F0F6" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: SUB }} axisLine={false} tickLine={false} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 11, fill: SUB }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => RM(v)} /><Area type="monotone" dataKey="Pendapatan" stroke={PURPLE} strokeWidth={2.5} fill="url(#ga)" /></AreaChart></ResponsiveContainer>
            )}
          </Panel>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
            <Panel title="Pendapatan Ikut Brand">
              {brandArr.length === 0 ? <p className="py-6 text-center text-sm" style={{ color: SUB }}>Tiada data.</p> : (
                <div className="flex flex-col gap-3">
                  {brandArr.map((b, i) => {
                    const pct = income > 0 ? (b.income / income) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold"><Dot color={b.color} />{b.name}</span><span className="font-bold" style={{ color: PURPLE }}>{RM(b.income)}</span></div>
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "#F1F0F6" }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} /></div>
                        <p className="mt-0.5 text-[11px]" style={{ color: SUB }}>{b.sessions} sesi · {H(b.hours)} jam · {pct.toFixed(0)}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
            <Panel title="Agihan Brand">
              {brandArr.length === 0 ? <div className="flex h-52 items-center justify-center text-sm" style={{ color: SUB }}>Tiada data.</div> : (
                <div className="flex h-52 items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={brandArr} dataKey="income" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">{brandArr.map((b, i) => <Cell key={i} fill={b.color} />)}</Pie><Tooltip formatter={(v) => RM(v)} /></PieChart></ResponsiveContainer></div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
function Metric({ label, value }) { return <div className="rounded-xl p-3.5" style={{ background: "#F8FAFC" }}><p className="text-xs" style={{ color: SUB }}>{label}</p><p className="mt-0.5 text-lg font-bold">{value}</p></div>; }

/* ============================================================ 6. INVOICE (list + popup) */
function Invoice({ ctx }) {
  const { data, settings, sessions, brands, markClaimPaid } = ctx;
  const invoices = data.invoices; // terkini dahulu
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fBrand, setFBrand] = useState("all");
  const [fYear, setFYear] = useState("all");
  const [fMonth, setFMonth] = useState("all");
  const years = useMemo(() => [...new Set(invoices.map((w) => parseISO(w.start).getFullYear()))].sort((a, b) => b - a), [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((w) => {
      const d = parseISO(w.start);
      if (fStatus === "paid" && !w.paid) return false;
      if (fStatus === "pending" && w.paid) return false;
      if (fBrand !== "all" && w.brandId !== fBrand) return false;
      if (fYear !== "all" && d.getFullYear() !== Number(fYear)) return false;
      if (fMonth !== "all" && d.getMonth() !== Number(fMonth)) return false;
      if (q && !(`${w.invoiceNo} ${w.brand} ${w.label}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [invoices, query, fStatus, fBrand, fYear, fMonth]);

  const totalPending = filtered.filter((w) => !w.paid).reduce((a, w) => a + w.total, 0);

  if (invoices.length === 0) return (<><PageHead title="Invoice" subtitle="Invoice dijana bila anda buat claim." /><Panel><div className="py-10 text-center text-sm" style={{ color: SUB }}>Belum ada invoice. Buat claim di halaman Claim / Bil.</div></Panel></>);

  return (
    <>
      <div className="no-print">
      <PageHead title="Invoice" subtitle="Senarai invois. Tekan Buka untuk lihat invois penuh." />

      <Panel title="Semua Invoice"
        action={<span className="text-xs font-semibold" style={{ color: SUB }}>{filtered.length} invois{totalPending > 0 ? ` · ${RM(totalPending)} belum bayar` : ""}</span>}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "#EEF0F4" }}><Search size={14} style={{ color: SUB }} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari invois / company…" className="w-44 text-sm outline-none" /></div>
          <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="appearance-none rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: "#EEF0F4" }}><option value="all">Semua Tahun</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <select value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="appearance-none rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: "#EEF0F4" }}><option value="all">Semua Bulan</option>{MONTHS_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
          <select value={fBrand} onChange={(e) => setFBrand(e.target.value)} className="appearance-none rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: "#EEF0F4" }}><option value="all">Semua Brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="appearance-none rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: "#EEF0F4" }}><option value="all">Semua Status</option><option value="paid">Paid</option><option value="pending">Pending</option></select>
          {(query || fYear !== "all" || fMonth !== "all" || fBrand !== "all" || fStatus !== "all") && (
            <button onClick={() => { setQuery(""); setFYear("all"); setFMonth("all"); setFBrand("all"); setFStatus("all"); }} className="rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: "#EEF0F4", color: SUB }}>Reset</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: SUB }}><th className="pb-3 font-semibold">Invois</th><th className="pb-3 font-semibold">Company</th><th className="pb-3 font-semibold">Tempoh</th><th className="pb-3 font-semibold">Amount</th><th className="pb-3 font-semibold">Status</th><th className="pb-3"></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="py-6 text-center" style={{ color: SUB }}>Tiada invois sepadan.</td></tr>}
              {filtered.map((w) => (
                <tr key={w.id} className="cursor-pointer border-t transition-colors hover:bg-violet-50" style={{ borderColor: "#F1F0F6" }} onClick={() => setOpenId(w.id)}>
                  <td className="py-3 font-semibold">{w.invoiceNo}</td>
                  <td className="py-3"><span className="flex items-center gap-2"><Dot color={w.color} />{w.brand}</span></td>
                  <td className="py-3" style={{ color: SUB }}>{w.label}</td>
                  <td className="py-3 font-bold" style={{ color: PURPLE }}>{RM(w.total)}</td>
                  <td className="py-3"><Pill tone={w.paid ? "green" : "amber"}>{w.paid ? "Paid" : "Pending"}</Pill></td>
                  <td className="py-3 text-right"><button onClick={(e) => { e.stopPropagation(); setOpenId(w.id); }} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: "#EEF0F4", color: PURPLE }}>Buka</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      </div>
      {openId && <InvoiceModal invId={openId} ctx={ctx} onClose={() => setOpenId(null)} />}
    </>
  );
}

function InvoiceModal({ invId, ctx, onClose }) {
  const { data, settings, sessions, brands, markClaimPaid, reopenClaim, isAdmin, setPage } = ctx;
  const inv = data.invoices.find((w) => w.id === invId);
  const [ref, setRef] = useState("");
  const brandInfo = brands.find((b) => b.id === inv?.brandId);
  const items = useMemo(() => { if (!inv) return []; const set = new Set(inv.sessionIds); return sessions.filter((s) => set.has(s.id)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)); }, [inv, sessions]);
  if (!inv) return null;
  function share() { const txt = `Invoice ${inv.invoiceNo}%0ACompany: ${inv.brand}%0AHost: ${settings.hostName}%0APeriod: ${inv.label}%0AGrand Total: ${RM(inv.total)}%0AStatus: ${inv.paid ? "PAID" : "PENDING"}%0ABank: ${settings.bankName} ${settings.bankAccount}`; window.open(`https://wa.me/?text=${txt}`, "_blank"); }

  return (
    <Modal onClose={onClose} xl>
      <div className="mb-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-2"><FileText size={18} style={{ color: PURPLE }} /><h3 className="text-base font-bold">Invois {inv.invoiceNo}</h3></div>
        <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: SUB }}><X size={18} /></button>
      </div>

      <div id="invoice-print" className="rounded-2xl border p-5" style={{ borderColor: "#F1F0F6" }}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: "#F1F0F6" }}>
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><Activity size={20} className="text-white" /></span><div><p className="text-lg font-extrabold">Host<span style={{ color: PURPLE }}>Income</span></p><p className="text-xs" style={{ color: SUB }}>Invois Perkhidmatan Live Host</p></div></div>
          <div className="text-right"><p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SUB }}>Invois</p><p className="text-base font-extrabold">{inv.invoiceNo}</p><div className="mt-1 flex justify-end"><Pill tone={inv.paid ? "green" : "amber"}>{inv.paid ? "PAID" : "PENDING"}</Pill></div></div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: SUB }}>Billed By</p>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-full" style={{ background: LAV }}>{settings.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg,#C084FC,#7C3AED)" }}>{settings.hostName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>}</div>
              <div><p className="text-sm font-bold">{settings.hostName}</p><p className="text-[11px]" style={{ color: SUB }}>Freelance Live Host</p></div>
            </div>
            <div className="mt-2 space-y-0.5 text-xs" style={{ color: SUB }}>
              {settings.address && <p>{settings.address}</p>}
              {settings.phone && <p>Tel: {settings.phone}</p>}
              {settings.email && <p>{settings.email}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: SUB }}>Bill To</p>
            <div className="flex items-center gap-3 sm:flex-row-reverse">
              <LogoBox src={brandInfo?.logo} name={inv.brand} color={inv.color} size={44} />
              <div className="sm:text-right"><p className="text-sm font-bold">{inv.brand}</p>{brandInfo && <p className="text-[11px]" style={{ color: SUB }}>{RM(brandInfo.rate)}/jam</p>}</div>
            </div>
            <div className="mt-2 space-y-0.5 text-xs" style={{ color: SUB }}>
              {brandInfo?.address && <p>{brandInfo.address}</p>}
              {brandInfo?.phone && <p>Tel: {brandInfo.phone}</p>}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl p-3 sm:grid-cols-4" style={{ background: "#FAFAFE" }}>
          <InvMeta label="Tarikh Invois" value={fmtDate(inv.end)} />
          <InvMeta label="Tempoh" value={inv.label} />
          <InvMeta label="Status" value={inv.paid ? "Sudah Dibayar" : "Belum Dibayar"} />
          <InvMeta label="Tarikh Bayaran" value={inv.paidDate ? fmtDate(inv.paidDate) : "-"} />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: "#F1F0F6" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "#FAFAFE", color: SUB }}><th className="px-4 py-3 text-left font-semibold">Tarikh</th><th className="px-4 py-3 text-left font-semibold">Masa</th><th className="px-4 py-3 text-right font-semibold">Jam</th><th className="px-4 py-3 text-right font-semibold">Rate</th><th className="px-4 py-3 text-right font-semibold">Komisen</th><th className="px-4 py-3 text-right font-semibold">Jumlah</th></tr></thead>
            <tbody>{items.map((s) => (<tr key={s.id} className="border-t" style={{ borderColor: "#F1F0F6" }}><td className="px-4 py-3">{fmtDateShort(s.date)}</td><td className="px-4 py-3">{fmtTime(s.start)}-{fmtTime(s.end)}</td><td className="px-4 py-3 text-right">{s.hours}</td><td className="px-4 py-3 text-right">{RM(s.rate)}</td><td className="px-4 py-3 text-right">{RM(s.commission)}</td><td className="px-4 py-3 text-right font-semibold">{RM(s.income)}</td></tr>))}</tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <div className="order-2 rounded-xl border p-4 lg:order-1" style={{ borderColor: "#E4E0F5", background: "#FCFBFE" }}>
            <p className="flex items-center gap-2 text-xs font-bold"><Landmark size={14} style={{ color: PURPLE }} /> Maklumat Pembayaran</p>
            <p className="mt-2 text-sm" style={{ color: SUB }}>Sila bayar ke akaun berikut:</p>
            <p className="mt-1 text-sm font-bold">{settings.bankName}</p>
            <p className="text-sm font-bold tracking-wide">{settings.bankAccount}</p>
            <p className="text-xs" style={{ color: SUB }}>a/n {settings.hostName}</p>
            {inv.ref && <p className="mt-2 text-xs" style={{ color: SUB }}>Ref bayaran: <b>{inv.ref}</b></p>}
          </div>
          <div className="order-1 flex flex-col justify-between gap-2 lg:order-2">
            <div className="flex items-center justify-between text-sm"><span style={{ color: SUB }}>Hourly Income</span><span className="font-semibold">{RM(inv.hourlyIncome)}</span></div>
            <div className="flex items-center justify-between text-sm"><span style={{ color: SUB }}>Commission</span><span className="font-semibold">{RM(inv.commission)}</span></div>
            <div className="flex items-center justify-between text-sm"><span style={{ color: SUB }}>{inv.sessions} sesi - {H(inv.hours)} jam</span><span> </span></div>
            <div className="mt-1 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><span className="text-sm font-bold text-white">Grand Total</span><span className="text-xl font-extrabold text-white">{RM(inv.total)}</span></div>
          </div>
        </div>

        <p className="mt-5 border-t pt-4 text-center text-[11px]" style={{ borderColor: "#F1F0F6", color: SUB }}>Terima kasih atas kerjasama anda. Invois ini dijana secara automatik oleh HostIncome.</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 no-print">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><Download size={15} /> Download PDF</button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4" }}><Printer size={15} style={{ color: PURPLE }} /> Print</button>
        <button onClick={share} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: "#25D366" }}><Share2 size={15} /> Share WhatsApp</button>
        {!inv.paid && <div className="flex items-center gap-2"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Payment ref (pilihan)" className="rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} /><button onClick={() => { markClaimPaid(inv.id, ref); setRef(""); }} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: "#16A34A" }}><CheckCircle2 size={15} /> Mark As Paid</button></div>}
        {!inv.paid && <button onClick={() => { if (confirm("Buka semula invois ini? Invois akan dipadam dan slot boleh diedit semula di Jadual.")) { reopenClaim(inv.id); onClose(); setPage("jadual"); } }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold" style={{ borderColor: "#FDE68A", color: "#B45309", background: "#FFFBEB" }}><Pencil size={15} /> Buka Semula & Edit</button>}
        {inv.paid && isAdmin && <button onClick={() => { if (confirm("AMARAN: Invois ini SUDAH DIBAYAR.\n\nBuka semula akan PADAM invois & rekod bayaran ini, dan slot kembali boleh diedit di Jadual. Teruskan?")) { reopenClaim(inv.id); onClose(); setPage("jadual"); } }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold" style={{ borderColor: "#FECACA", color: "#DC2626", background: "#FEF2F2" }}><Lock size={15} /> Buka Semula (Admin)</button>}
      </div>
    </Modal>
  );
}
function InvMeta({ label, value }) { return <div><p className="text-xs" style={{ color: SUB }}>{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p></div>; }

/* ============================================================ 7. PEMBAYARAN */
function Pembayaran({ ctx }) {
  const { data } = ctx;
  const rows = data.invoices.map((w) => { const due = iso(addDays(parseISO(w.end), 7)); const status = w.paid ? "Paid" : (parseISO(due) < TODAY ? "Overdue" : "Pending"); return { ...w, due, status }; });
  const totalPaid = rows.filter((r) => r.status === "Paid").reduce((a, r) => a + r.total, 0);
  const totalPending = rows.filter((r) => r.status !== "Paid").reduce((a, r) => a + r.total, 0);
  const toneFor = (s) => (s === "Paid" ? "green" : s === "Overdue" ? "red" : "amber");
  return (
    <>
      <PageHead title="Pembayaran" subtitle="Status bayaran setiap claim / company." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard theme="green" Icon={CheckCircle2} label="Total Paid" value={RM(totalPaid)} sub={`${rows.filter((r) => r.status === "Paid").length} invoice`} />
        <StatCard theme="orange" Icon={CircleDashed} label="Total Pending" value={RM(totalPending)} sub={`${rows.filter((r) => r.status !== "Paid").length} invoice`} />
        <StatCard theme="purple" Icon={Wallet} label="Total Monthly Income" value={RM(data.monthIncome)} sub={data.monthLabel} />
      </div>
      <Panel className="mt-6" title="Senarai Pembayaran">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: SUB }}><th className="pb-3 font-semibold">Company</th><th className="pb-3 font-semibold">Invoice</th><th className="pb-3 font-semibold">Tempoh</th><th className="pb-3 font-semibold">Amount</th><th className="pb-3 font-semibold">Due Date</th><th className="pb-3 font-semibold">Ref</th><th className="pb-3 font-semibold">Status</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center" style={{ color: SUB }}>Tiada pembayaran direkodkan.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "#F1F0F6" }}>
                  <td className="py-3"><span className="flex items-center gap-2 font-semibold"><Dot color={r.color} />{r.brand}</span></td>
                  <td className="py-3 text-xs" style={{ color: SUB }}>{r.invoiceNo}</td><td className="py-3" style={{ color: SUB }}>{r.label}</td><td className="py-3 font-bold" style={{ color: PURPLE }}>{RM(r.total)}</td><td className="py-3" style={{ color: SUB }}>{fmtDate(r.due)}</td><td className="py-3" style={{ color: SUB }}>{r.ref || "-"}</td><td className="py-3"><Pill tone={toneFor(r.status)}>{r.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ============================================================ 8. TETAPAN */
function Tetapan({ ctx }) {
  const { settings, setSettings, flash } = ctx;
  const [f, setF] = useState(settings);
  return (
    <>
      <PageHead title="Tetapan" subtitle="Profil host, maklumat bank & gambar — dipaparkan dalam invoice rasmi." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Profil Host">
          <div className="flex flex-col gap-5">
            <Field label="Gambar Profil"><ImageUpload value={f.photo} onChange={(v) => setF({ ...f, photo: v })} round size={80} label="Muat Naik Gambar" fallback={f.hostName ? f.hostName[0] : "?"} /></Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Host Name"><Input value={f.hostName} onChange={(v) => setF({ ...f, hostName: v })} /></Field>
              <Field label="No. Telefon"><Input value={f.phone} placeholder="+60 12-000 0000" onChange={(v) => setF({ ...f, phone: v })} /></Field>
              <Field label="Email"><Input value={f.email} placeholder="nama@email.com" onChange={(v) => setF({ ...f, email: v })} /></Field>
              <Field label="Currency"><Select value={f.currency} onChange={(v) => setF({ ...f, currency: v })}><option>RM</option><option>SGD</option><option>USD</option></Select></Field>
              <div className="sm:col-span-2"><Field label="Alamat"><Input value={f.address} placeholder="Alamat penuh" onChange={(v) => setF({ ...f, address: v })} /></Field></div>
            </div>
            <div className="border-t pt-5" style={{ borderColor: "#F1F0F6" }}>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Landmark size={15} style={{ color: PURPLE }} /> Maklumat Bank (untuk invoice)</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Nama Bank"><Input value={f.bankName} placeholder="cth: Maybank" onChange={(v) => setF({ ...f, bankName: v })} /></Field>
                <Field label="No. Akaun"><Input value={f.bankAccount} placeholder="0000 0000 0000" onChange={(v) => setF({ ...f, bankAccount: v })} /></Field>
              </div>
            </div>
            <div className="border-t pt-5" style={{ borderColor: "#F1F0F6" }}>
              <Field label="Maximum Slots Per Day"><Select value={f.maxSlots} onChange={(v) => setF({ ...f, maxSlots: Number(v) })}><option value={3}>3 slot</option><option value={4}>4 slot</option><option value={5}>5 slot</option><option value={6}>6 slot</option><option value={8}>8 slot</option></Select></Field>
            </div>
            <button onClick={() => ctx.saveSettings(f)} className="inline-flex w-fit items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", boxShadow: "0 8px 18px rgba(109,40,217,0.28)" }}><CheckCircle2 size={16} /> Save Settings</button>
          </div>
        </Panel>
        <Panel title="Pratonton Invoice" className="self-start">
          <div className="rounded-2xl border p-5" style={{ borderColor: "#F1F0F6" }}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: SUB }}>Billed By</p>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full" style={{ background: LAV }}>{f.photo ? <img src={f.photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-white" style={{ background: "linear-gradient(135deg,#C084FC,#7C3AED)" }}>{f.hostName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>}</div>
              <div><p className="text-sm font-bold">{f.hostName}</p><p className="text-xs" style={{ color: SUB }}>Freelance Live Host</p></div>
            </div>
            <div className="mt-3 space-y-1 text-xs" style={{ color: SUB }}>
              {f.address && <p className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0" />{f.address}</p>}
              {f.phone && <p className="flex items-center gap-1.5"><Phone size={12} />{f.phone}</p>}
              {f.email && <p className="flex items-center gap-1.5"><Mail size={12} />{f.email}</p>}
            </div>
            <div className="mt-3 rounded-xl p-3" style={{ background: LAV }}><p className="text-[11px] font-semibold" style={{ color: SUB }}>Bayaran ke akaun</p><p className="text-sm font-bold">{f.bankName} · {f.bankAccount}</p></div>
          </div>
        </Panel>
      </div>
    </>
  );
}
