// Isometric projection for the studio room. Room units: x runs toward the bottom-right,
// y toward the bottom-left, z up. The viewer looks from the front corner (x and y large),
// so the visible vertical faces of a box are the x+w plane ("right") and the y+d plane ("left").

const SCALE = 46;
const ORIGIN_X = 500;
const ORIGIN_Y = 300;
const COS30 = Math.cos(Math.PI / 6);

export const ROOM = { size: 10, height: 5.4 } as const;

/** Screen position of a room point. */
export function iso(x: number, y: number, z = 0): [number, number] {
  return [ORIGIN_X + (x - y) * COS30 * SCALE, ORIGIN_Y + (x + y) * 0.5 * SCALE - z * SCALE];
}

type P3 = [number, number, number];

/** SVG `points` string for a polygon of room points. */
export function pts(...points: P3[]) {
  return points.map(([x, y, z]) => iso(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");
}

/** The three visible faces of a box at (x, y, z) with width w (x), depth d (y) and height h (z). */
export function box(x: number, y: number, z: number, w: number, d: number, h: number) {
  return {
    top: pts([x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]),
    left: pts([x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]),
    right: pts([x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]),
  };
}

/** A rectangle drawn flat on the left wall (the x = 0 plane): y from y0 to y1, z from z0 to z1. */
export function onLeftWall(y0: number, y1: number, z0: number, z1: number, inset = 0) {
  return pts([inset, y0, z0], [inset, y1, z0], [inset, y1, z1], [inset, y0, z1]);
}

/** A rectangle drawn flat on the right wall (the y = 0 plane): x from x0 to x1, z from z0 to z1. */
export function onRightWall(x0: number, x1: number, z0: number, z1: number, inset = 0) {
  return pts([x0, inset, z0], [x1, inset, z0], [x1, inset, z1], [x0, inset, z1]);
}

/** A rectangle flat on a horizontal surface at height z. */
export function onFloor(x0: number, y0: number, x1: number, y1: number, z = 0) {
  return pts([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]);
}

/**
 * SVG transform that lays text flat on a wall, reading left to right on screen.
 * Left wall text runs toward the back corner (y decreasing); right wall text runs toward the front (x increasing).
 */
export function wallText(wall: "left" | "right", x: number, y: number, z: number) {
  const [sx, sy] = iso(x, y, z);
  return wall === "left" ? `matrix(${COS30},-0.5,0,1,${sx},${sy})` : `matrix(${COS30},0.5,0,1,${sx},${sy})`;
}
