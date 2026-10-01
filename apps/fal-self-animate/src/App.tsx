import { useCallback, useEffect, useRef, useState } from "react";
import { MODELS, PRESETS, SAMPLE_STILL, modelById, presetById, type ModelId, type PresetId } from "./presets";

type Still = { kind: "sample"; url: string; name: string } | { kind: "upload"; url: string; name: string };

type Job =
  | { state: "idle" }
  | { state: "running"; status: string; logs: string[] }
  | { state: "done"; videoUrl: string; source: "sample" | "fal"; note?: string; elapsedMs?: number }
  | { state: "error"; message: string };

interface ServerStatus {
  live: boolean;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function App() {
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [still, setStill] = useState<Still>({ kind: "sample", url: SAMPLE_STILL.url, name: SAMPLE_STILL.label });
  const [preset, setPreset] = useState<PresetId>("walk");
  const [model, setModel] = useState<ModelId>("ltx-2.5-fast");
  const [job, setJob] = useState<Job>({ state: "idle" });
  const [dragging, setDragging] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: ServerStatus) => setServer(s))
      .catch(() => setServer({ live: false }));
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, job]);

  const live = server?.live ?? false;
  const busy = job.state === "running";

  const acceptFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setJob({ state: "error", message: "Drop an image file (png, jpg, webp)." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setJob({ state: "error", message: "Image is over 8 MB; pick something smaller." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setStill({ kind: "upload", url: String(reader.result), name: file.name });
      setJob({ state: "idle" });
    };
    reader.readAsDataURL(file);
  }, []);

  async function animate() {
    const p = presetById(preset);
    if (!live) {
      setJob({ state: "running", status: "SAMPLE", logs: ["No FAL_KEY on server — using bundled sample loop"] });
      await new Promise((r) => setTimeout(r, 500));
      setJob({
        state: "done",
        videoUrl: p.sample,
        source: "sample",
        note:
          still.kind === "upload"
            ? "Sample mode: this is the bundled loop for this preset, not your still. Set FAL_KEY to animate uploads."
            : undefined,
      });
      return;
    }

    setJob({ state: "running", status: "SUBMITTING", logs: [] });
    try {
      const res = await fetch("/api/animate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preset,
          model,
          ...(still.kind === "upload" ? { imageDataUrl: still.url } : { imageUrl: still.url }),
        }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let logs: string[] = [];
      let status = "IN_QUEUE";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as Record<string, string | number | undefined>;
          if (ev.type === "log") logs = [...logs.slice(-40), String(ev.message)];
          if (ev.type === "status") {
            status = String(ev.status);
            if (ev.position !== undefined) logs = [...logs.slice(-40), `Queue position ${ev.position}`];
          }
          if (ev.type === "done") {
            setJob({ state: "done", videoUrl: String(ev.videoUrl), source: "fal", elapsedMs: Number(ev.elapsedMs) });
            return;
          }
          if (ev.type === "error") throw new Error(String(ev.message));
          setJob({ state: "running", status, logs });
        }
      }
      throw new Error("Stream ended without a result");
    } catch (err) {
      setJob({ state: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  const selectedPreset = presetById(preset);
  const selectedModel = modelById(model);

  return (
    <main className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden />
          <div>
            <h1>fal self-animate</h1>
            <p>Still → motion preset → looping clip, via fal image-to-video.</p>
          </div>
        </div>
        <span className={`badge ${live ? "badge-live" : "badge-sample"}`} title={live ? "FAL_KEY detected" : "Set FAL_KEY to enable live generation"}>
          <i />
          {server === null ? "connecting" : live ? "live · fal" : "sample mode"}
        </span>
      </header>

      <section className="grid">
        <aside className="controls">
          <div className="step">
            <h2><span>1</span> Still</h2>
            <div className="stills">
              <button
                type="button"
                className={`still-card ${still.kind === "sample" ? "selected" : ""}`}
                onClick={() => setStill({ kind: "sample", url: SAMPLE_STILL.url, name: SAMPLE_STILL.label })}
              >
                <img src={SAMPLE_STILL.url} alt="Bolt, the bundled sample robot" />
                <span>{SAMPLE_STILL.label} <small>sample</small></span>
              </button>
              <div
                role="button"
                tabIndex={0}
                className={`still-card dropzone ${still.kind === "upload" ? "selected" : ""} ${dragging ? "dragging" : ""}`}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  acceptFile(e.dataTransfer.files[0]);
                }}
              >
                {still.kind === "upload" ? (
                  <img src={still.url} alt={still.name} />
                ) : (
                  <div className="drop-hint">
                    <strong>+</strong>
                    drop or pick a still
                  </div>
                )}
                <span>{still.kind === "upload" ? still.name : "Your image"} <small>{still.kind === "upload" ? "upload" : "png · jpg · webp"}</small></span>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    acceptFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          <div className="step">
            <h2><span>2</span> Motion</h2>
            <div className="presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset ${preset === p.id ? "selected" : ""}`}
                  onClick={() => setPreset(p.id)}
                  disabled={busy}
                >
                  <PresetGlyph id={p.id} />
                  <strong>{p.label}</strong>
                  <small>{p.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="step">
            <h2><span>3</span> Model {!live && <em>live only</em>}</h2>
            <div className="segmented">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={model === m.id ? "selected" : ""}
                  onClick={() => setModel(m.id)}
                  disabled={busy}
                  title={m.endpoint}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="model-note">
              <code>{selectedModel.endpoint}</code> — {selectedModel.note}{" "}
              <a href={selectedModel.docs} target="_blank" rel="noreferrer">docs</a>
            </p>
          </div>

          <button type="button" className="animate" onClick={animate} disabled={busy || server === null}>
            {busy ? <span className="spinner" /> : <span className="play" />}
            {busy ? "Animating…" : live ? `Animate with fal · ${selectedPreset.label}` : `Animate · ${selectedPreset.label}`}
          </button>
          {!live && server !== null && (
            <p className="footnote">
              No <code>FAL_KEY</code> in env, so Animate plays the bundled loop for the chosen preset. Export{" "}
              <code>FAL_KEY</code> and restart to generate for real.
            </p>
          )}
        </aside>

        <section className="stage">
          <div className={`player ${job.state}`}>
            {job.state === "done" ? (
              <video
                key={job.videoUrl}
                ref={videoRef}
                src={job.videoUrl}
                autoPlay
                loop={loop}
                muted
                playsInline
                onClick={(e) => {
                  const v = e.currentTarget;
                  v.paused ? v.play() : v.pause();
                }}
              />
            ) : (
              <div className="placeholder">
                <img src={still.url} alt="" className={job.state === "running" ? "pulse" : ""} />
                {job.state === "running" && (
                  <div className="progress">
                    <span className="spinner" />
                    {job.status === "SAMPLE" ? "Loading sample loop" : job.status.replace("_", " ").toLowerCase()}
                  </div>
                )}
                {job.state === "idle" && <p className="placeholder-hint">Your loop shows up here.</p>}
                {job.state === "error" && <p className="error">{job.message}</p>}
              </div>
            )}
          </div>

          <div className="stage-bar">
            <div className="meta">
              {job.state === "done" ? (
                <>
                  <span className={`chip ${job.source === "fal" ? "chip-live" : "chip-sample"}`}>
                    {job.source === "fal" ? selectedModel.label : "bundled sample"}
                  </span>
                  <span className="chip">{selectedPreset.label}</span>
                  {job.elapsedMs !== undefined && <span className="chip">{(job.elapsedMs / 1000).toFixed(1)}s</span>}
                </>
              ) : (
                <span className="chip chip-muted">{still.name}</span>
              )}
            </div>
            <div className="player-controls">
              <button type="button" className={`pill ${loop ? "on" : ""}`} onClick={() => setLoop((l) => !l)}>
                loop {loop ? "on" : "off"}
              </button>
              {[0.5, 1, 2].map((s) => (
                <button key={s} type="button" className={`pill ${speed === s ? "on" : ""}`} onClick={() => setSpeed(s)}>
                  {s}×
                </button>
              ))}
              {job.state === "done" && (
                <a className="pill" href={job.videoUrl} download={`${still.name}-${preset}.mp4`} target="_blank" rel="noreferrer">
                  download
                </a>
              )}
            </div>
          </div>

          {job.state === "done" && job.note && <p className="note">{job.note}</p>}
          {job.state === "running" && job.logs.length > 0 && (
            <pre className="logs">{job.logs.join("\n")}</pre>
          )}
        </section>
      </section>
    </main>
  );
}

function PresetGlyph({ id }: { id: PresetId }) {
  // tiny inline glyphs so the preset cards read at a glance
  switch (id) {
    case "walk":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="13" cy="4" r="2.2" />
          <path d="M12 7l-3 5 2 2-3 6M12 7l3 4 3 1M11 12l3 3 1 5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="5" r="2.2" />
          <path d="M11 8v8l-2 6M11 16l2 6M11 10l-3 3M11 10l4-2 3-5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "idle":
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="5" r="2.2" />
          <path d="M12 8v8M9 22l3-6 3 6M12 10l-3 3M12 10l3 3" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 3v4M20 3v4" fill="none" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
        </svg>
      );
  }
}
