import { fal } from "@fal-ai/client";
import { basename, join } from "node:path";
import index from "./index.html";
import { MODELS, PRESETS, modelById, presetById, type ModelId, type PresetId } from "./presets";

const PORT = Number(process.env.PORT ?? 3000);
const FAL_KEY = process.env.FAL_KEY;
const LIVE = Boolean(FAL_KEY);
const SAMPLES_DIR = join(import.meta.dir, "..", "samples");

if (LIVE) fal.config({ credentials: FAL_KEY });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

interface AnimateBody {
  imageDataUrl?: string;
  imageUrl?: string;
  preset?: PresetId;
  model?: ModelId;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Malformed data URL");
  const mime = match[1] || "application/octet-stream";
  const payload = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
  return new Blob([payload], { type: mime });
}

function buildInput(model: ModelId, imageUrl: string, prompt: string): Record<string, unknown> {
  switch (model) {
    case "kling-v3-standard":
      return {
        prompt,
        start_image_url: imageUrl,
        duration: "5",
        generate_audio: false,
        negative_prompt: "blur, distort, low quality, camera movement, scene change, text",
        cfg_scale: 0.5,
      };
    case "ltx-2.5-fast":
    default:
      return {
        image_url: imageUrl,
        prompt,
        duration: "6",
        resolution: "720p",
        aspect_ratio: "auto",
        fps: 24,
        generate_audio: false,
        camera_motion: "static",
      };
  }
}

/** Streams NDJSON progress events, then a final {type:"done"} or {type:"error"}. */
async function animate(req: Request): Promise<Response> {
  if (!LIVE) {
    return json({ error: "FAL_KEY is not set on the server; live generation is disabled." }, 409);
  }
  let body: AnimateBody;
  try {
    body = (await req.json()) as AnimateBody;
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }
  const preset = presetById(body.preset ?? "walk");
  const model = modelById(body.model ?? "ltx-2.5-fast");
  if (!body.imageDataUrl && !body.imageUrl) return json({ error: "Missing image" }, 400);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        let imageUrl = body.imageUrl!;
        if (body.imageDataUrl) {
          send({ type: "log", message: "Uploading still to fal storage…" });
          imageUrl = await fal.storage.upload(dataUrlToBlob(body.imageDataUrl));
        } else if (imageUrl.startsWith("/")) {
          // bundled sample: read from disk and upload so fal can fetch it
          send({ type: "log", message: "Uploading sample still to fal storage…" });
          const file = Bun.file(join(SAMPLES_DIR, basename(imageUrl)));
          imageUrl = await fal.storage.upload(new Blob([await file.arrayBuffer()], { type: file.type }));
        }
        send({ type: "log", message: `Submitting to ${model.endpoint}` });
        const started = Date.now();
        const result = await fal.subscribe(model.endpoint, {
          input: buildInput(model.id, imageUrl, preset.prompt),
          logs: true,
          onQueueUpdate(update) {
            send({
              type: "status",
              status: update.status,
              position: "queue_position" in update ? update.queue_position : undefined,
            });
            if (update.status === "IN_PROGRESS") {
              for (const log of update.logs ?? []) send({ type: "log", message: log.message });
            }
          },
        });
        const data = result.data as { video?: { url?: string } };
        if (!data?.video?.url) throw new Error("fal returned no video URL");
        send({
          type: "done",
          videoUrl: data.video.url,
          requestId: result.requestId,
          elapsedMs: Date.now() - started,
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
  routes: {
    "/": index,
    "/api/status": () =>
      json({
        live: LIVE,
        models: MODELS,
        presets: PRESETS.map(({ id, label, hint, sample }) => ({ id, label, hint, sample })),
      }),
    "/api/animate": { POST: animate },
    "/samples/:file": async (req) => {
      const file = Bun.file(join(SAMPLES_DIR, basename(req.params.file)));
      if (!(await file.exists())) return new Response("Not found", { status: 404 });
      return new Response(file, { headers: { "cache-control": "public, max-age=3600" } });
    },
  },
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(`fal-self-animate → http://localhost:${server.port}  (live fal: ${LIVE ? "on" : "off, sample mode"})`);
