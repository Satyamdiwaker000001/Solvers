import { useEffect, useState } from "react";
import { Info, Medal } from "lucide-react";
import { getLeaderboard } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { studentById } from "../../mocks/data.js";

function RankBadge({ rank }) {
  const styles = ["bg-warning-bg text-warning", "bg-canvas text-muted", "bg-primary-subtle text-primary"];
  if (rank <= 3) {
    return (
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${styles[rank - 1]}`}>
        <Medal aria-hidden="true" className="size-4" />
      </span>
    );
  }
  return <span className="tnum grid size-8 shrink-0 place-items-center rounded-full bg-canvas text-sm font-bold text-muted">{rank}</span>;
}

/** Shared by student + admin; admin passes highlightId to spotlight a student. */
export function Leaderboard({ highlightId, title = "Activity leaderboard", description = "Ranking reflects verified activity and consistency — never raw commit count (FR-LB-02). Values are reproducible from stored qualifying events." }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getLeaderboard()
      .then((r) => live && setState({ loading: false, error: null, data: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, data: null }));
    return () => { live = false; };
  }, [attempt]);

  if (state.loading) return <LoadingState label="Loading leaderboard…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, data: null }); setAttempt((a) => a + 1); }} />;

  const { entries, formula, window } = state.data;
  if (entries.length === 0) return <EmptyState title="No rankings yet" body="The leaderboard appears once qualifying evidence has been verified." />;

  return (
    <div className="grid gap-4">
      <PageHeader title={title} description={description} />
      <Card className="flex gap-2.5 border-info/25 bg-info-bg/50 text-sm">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <div className="min-w-0">
          <p className="font-semibold">How ranking works</p>
          <p className="text-muted">{formula}</p>
          <p className="tnum mt-0.5 text-xs text-muted">{window}</p>
        </div>
      </Card>
      {/* Compact list on narrow screens */}
      <ol className="grid gap-2 lg:hidden">
        {entries.map((e) => {
          const s = studentById(e.studentId);
          const hot = e.studentId === highlightId;
          return (
            <li key={e.studentId} className={`flex items-center gap-3 rounded-2xl border p-3 ${hot ? "border-primary bg-primary-subtle/50" : "border-border bg-surface"}`}>
              <RankBadge rank={e.rank} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-bold">{s.displayName} {hot && <span className="text-xs font-semibold text-primary">(you)</span>}</p>
                <p className="tnum truncate text-xs text-muted">{e.verifiedProblems} verified · {e.activeDays} active days</p>
              </div>
              <p className="tnum text-base font-extrabold">{e.score}<span className="text-xs font-medium text-muted"> pts</span></p>
            </li>
          );
        })}
      </ol>
      {/* Table on wide screens */}
      <Card className="hidden p-0 lg:block">
        <div className="table-scroll">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 text-right">Verified</th><th className="px-4 py-3 text-right">Active days</th><th className="px-4 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const s = studentById(e.studentId);
                const hot = e.studentId === highlightId;
                return (
                  <tr key={e.studentId} className={`border-b border-border/60 last:border-0 ${hot ? "bg-primary-subtle/50" : "hover:bg-canvas/60"}`}>
                    <td className="px-4 py-3"><span className="flex items-center gap-2"><RankBadge rank={e.rank} /><span className="tnum text-xs text-muted">{e.trend}</span></span></td>
                    <td className="px-4 py-3"><p className="font-semibold">{s.displayName} {hot && <span className="text-xs text-primary">(you)</span>}</p><p className="mono text-xs text-muted">@{s.githubLogin} · {s.id}</p></td>
                    <td className="tnum px-4 py-3 text-right font-bold">{e.verifiedProblems}</td>
                    <td className="tnum px-4 py-3 text-right">{e.activeDays}</td>
                    <td className="tnum px-4 py-3 text-right font-extrabold">{e.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function StudentLeaderboardPage() {
  return <Leaderboard highlightId="STU001" />;
}
