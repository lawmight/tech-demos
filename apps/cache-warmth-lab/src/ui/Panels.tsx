import type { ProviderProfile, Replay } from "../lib/types";
import { formatClock, formatTokens, formatUsd } from "./format";

export function CostPanel({ lanes }: { lanes: Array<{ profile: ProviderProfile; replay: Replay }> }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Warm vs cold</h2>
      </header>
      <p className="lede">
        Warm is the replay so far. Cold prices every elapsed prompt with no cache. Ping path and rewrite path compare
        the input cost of the turn after the longest gap. Output tokens match on both paths, so they are left out. A
        ping is a cache read of the prefix already in cache. A result that depends on an unknown TTL, minimum, or
        multiplier stays unknown.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Warm so far</th>
              <th>All cold so far</th>
              <th>Longest gap</th>
              <th>Pings to stay warm</th>
              <th>Ping path</th>
              <th>Rewrite path</th>
              <th>Break-even pings</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map(({ profile, replay }) => {
              const gap = replay.gap;
              return (
                <tr key={profile.id}>
                  <td>{profile.label}</td>
                  <td>{formatUsd(replay.warm)}</td>
                  <td>{formatUsd(replay.cold)}</td>
                  <td>{gap ? formatClock(gap.gapMs) : "none"}</td>
                  <td>{gap ? (gap.insideTtl ? "0, gap is inside the TTL" : String(gap.pingsNeeded)) : "unknown"}</td>
                  <td>{gap ? formatUsd(gap.pingPath) : "unknown"}</td>
                  <td>{gap ? formatUsd(gap.rewritePath) : "unknown"}</td>
                  <td>{gap?.breakEvenPings === null || gap?.breakEvenPings === undefined ? "unknown" : gap.breakEvenPings}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RatePanel({ lanes }: { lanes: Array<{ profile: ProviderProfile; replay: Replay }> }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Do cache reads count?</h2>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Answer</th>
              <th>Tokens against the limit so far</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map(({ profile, replay }) => (
              <tr key={profile.id}>
                <td>{profile.label}</td>
                <td>{profile.readsCountTowardRateLimit.value}</td>
                <td>{formatTokens(replay.tokensAgainstLimit)}</td>
                <td>
                  {profile.readsCountTowardRateLimit.note}{" "}
                  {profile.readsCountTowardRateLimit.source ? (
                    <a href={profile.readsCountTowardRateLimit.source}>source</a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
