// Maintenance list + detail
window.MaintenancePage = ({ lang, onOpenRequest }) => {
  const t = window.T[lang];
  const [status, setStatus] = React.useState("ALL");
  const [priority, setPriority] = React.useState("ALL");
  const filters = ["ALL", "PENDING", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"];
  const pFilters = ["ALL", "LOW", "NORMAL", "HIGH", "URGENT"];
  let rows = window.DATA.requests;
  if (status !== "ALL") rows = rows.filter(r => r.status === status);
  if (priority !== "ALL") rows = rows.filter(r => r.priority === priority);

  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.operations}</div>
          <h1 className="page-title display">{t.maintenance}</h1>
          <p className="page-subtitle">Track, assign, and resolve requests across your portfolio.</p>
        </div>
        <button className="btn btn-accent"><Icon name="plus" size={14}/>{t.newRequest}</button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid var(--line-2)" }}>
          {filters.map(f => (
            <button key={f} className={"btn " + (status === f ? "btn-primary" : "btn-ghost")} style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setStatus(f)}>
              {f === "ALL" ? t.allStatus : t.statuses[f]}
            </button>
          ))}
          <div style={{ width: 1, background: "var(--line)", marginInline: 6 }}/>
          {pFilters.map(f => (
            <button key={f} className={"btn " + (priority === f ? "btn-primary" : "btn-ghost")} style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setPriority(f)}>
              {f === "ALL" ? t.allPriority : t.priorities[f]}
            </button>
          ))}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.description}</th>
              <th>{t.property} / {t.unit}</th>
              <th>{t.tenant}</th>
              <th>{t.officer}</th>
              <th>{t.status}</th>
              <th>{t.priority}</th>
              <th>{t.created}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} onClick={() => onOpenRequest(r)} style={{ cursor: "pointer", animation: `fadeUp 360ms var(--e-out) ${i*40}ms both` }}>
                <td className="td-mono">{r.id}</td>
                <td style={{ fontWeight: 500, maxWidth: 260 }}>{r.title[lang]}</td>
                <td>
                  <div style={{ fontSize: 13 }}>{r.property}</div>
                  <div className="td-mono muted" style={{ fontSize: 11 }}>{r.unit}</div>
                </td>
                <td>{r.tenant}</td>
                <td style={{ color: r.officer === "—" ? "var(--ink-400)" : undefined }}>{r.officer}</td>
                <td><span className={`chip chip-${r.status}`}>{t.statuses[r.status]}</span></td>
                <td><span className={`pri pri-${r.priority}`}>{t.priorities[r.priority]}</span></td>
                <td className="muted" style={{ fontSize: 12 }}>{lang === "ar" ? r.createdAr : r.created}</td>
                <td><Icon name={lang === "ar" ? "chevronLeft" : "chevronRight"} size={16} style={{ color: "var(--ink-400)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.RequestDetailPage = ({ lang, req, onBack, onComplete }) => {
  const t = window.T[lang];
  const steps = [
    { k: "submitted", done: true, date: "Apr 20, 10:14", label: t.submitted },
    { k: "reviewed", done: true, date: "Apr 20, 11:05", label: t.reviewed },
    { k: "scheduled", done: true, date: "Apr 21, 09:00", label: t.scheduled },
    { k: "visit", done: req.status === "IN_PROGRESS" || req.status === "COMPLETED", active: req.status === "IN_PROGRESS", date: req.status !== "PENDING" ? "In progress" : "—", label: t.visit },
    { k: "completed", done: req.status === "COMPLETED", date: req.status === "COMPLETED" ? "Apr 21" : "—", label: t.completed },
  ];
  const [celebrating, setCelebrating] = React.useState(false);
  const handleComplete = (e) => {
    setCelebrating(true);
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.style.left = (rect.left + rect.width / 2) + "px";
      s.style.top = (rect.top + rect.height / 2) + "px";
      const ang = (i / 14) * Math.PI * 2;
      const r = 80 + Math.random() * 40;
      s.style.setProperty("--sparkle-trans", `translate(${Math.cos(ang)*r}px, ${Math.sin(ang)*r}px)`);
      s.style.background = i % 2 ? "var(--brass-400)" : "var(--brass-300)";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
    setTimeout(() => { onComplete && onComplete(); }, 600);
  };

  return (
    <div className="page-inner animate-in">
      <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <a onClick={onBack} style={{ cursor: "pointer", color: "var(--accent)" }}>{t.maintenance}</a>
        <span>/</span>
        <span className="td-mono">{req.id}</span>
      </div>

      <div className="page-head" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <span className={`chip chip-${req.status}`}>{t.statuses[req.status]}</span>
            <span className={`pri pri-${req.priority}`}>{t.priorities[req.priority]}</span>
            <span className="td-mono muted">{req.id}</span>
          </div>
          <h1 className="page-title display" style={{ fontSize: 36 }}>{req.title[lang]}</h1>
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            <Icon name="mapPin" size={13} style={{ verticalAlign: "text-bottom", marginInlineEnd: 4 }}/>
            {req.property} · <span className="td-mono">{req.unit}</span> · {req.tenant}
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost"><Icon name="edit" size={14}/>Edit</button>
          {req.status !== "COMPLETED" ? (
            <button className="btn btn-accent" onClick={handleComplete}><Icon name="check" size={14}/>{t.markComplete}</button>
          ) : (
            <span className="chip chip-COMPLETED">{t.statuses.COMPLETED}</span>
          )}
        </div>
      </div>

      <div className="grid-2 stagger">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head"><div className="card-title display">{t.description}</div></div>
            <div className="card-body">
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-700)", maxWidth: 620 }}>
                {lang === "en"
                  ? "Tenant reports water pooling on the bathroom floor after a shower. Leak appears to originate from the base of the toilet tank. Request urgent inspection and replacement of sealing washer if necessary. Tenant available after 9am."
                  : "أبلغ المستأجر عن تجمع الماء على أرضية الحمام بعد الاستحمام. يبدو أن التسرب من قاعدة خزان المرحاض. مطلوب فحص عاجل واستبدال الحشوة إذا لزم الأمر. المستأجر متاح بعد التاسعة صباحاً."}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 18 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="img-placeholder" style={{ height: 120, borderRadius: 10 }}>
                    photo {i}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title display">{t.timeline}</div></div>
            <div className="card-body">
              <div style={{ position: "relative", paddingInlineStart: 8 }}>
                {steps.map((s, i) => (
                  <div key={s.k} style={{ display: "flex", gap: 16, paddingBottom: 22, position: "relative" }}>
                    {i < steps.length - 1 && (
                      <div style={{ position: "absolute", insetInlineStart: 11, top: 24, bottom: -6, width: 2, background: s.done ? "var(--brass-400)" : "var(--line)" }}/>
                    )}
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                      background: s.done ? "var(--brass-500)" : s.active ? "var(--accent-soft)" : "var(--paper-3)",
                      border: s.active ? "2px solid var(--accent)" : "2px solid transparent",
                      color: s.done ? "var(--navy-900)" : "var(--ink-400)",
                      display: "grid", placeItems: "center",
                      animation: s.active ? "urgentPulse 2s infinite" : undefined
                    }}>
                      {s.done ? <Icon name="check" size={12}/> : <span style={{ fontSize: 10, fontWeight: 700 }}>{i+1}</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{s.label}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{s.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head"><div className="card-title display">{t.scheduledFor}</div></div>
            <div className="card-body">
              <div className="display" style={{ fontSize: 28 }}>Apr 21, 09:00</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Tuesday — morning window</div>
              <div className="divider"/>
              <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                <div className="avatar" style={{ width: 40, height: 40 }}>SR</div>
                <div>
                  <div style={{ fontWeight: 500 }}>Saleh Al-Rashidi</div>
                  <div className="muted" style={{ fontSize: 12 }}>Plumbing · Internal</div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}><Icon name="phone" size={14}/>Contact officer</button>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title display">{t.visitReport}</div></div>
            <div className="card-body">
              {req.status === "COMPLETED" ? (
                <div>
                  <div style={{ fontSize: 12, color: "var(--ok)", fontWeight: 600, marginBottom: 8 }}>{t.statuses.COMPLETED}</div>
                  <p style={{ fontSize: 13.5, color: "var(--ink-700)" }}>Tank washer replaced; leak confirmed resolved. Floor dried and tested over 15 min.</p>
                  <div className="row" style={{ gap: 10, marginTop: 10, fontSize: 12, color: "var(--ink-500)" }}>
                    <span>Parts: 1 × washer</span>
                    <span>•</span>
                    <span>Paid: 2.500 OMR</span>
                  </div>
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>Report will appear after the officer visits.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MaintenancePage: window.MaintenancePage, RequestDetailPage: window.RequestDetailPage });
