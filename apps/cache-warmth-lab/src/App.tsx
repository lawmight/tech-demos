import { useEffect, useRef, useState } from "react";
import { AS_OF, blankProfile, shippedProfiles } from "./config/providers";
import { replay, sessionEndMs, shouldNudge } from "./lib/replay";
import { sampleSession } from "./lib/sample";
import { loadProfiles, resetProfiles, saveProfiles } from "./lib/storage";
import type { ImportResult, ProviderProfile, Session, TtlChoice } from "./lib/types";
import { ImportBox } from "./ui/ImportBox";
import { CostPanel, RatePanel } from "./ui/Panels";
import { ProviderBoard } from "./ui/Providers";
import { ReplayStage } from "./ui/Replay";
import { formatClock } from "./ui/format";

const START_MS = 400_000;

function browserStore(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function App() {
  const [profiles, setProfiles] = useState<ProviderProfile[]>(() => {
    const store = browserStore();
    return store ? loadProfiles(store, shippedProfiles) : shippedProfiles;
  });
  const [revision, setRevision] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => shippedProfiles.map((profile) => profile.id));
  const [session, setSession] = useState<Session>(sampleSession);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(START_MS);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 10 | 60>(10);
  const [ttlChoice, setTtlChoice] = useState<TtlChoice>("default");
  const [leadSeconds, setLeadSeconds] = useState(30);
  const [toast, setToast] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });
  const fired = useRef(new Set<string>());

  const selected = profiles.filter((profile) => selectedIds.includes(profile.id));
  const maxMs = sessionEndMs(session, selected, ttlChoice);
  const leadMs = leadSeconds * 1000;
  const lanes = selected.map((profile) => ({ profile, replay: replay(session, profile, nowMs, ttlChoice) }));
  const extendedAvailable = selected.some((profile) => profile.extendedTtlSeconds.kind === "known");

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (time: number) => {
      const delta = time - last;
      last = time;
      setNowMs((current) => Math.min(maxMs, current + delta * speed));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, maxMs]);

  useEffect(() => {
    if (nowMs >= maxMs && playing) setPlaying(false);
  }, [nowMs, maxMs, playing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!playing) return;
    for (const lane of lanes) {
      if (!shouldNudge(lane.replay.warmth, leadMs)) continue;
      const last = lane.replay.turns.at(-1);
      if (!last || lane.replay.warmth.status !== "warm") continue;
      const key = `${lane.profile.id}:${last.id}:${lane.replay.warmth.ttlMs}`;
      if (fired.current.has(key)) continue;
      fired.current.add(key);
      const body = `${lane.profile.label} goes cold in ${formatClock(lane.replay.warmth.remainingMs)}.`;
      announce(body, permission, setToast);
    }
  }, [lanes, leadMs, permission, playing]);

  function persist(next: ProviderProfile[]) {
    setProfiles(next);
    const store = browserStore();
    if (store) saveProfiles(store, next);
  }

  function announcePreview() {
    const lane = lanes.find((item) => shouldNudge(item.replay.warmth, leadMs));
    const body = lane
      ? `${lane.profile.label} goes cold in ${formatClock(lane.replay.warmth.status === "warm" ? lane.replay.warmth.remainingMs : 0)}.`
      : "Cache expiry nudge. This is the in-page fallback.";
    announce(body, permission, setToast);
  }

  const nudges = lanes.filter((lane) => shouldNudge(lane.replay.warmth, leadMs));

  return (
    <main>
      <header className="top">
        <p className="kicker">Simulation, offline, no API key</p>
        <h1>Cache Warmth Lab</h1>
        <ul className="rules">
          <li>Provider numbers as of {AS_OF}. Verify and edit.</li>
          <li>Not affiliated with Anthropic, OpenAI, Cursor, or xAI.</li>
          <li>Timers are simulated. 1× is real time. 10× and 60× compress a five-minute TTL.</li>
        </ul>
      </header>
      {nudges.length > 0 ? (
        <div className="banner" role="status">
          {nudges.map((lane) => (
            <p key={lane.profile.id}>
              {lane.profile.label} goes cold in{" "}
              {lane.replay.warmth.status === "warm" ? formatClock(lane.replay.warmth.remainingMs) : "0:00"}.
            </p>
          ))}
        </div>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          {toast}
          {permission === "denied" || permission === "unsupported"
            ? " Browser notifications are unavailable, so this banner is the alert."
            : ""}
        </div>
      ) : null}
      <div className="row alerts">
        <label>
          Nudge lead (seconds)
          <input
            type="number"
            min={1}
            max={600}
            value={leadSeconds}
            onChange={(event) => setLeadSeconds(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (typeof Notification === "undefined") {
              setPermission("unsupported");
              setToast("This browser has no Notification API. The in-page banner is the alert.");
              return;
            }
            void Notification.requestPermission().then((result) => {
              setPermission(result);
              setToast(
                result === "granted"
                  ? "Notifications allowed. A nudge will use them."
                  : "Notifications blocked. The in-page banner is the alert.",
              );
            });
          }}
        >
          Allow expiry alerts
        </button>
        <button type="button" onClick={announcePreview}>
          Preview nudge
        </button>
      </div>
      <ProviderBoard
        profiles={profiles}
        selectedIds={selectedIds}
        revision={revision}
        onToggle={(id) =>
          setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
        }
        onChange={(profile) => persist(profiles.map((item) => (item.id === profile.id ? profile : item)))}
        onAdd={() => {
          const id = `custom-${crypto.randomUUID()}`;
          persist([...profiles, blankProfile(id)]);
          setSelectedIds((current) => [...current, id]);
          setRevision((value) => value + 1);
        }}
        onReset={() => {
          const store = browserStore();
          if (store) resetProfiles(store);
          setProfiles(shippedProfiles);
          setRevision((value) => value + 1);
        }}
      />
      <ReplayStage
        session={session}
        lanes={lanes}
        nowMs={nowMs}
        maxMs={maxMs}
        playing={playing}
        speed={speed}
        ttlChoice={ttlChoice}
        extendedAvailable={extendedAvailable}
        onScrub={(ms) => {
          setPlaying(false);
          setNowMs(ms);
        }}
        onToggle={() => setPlaying((value) => !value)}
        onSpeed={setSpeed}
        onStep={() => {
          const next = session.turns.find((turn) => turn.atMs > nowMs + 1);
          setPlaying(false);
          setNowMs(next ? next.atMs : maxMs);
        }}
        onTtl={setTtlChoice}
      />
      <CostPanel lanes={lanes} />
      <RatePanel lanes={lanes} />
      <ImportBox
        onImport={(result: ImportResult) => {
          setWarnings(result.warnings);
          if (!result.session) return;
          setSession(result.session);
          setNowMs(0);
          setPlaying(false);
          fired.current.clear();
        }}
      />
      {warnings.length > 0 ? (
        <ul className="warnings">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {session.source !== "sample" ? (
        <p className="lede">
          Parsed {session.turns.length} turns from {session.source}.{" "}
          <button
            type="button"
            onClick={() => {
              setSession(sampleSession);
              setWarnings([]);
              setNowMs(START_MS);
              setPlaying(false);
            }}
          >
            Back to sample
          </button>
        </p>
      ) : null}
    </main>
  );
}

function announce(
  body: string,
  permission: NotificationPermission | "unsupported",
  setToast: (value: string) => void,
): void {
  if (permission === "granted" && typeof Notification !== "undefined") {
    new Notification("Cache going cold", { body });
  }
  setToast(body);
}
