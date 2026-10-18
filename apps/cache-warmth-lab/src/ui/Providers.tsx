import { useState } from "react";
import type { CacheMode, Field, ProviderProfile, RateAnswer } from "../lib/types";
import { formatField, formatMode } from "./format";

const HTTPS = /^https:\/\/\S+$/;

const numberFields = [
  ["ttlSeconds", "TTL seconds"],
  ["extendedTtlSeconds", "Extended TTL seconds"],
  ["minCacheablePrefixTokens", "Min cacheable prefix"],
  ["inputUsdPerMillion", "Input $ / 1M"],
  ["outputUsdPerMillion", "Output $ / 1M"],
  ["cacheWriteMultiplier", "Cache write multiplier"],
  ["extendedCacheWriteMultiplier", "Extended write multiplier"],
  ["cacheReadMultiplier", "Cache read multiplier"],
] as const;

type NumberKey = (typeof numberFields)[number][0];

function fieldText(field: Field<number>): string {
  return field.kind === "unknown" ? "unknown" : String(field.value);
}

function sourceText(field: Field<unknown>): string {
  return field.source ?? "";
}

function parseNumber(raw: string, source: string): Field<number> | string {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "unknown") {
    return { kind: "unknown", source: source.trim() || null };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return "use a non-negative number or unknown";
  if (!HTTPS.test(source.trim())) return "a known number needs an https source";
  return { kind: "known", value, source: source.trim() };
}

function SourceLink({ source }: { source: string | null }) {
  if (!source) return null;
  let host = "source";
  try {
    host = new URL(source).host;
  } catch {
    host = "source";
  }
  return (
    <a href={source} target="_blank" rel="noreferrer">
      {host}
    </a>
  );
}

export function ProviderBoard({
  profiles,
  selectedIds,
  onToggle,
  onChange,
  onAdd,
  onReset,
  revision,
}: {
  profiles: ProviderProfile[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onChange: (profile: ProviderProfile) => void;
  onAdd: () => void;
  onReset: () => void;
  revision: number;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Provider profiles</h2>
        <div className="row">
          <button type="button" onClick={onAdd}>
            Add profile
          </button>
          <button type="button" onClick={onReset}>
            Reset to shipped defaults
          </button>
        </div>
      </header>
      <p className="lede">
        Numbers are as of {profiles[0]?.asOf ?? "unknown"}. They may be stale. Edit them. Unknown stays unknown until you
        supply a value and a source.
      </p>
      <div className="profile-grid">
        {profiles.map((profile) => (
          <article key={profile.id} className="profile" data-provider={profile.id}>
            <label className="check">
              <input
                type="checkbox"
                checked={selectedIds.includes(profile.id)}
                onChange={() => onToggle(profile.id)}
              />
              <span>{profile.label}</span>
            </label>
            <p className="model">{profile.model}</p>
            <dl>
              <div>
                <dt>TTL</dt>
                <dd>
                  {formatField(profile.ttlSeconds, 0)}
                  {profile.ttlSeconds.kind === "known" ? "s" : ""} <SourceLink source={profile.ttlSeconds.source} />
                </dd>
              </div>
              <div>
                <dt>Extended TTL</dt>
                <dd>
                  {formatField(profile.extendedTtlSeconds, 0)}
                  {profile.extendedTtlSeconds.kind === "known" ? "s" : ""}{" "}
                  <SourceLink source={profile.extendedTtlSeconds.source} />
                </dd>
              </div>
              <div>
                <dt>Min prefix</dt>
                <dd>
                  {formatField(profile.minCacheablePrefixTokens, 0)}{" "}
                  <SourceLink source={profile.minCacheablePrefixTokens.source} />
                </dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>
                  {formatMode(profile.cacheMode)} <SourceLink source={profile.cacheMode.source} />
                </dd>
              </div>
              <div>
                <dt>Input / output</dt>
                <dd>
                  {profile.inputUsdPerMillion.kind === "known" ? `$${profile.inputUsdPerMillion.value}` : "unknown"} /{" "}
                  {profile.outputUsdPerMillion.kind === "known" ? `$${profile.outputUsdPerMillion.value}` : "unknown"} per
                  1M
                </dd>
              </div>
              <div>
                <dt>Write / read</dt>
                <dd>
                  {formatField(profile.cacheWriteMultiplier)}× / {formatField(profile.cacheReadMultiplier)}×
                </dd>
              </div>
              <div>
                <dt>Reads count?</dt>
                <dd>
                  {profile.readsCountTowardRateLimit.value}{" "}
                  <SourceLink source={profile.readsCountTowardRateLimit.source} />
                </dd>
              </div>
            </dl>
            <p className="note">{profile.notes}</p>
            <ProfileEditor key={`${profile.id}:${revision}`} profile={profile} onChange={onChange} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfileEditor({
  profile,
  onChange,
}: {
  profile: ProviderProfile;
  onChange: (profile: ProviderProfile) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => profile);

  function apply(next: ProviderProfile) {
    setDraft(next);
    setError(null);
    onChange(next);
  }

  function commitNumber(key: NumberKey, raw: string, source: string) {
    const parsed = parseNumber(raw, source);
    if (typeof parsed === "string") {
      setError(parsed);
      return;
    }
    apply({ ...draft, [key]: parsed });
  }

  return (
    <details className="editor">
      <summary>Edit numbers</summary>
      <label>
        Label
        <input value={draft.label} onChange={(event) => apply({ ...draft, label: event.target.value })} />
      </label>
      <label>
        Model
        <input value={draft.model} onChange={(event) => apply({ ...draft, model: event.target.value })} />
      </label>
      {numberFields.map(([key, label]) => (
        <div key={key} className="edit-pair">
          <label>
            {label}
            <input
              defaultValue={fieldText(draft[key])}
              onBlur={(event) => commitNumber(key, event.target.value, sourceText(draft[key]))}
            />
          </label>
          <label>
            Source
            <input
              defaultValue={sourceText(draft[key])}
              onBlur={(event) => commitNumber(key, fieldText(draft[key]), event.target.value)}
            />
          </label>
        </div>
      ))}
      <label>
        Cache mode
        <select
          value={draft.cacheMode.kind === "unknown" ? "unknown" : draft.cacheMode.value}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "unknown") {
              apply({ ...draft, cacheMode: { kind: "unknown", source: draft.cacheMode.source } });
              return;
            }
            const mode: CacheMode = value === "explicit" ? "explicit" : "automatic";
            const source = draft.cacheMode.source ?? "";
            if (!HTTPS.test(source)) {
              setError("set an https source before choosing a cache mode");
              return;
            }
            apply({ ...draft, cacheMode: { kind: "known", value: mode, source } });
          }}
        >
          <option value="automatic">automatic</option>
          <option value="explicit">explicit</option>
          <option value="unknown">unknown</option>
        </select>
      </label>
      <label>
        Reads count toward rate limits
        <select
          value={draft.readsCountTowardRateLimit.value}
          onChange={(event) => {
            const value = event.target.value as RateAnswer;
            if (value !== "unknown" && !HTTPS.test(draft.readsCountTowardRateLimit.source ?? "")) {
              setError("set an https source before answering the rate-limit question");
              return;
            }
            apply({
              ...draft,
              readsCountTowardRateLimit: { ...draft.readsCountTowardRateLimit, value },
            });
          }}
        >
          <option value="yes">yes</option>
          <option value="no">no</option>
          <option value="partial">partial</option>
          <option value="unknown">unknown</option>
        </select>
      </label>
      <label>
        Rate-limit source
        <input
          value={draft.readsCountTowardRateLimit.source ?? ""}
          onChange={(event) =>
            apply({
              ...draft,
              readsCountTowardRateLimit: {
                ...draft.readsCountTowardRateLimit,
                source: event.target.value.trim() || null,
              },
            })
          }
        />
      </label>
      <label>
        Rate-limit note
        <input
          value={draft.readsCountTowardRateLimit.note}
          onChange={(event) =>
            apply({
              ...draft,
              readsCountTowardRateLimit: { ...draft.readsCountTowardRateLimit, note: event.target.value },
            })
          }
        />
      </label>
      <label>
        Notes
        <textarea value={draft.notes} onChange={(event) => apply({ ...draft, notes: event.target.value })} />
      </label>
      {error ? <p className="error">{error}</p> : null}
    </details>
  );
}
