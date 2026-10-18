import type { CoordinateSpace, ImageSize } from "./types";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ContainLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
};

export type DisplayBox = Rect & {
  deviceX: number;
  deviceY: number;
  deviceWidth: number;
  deviceHeight: number;
};

export const MAX_LONG_SIDE = 1536;

export function sentSizeForOriginal(
  original: ImageSize,
  maxLongSide = MAX_LONG_SIDE,
): ImageSize {
  const longSide = Math.max(original.width, original.height);
  if (longSide <= maxLongSide) {
    return { width: original.width, height: original.height };
  }
  const scale = maxLongSide / longSide;
  return {
    width: Math.round(original.width * scale),
    height: Math.round(original.height * scale),
  };
}

export function containLayout(original: ImageSize, display: ImageSize): ContainLayout {
  const scale = Math.min(
    display.width / original.width,
    display.height / original.height,
  );
  const renderedWidth = original.width * scale;
  const renderedHeight = original.height * scale;
  return {
    scale,
    offsetX: (display.width - renderedWidth) / 2,
    offsetY: (display.height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  };
}

export function modelBoxToOriginalPixels(
  box: [number, number, number, number],
  space: CoordinateSpace,
  sent: ImageSize,
  original: ImageSize,
): Rect {
  const [xMin, yMin, xMax, yMax] = box;
  let left = xMin;
  let top = yMin;
  let right = xMax;
  let bottom = yMax;
  if (space === "normalized_1000") {
    left = (xMin / 1000) * original.width;
    top = (yMin / 1000) * original.height;
    right = (xMax / 1000) * original.width;
    bottom = (yMax / 1000) * original.height;
  } else if (space === "normalized_1") {
    left = xMin * original.width;
    top = yMin * original.height;
    right = xMax * original.width;
    bottom = yMax * original.height;
  } else {
    const sx = original.width / sent.width;
    const sy = original.height / sent.height;
    left = xMin * sx;
    top = yMin * sy;
    right = xMax * sx;
    bottom = yMax * sy;
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function originalPixelsToDisplay(
  rect: Rect,
  original: ImageSize,
  display: ImageSize,
  devicePixelRatio: number,
): DisplayBox {
  const layout = containLayout(original, display);
  const x = layout.offsetX + rect.x * layout.scale;
  const y = layout.offsetY + rect.y * layout.scale;
  const width = rect.width * layout.scale;
  const height = rect.height * layout.scale;
  return {
    x,
    y,
    width,
    height,
    deviceX: x * devicePixelRatio,
    deviceY: y * devicePixelRatio,
    deviceWidth: width * devicePixelRatio,
    deviceHeight: height * devicePixelRatio,
  };
}

export function scaleBoxToDisplay(input: {
  box: [number, number, number, number];
  space: CoordinateSpace;
  sent: ImageSize;
  original: ImageSize;
  display: ImageSize;
  devicePixelRatio: number;
}): DisplayBox {
  const originalRect = modelBoxToOriginalPixels(
    input.box,
    input.space,
    input.sent,
    input.original,
  );
  return originalPixelsToDisplay(
    originalRect,
    input.original,
    input.display,
    input.devicePixelRatio,
  );
}
