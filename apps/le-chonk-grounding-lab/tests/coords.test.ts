import { describe, expect, test } from "bun:test";
import {
  containLayout,
  scaleBoxToDisplay,
  sentSizeForOriginal,
} from "../src/lib/coords";

describe("coordinate scaling", () => {
  test("maps normalized_1000 through letterboxing", () => {
    const display = scaleBoxToDisplay({
      box: [100, 200, 300, 400],
      space: "normalized_1000",
      sent: { width: 800, height: 560 },
      original: { width: 800, height: 560 },
      display: { width: 400, height: 400 },
      devicePixelRatio: 2,
    });
    expect(display).toEqual({
      x: 40,
      y: 116,
      width: 80,
      height: 56,
      deviceX: 80,
      deviceY: 232,
      deviceWidth: 160,
      deviceHeight: 112,
    });
  });

  test("maps normalized_1 to the same display box", () => {
    const display = scaleBoxToDisplay({
      box: [0.1, 0.2, 0.3, 0.4],
      space: "normalized_1",
      sent: { width: 800, height: 560 },
      original: { width: 800, height: 560 },
      display: { width: 400, height: 400 },
      devicePixelRatio: 1,
    });
    expect(display).toEqual({
      x: 40,
      y: 116,
      width: 80,
      height: 56,
      deviceX: 40,
      deviceY: 116,
      deviceWidth: 80,
      deviceHeight: 56,
    });
  });

  test("maps sent pixels back through a downscale, then letterboxes", () => {
    expect(sentSizeForOriginal({ width: 2048, height: 1024 })).toEqual({
      width: 1536,
      height: 768,
    });
    const display = scaleBoxToDisplay({
      box: [192, 96, 384, 192],
      space: "pixels",
      sent: { width: 1536, height: 768 },
      original: { width: 2048, height: 1024 },
      display: { width: 1024, height: 512 },
      devicePixelRatio: 1,
    });
    expect(display).toEqual({
      x: 128,
      y: 64,
      width: 128,
      height: 64,
      deviceX: 128,
      deviceY: 64,
      deviceWidth: 128,
      deviceHeight: 64,
    });
  });

  test("letterboxes on the vertical axis when the frame is wide", () => {
    const layout = containLayout(
      { width: 800, height: 560 },
      { width: 200, height: 400 },
    );
    expect(layout).toEqual({
      scale: 0.25,
      offsetX: 0,
      offsetY: 130,
      renderedWidth: 200,
      renderedHeight: 140,
    });
    const display = scaleBoxToDisplay({
      box: [80, 112, 240, 224],
      space: "pixels",
      sent: { width: 800, height: 560 },
      original: { width: 800, height: 560 },
      display: { width: 200, height: 400 },
      devicePixelRatio: 1,
    });
    expect(display).toEqual({
      x: 20,
      y: 158,
      width: 40,
      height: 28,
      deviceX: 20,
      deviceY: 158,
      deviceWidth: 40,
      deviceHeight: 28,
    });
  });
});
