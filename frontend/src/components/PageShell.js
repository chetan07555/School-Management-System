import Sidebar from './Sidebar';

export default function PageShell({ title, subtitle, actions, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <main className="app-page">
          <div className="page-hero">
            <div>
              <p className="eyebrow">School Management System</p>
              <h1>{title}</h1>
              {subtitle ? <p className="page-hero__subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="page-hero__actions">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}