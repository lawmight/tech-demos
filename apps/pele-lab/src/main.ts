import { mount, PeleError } from "pele";
import type { Mounted } from "pele";
import { debounce } from "./lib/debounce.ts";
import { DEBOUNCE_MS, presetById, presets } from "./lib/presets.ts";
import type { PresetId } from "./lib/presets.ts";
import { themeStylesheet, themes } from "./lib/themes.ts";
import type { ThemeId } from "./lib/themes.ts";

function required<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Pele Lab is missing ${selector}.`);
  }
  return el;
}

const sourceEl = required<HTMLTextAreaElement>("#source");
const stage = required<HTMLElement>("#stage");
const errorEl = required<HTMLElement>("#error");
const hintEl = required<HTMLElement>("#hint");
const presetHost = required<HTMLElement>("#presets");
const themeHost = required<HTMLElement>("#themes");

const style = document.createElement("style");
style.textContent = themeStylesheet();
document.head.append(style);

hintEl.textContent = `Updates ${DEBOUNCE_MS} ms after you stop typing.`;

function showError(error: unknown): void {
  if (error instanceof PeleError) {
    errorEl.textContent = error.message;
    return;
  }
  errorEl.textContent = "Could not render this diagram.";
}

function clearError(): void {
  errorEl.textContent = "";
}

let mounted: Mounted | undefined;

function renderSource(text: string): void {
  try {
    if (!mounted) {
      mounted = mount(stage, text, {
        onError: showError,
        onRender: () => {
          clearError();
        },
      });
      if (mounted.error) {
        showError(mounted.error);
      }
      return;
    }
    mounted.update(text);
    if (mounted.error) {
      showError(mounted.error);
    } else {
      clearError();
    }
  } catch (error) {
    showError(error);
  }
}

function setPressed(host: HTMLElement, id: string): void {
  for (const button of host.querySelectorAll<HTMLButtonElement>("button")) {
    const on = button.dataset.id === id;
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function loadPreset(id: PresetId): void {
  scheduleRender.cancel();
  const preset = presetById(id);
  sourceEl.value = preset.source;
  setPressed(presetHost, id);
  renderSource(preset.source);
}

function applyTheme(id: ThemeId): void {
  stage.dataset.theme = id;
  setPressed(themeHost, id);
}

for (const preset of presets) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.id = preset.id;
  button.textContent = preset.label;
  button.addEventListener("click", () => {
    loadPreset(preset.id);
  });
  presetHost.append(button);
}

for (const theme of themes) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.id = theme.id;
  button.textContent = theme.label;
  button.addEventListener("click", () => {
    applyTheme(theme.id);
  });
  themeHost.append(button);
}

const scheduleRender = debounce(DEBOUNCE_MS, () => {
  renderSource(sourceEl.value);
});

sourceEl.addEventListener("input", () => {
  setPressed(presetHost, "");
  scheduleRender();
});

applyTheme("day");
loadPreset("flowchart");
