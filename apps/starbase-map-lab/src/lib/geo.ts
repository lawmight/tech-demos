import type { LngLat } from "./types";

/** WGS84 equatorial radius, metres. */
export const EARTH_RADIUS_M = 6_378_137;

export function enuFromDownrange(
  downrangeM: number,
  azimuthDeg: number,
): { eastM: number; northM: number } {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  return {
    eastM: downrangeM * Math.sin(azimuth),
    northM: downrangeM * Math.cos(azimuth),
  };
}

/**
 * Spherical destination. Azimuth is degrees clockwise from north.
 * A zero distance returns the origin unchanged.
 */
export function destination(origin: LngLat, distanceM: number, azimuthDeg: number): LngLat {
  if (distanceM === 0) return { lng: origin.lng, lat: origin.lat };
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = (azimuthDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinDelta = Math.sin(delta);
  const cosDelta = Math.cos(delta);
  const lat2 = Math.asin(sinLat1 * cosDelta + cosLat1 * sinDelta * Math.cos(theta));
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(theta) * sinDelta * cosLat1,
      cosDelta - sinLat1 * Math.sin(lat2),
    );
  return {
    lat: (lat2 * 180) / Math.PI,
    lng: ((((lng2 * 180) / Math.PI + 540) % 360) - 180),
  };
}

/** Inverse of {@link destination}: distance and initial azimuth from origin to point. */
export function trackFromLngLat(
  origin: LngLat,
  point: LngLat,
): { distanceM: number; azimuthDeg: number } {
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (point.lat * Math.PI) / 180;
  const dLng = ((point.lng - origin.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const azimuth = (Math.atan2(y, x) * 180) / Math.PI;
  return {
    distanceM: haversineM(origin, point),
    azimuthDeg: (azimuth + 360) % 360,
  };
}

export function haversineM(a: LngLat, b: LngLat): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Local flat offset from an origin, used for the few dozen metres between tower and mount. */
export function offsetEnu(origin: LngLat, eastM: number, northM: number): LngLat {
  const latRad = (origin.lat * Math.PI) / 180;
  const dLat = (northM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = (eastM / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI);
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}
