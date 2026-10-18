export type CoastFeature = {
  type: "Feature";
  properties: { kind: "land" | "lagoon" | "shore" | "road" };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "LineString"; coordinates: number[][] };
};

export type CoastCollection = {
  type: "FeatureCollection";
  features: CoastFeature[];
};

/**
 * Hand-drawn schematic of Boca Chica. The Gulf is the map background.
 * The pad sits on the spit, just west of the shoreline, so an eastbound
 * track leaves land immediately.
 */
export const COASTLINE: CoastCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "land" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-97.4, 25.84],
            [-97.175, 25.84],
            [-97.155, 25.9],
            [-97.147, 25.96],
            [-97.1455, 25.996],
            [-97.149, 26.03],
            [-97.168, 26.08],
            [-97.23, 26.12],
            [-97.42, 26.08],
            [-97.48, 25.96],
            [-97.45, 25.86],
            [-97.4, 25.84],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "lagoon" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-97.36, 25.93],
            [-97.2, 25.945],
            [-97.185, 26.0],
            [-97.21, 26.055],
            [-97.33, 26.04],
            [-97.39, 25.98],
            [-97.36, 25.93],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "shore" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-97.175, 25.84],
          [-97.155, 25.9],
          [-97.147, 25.96],
          [-97.1455, 25.996],
          [-97.149, 26.03],
          [-97.168, 26.08],
          [-97.23, 26.12],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-97.4, 26.02],
          [-97.28, 25.997],
          [-97.19, 25.99],
          [-97.16, 25.95],
        ],
      },
    },
  ],
};
