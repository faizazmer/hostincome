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
function halfHours(h) { return Math.floor((Number(h) || 0) * 2) / 2; } // bundar ke bawah ke 0.5 jam
function kpiTargetFor(c, hours) { return halfHours(hours) * (Number(c.perHour) || 0); }
function computeCommission(brand, sales, hours) {
  const c = brand && brand.commission; const s = Number(sales || 0);
  if (!c || c.type === "manual" || !c.type) return null;
  if (c.type === "percent") return s * (Number(c.percent) || 0) / 100;
  if (c.type === "kpi") { const th = Number(c.threshold) || 0; return s > th ? (s - th) * (Number(c.percent) || 0) / 100 : 0; }
  if (c.type === "kpi_hourly") { const th = kpiTargetFor(c, hours); return s > th ? (s - th) * (Number(c.percent) || 0) / 100 : 0; }
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
  if (c.type === "kpi_hourly") return `KPI ${RM(c.perHour || 0)}/jam × ${c.percent || 0}%`;
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
      const comm = computeCommission(b, sales, hrs); const commission = comm != null ? Math.round(comm) : Math.round(sales * 0.05);
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
        <div className="mb-5 flex items-center justify-center">
          <img src={LOGO_STACK} alt="HostIncome" className="h-24 w-auto" style={{ objectFit: "contain" }} draggable={false} />
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
  function setClaimAdjustment(id, amount, note) {
    const patch = { adjustment: Number(amount || 0), adjustmentNote: note || "" };
    if (cloud && fb.current) { fb.current.update(fb.current.path(`claims/${id}`), patch); }
    else { setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))); }
    flash("Pelarasan invois disimpan.");
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
  const ctx = { brands, sessions, claims, data, settings, setSettings, saveSettings, cloud, upsertSession, deleteSession, addBrand, updateBrand, deleteBrand, createClaim, markClaimPaid, reopenClaim, setClaimAdjustment, setPage, flash, isAdmin, authUser, profile, users, markTutorialSeen, demo, exitDemo, login, register, logout, setUserRole, setUserStatus, deleteUserRecord, resendVerification, reloadUser };

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
          .print-only { display: flex !important; visibility: visible !important; }
        }
        .print-only { display: none; }
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
  // Pelarasan: hanya invois DIBAYAR, diletak ikut tempoh live (tarikh akhir invois)
  const monthAdjustment = claims.filter((c) => c.paid && c.adjustment && (() => { const d = parseISO(c.end); return d.getMonth() === monthIdx && d.getFullYear() === year; })()).reduce((a, c) => a + (c.adjustment || 0), 0);
  const invoices = claims.map((c) => ({ ...c, color: c.color || bById[c.brandId]?.color || PURPLE, label: rangeLabel(c.start, c.end), adjustment: c.adjustment || 0, grandTotal: (c.total || 0) + (c.adjustment || 0) }))
    .sort((a, b) => b.start.localeCompare(a.start) || (b.id > a.id ? 1 : -1));
  const pendingInvoices = invoices.filter((c) => !c.paid);

  return {
    todayStr, monthLabel: `${MONTHS_FULL[monthIdx]} ${year}`,
    today, todayDone: today.filter(isDone), todayIncome: sumD(today, (x) => x.income), todayHours: sumD(today, (x) => x.hours),
    weekIncome: sumD(calWeek, (x) => x.income), weekSessions: cntD(calWeek), weekHours: sumD(calWeek, (x) => x.hours),
    monthIncome: sumD(thisMonth, (x) => x.income), monthSessions: cntD(thisMonth), monthHours: sumD(thisMonth, (x) => x.hours), monthCommission: sumD(thisMonth, (x) => x.commission), monthHourly: sumD(thisMonth, (x) => x.hours * x.rate),
    monthAdjustment, monthTotal: sumD(thisMonth, (x) => x.income) + monthAdjustment,
    invoices, pendingInvoices, claimedSessionIds, lockedSessionIds: claimedSessionIds, bById,
  };
}

/* ============================================================ SIDEBAR */
const LOGO_FULL = "data:image/png;base64,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";
const LOGO_ICON = "data:image/png;base64,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";
const LOGO_STACK = "data:image/png;base64,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";
function Brand({ icon }) { return <img src={icon ? LOGO_ICON : LOGO_FULL} alt="HostIncome" className={icon ? "h-9 w-9 rounded-xl" : "h-9 w-auto"} style={{ display: "block", objectFit: "contain" }} draggable={false} />; }
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
        <p className="mt-3 text-[11px] font-medium" style={{ color: SUB }}>Jumlah Pendapatan</p><p className="text-xl font-extrabold" style={{ color: INK }}>{RM(data.monthTotal)}</p>
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
function NextLiveBar({ next, live, now, ctx }) {
  if (live) {
    const s = live.s;
    const endMs = (() => { const en = new Date(sessionStartDate(s)); const [h, m] = s.end.split(":").map(Number); en.setHours(h, m, 0, 0); return en.getTime(); })();
    return (
      <div className="relative overflow-hidden rounded-2xl p-4 text-white sm:p-5" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)", boxShadow: "0 12px 30px rgba(220,38,38,0.32)" }}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Sedang Live</p>
            <p className="mt-1 truncate text-lg font-extrabold sm:text-xl">{s.brand}</p>
            <p className="text-xs opacity-90">{fmtTime(s.start)} – {fmtTime(s.end)}</p>
          </div>
          <div className="shrink-0 rounded-xl px-3 py-2 text-center sm:text-right" style={{ background: "rgba(255,255,255,0.18)" }}>
            <p className="text-[10px] uppercase tracking-wide opacity-90">tamat dalam</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums sm:text-3xl">{fmtCountdown(endMs - now)}</p>
          </div>
        </div>
      </div>
    );
  }
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

  const live = useMemo(() => {
    const nowMs = now.getTime();
    const on = sessions.filter((s) => s.status === "Belum Live").map((s) => { const st = sessionStartDate(s); const en = new Date(st); const [h, m] = s.end.split(":").map(Number); en.setHours(h, m, 0, 0); return { s, st, en }; }).filter((x) => nowMs >= x.st.getTime() && nowMs < x.en.getTime()).sort((a, b) => a.en - b.en);
    return on[0] || null;
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
      <NextLiveBar next={next} live={live} now={now} ctx={ctx} />

      {/* STAT CARDS (3) */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1"><StatCard theme="purple" Icon={Wallet} label="Pendapatan Hari Ini" value={RM(data.todayIncome)} sub={`${data.todayDone.length} sesi selesai`} /></div>
        <StatCard theme="green" Icon={TrendingUp} label="Minggu Ini" value={RM(data.weekIncome)} sub={`${data.weekSessions} sesi`} />
        <StatCard theme="orange" Icon={DollarSign} label="Bulan Ini" value={RM(data.monthTotal)} sub={data.monthAdjustment ? `${RM(data.monthIncome)} + pelarasan` : `${data.monthSessions} sesi`} />
        <StatCard theme="teal" Icon={Coins} label="Pelarasan (Bulan)" value={RM(data.monthAdjustment)} sub="dari invois dibayar" />
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
  const autoComm = computeCommission(brand, f.sales, hours);
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
          <Field label="Komisen (auto ikut struktur brand)"><div className="flex items-center justify-between rounded-xl border px-3.5 py-2.5" style={{ borderColor: "#E4E0F5", background: LAV }}><span className="text-sm font-extrabold" style={{ color: PURPLE }}>{RM(autoComm)}</span><span className="text-[11px] font-semibold" style={{ color: SUB }}>{brand?.commission?.type === "kpi_hourly" ? `KPI ${RM(kpiTargetFor(brand.commission, hours))} (${H(halfHours(hours))}j)` : commissionRuleLabel(brand.commission)}</span></div></Field>
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
  const [openInv, setOpenInv] = useState(null);

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
                      <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><Dot color={c.color} />{c.brand}</span><span className="text-sm font-extrabold" style={{ color: PURPLE }}>{RM(c.grandTotal || c.total)}</span></div>
                      <p className="mt-0.5 text-[11px]" style={{ color: SUB }}>{c.invoiceNo} · {c.label}</p>
                      <button onClick={() => setOpenInv(c.id)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-white" style={{ background: "#16A34A" }}><CheckCircle2 size={13} /> Buka & Tandai Dibayar</button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
      {openInv && <InvoiceModal invId={openInv} ctx={ctx} onClose={() => setOpenInv(null)} />}
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
    if (t === "kpi_hourly") { base.perHour = comm.perHour ?? 400; base.percent = comm.percent ?? 10; }
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
    if (ct === "kpi_hourly") { commission.perHour = Number(comm.perHour || 0); commission.percent = Number(comm.percent || 0); }
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
                  <option value="kpi_hourly">KPI ikut jam — RM/jam × %</option>
                  <option value="tiered">Berperingkat — capai RM, dapat %</option>
                </Select>
              </Field>
              {comm.type === "percent" && (
                <div className="mt-3"><Field label="Peratus dari sales (%)"><Input type="number" value={comm.percent ?? ""} onChange={(v) => setComm("percent", v)} placeholder="cth: 10" /></Field><p className="mt-1 text-[11px]" style={{ color: SUB }}>Komisen = sales × %. Cth sales RM100 × 10% = RM10.</p></div>
              )}
              {comm.type === "kpi" && (
                <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Sasaran KPI (RM)"><Input type="number" value={comm.threshold ?? ""} onChange={(v) => setComm("threshold", v)} placeholder="cth: 800" /></Field><Field label="Peratus baki (%)"><Input type="number" value={comm.percent ?? ""} onChange={(v) => setComm("percent", v)} placeholder="cth: 20" /></Field><p className="col-span-2 -mt-1 text-[11px]" style={{ color: SUB }}>Komisen = (sales − sasaran) × %. Cth sales RM1000, sasaran RM800 → RM200 × 20% = RM40. Bawah sasaran = RM0.</p></div>
              )}
              {comm.type === "kpi_hourly" && (
                <div className="mt-3 grid grid-cols-2 gap-3"><Field label="KPI per jam (RM)"><Input type="number" value={comm.perHour ?? ""} onChange={(v) => setComm("perHour", v)} placeholder="cth: 400" /></Field><Field label="Peratus baki (%)"><Input type="number" value={comm.percent ?? ""} onChange={(v) => setComm("percent", v)} placeholder="cth: 10" /></Field><p className="col-span-2 -mt-1 text-[11px]" style={{ color: SUB }}>Sasaran = jam × RM/jam, dibundar <b>ke bawah</b> setiap ½ jam. Cth RM400/jam: 2j → RM800; 2j 30m → RM1000; 2j 15m → masih RM800. Komisen = (sales − sasaran) × %.</p></div>
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

  const claims = ctx.claims;
  const inRange = sessions.filter((s) => isDone(s) && s.date >= from && s.date <= to && (brandF === "all" || s.brandId === brandF));
  const adjInRange = claims.filter((c) => c.paid && c.adjustment && c.end >= from && c.end <= to && (brandF === "all" || c.brandId === brandF));
  const adjTotal = adjInRange.reduce((a, c) => a + (c.adjustment || 0), 0);
  const liveIncome = inRange.reduce((a, s) => a + s.income, 0);
  const income = liveIncome + adjTotal;
  const hours = inRange.reduce((a, s) => a + s.hours, 0);
  const commission = inRange.reduce((a, s) => a + s.commission, 0);
  const hourly = inRange.reduce((a, s) => a + s.hours * s.rate, 0);
  const activeDays = new Set(inRange.map((s) => s.date)).size;

  const spanDays = Math.round((parseISO(to) - parseISO(from)) / 86400000);
  const byWeek = spanDays > 45;
  const buckets = {};
  inRange.forEach((s) => { const key = byWeek ? iso(getMonday(parseISO(s.date))) : s.date; (buckets[key] ||= { income: 0, comm: 0 }); buckets[key].income += s.income; buckets[key].comm += s.commission; });
  adjInRange.forEach((c) => { const key = byWeek ? iso(getMonday(parseISO(c.end))) : c.end; (buckets[key] ||= { income: 0, comm: 0 }); buckets[key].income += (c.adjustment || 0); });
  const series = Object.keys(buckets).sort().map((k) => ({ name: fmtDateShort(k), Pendapatan: Math.round(buckets[k].income), Komisen: Math.round(buckets[k].comm) }));

  const byBrand = {};
  inRange.forEach((s) => { const b = (byBrand[s.brandId] ||= { name: s.brand, income: 0, sessions: 0, hours: 0, color: data.bById[s.brandId]?.color || PURPLE }); b.income += s.income; b.sessions++; b.hours += s.hours; });
  adjInRange.forEach((c) => { const b = (byBrand[c.brandId] ||= { name: c.brand, income: 0, sessions: 0, hours: 0, color: data.bById[c.brandId]?.color || PURPLE }); b.income += (c.adjustment || 0); });
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
              <p className="mt-1 text-[11px]" style={{ color: SUB }}>{inRange.length} sesi · {activeDays} hari aktif{adjTotal ? ` · +${RM(adjTotal)} pelarasan` : ""}</p>
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

  const totalPending = filtered.filter((w) => !w.paid).reduce((a, w) => a + w.grandTotal, 0);

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
                  <td className="py-3 font-bold" style={{ color: PURPLE }}>{RM(w.grandTotal)}</td>
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
  const { data, settings, sessions, brands, markClaimPaid, reopenClaim, setClaimAdjustment, isAdmin, setPage } = ctx;
  const inv = data.invoices.find((w) => w.id === invId);
  const [adj, setAdj] = useState(inv && inv.adjustment ? String(inv.adjustment) : "");
  const [adjNote, setAdjNote] = useState((inv && inv.adjustmentNote) || "");
  const [paidAmt, setPaidAmt] = useState(inv ? (Math.round(inv.grandTotal * 100) / 100).toFixed(2) : "");
  const [ref, setRef] = useState("");
  const brandInfo = brands.find((b) => b.id === inv?.brandId);
  const items = useMemo(() => { if (!inv) return []; const set = new Set(inv.sessionIds); return sessions.filter((s) => set.has(s.id)).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)); }, [inv, sessions]);
  if (!inv) return null;
  function share() { const txt = `Invoice ${inv.invoiceNo}%0ACompany: ${inv.brand}%0AHost: ${settings.hostName}%0APeriod: ${inv.label}%0AGrand Total: ${RM(inv.grandTotal)}%0AStatus: ${inv.paid ? "PAID" : "PENDING"}%0ABank: ${settings.bankName} ${settings.bankAccount}`; window.open(`https://wa.me/?text=${txt}`, "_blank"); }

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
            {inv.adjustment ? <div className="print-only items-center justify-between text-sm"><span style={{ color: SUB }}>Pelarasan{inv.adjustmentNote ? ` (${inv.adjustmentNote})` : ""}</span><span className="font-semibold" style={{ color: inv.adjustment >= 0 ? "#15803D" : "#DC2626" }}>{inv.adjustment >= 0 ? "+" : ""}{RM(inv.adjustment)}</span></div> : null}
            <div className="no-print flex items-center justify-between gap-2 text-sm">
              <span style={{ color: SUB }}>Pelarasan (Lebihan/Kurang)</span>
              <div className="flex items-center gap-1"><span className="text-xs" style={{ color: SUB }}>RM</span><input type="number" value={adj} onChange={(e) => setAdj(e.target.value)} onBlur={() => setClaimAdjustment(inv.id, adj, adjNote)} placeholder="0.00" className="w-24 rounded-lg border px-2 py-1 text-right text-sm font-semibold outline-none" style={{ borderColor: "#E4E0F5", color: Number(adj) < 0 ? "#DC2626" : "#15803D" }} /></div>
            </div>
            <div className="no-print"><input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} onBlur={() => setClaimAdjustment(inv.id, adj, adjNote)} placeholder="Nota pelarasan (cth: jualan lewat)" className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none" style={{ borderColor: "#EEF0F4" }} /></div>
            <div className="flex items-center justify-between text-sm"><span style={{ color: SUB }}>{inv.sessions} sesi - {H(inv.hours)} jam</span><span> </span></div>
            <div className="mt-1 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><span className="text-sm font-bold text-white">Grand Total</span><span className="text-xl font-extrabold text-white">{RM(inv.grandTotal)}</span></div>
          </div>
        </div>

        <p className="mt-5 border-t pt-4 text-center text-[11px]" style={{ borderColor: "#F1F0F6", color: SUB }}>Terima kasih atas kerjasama anda. Invois ini dijana secara automatik oleh HostIncome.</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 no-print">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}><Download size={15} /> Download PDF</button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "#EEF0F4" }}><Printer size={15} style={{ color: PURPLE }} /> Print</button>
        <button onClick={share} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: "#25D366" }}><Share2 size={15} /> Share WhatsApp</button>
        {!inv.paid && (() => {
          const base = inv.total; const paid = paidAmt === "" ? base : Number(paidAmt); const lebihan = Math.round((paid - base) * 100) / 100;
          return (
            <div className="flex w-full flex-wrap items-end gap-2 rounded-xl border p-3" style={{ borderColor: "#BBF7D0", background: "#F0FDF4" }}>
              <div><p className="mb-1 text-xs font-bold" style={{ color: SUB }}>Jumlah Dibayar (RM)</p><input type="number" value={paidAmt} onChange={(e) => setPaidAmt(e.target.value)} className="w-32 rounded-xl border px-3 py-2.5 text-sm font-bold outline-none" style={{ borderColor: "#86EFAC" }} /></div>
              <div><p className="mb-1 text-xs font-bold" style={{ color: SUB }}>Ref bayaran (pilihan)</p><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="cth: TRX123" className="w-36 rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#E6E6EE" }} /></div>
              <button onClick={() => { const note = adjNote || (lebihan !== 0 ? "Pelarasan bayaran" : ""); if (lebihan !== 0 || Number(adj || 0) !== lebihan) setClaimAdjustment(inv.id, lebihan, note); markClaimPaid(inv.id, ref); setRef(""); }} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: "#16A34A" }}><CheckCircle2 size={15} /> Sahkan Dibayar</button>
              <p className="w-full text-[11px]" style={{ color: SUB }}>Jumlah asal <b>{RM(base)}</b>. Lebihan auto: <b style={{ color: lebihan >= 0 ? "#15803D" : "#DC2626" }}>{lebihan >= 0 ? "+" : ""}{RM(lebihan)}</b> → masuk ke Pelarasan. Boleh edit di baris Pelarasan di atas.</p>
            </div>
          );
        })()}
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
  const totalPaid = rows.filter((r) => r.status === "Paid").reduce((a, r) => a + r.grandTotal, 0);
  const totalPending = rows.filter((r) => r.status !== "Paid").reduce((a, r) => a + r.grandTotal, 0);
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
                  <td className="py-3 text-xs" style={{ color: SUB }}>{r.invoiceNo}</td><td className="py-3" style={{ color: SUB }}>{r.label}</td><td className="py-3 font-bold" style={{ color: PURPLE }}>{RM(r.grandTotal)}</td><td className="py-3" style={{ color: SUB }}>{fmtDate(r.due)}</td><td className="py-3" style={{ color: SUB }}>{r.ref || "-"}</td><td className="py-3"><Pill tone={toneFor(r.status)}>{r.status}</Pill></td>
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
