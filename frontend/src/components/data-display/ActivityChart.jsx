import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";

/** Responsive activity chart with labelled axes, legend, and text summary. */
export function ActivityChart({ data }) {
  const reducedMotion = usePrefersReducedMotion();
  const totals = (data ?? []).reduce((a, d) => ({ v: a.v + d.verified, p: a.p + d.progress, r: a.r + d.review }), { v: 0, p: 0, r: 0 });
  return (
    <figure className="min-w-0">
      <div className="h-56 w-full min-w-0 sm:h-64" role="img" aria-label={`Activity chart: ${totals.v} verified, ${totals.p} meaningful-progress and ${totals.r} review events in the last 14 days.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE4EE" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} label={{ value: "qualifying events", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="verified" name="Verified problems" stroke="#247A52" fill="#247A52" fillOpacity={0.18} strokeWidth={2} isAnimationActive={!reducedMotion} />
            <Area type="monotone" dataKey="progress" name="Meaningful progress" stroke="#2859A8" fill="#2859A8" fillOpacity={0.12} strokeWidth={2} isAnimationActive={!reducedMotion} />
            <Area type="monotone" dataKey="review" name="Needs review" stroke="#946200" fill="#946200" fillOpacity={0.15} strokeWidth={2} isAnimationActive={!reducedMotion} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="tnum mt-1 text-xs text-muted">
        Last 14 days: {totals.v} verified · {totals.p} meaningful-progress · {totals.r} needs-review. Counts come from qualifying evidence, never raw commits.
      </figcaption>
    </figure>
  );
}
