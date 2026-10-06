import type { StyleSpecification } from "maplibre-gl";
import { PAD } from "../config/profile";
import { COASTLINE } from "../data/coastline";

/** Bundled style used when OpenFreeMap cannot be reached, or when `?offline=1`. */
export function offlineStyle(): StyleSpecification {
  return {
    version: 8,
    name: "Boca Chica offline",
    sources: {
      coast: {
        type: "geojson",
        data: COASTLINE,
        attribution: "Schematic Boca Chica coastline (offline fallback)",
      },
      pad: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { name: "Starbase pad" },
          geometry: { type: "Point", coordinates: [PAD.lng, PAD.lat] },
        },
      },
    },
    layers: [
      {
        id: "water",
        type: "background",
        paint: { "background-color": "#1a4d66" },
      },
      {
        id: "land",
        type: "fill",
        source: "coast",
        filter: ["==", ["get", "kind"], "land"],
        paint: { "fill-color": "#c6b48a" },
      },
      {
        id: "lagoon",
        type: "fill",
        source: "coast",
        filter: ["==", ["get", "kind"], "lagoon"],
        paint: { "fill-color": "#24586f" },
      },
      {
        id: "shore",
        type: "line",
        source: "coast",
        filter: ["==", ["get", "kind"], "shore"],
        paint: { "line-color": "#f4efe6", "line-width": 1.6 },
      },
      {
        id: "road",
        type: "line",
        source: "coast",
        filter: ["==", ["get", "kind"], "road"],
        paint: { "line-color": "#8d6840", "line-width": 1.2 },
      },
      {
        id: "pad-halo",
        type: "circle",
        source: "pad",
        paint: {
          "circle-radius": 9,
          "circle-color": "#ffb25b",
          "circle-opacity": 0.35,
        },
      },
      {
        id: "pad-dot",
        type: "circle",
        source: "pad",
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#ffb25b",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#1c140c",
        },
      },
    ],
  };
}
