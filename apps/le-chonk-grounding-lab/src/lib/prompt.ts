export function groundingPrompt(query: string): string {
  return [
    "Localize the requested thing in the image.",
    "Reply with JSON only, matching the schema.",
    'Set coordinate_space to "normalized_1000".',
    "box_2d is [x_min, y_min, x_max, y_max], each number from 0 to 1000, relative to the full image width and height.",
    'Use that x-then-y order. Only if you must emit [y_min, x_min, y_max, x_max], set order to "yxyx".',
    "confidence is a number from 0 to 1.",
    "reasoning is one to three sentences on why this region matches.",
    "If nothing matches, return an empty boxes array.",
    `Question: ${query}`,
  ].join("\n");
}
