export function SolversLogo({ compact = false }) {
  return <div className={`solvers-logo ${compact ? "is-compact" : ""}`} aria-label="Solvers logo"><span className="solvers-logo-bracket">&lt;</span><span className="solvers-logo-slash">/</span><span className="solvers-logo-bracket">&gt;</span><i /></div>;
}
