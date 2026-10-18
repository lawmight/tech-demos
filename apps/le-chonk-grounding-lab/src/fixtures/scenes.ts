export type SceneObject = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  reasoning: string;
};

export type SceneQuestion = {
  id: string;
  query: string;
  objectIds: string[];
  notes?: string;
};

export type Scene = {
  id: string;
  title: string;
  width: 1000;
  height: 1000;
  caption: string;
  objects: SceneObject[];
  questions: SceneQuestion[];
};

export const SCENE_SIZE = { width: 1000, height: 1000 } as const;

export const scenes: Scene[] = [
  {
    id: "kitchen",
    title: "Kitchen counter",
    width: 1000,
    height: 1000,
    caption: "A kettle, two mugs, and a plant on a kitchen counter.",
    objects: [
      {
        id: "kettle",
        label: "kettle",
        x: 90,
        y: 330,
        w: 250,
        h: 310,
        confidence: 0.93,
        reasoning:
          "The dark rounded body, short spout, and loop handle sit on the left of the counter. That silhouette matches a kettle rather than the cups beside it.",
      },
      {
        id: "red-mug",
        label: "red mug",
        x: 400,
        y: 470,
        w: 140,
        h: 210,
        confidence: 0.9,
        reasoning:
          "A red cup with a handle stands just right of center on the counter. The color and open top mark it as a mug.",
      },
      {
        id: "blue-mug",
        label: "blue mug",
        x: 570,
        y: 500,
        w: 140,
        h: 190,
        confidence: 0.88,
        reasoning:
          "A second cup, this one blue, sits further right at the same counter height. It is separate from the red mug.",
      },
      {
        id: "plant",
        label: "plant",
        x: 760,
        y: 250,
        w: 180,
        h: 420,
        confidence: 0.86,
        reasoning:
          "Green leaves rise out of a brown pot at the right edge. The foliage is the plant, not the cookware.",
      },
    ],
    questions: [
      { id: "kitchen-kettle", query: "Where is the kettle?", objectIds: ["kettle"] },
      {
        id: "kitchen-mugs",
        query: "Where are the mugs?",
        objectIds: ["red-mug", "blue-mug"],
        notes: "Two mugs share the counter.",
      },
      {
        id: "kitchen-bicycle",
        query: "Where is the bicycle?",
        objectIds: [],
        notes: "Nothing in the kitchen matches a bicycle.",
      },
    ],
  },
  {
    id: "desk",
    title: "Desk lamp",
    width: 1000,
    height: 1000,
    caption: "A lamp, an open laptop, and a notebook on a desk.",
    objects: [
      {
        id: "lamp",
        label: "lamp",
        x: 70,
        y: 140,
        w: 230,
        h: 560,
        confidence: 0.91,
        reasoning:
          "A brass stand and a wide shade occupy the left of the desk, with a warm glow under the shade. That is the lamp.",
      },
      {
        id: "laptop",
        label: "laptop",
        x: 340,
        y: 360,
        w: 340,
        h: 300,
        confidence: 0.92,
        reasoning:
          "The hinged screen and flat keyboard deck in the middle of the desk form an open laptop.",
      },
      {
        id: "notebook",
        label: "notebook",
        x: 720,
        y: 480,
        w: 210,
        h: 220,
        confidence: 0.84,
        reasoning:
          "A cream page block with a red ribbon sits to the right of the laptop. It reads as a closed notebook, not the screen.",
      },
    ],
    questions: [
      { id: "desk-lamp", query: "Where is the lamp?", objectIds: ["lamp"] },
      {
        id: "desk-laptop-notebook",
        query: "Where are the laptop and the notebook?",
        objectIds: ["laptop", "notebook"],
      },
      {
        id: "desk-cat",
        query: "Where is the cat?",
        objectIds: [],
        notes: "No animal is on the desk.",
      },
    ],
  },
  {
    id: "park",
    title: "Park bench",
    width: 1000,
    height: 1000,
    caption: "A tree, a bench, and a dog in a park.",
    objects: [
      {
        id: "tree",
        label: "tree",
        x: 40,
        y: 80,
        w: 320,
        h: 700,
        confidence: 0.95,
        reasoning:
          "A brown trunk rises into a round green canopy on the left. The whole shape is the tree.",
      },
      {
        id: "bench",
        label: "bench",
        x: 390,
        y: 560,
        w: 390,
        h: 180,
        confidence: 0.89,
        reasoning:
          "Horizontal wooden slats on two legs sit in the middle ground. That is the bench.",
      },
      {
        id: "dog",
        label: "dog",
        x: 640,
        y: 450,
        w: 280,
        h: 200,
        confidence: 0.9,
        reasoning:
          "A tan body, darker ear, and a curled tail sit in front of the bench. The pose is a sitting dog.",
      },
    ],
    questions: [
      { id: "park-dog", query: "Where is the dog?", objectIds: ["dog"] },
      {
        id: "park-tree-bench",
        query: "Where are the tree and the bench?",
        objectIds: ["tree", "bench"],
      },
      {
        id: "park-train",
        query: "Where is the train?",
        objectIds: [],
        notes: "The park scene has no train.",
      },
    ],
  },
  {
    id: "workshop",
    title: "Workshop wall",
    width: 1000,
    height: 1000,
    caption: "A hammer, a wrench, and a toolbox on a pegboard.",
    objects: [
      {
        id: "hammer",
        label: "hammer",
        x: 80,
        y: 160,
        w: 220,
        h: 520,
        confidence: 0.94,
        reasoning:
          "A long wooden handle ends in a dark metal head on the left of the pegboard. That tool is the hammer.",
      },
      {
        id: "wrench",
        label: "wrench",
        x: 360,
        y: 210,
        w: 200,
        h: 460,
        confidence: 0.87,
        reasoning:
          "A slim metal bar with open jaws near the top hangs in the middle. The jaws make it a wrench.",
      },
      {
        id: "toolbox",
        label: "toolbox",
        x: 620,
        y: 430,
        w: 300,
        h: 280,
        confidence: 0.9,
        reasoning:
          "A red box with a silver latch and a top handle rests at the lower right. It is the toolbox, not one of the hanging tools.",
      },
    ],
    questions: [
      { id: "workshop-hammer", query: "Where is the hammer?", objectIds: ["hammer"] },
      { id: "workshop-toolbox", query: "Where is the toolbox?", objectIds: ["toolbox"] },
      {
        id: "workshop-tools",
        query: "Where are the hammer and the wrench?",
        objectIds: ["hammer", "wrench"],
      },
    ],
  },
];

export function boxForObject(object: SceneObject): [number, number, number, number] {
  return [object.x, object.y, object.x + object.w, object.y + object.h];
}
