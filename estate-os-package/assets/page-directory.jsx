// Properties, Units, Inventory, Reports, Users, Tenants
window.PropertiesPage = ({ lang }) => {
  const t = window.T[lang];
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.directory}</div>
          <h1 className="page-title display">{t.propertyList}</h1>
          <p className="page-subtitle">{t.propertySub}</p>
        </div>
        <button className="btn btn-accent"><Icon name="plus" size={14}/>{t.addProperty}</button>
      </div>
      <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
        {window.DATA.properties.map((p, i) => {
          const occ = Math.round((p.occupied / p.units) * 100);
          return (
            <div key={p.name} className="card hoverable" style={{ cursor: "pointer" }}>
              <div className="img-placeholder" style={{ height: 130, borderRadius: 0, borderInline: 0, borderTop: 0 }}>
                property photo
              </div>
              <div className="card-body">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="display" style={{ fontSize: 20 }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      <Icon name="mapPin" size={11} style={{ verticalAlign: "text-bottom" }}/> {p.city} · {p.type}
                    </div>
                  </div>
                  <span className="chip chip-OK">{t.active}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
                  <Mini label={t.units} value={p.units}/>
                  <Mini label={t.occupancy} value={occ + "%"}/>
                  <Mini label={t.floors} value={p.floors}/>
                </div>
                <div className="progress" style={{ marginTop: 14 }}><div className="progress-fill" style={{ width: occ + "%" }}/></div>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 12, fontSize: 12 }}>
                  <span className="muted">{t.owner}: {p.owner}</span>
                  {p.pending > 0 && <span style={{ color: "var(--warn)", fontWeight: 600 }}>{p.pending} {t.pending.toLowerCase()}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Mini = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{label}</div>
    <div className="display" style={{ fontSize: 22, marginTop: 2 }}>{value}</div>
  </div>
);

window.UnitsPage = ({ lang }) => {
  const t = window.T[lang];
  const units = [];
  window.DATA.properties.slice(0, 4).forEach(p => {
    for (let i = 1; i <= 6; i++) {
      units.push({ prop: p.name, id: `${p.name.split(" ")[0].slice(0,2).toUpperCase()}-${String(i).padStart(2,"0")}`, floor: Math.ceil(i/2), rented: Math.random() > 0.25, tenant: ["Fatima", "Ahmed", "Maryam", "Omar", "Noor", "Zainab"][i-1] + " Al-" + ["Harthi","Balushi","Siyabi","Busaidi","Kindi","Hinai"][i-1] });
    }
  });
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.directory}</div>
          <h1 className="page-title display">{t.units}</h1>
          <p className="page-subtitle">Every unit, its tenant, and its status.</p>
        </div>
        <button className="btn btn-accent"><Icon name="plus" size={14}/>{t.addUnit}</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>{t.unit}</th><th>{t.property}</th><th>{t.floors}</th><th>{t.tenant}</th><th>{t.status}</th></tr></thead>
          <tbody>
            {units.map((u, i) => (
              <tr key={i} style={{ animation: `fadeUp 360ms var(--e-out) ${i*24}ms both` }}>
                <td className="td-mono" style={{ fontWeight: 600 }}>{u.id}</td>
                <td>{u.prop}</td>
                <td>{u.floor}</td>
                <td style={{ color: u.rented ? undefined : "var(--ink-400)" }}>{u.rented ? u.tenant : "—"}</td>
                <td><span className={`chip chip-${u.rented ? "COMPLETED" : "PENDING"}`}>{u.rented ? "Rented" : "Vacant"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.TenantsPage = ({ lang }) => {
  const t = window.T[lang];
  const tenants = [
    { n: "Fatima Al-Harthi", u: "Al Mouj B-14", since: "Jun 2023", email: "fatima.h@mail.om", phone: "+968 9123 4567" },
    { n: "Ahmed Al-Balushi", u: "Muscat Gardens A-07", since: "Sep 2023", email: "ahmed.b@mail.om", phone: "+968 9234 5678" },
    { n: "Maryam Al-Siyabi", u: "Qurum Heights C-21", since: "Jan 2024", email: "maryam.s@mail.om", phone: "+968 9345 6789" },
    { n: "Omar Al-Busaidi", u: "Al Mouj D-03", since: "Mar 2024", email: "omar.b@mail.om", phone: "+968 9456 7890" },
    { n: "Noor Al-Kindi", u: "Bawshar V-11", since: "Feb 2023", email: "noor.k@mail.om", phone: "+968 9567 8901" },
    { n: "Zainab Al-Hinai", u: "Muscat Gardens A-12", since: "Oct 2023", email: "zainab.h@mail.om", phone: "+968 9678 9012" },
  ];
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.directory}</div>
          <h1 className="page-title display">{t.tenants}</h1>
          <p className="page-subtitle">The people who call these properties home.</p>
        </div>
        <button className="btn btn-accent"><Icon name="plus" size={14}/>{t.addUser}</button>
      </div>
      <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {tenants.map((x, i) => (
          <div key={i} className="card hoverable" style={{ padding: 20 }}>
            <div className="row" style={{ gap: 14 }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{x.n.split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{x.n}</div>
                <div className="muted" style={{ fontSize: 12 }}>{x.u}</div>
              </div>
            </div>
            <div className="divider"/>
            <div className="col" style={{ gap: 6, fontSize: 12, color: "var(--ink-700)" }}>
              <div className="row" style={{ gap: 8 }}><Icon name="mail" size={12} style={{ color: "var(--ink-500)" }}/>{x.email}</div>
              <div className="row" style={{ gap: 8 }}><Icon name="phone" size={12} style={{ color: "var(--ink-500)" }}/>{x.phone}</div>
              <div className="row" style={{ gap: 8 }}><Icon name="calendar" size={12} style={{ color: "var(--ink-500)" }}/>Since {x.since}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.InventoryPage = ({ lang }) => {
  const t = window.T[lang];
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.operations}</div>
          <h1 className="page-title display">{t.inventoryTitle}</h1>
          <p className="page-subtitle">{t.inventorySub}</p>
        </div>
        <button className="btn btn-accent"><Icon name="plus" size={14}/>Add item</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>{t.code}</th><th>{t.item}</th><th>{t.qty}</th><th>{t.min}</th><th>{t.location}</th><th>{t.level}</th><th></th></tr></thead>
          <tbody>
            {window.DATA.inventory.map((it, i) => {
              const pct = Math.min(100, (it.qty / it.min) * 100);
              const low = it.qty < it.min;
              return (
                <tr key={it.code} style={{ animation: `fadeUp 360ms var(--e-out) ${i*40}ms both` }}>
                  <td className="td-mono" style={{ fontWeight: 600 }}>{it.code}</td>
                  <td style={{ fontWeight: 500 }}>{it.name[lang]}</td>
                  <td className="mono">{it.qty} {it.unit}</td>
                  <td className="mono muted">{it.min} {it.unit}</td>
                  <td className="muted">{it.loc}</td>
                  <td style={{ minWidth: 160 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <div className="progress" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: pct + "%", background: low ? "linear-gradient(90deg, var(--bad), #C44B3E)" : undefined }}/>
                      </div>
                      <span className={`chip chip-${low ? "BAD" : "OK"}`} style={{ fontSize: 10 }}>{low ? t.lowStock : "OK"}</span>
                    </div>
                  </td>
                  <td><button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>+ stock</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.ReportsPage = ({ lang }) => {
  const t = window.T[lang];
  const monthly = [{label:"Nov",value:62},{label:"Dec",value:68},{label:"Jan",value:74},{label:"Feb",value:81},{label:"Mar",value:79},{label:"Apr",value:87}];
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.operations}</div>
          <h1 className="page-title display">{t.reportsTitle}</h1>
          <p className="page-subtitle">{t.reportsSub}</p>
        </div>
        <button className="btn btn-ghost"><Icon name="upload" size={14}/>Export</button>
      </div>
      <div className="stat-grid stagger">
        <StatTile label="Revenue / mo" value={184500} suffix=" OMR" delta="+6.2%" spark={[140,148,155,162,170,175,180,184]} icon="trendUp"/>
        <StatTile label="Resolved" value={87} delta="+11" spark={[60,63,68,72,74,78,82,87]} icon="check"/>
        <StatTile label="Avg. resolve" value={18.4} suffix="h" delta="-2.1h" spark={[24,22,21,20,19,19,18,18]} icon="clock"/>
        <StatTile label="Officer util." value={78} suffix="%" delta="+3%" spark={[70,72,74,75,76,77,78,78]} icon="users"/>
      </div>
      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-head"><div className="card-title display">Completions / month</div></div>
          <div className="card-body"><Bars data={monthly} color="var(--brass-500)" height={180}/></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title display">Officer leaderboard</div></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {n:"Saleh Al-Rashidi", v:28, p:92},
              {n:"Yasir Team", v:22, p:76},
              {n:"Rashid Co.", v:19, p:68},
              {n:"Khalid Plumbing", v:14, p:52},
            ].map((o, i) => (
              <div key={i} style={{ animation: `fadeUp 440ms var(--e-out) ${i*80}ms both` }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="display" style={{ fontSize: 20, width: 24, color: "var(--ink-400)" }}>{i+1}</span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{o.n}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{o.v} resolved</div>
                    </div>
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>{o.p}%</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: o.p + "%" }}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.UsersPage = ({ lang }) => {
  const t = window.T[lang];
  const users = [
    { n: "Hassan Al-Lawati", e: "hassan@estate.om", r: "SUPER_ADMIN", a: true, last: "now" },
    { n: "Saleh Al-Rashidi", e: "saleh@estate.om", r: "MAINTENANCE_OFFICER", a: true, last: "2m" },
    { n: "Yasir Team", e: "yasir@contract.om", r: "MAINTENANCE_OFFICER", a: true, last: "1h" },
    { n: "Fatima Al-Harthi", e: "fatima.h@mail.om", r: "TENANT", a: true, last: "yesterday" },
    { n: "Ahmed Al-Balushi", e: "ahmed.b@mail.om", r: "TENANT", a: true, last: "3d" },
    { n: "Rashid Co.", e: "ops@rashid.om", r: "MAINTENANCE_OFFICER", a: false, last: "2w" },
  ];
  return (
    <div className="page-inner animate-in">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{t.you}</div>
          <h1 className="page-title display">{t.usersTitle}</h1>
          <p className="page-subtitle">{t.usersSub}</p>
        </div>
        <button className="btn btn-accent"><Icon name="plus" size={14}/>{t.addUser}</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>{t.user}</th><th>{t.role_col}</th><th>{t.status_col}</th><th>{t.lastActive}</th><th></th></tr></thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} style={{ animation: `fadeUp 360ms var(--e-out) ${i*40}ms both` }}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="avatar">{u.n.split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.n}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{u.e}</div>
                    </div>
                  </div>
                </td>
                <td><span className="chip chip-INFO">{t.role[u.r]}</span></td>
                <td><span className={`chip chip-${u.a ? "OK" : "BAD"}`}>{u.a ? t.active : t.inactive}</span></td>
                <td className="muted">{u.last}</td>
                <td><button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}><Icon name="edit" size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Object.assign(window, { PropertiesPage: window.PropertiesPage, UnitsPage: window.UnitsPage, TenantsPage: window.TenantsPage, InventoryPage: window.InventoryPage, ReportsPage: window.ReportsPage, UsersPage: window.UsersPage });
