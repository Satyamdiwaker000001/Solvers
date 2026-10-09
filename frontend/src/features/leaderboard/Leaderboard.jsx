import { useEffect, useState } from "react";
import { Crown, Flame, Info, Medal, TrendingUp, Trophy } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { getLeaderboard } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";

function RankBadge({ rank }) {
  const styles = [
    "leader-rank-gold",
    "leader-rank-silver",
    "leader-rank-bronze",
  ];
  if (rank <= 3) {
    return (
      <span className={`leader-rank-badge ${styles[rank - 1]}`}>
        {rank === 1 ? <Crown aria-hidden="true" /> : <Medal aria-hidden="true" />}
      </span>
    );
  }
  return <span className="leader-rank-number">{rank}</span>;
}

function Podium({ entries, highlightId }) {
  const top = [entries[1], entries[0], entries[2]].filter(Boolean);
  return (
    <div className="leader-podium" aria-label="Top three students">
      {top.map((entry) => (
        <div key={entry.studentId} className={`leader-podium-card rank-${entry.rank} ${entry.studentId === highlightId ? "is-current" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <RankBadge rank={entry.rank} />
            <span className="leader-place">#{entry.rank}</span>
          </div>
          <Avatar src={entry.avatarUrl} name={entry.displayName || entry.name || entry.studentId} className="leader-avatar object-cover" />
          <p className="leader-name">{entry.displayName || entry.name || entry.studentId}{entry.studentId === highlightId && <span className="leader-you">YOU</span>}</p>
          <p className="leader-score">{entry.score}<small> points</small></p>
          <p className="leader-subscore">{entry.verifiedProblems} verified · {entry.activeDays} active days</p>
        </div>
      ))}
    </div>
  );
}

/** Shared by student + admin; admin passes highlightId to spotlight a student. */
export function Leaderboard({
  highlightId,
  useSelfHighlight = false,
  title = "Activity leaderboard",
  description = "Ranking reflects verified problem completion and consistent activity across class assignments.",
}) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);
  const { user } = useAuth();
  const effectiveHighlight = highlightId ?? (useSelfHighlight ? user?.studentId : undefined);

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
      <div className="leaderboard-intro"><div className="leaderboard-intro-icon"><Trophy aria-hidden="true" /></div><div><p className="leaderboard-kicker">COMPETITION HUB</p><h2>Climb the ranks</h2><p>Earn points through consistent, verified problem solving.</p></div><div className="leaderboard-streak"><Flame aria-hidden="true" /><b>Keep your streak alive</b></div></div>
      <Card className="flex gap-2.5 border-info/25 bg-info-bg/50 text-sm">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <div className="min-w-0">
          <p className="font-semibold">How ranking works</p>
          <p className="text-muted">{formula}</p>
          <p className="tnum mt-0.5 text-xs text-muted">{window}</p>
        </div>
      </Card>
      <Podium entries={entries} highlightId={effectiveHighlight} />
      {/* Compact list on narrow screens */}
      <ol className="grid gap-2 lg:hidden">
        {entries.map((e) => {
          const name = e.displayName || e.name || e.studentId;
          const hot = e.studentId === effectiveHighlight;
          return (
            <li key={e.studentId} className={`leader-list-row ${hot ? "is-current" : ""}`}>
              <RankBadge rank={e.rank} />
              <Avatar src={e.avatarUrl} name={name} className="size-8 shrink-0 rounded-full border border-border object-cover text-center text-xs font-bold leading-8 text-primary" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-bold">{name} {hot && <span className="text-xs font-semibold text-primary">(you)</span>}</p>
                <p className="tnum truncate text-xs text-muted">{e.verifiedProblems} verified · {e.activeDays} active days</p>
              </div>
              <p className="leader-list-score"><TrendingUp aria-hidden="true" />{e.score}<span>pts</span></p>
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
                const name = e.displayName || e.name || e.studentId;
                const login = e.githubLogin || "";
                const hot = e.studentId === effectiveHighlight;
                return (
                  <tr key={e.studentId} className={`border-b border-border/60 last:border-0 ${hot ? "bg-primary-subtle/50" : "hover:bg-canvas/60"}`}>
                    <td className="px-4 py-3"><RankBadge rank={e.rank} /></td>
                    <td className="px-4 py-3"><p className="font-semibold">{name} {hot && <span className="text-xs text-primary">(you)</span>}</p>{login && <p className="mono text-xs text-muted">@{login} · {e.studentId}</p>}</td>
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
  return <Leaderboard highlightId={undefined} useSelfHighlight />;
}
