const FILES = ["LAWS.bend", "PROOF.bend", "demo.bend", "parallel.bend"];

const proofOutput = document.getElementById("proof-output");
const parallelOutput = document.getElementById("parallel-output");
const sourceView = document.getElementById("source-view");
const bendStatus = document.getElementById("bend-status");
const tabs = document.getElementById("file-tabs");

let activeFile = FILES[0];

function renderTabs() {
  tabs.innerHTML = "";
  for (const file of FILES) {
    const btn = document.createElement("button");
    btn.className = `tab${file === activeFile ? " active" : ""}`;
    btn.textContent = file;
    btn.addEventListener("click", () => {
      activeFile = file;
      renderTabs();
      loadSource(file);
    });
    tabs.appendChild(btn);
  }
}

async function loadStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();
  if (data.bendAvailable) {
    bendStatus.textContent = data.bendVersion ?? "bend installed";
    bendStatus.className = "badge ok";
  } else {
    bendStatus.textContent = "bend not installed (sample output)";
    bendStatus.className = "badge warn";
  }
}

async function loadSource(file) {
  const res = await fetch(`/api/source?file=${encodeURIComponent(file)}`);
  const data = await res.json();
  sourceView.textContent = data.source ?? data.error ?? "failed to load";
}

async function run(endpoint, outputEl) {
  outputEl.textContent = "running…";
  outputEl.className = "";
  const res = await fetch(endpoint, { method: "POST" });
  const data = await res.json();
  const text = [data.stdout, data.stderr].filter(Boolean).join("\n");
  outputEl.textContent = text || "(no output)";
  outputEl.className = data.ok ? "ok" : "err";
  if (!data.bendAvailable) {
    outputEl.textContent += "\n\n(install bend to run locally)";
  }
}

document.getElementById("run-proof").addEventListener("click", () => {
  run("/api/proof", proofOutput);
});

document.getElementById("run-parallel").addEventListener("click", () => {
  run("/api/parallel", parallelOutput);
});

renderTabs();
loadStatus();
loadSource(activeFile);
