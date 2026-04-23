// Shell: Sidebar + Topbar + role-aware nav

window.Sidebar = ({ role, page, setPage, collapsed, setCollapsed, lang }) => {
  const t = window.T[lang];
  const adminNav = [
    { section: t.overview, items: [
      { id: "dashboard", label: t.dashboard, icon: "dashboard" },
    ]},
    { section: t.directory, items: [
      { id: "properties", label: t.properties, icon: "building" },
      { id: "units", label: t.units, icon: "door" },
      { id: "tenants", label: t.tenants, icon: "users" },
    ]},
    { section: t.operations, items: [
      { id: "maintenance", label: t.maintenance, icon: "wrench", badge: 14 },
      { id: "inventory", label: t.inventory, icon: "box", badge: 6 },
      { id: "reports", label: t.reports, icon: "chart" },
    ]},
    { section: t.you, items: [
      { id: "users", label: t.users, icon: "settings" },
    ]},
  ];
  const officerNav = [
    { section: t.operations, items: [
      { id: "schedule", label: t.mySchedule, icon: "calendar" },
      { id: "my-requests", label: t.myRequests, icon: "clipboard", badge: 4 },
    ]},
    { section: t.you, items: [
      { id: "profile", label: t.profile, icon: "user" },
    ]},
  ];
  const tenantNav = [
    { section: t.overview, items: [
      { id: "my-unit", label: t.myUnit, icon: "home" },
      { id: "new-request", label: t.newRequest, icon: "plus" },
      { id: "my-requests", label: t.myRequests, icon: "history" },
    ]},
    { section: t.you, items: [
      { id: "profile", label: t.profile, icon: "user" },
    ]},
  ];
  const nav = role === "SUPER_ADMIN" ? adminNav : role === "MAINTENANCE_OFFICER" ? officerNav : tenantNav;
  const user = role === "SUPER_ADMIN" ? { name: "Hassan Al-Lawati", initials: "HL", roleLabel: t.role.SUPER_ADMIN } :
               role === "MAINTENANCE_OFFICER" ? { name: "Saleh Al-Rashidi", initials: "SR", roleLabel: t.role.MAINTENANCE_OFFICER } :
               { name: "Fatima Al-Harthi", initials: "FH", roleLabel: t.role.TENANT };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">É</div>
        <div className="brand-text">
          <div className="brand-name">Estate</div>
          <div className="brand-sub">Operations Suite</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map((sec, i) => (
          <React.Fragment key={i}>
            <div className="nav-section-label">{sec.section}</div>
            {sec.items.map(it => (
              <div key={it.id} className={"nav-item" + (page === it.id ? " active" : "")} onClick={() => setPage(it.id)}>
                <Icon name={it.icon} size={18}/>
                <span className="nav-label">{it.label}</span>
                {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
              </div>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="avatar">{user.initials}</div>
        <div className="user-meta">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.roleLabel}</div>
        </div>
      </div>
    </aside>
  );
};

window.Topbar = ({ lang, setLang, dark, setDark, role, setRole, collapsed, setCollapsed, onTweaks, onLogout }) => {
  const t = window.T[lang];
  return (
    <header className="topbar">
      <button className="icon-btn focusable" onClick={() => setCollapsed(!collapsed)} aria-label="menu">
        <Icon name="menu" size={18}/>
      </button>
      <div className="search">
        <Icon name="search" size={16} style={{ color: "var(--ink-400)" }}/>
        <input placeholder={t.search}/>
        <span className="search-kbd">⌘K</span>
      </div>
      <div className="topbar-spacer"/>
      <div className="role-switcher" title="Switch role view">
        <button className={role === "SUPER_ADMIN" ? "active" : ""} onClick={() => setRole("SUPER_ADMIN")}>{t.role.SUPER_ADMIN}</button>
        <button className={role === "MAINTENANCE_OFFICER" ? "active" : ""} onClick={() => setRole("MAINTENANCE_OFFICER")}>{t.role.MAINTENANCE_OFFICER}</button>
        <button className={role === "TENANT" ? "active" : ""} onClick={() => setRole("TENANT")}>{t.role.TENANT}</button>
      </div>
      <button className="icon-btn focusable" onClick={() => setLang(lang === "en" ? "ar" : "en")} title="Language">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{lang === "en" ? "EN" : "ع"}</span>
      </button>
      <button className="icon-btn focusable" onClick={() => setDark(!dark)} title="Theme">
        <Icon name={dark ? "sun" : "moon"} size={18}/>
      </button>
      <button className="icon-btn focusable" title="Notifications" style={{ position: "relative" }}>
        <Icon name="bell" size={18}/>
        <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "var(--bad)" }}/>
      </button>
      <button className="icon-btn focusable" onClick={onTweaks} title="Tweaks">
        <Icon name="sparkle" size={18}/>
      </button>
    </header>
  );
};

Object.assign(window, { Sidebar: window.Sidebar, Topbar: window.Topbar });
