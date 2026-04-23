// Tenant portal + Officer schedule + Login + New Request form

window.TenantDashboard = ({ lang, onOpenRequest, onGoNew }) => {
  const t = window.T[lang];
  const active = window.DATA.tenantRequests[0];
  return (
    <div className="page-inner animate-in">
      <div className="page-head" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="page-eyebrow">{t.overview}</div>
          <h1 className="page-title display">{t.tenantWelcome} Fatima.</h1>
          <p className="page-subtitle">{t.tenantSub}</p>
        </div>
        <button className="btn btn-accent" onClick={onGoNew}><Icon name="plus" size={14}/>{t.createRequest}</button>
      </div>

      <div className="grid-2 stagger" style={{ marginBottom: 20 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", height: 200 }}>
            <div className="img-placeholder" style={{ height: "100%", borderRadius: 0, border: 0 }}>unit photo</div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(14,31,51,0.8))" }}/>
            <div style={{ position: "absolute", bottom: 18, left: 20, right: 20, color: "#F4E7C4" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>{t.yourUnit}</div>
              <div className="display" style={{ fontSize: 30, color: "#FBF2D9" }}>Al Mouj · B-14</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>3 bed · 2 bath · Floor 3</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Mini label="Lease" value="Jun 2023"/>
            <Mini label="Rent" value="450 OMR"/>
            <Mini label="Next due" value="May 01"/>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title display">{t.activeRequest}</div>
            <span className={`chip chip-${active.status}`}>{t.statuses[active.status]}</span>
          </div>
          <div className="card-body">
            <div className="td-mono muted" style={{ fontSize: 11 }}>{active.id}</div>
            <div className="display" style={{ fontSize: 22, marginTop: 4 }}>{active.title[lang]}</div>
            <div className="divider"/>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 600 }}>{t.nextVisit}</div>
            <div className="display" style={{ fontSize: 22, marginTop: 4 }}>Apr 21, 09:00</div>
            <div className="row" style={{ gap: 10, marginTop: 12 }}>
              <div className="avatar">SR</div>
              <div>
                <div style={{ fontWeight: 500 }}>Saleh Al-Rashidi</div>
                <div className="muted" style={{ fontSize: 12 }}>Plumbing</div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => onOpenRequest(window.DATA.requests[0])}>{t.view} <Icon name={lang==="ar" ? "chevronLeft" : "chevronRight"} size={14}/></button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title display">{t.historyOf}</div></div>
        <table className="table">
          <thead><tr><th>#</th><th>{t.description}</th><th>{t.officer}</th><th>{t.status}</th><th>{t.created}</th></tr></thead>
          <tbody>
            {window.DATA.tenantRequests.map((r, i) => (
              <tr key={r.id} style={{ animation: `fadeUp 360ms var(--e-out) ${i*60}ms both` }}>
                <td className="td-mono">{r.id}</td>
                <td style={{ fontWeight: 500 }}>{r.title[lang]}</td>
                <td>{r.officer}</td>
                <td><span className={`chip chip-${r.status}`}>{t.statuses[r.status]}</span></td>
                <td className="muted">{r.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.NewRequestPage = ({ lang, onSubmitted }) => {
  const t = window.T[lang];
  const [category, setCategory] = React.useState("");
  const [priority, setPriority] = React.useState("NORMAL");
  const [title, setTitle] = React.useState("");
  const cats = [
    { k: "plumbing", l: lang==="ar"?"سباكة":"Plumbing", icon: "wrench" },
    { k: "electric", l: lang==="ar"?"كهرباء":"Electrical", icon: "sparkle" },
    { k: "ac", l: lang==="ar"?"تكييف":"AC / HVAC", icon: "cube" },
    { k: "door", l: lang==="ar"?"أبواب":"Doors / Locks", icon: "door" },
    { k: "paint", l: lang==="ar"?"دهان":"Paint", icon: "image" },
    { k: "other", l: lang==="ar"?"أخرى":"Other", icon: "clipboard" },
  ];
  const pri = ["LOW","NORMAL","HIGH","URGENT"];
  return (
    <div className="page-inner animate-in" style={{ maxWidth: 880 }}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.newRequest}</div>
          <h1 className="page-title display">{lang==="ar"?"ما الذي نحتاج إصلاحه؟":"What needs fixing?"}</h1>
          <p className="page-subtitle">{lang==="ar"?"صف المشكلة بدقة وأضف الصور لنصل بسرعة.":"Describe the issue, add photos — we'll be there fast."}</p>
        </div>
      </div>

      <div className="card stagger">
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <div className="form-label">{t.category || "Category"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 8 }}>
              {cats.map(c => (
                <button key={c.k} onClick={() => setCategory(c.k)} className="card" style={{
                  padding: "16px 14px", textAlign: "start", cursor: "pointer",
                  borderColor: category === c.k ? "var(--accent)" : "var(--line)",
                  background: category === c.k ? "var(--accent-soft)" : "var(--surface)",
                  transition: "all var(--t-fast)"
                }}>
                  <Icon name={c.icon} size={20} style={{ color: category === c.k ? "var(--accent)" : "var(--ink-700)" }}/>
                  <div style={{ fontWeight: 500, marginTop: 8 }}>{c.l}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="form-label">{lang==="ar" ? "عنوان الطلب" : "Title"}</div>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={lang==="ar"?"مثال: تسريب ماء في الحمام":"e.g. Water leak in bathroom"}
              style={{ width: "100%", padding: "12px 14px", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 10, marginTop: 8, outline: "none" }}/>
          </div>

          <div>
            <div className="form-label">{lang==="ar"?"الوصف":"Description"}</div>
            <textarea rows={4} placeholder={lang==="ar"?"اشرح المشكلة بالتفصيل...":"Describe the issue in detail..."}
              style={{ width: "100%", padding: "12px 14px", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 10, marginTop: 8, outline: "none", resize: "vertical", fontFamily: "inherit" }}/>
          </div>

          <div>
            <div className="form-label">{t.priority}</div>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              {pri.map(p => (
                <button key={p} onClick={() => setPriority(p)} className={"btn " + (priority===p ? "btn-primary" : "btn-ghost")} style={{ fontSize: 12 }}>
                  <span className={`pri pri-${p}`} style={{ padding: "1px 5px" }}>{t.priorities[p]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="form-label">{lang==="ar"?"الصور":"Photos"}</div>
            <div style={{ marginTop: 8, border: "2px dashed var(--line)", borderRadius: 12, padding: "28px 20px", textAlign: "center", background: "var(--paper-2)", cursor: "pointer", transition: "all var(--t-fast)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line)"}>
              <Icon name="upload" size={28} style={{ color: "var(--ink-400)" }}/>
              <div style={{ marginTop: 8, fontWeight: 500 }}>{lang==="ar"?"اسحب الصور هنا أو انقر للتحميل":"Drop photos here or click to upload"}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>PNG, JPG, MP4 · max 10MB</div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost">Cancel</button>
            <button className="btn btn-accent" onClick={onSubmitted}><Icon name="check" size={14}/>{lang==="ar"?"إرسال الطلب":"Submit request"}</button>
          </div>
        </div>
      </div>
      <style>{`.form-label { font-size: 11px; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; }`}</style>
    </div>
  );
};

window.OfficerSchedule = ({ lang, onOpenRequest }) => {
  const t = window.T[lang];
  const items = window.DATA.schedule;
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.today}</div>
          <h1 className="page-title display">{t.officerToday}</h1>
          <p className="page-subtitle">{t.officerSub}</p>
        </div>
        <button className="btn btn-ghost"><Icon name="calendar" size={14}/>This week</button>
      </div>

      <div className="grid-2 stagger">
        <div className="col" style={{ gap: 14 }}>
          {items.map((v, i) => (
            <div key={i} className="card hoverable" style={{ padding: 18, animation: `fadeUp 440ms var(--e-out) ${i*80}ms both` }}>
              <div className="row" style={{ gap: 18, alignItems: "flex-start" }}>
                <div style={{ textAlign: "center", minWidth: 64 }}>
                  <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>{v.time}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{t.travel}<br/>{v.travel}</div>
                </div>
                <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }}/>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <span className={`pri pri-${v.priority}`}>{t.priorities[v.priority]}</span>
                    <span className="td-mono muted">{v.id}</span>
                  </div>
                  <div className="display" style={{ fontSize: 18 }}>{v.title[lang]}</div>
                  <div className="row" style={{ gap: 10, marginTop: 10 }}>
                    <button className="btn btn-accent" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => onOpenRequest(window.DATA.requests[0])}>{t.start}</button>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}><Icon name="phone" size={12}/></button>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}><Icon name="mapPin" size={12}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title display">{lang==="ar"?"الخريطة":"Route"}</div></div>
          <div style={{ position: "relative", height: 420, background: "linear-gradient(135deg, #D9E0D0, #C7D1C0)", overflow: "hidden" }}>
            <svg width="100%" height="100%" viewBox="0 0 400 420">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(14,31,51,0.06)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="400" height="420" fill="url(#grid)"/>
              <path d="M 60 350 Q 150 300 200 200 T 340 60" stroke="var(--brass-500)" strokeWidth="3" fill="none" strokeDasharray="6 4" strokeLinecap="round"/>
              {[{x:60,y:350,n:1},{x:180,y:230,n:2},{x:260,y:140,n:3},{x:340,y:60,n:4}].map(p => (
                <g key={p.n}>
                  <circle cx={p.x} cy={p.y} r="14" fill="var(--navy-900)"/>
                  <text x={p.x} y={p.y+4} textAnchor="middle" fill="var(--brass-400)" fontSize="11" fontWeight="700">{p.n}</text>
                </g>
              ))}
            </svg>
            <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, background: "rgba(255,253,248,0.95)", padding: 14, borderRadius: 10, backdropFilter: "blur(8px)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}>Total today</div>
                  <div className="display" style={{ fontSize: 22 }}>85 min · 28 km</div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>Navigate</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.OfficerRequests = ({ lang, onOpenRequest }) => {
  const t = window.T[lang];
  const mine = window.DATA.requests.filter(r => r.officer === "Saleh Al-Rashidi" || r.status === "ASSIGNED").slice(0,5);
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.operations}</div>
          <h1 className="page-title display">{t.myRequests}</h1>
          <p className="page-subtitle">Assigned to you. Start with the urgent ones.</p>
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>#</th><th>{t.description}</th><th>{t.property}</th><th>{t.priority}</th><th>{t.status}</th><th></th></tr></thead>
          <tbody>
            {mine.map((r, i) => (
              <tr key={r.id} onClick={() => onOpenRequest(r)} style={{ cursor: "pointer", animation: `fadeUp 360ms var(--e-out) ${i*50}ms both` }}>
                <td className="td-mono">{r.id}</td>
                <td style={{ fontWeight: 500 }}>{r.title[lang]}</td>
                <td>{r.property} <span className="td-mono muted">/ {r.unit}</span></td>
                <td><span className={`pri pri-${r.priority}`}>{t.priorities[r.priority]}</span></td>
                <td><span className={`chip chip-${r.status}`}>{t.statuses[r.status]}</span></td>
                <td><Icon name={lang==="ar"?"chevronLeft":"chevronRight"} size={16} style={{ color: "var(--ink-400)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.ProfilePage = ({ lang, role }) => {
  const t = window.T[lang];
  const u = role === "SUPER_ADMIN" ? { n: "Hassan Al-Lawati", r: t.role.SUPER_ADMIN, e: "hassan@estate.om", p: "+968 9123 0001", ini: "HL" } :
           role === "MAINTENANCE_OFFICER" ? { n: "Saleh Al-Rashidi", r: t.role.MAINTENANCE_OFFICER, e: "saleh@estate.om", p: "+968 9234 0002", ini: "SR" } :
           { n: "Fatima Al-Harthi", r: t.role.TENANT, e: "fatima.h@mail.om", p: "+968 9345 0003", ini: "FH" };
  return (
    <div className="page-inner animate-in" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.you}</div>
          <h1 className="page-title display">{t.profile}</h1>
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 28 }}>{u.ini}</div>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 28 }}>{u.n}</div>
            <div className="muted">{u.r}</div>
            <div className="row" style={{ gap: 14, marginTop: 10, fontSize: 13 }}>
              <span><Icon name="mail" size={12} style={{ color: "var(--ink-500)", verticalAlign: "text-bottom", marginInlineEnd: 4 }}/>{u.e}</span>
              <span><Icon name="phone" size={12} style={{ color: "var(--ink-500)", verticalAlign: "text-bottom", marginInlineEnd: 4 }}/>{u.p}</span>
            </div>
          </div>
          <button className="btn btn-ghost"><Icon name="edit" size={14}/>Edit</button>
        </div>
      </div>
    </div>
  );
};

window.Login = ({ lang, onSignIn }) => {
  const t = window.T[lang];
  return (
    <div style={{ width: "100vw", height: "100vh", display: "grid", gridTemplateColumns: "1.1fr 1fr", overflow: "hidden" }}>
      <div style={{ position: "relative", background: "linear-gradient(160deg, var(--navy-900) 0%, var(--navy-700) 60%, var(--navy-600) 100%)", color: "#F4E7C4", padding: "56px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div className="login-bg">
          <svg viewBox="0 0 600 800">
            <defs>
              <pattern id="arch" width="120" height="160" patternUnits="userSpaceOnUse">
                <path d="M 10 150 L 10 80 Q 10 20 60 20 Q 110 20 110 80 L 110 150 Z" fill="none" stroke="rgba(204,165,91,0.18)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="600" height="800" fill="url(#arch)"/>
            <circle cx="480" cy="120" r="180" fill="rgba(204,165,91,0.1)" style={{ filter: "blur(40px)" }}/>
          </svg>
        </div>
        <div style={{ position: "relative" }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 26 }}>É</div>
            <div>
              <div className="display" style={{ fontSize: 24, color: "#F4E7C4" }}>Estate</div>
              <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6 }}>Operations Suite</div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", maxWidth: 520 }}>
          <div style={{ fontSize: 11, color: "var(--brass-400)", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 18 }}>{t.eyebrow}</div>
          <h1 className="display" style={{ fontSize: 64, lineHeight: 1.05, color: "#FBF2D9" }}>
            {t.heroTitle1}<br/>
            <em style={{ color: "var(--brass-400)", fontStyle: "italic" }}>{t.heroTitle2}</em>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.78, marginTop: 22, maxWidth: 460 }}>{t.heroLine}</p>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 28, fontSize: 12, opacity: 0.5 }}>
          <span>© 2026 Estate OS</span>
          <span>·</span>
          <span>v4.2</span>
        </div>
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: 40, background: "var(--paper)", position: "relative" }}>
        <div style={{ width: "100%", maxWidth: 400 }} className="animate-in">
          <div className="display" style={{ fontSize: 36 }}>{t.login}</div>
          <p className="muted" style={{ marginTop: 6 }}>{t.loginSub}</p>
          <div className="col" style={{ gap: 16, marginTop: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: 8 }}>{t.email}</div>
              <div className="row" style={{ gap: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 14px" }}>
                <Icon name="mail" size={16} style={{ color: "var(--ink-400)" }}/>
                <input placeholder="you@estate.om" style={{ flex: 1, border: "none", outline: "none", padding: "14px 0", background: "none", fontSize: 14 }}/>
              </div>
            </div>
            <div>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>{t.password}</div>
                <a style={{ fontSize: 12, color: "var(--accent)" }}>{t.forgot}</a>
              </div>
              <div className="row" style={{ gap: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 14px" }}>
                <Icon name="lock" size={16} style={{ color: "var(--ink-400)" }}/>
                <input type="password" placeholder="••••••••" defaultValue="demo1234" style={{ flex: 1, border: "none", outline: "none", padding: "14px 0", background: "none", fontSize: 14 }}/>
              </div>
            </div>
            <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 14, marginTop: 8 }} onClick={onSignIn}>
              {t.signIn} <Icon name="arrowRight" size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TenantDashboard: window.TenantDashboard, NewRequestPage: window.NewRequestPage, OfficerSchedule: window.OfficerSchedule, OfficerRequests: window.OfficerRequests, ProfilePage: window.ProfilePage, Login: window.Login });
