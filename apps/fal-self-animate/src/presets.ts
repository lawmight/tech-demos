export type PresetId = "walk" | "wave" | "idle";

export interface MotionPreset {
  id: PresetId;
  label: string;
  hint: string;
  /** Motion prompt sent to fal. Kept generic so it works for any character still. */
  prompt: string;
  /** Path of the prebaked loop that stands in for fal output when no key is configured. */
  sample: string;
}

export const PRESETS: MotionPreset[] = [
  {
    id: "walk",
    label: "Walk",
    hint: "Steady walk cycle in place",
    prompt:
      "The character walks forward in place with a steady, looping walk cycle. Arms swing naturally, feet lift and land rhythmically. Static camera, plain background, character stays centered, smooth continuous motion, seamless loop.",
    sample: "/samples/bolt-walk.mp4",
  },
  {
    id: "wave",
    label: "Wave",
    hint: "Friendly hello with one hand",
    prompt:
      "The character stands still and waves one hand in a friendly greeting, raising the arm and swinging the hand side to side. Slight body sway, static camera, plain background, character stays centered, seamless loop.",
    sample: "/samples/bolt-wave.mp4",
  },
  {
    id: "idle",
    label: "Idle bounce",
    hint: "Gentle breathing bob + blink",
    prompt:
      "The character idles in place with a gentle up-and-down bounce, subtle breathing motion and an occasional blink. Static camera, plain background, character stays centered, calm, seamless loop.",
    sample: "/samples/bolt-idle.mp4",
  },
];

export type ModelId = "ltx-2.5-fast" | "kling-v3-standard";

export interface FalModel {
  id: ModelId;
  label: string;
  endpoint: string;
  note: string;
  docs: string;
}

/**
 * Current fal image-to-video endpoints as of Sep 2026 (verified against fal.ai/models).
 * LTX 2.5 fast is the default: cheap, quick, and exposes `camera_motion: "static"`
 * plus `generate_audio: false`, which is exactly what a character loop wants.
 */
export const MODELS: FalModel[] = [
  {
    id: "ltx-2.5-fast",
    label: "LTX 2.5 (fast)",
    endpoint: "lightricks/ltx-2.5/image-to-video/fast",
    note: "Fastest + cheapest. Static camera, no audio, 6s @ 720p.",
    docs: "https://fal.ai/models/lightricks/ltx-2.5/image-to-video/fast",
  },
  {
    id: "kling-v3-standard",
    label: "Kling v3 (standard)",
    endpoint: "fal-ai/kling-video/v3/standard/image-to-video",
    note: "Higher motion fidelity, slower. 5s clip.",
    docs: "https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video",
  },
];

export const SAMPLE_STILL = {
  id: "bolt",
  label: "Bolt",
  url: "/samples/bolt.png",
};

export function presetById(id: string): MotionPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

export function modelById(id: string): FalModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
