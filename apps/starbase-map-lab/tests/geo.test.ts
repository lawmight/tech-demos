import { describe, expect, test } from "bun:test";
import { PAD } from "../src/config/profile";
import { destination, enuFromDownrange, haversineM, trackFromLngLat } from "../src/lib/geo";

describe("geo", () => {
  test("zero downrange stays on the pad", () => {
    const same = destination(PAD, 0, 97);
    expect(same.lat).toBe(25.996142);
    expect(same.lng).toBe(-97.154559);
    expect(haversineM(same, PAD)).toBe(0);
  });

  test("1 km due east moves longitude and round-trips", () => {
    const east = destination({ lat: 25.996142, lng: -97.154559 }, 1000, 90);
    expect(east.lat).toBeCloseTo(25.996142, 5);
    expect(east.lng).toBeCloseTo(-97.144565, 5);
    const recovered = trackFromLngLat({ lat: 25.996142, lng: -97.154559 }, east);
    expect(recovered.distanceM).toBeCloseTo(1000, 3);
    expect(recovered.azimuthDeg).toBeCloseTo(90, 4);
  });

  test("downrange along an azimuth round-trips within a metre", () => {
    const origin = { lat: 25.996142, lng: -97.154559 };
    const out = destination(origin, 80_000, 97);
    const recovered = trackFromLngLat(origin, out);
    expect(Math.abs(recovered.distanceM - 80_000)).toBeLessThan(0.05);
    expect(Math.abs(recovered.azimuthDeg - 97)).toBeLessThan(0.0001);
    const homeBearing = trackFromLngLat(out, origin);
    const home = destination(out, homeBearing.distanceM, homeBearing.azimuthDeg);
    expect(haversineM(home, origin)).toBeLessThan(0.5);
    expect(out.lng).toBeGreaterThan(origin.lng);
    expect(out.lat).toBeLessThan(origin.lat);
  });

  test("enu components match the azimuth", () => {
    const east = enuFromDownrange(1000, 90);
    expect(east.eastM).toBeCloseTo(1000, 6);
    expect(east.northM).toBeCloseTo(0, 6);
    const track = enuFromDownrange(1000, 97);
    expect(track.eastM).toBeCloseTo(1000 * Math.sin((97 * Math.PI) / 180), 6);
    expect(track.northM).toBeCloseTo(1000 * Math.cos((97 * Math.PI) / 180), 6);
  });
});
