import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { boxForObject, scenes, type Scene, type SceneObject } from "../src/fixtures/scenes";
import type { GroundingResult, ReplayFixture } from "../src/lib/types";
import { encodePng, Raster, type RGB } from "./png";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sampleDir = resolve(root, "public/samples");
const fixtureDir = resolve(root, "src/fixtures/replay");

const wall: RGB = [246, 234, 216];
const ink: RGB = [36, 28, 22];
const wood: RGB = [176, 122, 74];
const leaf: RGB = [58, 122, 72];
const leafDark: RGB = [32, 90, 52];
const red: RGB = [190, 64, 54];
const blue: RGB = [48, 98, 158];
const brass: RGB = [196, 148, 72];
const silver: RGB = [196, 198, 204];
const screen: RGB = [28, 44, 62];
const paper: RGB = [252, 246, 232];
const sky: RGB = [142, 196, 224];
const grass: RGB = [126, 168, 86];
const tan: RGB = [196, 144, 86];

function objectById(scene: Scene, id: string): SceneObject {
  const found = scene.objects.find((item) => item.id === id);
  if (!found) throw new Error(`Missing object ${id}`);
  return found;
}

function paintKitchen(raster: Raster, scene: Scene): void {
  raster.fill(wall);
  raster.rect(0, 700, 1000, 300, [198, 154, 104]);
  raster.rect(0, 680, 1000, 24, [92, 64, 42]);
  raster.rect(70, 80, 300, 220, [186, 214, 228]);
  raster.rect(70, 80, 300, 12, ink);
  raster.rect(70, 288, 300, 12, ink);
  raster.rect(70, 80, 12, 220, ink);
  raster.rect(358, 80, 12, 220, ink);
  raster.rect(214, 80, 10, 220, [230, 238, 242]);
  raster.rect(70, 184, 300, 10, [230, 238, 242]);
  const kettle = objectById(scene, "kettle");
  raster.ellipse(kettle.x + 110, kettle.y + 180, 90, 110, [42, 48, 54]);
  raster.ellipse(kettle.x + 110, kettle.y + 70, 70, 22, [70, 76, 82]);
  raster.rect(kettle.x + 70, kettle.y + 40, 16, 40, [70, 76, 82]);
  raster.ellipse(kettle.x + 210, kettle.y + 160, 36, 70, [42, 48, 54]);
  raster.rect(kettle.x + 180, kettle.y + 130, 60, 28, [90, 96, 104]);
  const redMug = objectById(scene, "red-mug");
  raster.rect(redMug.x + 16, redMug.y + 30, 90, 160, red);
  raster.ellipse(redMug.x + 61, redMug.y + 30, 45, 18, [220, 96, 84]);
  raster.ring(redMug.x + 120, redMug.y + 110, 28, 36, 10, red);
  const blueMug = objectById(scene, "blue-mug");
  raster.rect(blueMug.x + 16, blueMug.y + 24, 90, 150, blue);
  raster.ellipse(blueMug.x + 61, blueMug.y + 24, 45, 16, [90, 140, 196]);
  raster.ring(blueMug.x + 120, blueMug.y + 100, 26, 34, 10, blue);
  const plant = objectById(scene, "plant");
  raster.rect(plant.x + 40, plant.y + 250, 100, 140, [122, 78, 42]);
  raster.ellipse(plant.x + 90, plant.y + 250, 62, 18, [150, 98, 54]);
  raster.ellipse(plant.x + 50, plant.y + 140, 50, 70, leafDark);
  raster.ellipse(plant.x + 120, plant.y + 120, 58, 80, leaf);
  raster.ellipse(plant.x + 80, plant.y + 70, 46, 60, [86, 160, 96]);
}

function paintDesk(raster: Raster, scene: Scene): void {
  raster.fill([232, 214, 188]);
  raster.rect(0, 760, 1000, 240, [92, 70, 52]);
  const lamp = objectById(scene, "lamp");
  raster.rect(lamp.x + 90, lamp.y + 180, 28, 300, brass);
  raster.ellipse(lamp.x + 104, lamp.y + 500, 70, 22, [120, 86, 40]);
  raster.ellipse(lamp.x + 104, lamp.y + 150, 100, 48, brass);
  raster.ellipse(lamp.x + 104, lamp.y + 190, 70, 20, [255, 214, 140]);
  const laptop = objectById(scene, "laptop");
  raster.rect(laptop.x + 20, laptop.y + 20, 280, 180, silver);
  raster.rect(laptop.x + 36, laptop.y + 36, 248, 140, screen);
  raster.rect(laptop.x + 10, laptop.y + 200, 320, 24, [150, 152, 160]);
  raster.ellipse(laptop.x + 170, laptop.y + 210, 28, 8, [90, 92, 98]);
  const notebook = objectById(scene, "notebook");
  raster.rect(notebook.x + 10, notebook.y + 16, 180, 180, paper);
  raster.rect(notebook.x + 10, notebook.y + 16, 14, 180, red);
  for (let i = 0; i < 6; i += 1) {
    raster.rect(notebook.x + 40, notebook.y + 48 + i * 22, 130, 4, [210, 196, 170]);
  }
}

function paintPark(raster: Raster, scene: Scene): void {
  raster.fill(sky);
  raster.rect(0, 620, 1000, 380, grass);
  raster.ellipse(820, 120, 70, 70, [255, 214, 110]);
  const tree = objectById(scene, "tree");
  raster.rect(tree.x + 130, tree.y + 280, 50, 400, [110, 72, 40]);
  raster.ellipse(tree.x + 150, tree.y + 220, 150, 130, leafDark);
  raster.ellipse(tree.x + 90, tree.y + 180, 90, 80, leaf);
  raster.ellipse(tree.x + 210, tree.y + 170, 100, 90, [74, 150, 88]);
  const bench = objectById(scene, "bench");
  raster.rect(bench.x + 20, bench.y + 40, 340, 22, wood);
  raster.rect(bench.x + 20, bench.y + 78, 340, 22, [150, 98, 54]);
  raster.rect(bench.x + 40, bench.y + 100, 18, 70, ink);
  raster.rect(bench.x + 320, bench.y + 100, 18, 70, ink);
  const dog = objectById(scene, "dog");
  raster.ellipse(dog.x + 130, dog.y + 120, 110, 60, tan);
  raster.ellipse(dog.x + 210, dog.y + 70, 48, 42, tan);
  raster.ellipse(dog.x + 230, dog.y + 40, 18, 28, [120, 78, 42]);
  raster.ellipse(dog.x + 40, dog.y + 90, 28, 18, tan);
  raster.ellipse(dog.x + 196, dog.y + 66, 5, 5, ink);
}

function paintWorkshop(raster: Raster, scene: Scene): void {
  raster.fill([236, 228, 214]);
  for (let y = 80; y < 900; y += 48) {
    for (let x = 40; x < 960; x += 48) raster.ellipse(x, y, 4, 4, [150, 140, 126]);
  }
  const hammer = objectById(scene, "hammer");
  raster.rect(hammer.x + 90, hammer.y + 120, 28, 360, wood);
  raster.rect(hammer.x + 40, hammer.y + 70, 140, 54, [54, 58, 64]);
  const wrench = objectById(scene, "wrench");
  raster.rect(wrench.x + 78, wrench.y + 80, 26, 320, silver);
  raster.ring(wrench.x + 91, wrench.y + 70, 46, 36, 14, silver);
  raster.ellipse(wrench.x + 91, wrench.y + 400, 34, 24, silver);
  const toolbox = objectById(scene, "toolbox");
  raster.rect(toolbox.x + 16, toolbox.y + 70, 260, 180, red);
  raster.rect(toolbox.x + 16, toolbox.y + 70, 260, 36, [150, 42, 36]);
  raster.rect(toolbox.x + 110, toolbox.y + 30, 70, 48, [70, 74, 80]);
  raster.rect(toolbox.x + 108, toolbox.y + 140, 80, 28, silver);
}

const painters: Record<string, (raster: Raster, scene: Scene) => void> = {
  kitchen: paintKitchen,
  desk: paintDesk,
  park: paintPark,
  workshop: paintWorkshop,
};

function fixtureFor(scene: Scene, question: Scene["questions"][number]): ReplayFixture {
  const boxes = question.objectIds.map((id) => {
    const object = objectById(scene, id);
    return {
      label: object.label,
      box_2d: boxForObject(object),
      confidence: object.confidence,
      reasoning: object.reasoning,
    };
  });
  const parsed: GroundingResult = {
    boxes,
    coordinate_space: "normalized_1000",
  };
  if (question.notes) parsed.notes = question.notes;
  return {
    id: question.id,
    provider: "vercel",
    model: "mistral/mistral-large-4",
    query: question.query,
    imageId: scene.id,
    rawResponse: {
      id: `synthetic-${question.id}`,
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify(parsed),
          },
        },
      ],
    },
    parsed,
    recordedAt: "2026-10-07T16:00:00.000Z",
    source: "synthetic",
  };
}

mkdirSync(sampleDir, { recursive: true });
mkdirSync(fixtureDir, { recursive: true });

const imports: string[] = [];
const names: string[] = [];

for (const scene of scenes) {
  const paint = painters[scene.id];
  if (!paint) throw new Error(`No painter for ${scene.id}`);
  const raster = new Raster(scene.width, scene.height);
  paint(raster, scene);
  const pngPath = resolve(sampleDir, `${scene.id}.png`);
  writeFileSync(pngPath, encodePng(scene.width, scene.height, raster.px));
  for (const question of scene.questions) {
    const fixture = fixtureFor(scene, question);
    const file = `${question.id}.json`;
    writeFileSync(resolve(fixtureDir, file), `${JSON.stringify(fixture, null, 2)}\n`);
    const varName = question.id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    imports.push(`import ${varName} from "./replay/${file}";`);
    names.push(varName);
  }
}

const index = `${imports.join("\n")}
import type { ReplayFixture } from "../lib/types";

export const fixtures: ReplayFixture[] = [
${names.map((name) => `  ${name} as ReplayFixture,`).join("\n")}
];
`;
writeFileSync(resolve(root, "src/fixtures/index.ts"), index);
console.log(`wrote ${scenes.length} samples and ${names.length} fixtures`);
