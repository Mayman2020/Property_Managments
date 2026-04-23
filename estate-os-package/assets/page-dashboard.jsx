// Admin Dashboard
window.AdminDashboard = ({ lang, onOpenRequest }) => {
  const t = window.T[lang];
  const s = window.DATA.stats;
  const occupancy = Math.round((s.rentedUnits / s.totalUnits) * 100);
  const [celebrate, setCelebrate] = React.useState(null);

  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.eyebrow}</div>
          <h1 className="page-title display">{t.dashTitle}</h1>
          <p className="page-subtitle">{t.dashSub}</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost"><Icon name="filter" size={14}/>{t.today}</button>
          <button className="btn btn-accent"><Icon name="plus" size={14}/>{t.newRequest}</button>
        </div>
      </div>

      <div className="stat-grid stagger">
        <StatTile label={t.totalProperties} value={s.totalProperties} delta="+2" spark={[20,22,21,24,26,28,30,32]} icon="building"/>
        <StatTile label={t.totalUnits} value={s.totalUnits} delta="+12" spark={[380,385,390,398,405,410,415,418]} icon="door"/>
        <StatTile label={t.occupancy} value={occupancy} suffix="%" delta="+1.4%" spark={window.DATA.occupancyTrend} icon="trendUp"/>
        <StatTile label={t.pending} value={s.pendingRequests} delta="-3" down spark={[22,20,19,18,17,16,15,14]} icon="clock" accent/>
      </div>

      <div className="grid-2 stagger" style={{ marginBottom: 24 }}>
        <div className="card hoverable" style={{ animationDelay: "200ms" }}>
          <div className="card-head">
            <div>
              <div className="card-title display">{t.operationsPulse}</div>
              <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>{t.last30}</div>
            </div>
            <div className="row" style={{ gap: 16 }}>
              <LegendDot color="var(--brass-500)" label={t.completedMo}/>
              <LegendDot color="var(--navy-500)" label={t.pending}/>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 6 }}>
            <TrendChart data={window.DATA.trend30}/>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>
              <span>Mar 23</span><span>Mar 30</span><span>Apr 06</span><span>Apr 13</span><span>Apr 20</span>
            </div>
          </div>
        </div>

        <div className="card hoverable" style={{ animationDelay: "260ms" }}>
          <div className="card-head">
            <div className="card-title display">{t.occupancyCard}</div>
            <span className="chip chip-OK">{t.active}</span>
          </div>
          <div className="card-body" style={{ display: "grid", placeItems: "center", padding: "20px 20px 28px" }}>
            <Donut
              size={200} thickness={26}
              centerValue={<><AnimatedNumber value={occupancy}/>%</>}
              centerLabel={t.occupancy}
              segments={[
                { value: s.rentedUnits, color: "var(--brass-500)" },
                { value: s.totalUnits - s.rentedUnits, color: "var(--paper-3)" },
              ]}/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", marginTop: 18 }}>
              <MiniStat label={t.occupancy + ""} value={s.rentedUnits} hint="rented"/>
              <MiniStat label="Vacant" value={s.totalUnits - s.rentedUnits} hint="units"/>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 stagger">
        <div className="card" style={{ animationDelay: "340ms" }}>
          <div className="card-head">
            <div className="card-title display">{t.recentRequests}</div>
            <a className="card-link">{t.viewAll} <Icon name="arrowRight" size={12}/></a>
          </div>
          <div>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>{t.description}</th><th>{t.property}</th><th>{t.status}</th><th style={{ textAlign: "end" }}></th>
                </tr>
              </thead>
              <tbody>
                {window.DATA.requests.slice(0, 5).map((r, i) => (
                  <tr key={r.id} onClick={() => onOpenRequest(r)} style={{ cursor: "pointer", animation: `fadeUp 420ms var(--e-out) ${i*60}ms both` }}>
                    <td className="td-mono">{r.id}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.title[lang]}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 2 }}>
                        <span className={`pri pri-${r.priority}`}>{t.priorities[r.priority]}</span>
                        <span style={{ marginInlineStart: 8 }}>{lang === "ar" ? r.createdAr : r.created}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{r.property}</div>
                      <div className="td-mono" style={{ fontSize: 11 }}>{r.unit}</div>
                    </td>
                    <td><span className={`chip chip-${r.status}`}>{t.statuses[r.status]}</span></td>
                    <td style={{ textAlign: "end" }}>
                      <Icon name={lang === "ar" ? "chevronLeft" : "chevronRight"} size={16} style={{ color: "var(--ink-400)" }}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ animationDelay: "400ms" }}>
          <div className="card-head">
            <div className="card-title display">{t.lowStockAlerts}</div>
            <a className="card-link">{t.manage} <Icon name="arrowRight" size={12}/></a>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {window.DATA.inventory.filter(i => i.qty < i.min).slice(0, 5).map((item, i) => {
              const pct = Math.round((item.qty / item.min) * 100);
              return (
                <div key={item.code} style={{ animation: `fadeUp 420ms var(--e-out) ${i*80}ms both` }}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name[lang]}</div>
                      <div className="td-mono muted" style={{ fontSize: 11 }}>{item.code} · {item.loc}</div>
                    </div>
                    <div style={{ textAlign: "end" }}>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{item.qty}/{item.min}</div>
                      <div style={{ fontSize: 10.5, color: "var(--warn)", fontWeight: 600 }}>{t.lowStock}</div>
                    </div>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct < 40 ? "linear-gradient(90deg, var(--bad), #C44B3E)" : undefined }}/></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ height: 24 }}/>

      <div className="card stagger" style={{ animationDelay: "480ms" }}>
        <div className="card-head">
          <div className="card-title display">{t.requestsStatus}</div>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { k: "PENDING", v: 14 },
            { k: "IN_PROGRESS", v: 9 },
            { k: "COMPLETED", v: 87 },
            { k: "NEEDS_REVISIT", v: 3 },
          ].map((x, i) => (
            <div key={x.k} style={{ padding: 18, background: "var(--paper-2)", borderRadius: 12, animation: `scaleIn 520ms var(--e-spring) ${i*70}ms both` }}>
              <span className={`chip chip-${x.k}`}>{t.statuses[x.k]}</span>
              <div className="display" style={{ fontSize: 36, marginTop: 12 }}><AnimatedNumber value={x.v}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.StatTile = ({ label, value, suffix, delta, down, spark, icon, accent }) => (
  <div className="stat">
    <div className="stat-top">
      <span className="stat-label">{label}</span>
      <div className="stat-icon-wrap" style={accent ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}>
        <Icon name={icon} size={16}/>
      </div>
    </div>
    <div className="stat-value">
      <AnimatedNumber value={value} suffix={suffix || ""}/>
    </div>
    <div className="stat-foot">
      {delta && <span className={`stat-delta ${down ? "down" : "up"}`}>
        <Icon name={down ? "arrowDown" : "arrowUp"} size={10}/>{delta}
      </span>}
      <span>vs last month</span>
    </div>
    {spark && <Sparkline data={spark}/>}
  </div>
);

window.LegendDot = ({ color, label }) => (
  <div className="row" style={{ gap: 6, fontSize: 11.5, color: "var(--ink-500)" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }}/>
    {label}
  </div>
);

window.MiniStat = ({ label, value, hint }) => (
  <div style={{ background: "var(--paper-2)", padding: 12, borderRadius: 10 }}>
    <div style={{ fontSize: 10.5, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{label}</div>
    <div className="display" style={{ fontSize: 26, marginTop: 4 }}><AnimatedNumber value={value}/></div>
    <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{hint}</div>
  </div>
);

window.TrendChart = ({ data, height = 160 }) => {
  const W = 720, H = height;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (W - 8) + 4;
    const y = H - 8 - ((v - min) / range) * (H - 16);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = path + ` L${W - 4},${H} L4,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brass-400)" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="var(--brass-400)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p, i) => (
        <line key={i} x1="0" x2={W} y1={H * p} y2={H * p} stroke="var(--line-2)" strokeDasharray="2 4"/>
      ))}
      <path d={area} fill="url(#trendFill)" style={{ animation: "fadeIn 900ms 300ms both" }}/>
      <path d={path} stroke="var(--brass-500)" strokeWidth="2" fill="none" strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: "drawLine 1800ms var(--e-out) forwards" }}/>
      {pts.filter((_, i) => i % 5 === 0).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--brass-500)" stroke="var(--surface)" strokeWidth="1.5"
                style={{ animation: `fadeIn 400ms ${600 + i*80}ms both` }}/>
      ))}
      <style>{`@keyframes drawLine { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
};

Object.assign(window, { AdminDashboard: window.AdminDashboard, StatTile: window.StatTile, LegendDot: window.LegendDot, MiniStat: window.MiniStat, TrendChart: window.TrendChart });
