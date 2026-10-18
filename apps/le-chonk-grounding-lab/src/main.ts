import "./styles.css";
import { researchLinks, researchRows, researchedOn, verdict } from "./content/research";
import { fixtures } from "./fixtures/index";
import { scenes } from "./fixtures/scenes";
import { modelBoxToOriginalPixels, scaleBoxToDisplay, sentSizeForOriginal } from "./lib/coords";
import { parseGrounding } from "./lib/parse";
import { getProvider, providerRegistry, selectRunMode } from "./lib/providers/registry";
import { findReplay } from "./lib/replay";
import type { GroundingBox, ParseOutcome, ProviderId } from "./lib/types";

const SESSION_KEY = "lechonk.session.v1";

type Session = {
  providerId: ProviderId;
  models: Record<ProviderId, string>;
  keys: Record<ProviderId, string>;
};

type Stage = {
  id: string;
  title: string;
  width: number;
  height: number;
};

const defaultModels = Object.fromEntries(
  providerRegistry.map((adapter) => [adapter.id, adapter.defaultModel]),
) as Record<ProviderId, string>;

const emptyKeys: Record<ProviderId, string> = { vercel: "", mistral: "", openrouter: "" };

function loadSession(): Session {
  const fallback: Session = {
    providerId: "vercel",
    models: { ...defaultModels },
    keys: { ...emptyKeys },
  };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Session>;
    const providerId =
      parsed.providerId === "mistral" || parsed.providerId === "openrouter"
        ? parsed.providerId
        : "vercel";
    return {
      providerId,
      models: { ...defaultModels, ...parsed.models },
      keys: { ...emptyKeys, ...parsed.keys },
    };
  } catch {
    return fallback;
  }
}

const session = loadSession();

const state: {
  mode: "replay" | "live";
  providerId: ProviderId;
  models: Record<ProviderId, string>;
  keys: Record<ProviderId, string>;
  envHas: Record<ProviderId, boolean>;
  stage: Stage | null;
  selected: number | null;
  outcome: ParseOutcome | null;
  raw: unknown;
  source: "synthetic" | "live" | null;
  error: string | null;
} = {
  mode: "replay",
  providerId: session.providerId,
  models: session.models,
  keys: session.keys,
  envHas: { vercel: false, mistral: false, openrouter: false },
  stage: null,
  selected: null,
  outcome: null,
  raw: null,
  source: null,
  error: null,
};

const app = document.querySelector("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <header class="top">
    <div>
      <p class="eyebrow">Mistral Large 4 · public preview</p>
      <h1>Le Chonk Grounding Lab</h1>
      <p class="lede">Ask where something is. Large 4 answers with boxes, a confidence, and a short reason. This page opens in replay, so you can try it with no key.</p>
    </div>
    <div class="stamps">
      <span id="replay-badge" class="badge">Replay</span>
      <span id="source-badge" class="badge badge-warn hidden">Illustrative replay — not real Large 4 output</span>
    </div>
  </header>
  <p class="rules">
    <span>Replay answers are illustrative unless marked live</span>
    <span>Keys stay local, never committed</span>
    <span>Not affiliated with Mistral AI, Vercel or OpenRouter</span>
  </p>
  <main class="layout">
    <section class="stage-col">
      <div class="samples" id="samples"></div>
      <div class="frame" id="stage-frame">
        <canvas id="stage-canvas"></canvas>
        <div class="overlay" id="overlay"></div>
        <p class="empty" id="empty-stage">Drop, paste, or pick an image.</p>
      </div>
      <p class="caption" id="caption"></p>
    </section>
    <section class="side">
      <form class="ask" id="ask-form">
        <label>Where is…
          <input id="ask-input" name="query" autocomplete="off" placeholder="the kettle" />
        </label>
        <button id="ask-button" type="submit">Ask</button>
      </form>
      <div class="suggestions" id="suggestions"></div>
      <div id="error-card" class="error hidden"></div>
      <article class="card" id="reasoning">
        <h2>Reasoning</h2>
        <p class="reasoning">Boxes land on the image. Click one, or tab to it and press Enter.</p>
      </article>
      <div class="box-list" id="box-list"></div>
      <details class="panel" id="raw-drawer">
        <summary>Raw response</summary>
        <pre id="raw-json">Nothing asked yet.</pre>
      </details>
      <details class="panel" id="provider-panel">
        <summary>Provider switcher</summary>
        <div class="choices" id="provider-choices"></div>
        <label class="field">Model id
          <input id="model-input" autocomplete="off" />
        </label>
        <div class="choices" id="mode-choices">
          <label><input type="radio" name="mode" value="replay" checked /> Replay</label>
          <label><input id="mode-live" type="radio" name="mode" value="live" /> Live</label>
        </div>
        <label class="field">API key for this provider
          <span class="key-row">
            <input id="key-input" type="password" autocomplete="off" spellcheck="false" placeholder="Session only" />
            <button class="text-btn ghost" id="clear-key" type="button">Clear key</button>
          </span>
        </label>
        <p class="hint" id="live-hint"></p>
      </details>
      <details class="panel" id="free-panel">
        <summary>Free during launch?</summary>
        <p class="hint" id="verdict"></p>
        <table>
          <thead><tr><th>Provider</th><th>Model</th><th>Free?</th></tr></thead>
          <tbody id="research-body"></tbody>
        </table>
        <ul class="links" id="research-links"></ul>
      </details>
    </section>
  </main>
  <footer>
    <p>Mistral's 6 Oct 2026 launch note presents Large 4, nicknamed Le Chonk, as a preview API and calls out visual grounding as a place it goes past closed models. Artificial Analysis scored it 38 on its Intelligence Index.</p>
    <p>
      <a href="https://mistral.ai/news/mistral-large-4/">Launch post</a> ·
      <a href="https://x.com/MistralAI/status/2107457414387622310">Bookmark</a> ·
      <a href="https://artificialanalysis.ai/articles/mistral-large-4-france-ai">Artificial Analysis</a> ·
      <a href="https://x.com/ArtificialAnlys/status/2107467221421420919">Index post</a>
    </p>
    <p>Mistral Large 4 is a public preview; weights are expected end of October 2026. Not affiliated with Mistral AI, Vercel or OpenRouter.</p>
  </footer>
`;

const samplesEl = must("#samples");
const frame = must("#stage-frame");
const canvas = mustCanvas("#stage-canvas");
const overlay = must("#overlay");
const emptyStage = must("#empty-stage");
const caption = must("#caption");
const askForm = mustForm("#ask-form");
const askInput = mustInput("#ask-input");
const suggestions = must("#suggestions");
const errorCard = must("#error-card");
const reasoning = must("#reasoning");
const boxList = must("#box-list");
const rawJson = must("#raw-json");
const sourceBadge = must("#source-badge");
const replayBadge = must("#replay-badge");
const providerChoices = must("#provider-choices");
const modelInput = mustInput("#model-input");
const liveRadio = mustInput("#mode-live");
const keyInput = mustInput("#key-input");
const liveHint = must("#live-hint");
const researchBody = must("#research-body");
const researchLinksEl = must("#research-links");
const verdictEl = must("#verdict");

function must(selector: string): HTMLElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function mustInput(selector: string): HTMLInputElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLInputElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function mustCanvas(selector: string): HTMLCanvasElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLCanvasElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function mustForm(selector: string): HTMLFormElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLFormElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function persist(): void {
  const payload: Session = {
    providerId: state.providerId,
    models: state.models,
    keys: state.keys,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function currentKey(): boolean {
  return state.keys[state.providerId].trim() !== "" || state.envHas[state.providerId];
}

function boxes(): GroundingBox[] {
  if (!state.outcome?.ok) return [];
  return state.outcome.result.boxes;
}

function renderProviders(): void {
  providerChoices.replaceChildren();
  for (const adapter of providerRegistry) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "provider";
    input.value = adapter.id;
    input.checked = adapter.id === state.providerId;
    input.addEventListener("change", () => {
      if (input.value === "vercel" || input.value === "mistral" || input.value === "openrouter") {
        state.providerId = input.value;
        persist();
        syncProviderFields(true);
      }
    });
    label.append(input, document.createTextNode(`${adapter.label}`));
    providerChoices.append(label);
  }
  syncProviderFields();
}

function syncProviderFields(refreshKey = false): void {
  const adapter = getProvider(state.providerId);
  modelInput.value = state.models[state.providerId];
  if (refreshKey) keyInput.value = state.keys[state.providerId];
  const enabled = currentKey();
  liveRadio.disabled = !enabled;
  if (!enabled && state.mode === "live") {
    state.mode = "replay";
    const replay = document.querySelector<HTMLInputElement>('input[name="mode"][value="replay"]');
    if (replay) replay.checked = true;
  }
  liveRadio.checked = state.mode === "live";
  replayBadge.textContent = state.mode === "live" ? "Live" : "Replay";
  const name = adapter?.label ?? "this provider";
  liveHint.textContent = enabled
    ? `Live is available for ${name}. The dev proxy forwards the call. The key stays in this tab or in .env.local.`
    : `Live is disabled for ${name}. Add a key in the field (this tab only) or in .env.local, then restart the dev server if you use the file.`;
}

function renderResearch(): void {
  verdictEl.textContent = `${verdict} As of ${researchedOn}.`;
  researchBody.replaceChildren();
  for (const row of researchRows) {
    const tr = document.createElement("tr");
    for (const text of [row.provider, row.model, row.free]) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    researchBody.append(tr);
  }
  researchLinksEl.replaceChildren();
  for (const link of researchLinks) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    a.target = "_blank";
    a.rel = "noreferrer";
    li.append(a);
    researchLinksEl.append(li);
  }
}

function renderSamples(): void {
  samplesEl.replaceChildren();
  for (const scene of scenes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.id = `sample-${scene.id}`;
    button.textContent = scene.title;
    button.setAttribute("aria-pressed", state.stage?.id === scene.id ? "true" : "false");
    button.addEventListener("click", () => {
      void loadSample(scene.id);
    });
    samplesEl.append(button);
  }
  const fileBtn = document.createElement("label");
  fileBtn.className = "file-btn";
  fileBtn.textContent = "Upload";
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.hidden = true;
  file.addEventListener("change", () => {
    const picked = file.files?.[0];
    if (picked) void loadFile(picked, picked.name);
  });
  fileBtn.append(file);
  samplesEl.append(fileBtn);
}

function renderSuggestions(): void {
  suggestions.replaceChildren();
  const scene = scenes.find((item) => item.id === state.stage?.id);
  if (!scene) return;
  for (const question of scene.questions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = question.query;
    button.addEventListener("click", () => {
      askInput.value = question.query;
      void ask(question.query);
    });
    suggestions.append(button);
  }
}

function formatPx(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function renderResult(): void {
  sourceBadge.classList.toggle("hidden", state.source === null);
  if (state.source === "synthetic") {
    sourceBadge.textContent = "Illustrative replay — not real Large 4 output";
  } else if (state.source === "live") {
    sourceBadge.textContent = "Recorded live";
  }
  errorCard.classList.toggle("hidden", state.error === null);
  errorCard.textContent = state.error ?? "";
  rawJson.textContent =
    state.raw === null ? "Nothing asked yet." : JSON.stringify(state.raw, null, 2);
  boxList.replaceChildren();
  const found = boxes();
  found.forEach((box, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = box.label;
    button.setAttribute("aria-pressed", state.selected === index ? "true" : "false");
    button.addEventListener("click", () => selectBox(index, false));
    boxList.append(button);
  });
  renderReasoning();
  layoutBoxes();
}

function renderReasoning(): void {
  const selected = state.selected === null ? undefined : boxes()[state.selected];
  reasoning.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = selected?.label ?? "Reasoning";
  reasoning.append(title);
  if (state.outcome && !state.outcome.ok) {
    const p = document.createElement("p");
    p.className = "reasoning";
    p.textContent = state.outcome.error;
    reasoning.append(p);
    return;
  }
  if (state.outcome?.ok && state.outcome.result.boxes.length === 0) {
    const p = document.createElement("p");
    p.className = "reasoning";
    p.textContent = state.outcome.result.notes
      ? `No match. ${state.outcome.result.notes}`
      : "No match. The answer returned no boxes.";
    reasoning.append(p);
    return;
  }
  if (!selected || !state.stage || !state.outcome?.ok) {
    const p = document.createElement("p");
    p.className = "reasoning";
    p.textContent = "Boxes land on the image. Click one, or tab to it and press Enter.";
    reasoning.append(p);
    return;
  }
  const meta = document.createElement("div");
  meta.className = "meta";
  const confidence = document.createElement("span");
  confidence.className = "pill";
  confidence.textContent = `${Math.round(selected.confidence * 100)}% confidence`;
  meta.append(confidence);
  reasoning.append(meta);
  const text = document.createElement("p");
  text.className = "reasoning";
  text.textContent = selected.reasoning;
  reasoning.append(text);
  const original = modelBoxToOriginalPixels(
    selected.box_2d,
    state.outcome.result.coordinate_space,
    sentSizeForOriginal(state.stage),
    state.stage,
  );
  const onScreen = scaleBoxToDisplay({
    box: selected.box_2d,
    space: state.outcome.result.coordinate_space,
    sent: sentSizeForOriginal(state.stage),
    original: state.stage,
    display: { width: overlay.clientWidth, height: overlay.clientHeight },
    devicePixelRatio: window.devicePixelRatio || 1,
  });
  const coords = document.createElement("p");
  coords.className = "coords";
  coords.textContent = `Original px ${formatPx(original.x)}–${formatPx(original.x + original.width)}, ${formatPx(original.y)}–${formatPx(original.y + original.height)}. On screen ${formatPx(onScreen.x)}, ${formatPx(onScreen.y)}, ${formatPx(onScreen.width)} × ${formatPx(onScreen.height)} CSS px.`;
  reasoning.append(coords);
}

function selectBox(index: number | null, focus: boolean): void {
  state.selected = index;
  overlay.querySelectorAll<HTMLButtonElement>(".box-hit").forEach((button, i) => {
    button.dataset.selected = i === index ? "true" : "false";
    button.setAttribute("aria-pressed", i === index ? "true" : "false");
    if (focus && i === index) button.focus();
  });
  boxList.querySelectorAll("button").forEach((button, i) => {
    button.setAttribute("aria-pressed", i === index ? "true" : "false");
  });
  renderReasoning();
}

function layoutBoxes(): void {
  overlay.replaceChildren();
  const found = boxes();
  if (!state.stage || found.length === 0 || !state.outcome?.ok) return;
  const displaySize = { width: overlay.clientWidth, height: overlay.clientHeight };
  found.forEach((box, index) => {
    const placed = scaleBoxToDisplay({
      box: box.box_2d,
      space: state.outcome && state.outcome.ok ? state.outcome.result.coordinate_space : "normalized_1000",
      sent: sentSizeForOriginal(state.stage as Stage),
      original: state.stage as Stage,
      display: displaySize,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    const button = document.createElement("button");
    button.type = "button";
    button.className = "box-hit";
    button.dataset.selected = state.selected === index ? "true" : "false";
    button.setAttribute("aria-pressed", state.selected === index ? "true" : "false");
    button.style.left = `${placed.x}px`;
    button.style.top = `${placed.y}px`;
    button.style.width = `${placed.width}px`;
    button.style.height = `${placed.height}px`;
    const label = document.createElement("span");
    label.textContent = box.label;
    button.append(label);
    button.addEventListener("mouseenter", () => {
      button.dataset.hover = "true";
    });
    button.addEventListener("mouseleave", () => {
      button.dataset.hover = "false";
    });
    button.addEventListener("click", () => selectBox(index, false));
    overlay.append(button);
  });
}

async function drawBitmap(bitmap: ImageBitmap, stage: Stage): Promise<void> {
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  state.stage = { ...stage, width: canvas.width, height: canvas.height };
  emptyStage.classList.add("hidden");
  caption.textContent = stage.title;
  state.outcome = null;
  state.raw = null;
  state.source = null;
  state.selected = null;
  state.error = null;
  renderSamples();
  renderSuggestions();
  renderResult();
}

async function loadSample(id: string): Promise<void> {
  const scene = scenes.find((item) => item.id === id);
  if (!scene) return;
  const response = await fetch(`/samples/${id}.png`);
  if (!response.ok) {
    state.error = "Could not load that sample image.";
    renderResult();
    return;
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  await drawBitmap(bitmap, { id: scene.id, title: scene.caption, width: bitmap.width, height: bitmap.height });
}

async function loadFile(file: File, title: string): Promise<void> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  await drawBitmap(bitmap, { id: "upload", title, width: bitmap.width, height: bitmap.height });
}

function sentCanvas(): { url: string; width: number; height: number } {
  if (!state.stage) throw new Error("No image");
  const sent = sentSizeForOriginal(state.stage);
  if (sent.width === canvas.width && sent.height === canvas.height) {
    return { url: canvas.toDataURL("image/png"), width: sent.width, height: sent.height };
  }
  const copy = document.createElement("canvas");
  copy.width = sent.width;
  copy.height = sent.height;
  const ctx = copy.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(canvas, 0, 0, sent.width, sent.height);
  return { url: copy.toDataURL("image/png"), width: sent.width, height: sent.height };
}

async function ask(query: string): Promise<void> {
  state.error = null;
  if (!state.stage) {
    state.error = "Add an image first.";
    renderResult();
    return;
  }
  const trimmed = query.trim();
  if (trimmed === "") {
    state.error = "Ask where something is.";
    renderResult();
    return;
  }
  const mode = selectRunMode({ requested: state.mode, hasKey: currentKey() });
  state.mode = mode;
  syncProviderFields();
  if (mode === "replay") {
    if (state.stage.id === "upload") {
      state.error = "Replay only knows the bundled samples. Pick one, or add a key and switch to live.";
      state.outcome = null;
      state.raw = null;
      state.source = null;
      renderResult();
      return;
    }
    const fixture = findReplay(fixtures, state.stage.id, trimmed);
    if (!fixture) {
      state.error = "No recorded answer for that question. Try one of the suggestions.";
      state.outcome = null;
      state.raw = null;
      state.source = null;
      renderResult();
      return;
    }
    state.outcome = parseGrounding(fixture.rawResponse, state.stage);
    state.raw = fixture.rawResponse;
    state.source = fixture.source;
    state.selected = null;
    renderResult();
    return;
  }
  const adapter = getProvider(state.providerId);
  if (!adapter) {
    state.error = "Unknown provider.";
    renderResult();
    return;
  }
  try {
    const sent = sentCanvas();
    const response = await fetch("/api/ground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: state.providerId,
        model: state.models[state.providerId],
        query: trimmed,
        imageDataUrl: sent.url,
        imageWidth: sent.width,
        imageHeight: sent.height,
        ...(state.keys[state.providerId].trim()
          ? { apiKey: state.keys[state.providerId].trim() }
          : {}),
      }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      raw?: unknown;
      outcome?: ParseOutcome;
    };
    state.raw = payload.raw ?? payload;
    state.source = null;
    if (!response.ok || !payload.outcome) {
      state.outcome = null;
      state.error = payload.error ?? "Live request failed.";
      renderResult();
      return;
    }
    state.outcome = payload.outcome;
    state.selected = null;
    if (!payload.outcome.ok) state.error = payload.outcome.error;
    renderResult();
  } catch {
    state.error = "Live request failed before a response came back.";
    state.outcome = null;
    renderResult();
  }
}

askForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void ask(askInput.value);
});

document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value === "live" && !currentKey()) {
      input.checked = false;
      const replay = document.querySelector<HTMLInputElement>('input[name="mode"][value="replay"]');
      if (replay) replay.checked = true;
      state.mode = "replay";
    } else if (input.value === "live" || input.value === "replay") {
      state.mode = input.value;
    }
    syncProviderFields();
  });
});

modelInput.addEventListener("change", () => {
  state.models[state.providerId] = modelInput.value.trim() || defaultModels[state.providerId];
  modelInput.value = state.models[state.providerId];
  persist();
});

keyInput.addEventListener("input", () => {
  state.keys[state.providerId] = keyInput.value.trim();
  persist();
  syncProviderFields();
});

must("#clear-key").addEventListener("click", () => {
  state.keys[state.providerId] = "";
  keyInput.value = "";
  persist();
  syncProviderFields(true);
});

frame.addEventListener("dragover", (event) => event.preventDefault());
frame.addEventListener("drop", (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file) void loadFile(file, file.name);
});

window.addEventListener("paste", (event) => {
  const file = event.clipboardData?.files[0];
  if (file && file.type.startsWith("image/")) void loadFile(file, "Pasted image");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    selectBox(null, false);
    return;
  }
  if (event.key !== "Enter" || event.target instanceof HTMLTextAreaElement) return;
  const active = document.activeElement;
  if (!(active instanceof HTMLButtonElement) || !active.classList.contains("box-hit")) return;
  const index = Array.from(overlay.querySelectorAll(".box-hit")).indexOf(active);
  if (index >= 0) selectBox(index, false);
});

new ResizeObserver(() => layoutBoxes()).observe(frame);

renderProviders();
renderResearch();
renderSamples();
syncProviderFields(true);

void fetch("/api/key-status")
  .then(async (response) => {
    if (!response.ok) return;
    const body = (await response.json()) as Partial<Record<ProviderId, boolean>>;
    state.envHas = {
      vercel: Boolean(body.vercel),
      mistral: Boolean(body.mistral),
      openrouter: Boolean(body.openrouter),
    };
    syncProviderFields();
  })
  .catch(() => {
    syncProviderFields();
  });

void loadSample("kitchen");
