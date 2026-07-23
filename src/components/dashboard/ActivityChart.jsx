import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { CalendarDays, RefreshCw, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { getChartData } from "@/services/dashboardService";

const STATUS_COLORS = {
  Menunggu:   "hsl(38 92% 50%)",
  Diarsipkan: "hsl(142 71% 35%)",
  Ditolak:    "hsl(0 72% 51%)",
};

const BULAN_ID    = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const BULAN_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const HARI        = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const DAYS_HEADER = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_SHORT[d.getMonth()]}`;
}
function formatMonthLabel(monthStr) {
  const [y, m] = monthStr.split("-");
  return `${BULAN_SHORT[Number(m) - 1]} ${y}`;
}
const fmt = (d) => d.toISOString().split("T")[0];
const fmtDisplay = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function SmartDateRangePicker({ value, onChange, label }) {
  const today      = new Date();
  const todayStr   = fmt(today);
  const [open, setOpen]         = useState(false);
  const [selecting, setSelecting] = useState("from"); 
  const [hovered,   setHovered]   = useState(null);
  const [draft,     setDraft]     = useState(value);
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() > 0 ? today.getMonth() - 1 : 0);
  const [popupPos,  setPopupPos]  = useState({ top: 0, left: 0 });

  const btnRef   = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (!popupRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const buildCalendar = (year, month) => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = Array(first).fill(null);
    for (let d = 1; d <= total; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  };

  const isInRange = (dateStr) => {
    if (!draft.from) return false;
    const t = draft.to || hovered || "";
    if (!t) return false;
    const [lo, hi] = draft.from <= t ? [draft.from, t] : [t, draft.from];
    return dateStr > lo && dateStr < hi;
  };
  const isStart = (d) => d === draft.from;
  const isEnd   = (d) => d === (draft.to || hovered || "");

  const handleDay = (dateStr) => {
    if (dateStr > todayStr) return;
    if (selecting === "from") {
      setDraft({ from: dateStr, to: "" });
      setSelecting("to");
    } else {
      const [from, to] = draft.from <= dateStr ? [draft.from, dateStr] : [dateStr, draft.from];
      setDraft({ from, to });
      setSelecting("from");
    }
  };

  const apply = () => {
    if (draft.from && draft.to) {
      onChange(draft);
      setOpen(false);
    }
  };

  const reset = () => {
    const def = {
      from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      to:   todayStr,
    };
    setDraft(def);
    onChange(def);
    setSelecting("from");
    setOpen(false);
  };

  const openPicker = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const popupW = 560, popupH = 420, gap = 8;
      let top  = rect.bottom + gap;
      let left = rect.right - popupW;
      if (window.innerHeight - rect.bottom < popupH && rect.top > popupH) {
        top = rect.top - popupH - gap;
      }
      left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
      top  = Math.max(8, top);
      setPopupPos({ top, left });
    }
    setDraft(value);
    setSelecting("from");
    setOpen((o) => !o);
  };

  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;

  const displayLabel = value.from && value.to
    ? `${fmtDisplay(value.from)} - ${fmtDisplay(value.to)}`
    : label || "Pilih rentang tanggal";

  const renderCalendar = (year, month, showLeft, showRight) => {
    const cells = buildCalendar(year, month);
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          {showLeft ? (
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : <span className="w-7" />}

          <span className="text-sm font-bold text-foreground">
            {BULAN_ID[month]} {year}
          </span>

          {showRight ? (
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : <span className="w-7" />}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {DAYS_HEADER.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={`e-${i}`} />;
            const start    = isStart(dateStr);
            const end      = isEnd(dateStr);
            const inRange  = isInRange(dateStr);
            const isFuture = dateStr > todayStr;
            const isToday  = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => handleDay(dateStr)}
                onMouseEnter={() => selecting === "to" && !isFuture && setHovered(dateStr)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "text-center text-xs py-1.5 font-medium transition-all rounded-lg",
                  isFuture ? "text-muted-foreground/30 cursor-not-allowed" : "cursor-pointer hover:bg-primary/10",
                  (start || end) && "!text-primary-foreground font-bold",
                  inRange && !start && !end && "!rounded-none bg-primary/10 text-primary",
                  isToday && !start && !end && "ring-1 ring-primary/40 text-primary font-semibold",
                )}
                style={
                  start || end
                    ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                    : undefined
                }
              >
                {parseInt(dateStr.split("-")[2])}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openPicker}
        className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors bg-card"
      >
        <CalendarDays size={14} className="text-primary" />
        <span className="text-xs font-medium text-foreground">{displayLabel}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground ml-0.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            top:      popupPos.top,
            left:     popupPos.left,
            zIndex:   9999,
            width:    560,
          }}
          className="bg-card border border-border rounded-2xl shadow-2xl p-5"
        >
          <p className="text-[10px] font-semibold text-muted-foreground mb-4 text-center uppercase tracking-widest">
            {selecting === "from" ? "Pilih Tanggal Mulai" : "Pilih Tanggal Akhir"}
          </p>

          <div className="grid grid-cols-2 gap-6">
            {renderCalendar(viewYear,  viewMonth,  true,  false)}
            {renderCalendar(rightYear, rightMonth, false, true)}
          </div>

          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border">
            <button
              onClick={reset}
              className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:border-border/80 hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              onClick={apply}
              disabled={!draft.from || !draft.to}
              className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Month Range Picker 
function MonthRangePicker({ monthFrom, monthTo, onApply }) {
  const today       = new Date();
  const currentYear = today.getFullYear();
  const todayMonth  = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); 

  const [open,      setOpen]      = useState(false);
  const [selecting, setSelecting] = useState("from"); 
  const [hovered,   setHovered]   = useState(null);
  const [draft,     setDraft]     = useState({
    from: fmt(monthFrom),
    to:   fmt(monthTo),
  });
  const [viewYear,  setViewYear]  = useState(currentYear - 1); 
  const [popupPos,  setPopupPos]  = useState({ top: 0, left: 0 });

  const btnRef   = useRef(null);
  const popupRef = useRef(null);

  const toMonthStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  useEffect(() => {
    setDraft({ from: toMonthStr(monthFrom), to: toMonthStr(monthTo) });
  }, [monthFrom, monthTo]);

  useEffect(() => {
    const handler = (e) => {
      if (!popupRef.current?.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPicker = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const popupW = 480, popupH = 360, gap = 8;
      let top  = rect.bottom + gap;
      let left = rect.right - popupW;
      if (window.innerHeight - rect.bottom < popupH && rect.top > popupH)
        top = rect.top - popupH - gap;
      left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
      top  = Math.max(8, top);
      setPopupPos({ top, left });
    }
    setDraft({ from: toMonthStr(monthFrom), to: toMonthStr(monthTo) });
    setSelecting("from");
    setOpen((o) => !o);
  };

  const addMonths = (ms, n) => {
    const d = new Date(ms);
    d.setMonth(d.getMonth() + n);
    return toMonthStr(d);
  };

  const isInRange = (ms) => {
    if (!draft.from) return false;
    const t = draft.to || hovered || "";
    if (!t) return false;
    const [lo, hi] = draft.from <= t ? [draft.from, t] : [t, draft.from];
    return ms > lo && ms < hi;
  };
  const isStart = (ms) => ms === draft.from;
  const isEnd   = (ms) => ms === (draft.to || hovered || "");

  const handleCell = (ms) => {
    if (ms > todayMonth) return;
    if (selecting === "from") {
      setDraft({ from: ms, to: "" });
      setSelecting("to");
    } else {
      let [f, t] = draft.from <= ms ? [draft.from, ms] : [ms, draft.from];
      if (f === t) t = addMonths(f, 1); 
      setDraft({ from: f, to: t });
      setSelecting("from");
    }
  };

  const apply = () => {
    if (draft.from && draft.to) {
      onApply(new Date(draft.from), new Date(draft.to));
      setOpen(false);
    }
  };

  const reset = () => {
    const f = toMonthStr(new Date(today.getFullYear(), today.getMonth() - 2, 1));
    const t = todayMonth;
    setDraft({ from: f, to: t });
    onApply(new Date(f), new Date(t));
    setOpen(false);
  };

  const renderYear = (year) => {
    const isPrevYear = year === viewYear;
    const isNextYear = year === viewYear + 1;
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          {isPrevYear ? (
            <button
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : <span className="w-7" />}

          <span className="text-sm font-bold text-foreground">{year}</span>

          {isNextYear ? (
            <button
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear + 1 >= currentYear}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : <span className="w-7" />}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {BULAN_SHORT.map((bln, m) => {
            const ms       = `${year}-${String(m + 1).padStart(2, "0")}-01`;
            const start    = isStart(ms);
            const end      = isEnd(ms);
            const inRange  = isInRange(ms);
            const isFuture = ms > todayMonth;

            return (
              <button
                key={ms}
                disabled={isFuture}
                onClick={() => handleCell(ms)}
                onMouseEnter={() => selecting === "to" && !isFuture && setHovered(ms)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all text-center",
                  isFuture ? "text-muted-foreground/30 cursor-not-allowed" : "cursor-pointer hover:bg-primary/10",
                  (start || end) && "!text-primary-foreground font-bold",
                  inRange && !start && !end && "bg-primary/10 text-primary !rounded-none",
                )}
                style={
                  start || end
                    ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                    : undefined
                }
              >
                {bln}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const monthLabel = `${format(monthFrom, "MMM yyyy")} - ${format(monthTo, "MMM yyyy")}`;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openPicker}
        className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors bg-card"
      >
        <CalendarDays size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{monthLabel}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground ml-0.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          ref={popupRef}
          style={{ position: "fixed", top: popupPos.top, left: popupPos.left, zIndex: 9999, width: 480 }}
          className="bg-card border border-border rounded-2xl shadow-2xl p-5"
        >
          <p className="text-[10px] font-semibold text-muted-foreground mb-4 text-center uppercase tracking-widest">
            {selecting === "from" ? "Pilih Bulan Mulai" : "Pilih Bulan Akhir (min. 2 bulan)"}
          </p>

          <div className="grid grid-cols-2 gap-6">
            {renderYear(viewYear)}
            {renderYear(viewYear + 1)}
          </div>

          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border">
            <button
              onClick={reset}
              className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              onClick={apply}
              disabled={!draft.from || !draft.to}
              className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ActivityChart({ onDateClick }) {
  const today = new Date();

  const [period, setPeriod] = useState("weekly");

  // Weekly range state
  const [weekRange, setWeekRange] = useState({
    from: fmt(startOfWeek(today, { weekStartsOn: 1 })),
    to:   fmt(endOfWeek(today,   { weekStartsOn: 1 })),
  });

  // Monthly range state
  const [monthFrom, setMonthFrom] = useState(startOfMonth(addDays(today, -60)));
  const [monthTo,   setMonthTo]   = useState(startOfMonth(today));

  const [chartData,     setChartData]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [visibleLines,  setVisibleLines]  = useState(new Set(["Menunggu", "Diarsipkan", "Ditolak"]));

  const fetchChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fromStr = period === "weekly" ? weekRange.from : fmt(monthFrom);
      const toStr   = period === "weekly" ? weekRange.to   : fmt(monthTo);

      const result = await getChartData({ period, from: fromStr, to: toStr });

      const transformed = (result.data || []).map((row) =>
        period === "weekly"
          ? { name: formatDateLabel(row.date),   date: row.date,  Menunggu: row.Menunggu || 0, Diarsipkan: row.Diarsipkan || 0, Ditolak: row.Ditolak || 0 }
          : { name: formatMonthLabel(row.month), date: row.month, Menunggu: row.Menunggu || 0, Diarsipkan: row.Diarsipkan || 0, Ditolak: row.Ditolak || 0 }
      );
      setChartData(transformed);
    } catch (err) {
      setError(err.message || "Gagal memuat data chart");
    } finally {
      setLoading(false);
    }
  }, [period, weekRange, monthFrom, monthTo]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  const handleDotClick = (status) => (payload) => {
    if (payload?.payload?.date) onDateClick(payload.payload.date, status);
  };

  const handleLegendClick = (e) => {
    const key = e?.value || e?.dataKey;
    if (!key) return;
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const renderLegend = (props) => {
    const { payload } = props;
    if (!payload) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {payload.map((entry) => {
          const active = visibleLines.has(entry.value);
          return (
            <button key={entry.value} onClick={() => handleLegendClick(entry)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                active ? "border-border bg-card shadow-sm" : "border-transparent bg-muted/50 opacity-50"
              )}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.value}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Aktivitas {period === "weekly" ? "Mingguan" : "Bulanan"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Klik titik grafik untuk melihat dokumen, klik legend untuk toggle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === "weekly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bulanan
            </button>
          </div>

          {error && (
            <button
              onClick={fetchChart}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              <RefreshCw size={12} /> Coba Lagi
            </button>
          )}

          {/* Date pickers */}
          {period === "weekly" ? (
            <SmartDateRangePicker
              value={weekRange}
              onChange={setWeekRange}
            />
          ) : (
            <MonthRangePicker
              monthFrom={monthFrom}
              monthTo={monthTo}
              onApply={(f, t) => { setMonthFrom(f); setMonthTo(t); }}
            />
          )}
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <RefreshCw size={24} className="animate-spin" />
            <span className="text-sm">Memuat data grafik…</span>
          </div>
        </div>
      ) : error ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle size={24} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          Tidak ada data pada periode ini.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} style={{ cursor: "pointer" }}>
            <defs>
              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(340 12% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(220 10% 46%)" angle={-25} textAnchor="end" height={60} interval={chartData.length > 14 ? 2 : 0} />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(0 0% 100%)", border: "1px solid hsl(340 12% 90%)", borderRadius: "8px", fontSize: "13px" }} />
            <Legend content={renderLegend} />
            {["Menunggu", "Diarsipkan", "Ditolak"].map((key) => (
              <Area key={key} type="monotone" dataKey={key} stroke={STATUS_COLORS[key]} fill={`url(#gradient-${key})`}
                strokeWidth={visibleLines.has(key) ? 2 : 0} fillOpacity={visibleLines.has(key) ? 1 : 0}
                dot={visibleLines.has(key) ? { r: 4, fill: STATUS_COLORS[key] } : false}
                activeDot={visibleLines.has(key) ? { r: 6, onClick: handleDotClick(key), cursor: "pointer" } : false}
                hide={!visibleLines.has(key)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}