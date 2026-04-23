// Icons: compact inline SVG set
window.Icon = ({ name, size = 18, stroke = 1.75, style }) => {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", style };
  const P = {
    dashboard: <g><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></g>,
    building: <g><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M15 9h3a2 2 0 0 1 2 2v10"/><path d="M8 7h2"/><path d="M8 11h2"/><path d="M8 15h2"/></g>,
    door: <g><rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="15" cy="12" r="1" fill="currentColor"/></g>,
    users: <g><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14c3 0 6 2 6 5"/></g>,
    wrench: <g><path d="M14.7 6.3a4 4 0 0 1 5.3 5.3l-2.6-2.6-1.4 1.4 2.6 2.6a4 4 0 0 1-5.3-5.3z"/><path d="M13.5 10.5 4 20a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l9.5-9.5"/></g>,
    box: <g><path d="M3 7 12 3l9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4"/><path d="M12 11v10"/></g>,
    chart: <g><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></g>,
    user: <g><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></g>,
    calendar: <g><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4"/><path d="M16 2v4"/></g>,
    plus: <g><path d="M12 5v14M5 12h14"/></g>,
    search: <g><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></g>,
    bell: <g><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></g>,
    sun: <g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></g>,
    moon: <g><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></g>,
    globe: <g><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></g>,
    arrowRight: <g><path d="M5 12h14M13 5l7 7-7 7"/></g>,
    arrowUp: <g><path d="M12 19V5M5 12l7-7 7 7"/></g>,
    arrowDown: <g><path d="M12 5v14M19 12l-7 7-7-7"/></g>,
    logout: <g><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></g>,
    check: <g><path d="m5 12 5 5L20 7"/></g>,
    x: <g><path d="M18 6 6 18M6 6l12 12"/></g>,
    alert: <g><path d="M10.3 3.9 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></g>,
    clock: <g><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
    sparkle: <g><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2"/></g>,
    mapPin: <g><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></g>,
    filter: <g><path d="M4 4h16l-6 8v7l-4-2v-5L4 4z"/></g>,
    menu: <g><path d="M4 6h16M4 12h16M4 18h16"/></g>,
    chevronLeft: <g><path d="m15 18-6-6 6-6"/></g>,
    chevronRight: <g><path d="m9 6 6 6-6 6"/></g>,
    chevronDown: <g><path d="m6 9 6 6 6-6"/></g>,
    image: <g><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></g>,
    upload: <g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></g>,
    home: <g><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></g>,
    history: <g><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></g>,
    edit: <g><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></g>,
    eye: <g><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></g>,
    phone: <g><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z"/></g>,
    mail: <g><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/></g>,
    lock: <g><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></g>,
    settings: <g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>,
    trendUp: <g><path d="m3 17 6-6 4 4 8-8"/><path d="M21 7h-6M21 7v6"/></g>,
    cube: <g><path d="m12 2 10 5v10l-10 5-10-5V7z"/><path d="m2 7 10 5 10-5"/><path d="M12 22V12"/></g>,
    clipboard: <g><rect x="7" y="4" width="10" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M8 12h8M8 16h6"/></g>,
  };
  return <svg {...common}>{P[name] || P.dashboard}</svg>;
};

window.Sparkline = ({ data, color = "var(--brass-400)", width = 110, height = 40 }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = path + ` L${width - 2},${height} L2,${height} Z`;
  return (
    <svg width={width} height={height} className="stat-spark">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${color})`}/>
      <path d={path} stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  );
};

window.AnimatedNumber = ({ value, duration = 1100, decimals = 0, prefix = "", suffix = "" }) => {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let raf, start;
    const from = 0, to = value;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{suffix}</>;
};

window.Donut = ({ segments, size = 180, thickness = 22, centerLabel, centerValue }) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--paper-3)" strokeWidth={thickness} fill="none"/>
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r} stroke={s.color} strokeWidth={thickness} fill="none"
              strokeDasharray={`${len} ${c}`} strokeDashoffset={-offset} strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 1.2s var(--e-out)" }}/>
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="display" style={{ fontSize: 34, lineHeight: 1 }}>{centerValue}</div>
          <div style={{ fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 6 }}>{centerLabel}</div>
        </div>
      </div>
    </div>
  );
};

window.Bars = ({ data, color = "var(--accent)", height = 140 }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height, padding: "12px 0" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${(d.value / max) * 100}%`,
              background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 70%, black))`,
              borderRadius: "6px 6px 2px 2px",
              animation: `barGrow 900ms var(--e-out) ${i * 60}ms both`,
              transformOrigin: "bottom"
            }}/>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>{d.label}</div>
        </div>
      ))}
      <style>{`@keyframes barGrow { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }`}</style>
    </div>
  );
};

Object.assign(window, { Icon: window.Icon, Sparkline: window.Sparkline, AnimatedNumber: window.AnimatedNumber, Donut: window.Donut, Bars: window.Bars });
