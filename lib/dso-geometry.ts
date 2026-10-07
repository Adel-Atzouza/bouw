import type { DsoGeometry } from "@/lib/dso";

export function validCoordinates(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === "number" && Number.isFinite(n)) && value[0] >= -7000 && value[0] <= 300000 && value[1] >= 289000 && value[1] <= 630000;
}

const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export function validGeometry(value: unknown): value is DsoGeometry {
  if (!value || typeof value !== "object") return false;
  const geo = value as DsoGeometry;
  if (geo.type === "Point") return validCoordinates(geo.coordinates);
  if (geo.type !== "Polygon" || !Array.isArray(geo.coordinates) || geo.coordinates.length !== 1) return false;
  const ring = geo.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 101 || !ring.every(validCoordinates)) return false;
  if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) return false;
  const points = ring.slice(0, -1);
  if (new Set(points.map((p) => p.join(","))).size !== points.length) return false;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = ring[i], b = ring[i + 1];
    area += a[0] * b[1] - b[0] * a[1];
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = ring[j], d = ring[j + 1];
      const on = (p: number[], q: number[], r: number[]) => cross(p, q, r) === 0 && r[0] >= Math.min(p[0], q[0]) && r[0] <= Math.max(p[0], q[0]) && r[1] >= Math.min(p[1], q[1]) && r[1] <= Math.max(p[1], q[1]);
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0 || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)) return false;
    }
  }
  return Math.abs(area / 2) >= 1;
}

// PDOK BRT WMTS EPSG:28992 matrix: 256px tiles, resolution halves at each level.
export const mapOrigin = [-285401.92, 903401.92] as const;
export const mapResolution = (zoom: number) => 3440.64 / 2 ** zoom;
export function mapPoint(center: [number, number], zoom: number, pixel: [number, number], size: [number, number]): [number, number] {
  const r = mapResolution(zoom);
  return [Math.round((center[0] + (pixel[0] - size[0] / 2) * r) * 100) / 100, Math.round((center[1] - (pixel[1] - size[1] / 2) * r) * 100) / 100];
}
