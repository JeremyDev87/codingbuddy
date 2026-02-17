/**
 * Edge Router - Manhattan path computation for TUI graph edges.
 *
 * Computes paths between two points using only horizontal and vertical
 * segments (Manhattan routing), with box-drawing characters for corners
 * and arrow tips at endpoints.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PathSegment extends Point {
  char: string;
}

/**
 * Compute Manhattan path between two points.
 * Strategy: horizontal to midpoint, vertical, horizontal to target.
 */
export function computeEdgePath(from: Point, to: Point): PathSegment[] {
  const path: PathSegment[] = [];
  const midX = Math.floor((from.x + to.x) / 2);

  if (from.y === to.y) {
    // Same row: simple horizontal line
    const dir = to.x > from.x ? 1 : -1;
    for (let x = from.x; x !== to.x; x += dir) {
      path.push({ x, y: from.y, char: '─' });
    }
    path.push({ x: to.x, y: to.y, char: dir > 0 ? '▸' : '◂' });
  } else if (from.x === to.x) {
    // Same column: simple vertical line
    const dir = to.y > from.y ? 1 : -1;
    for (let y = from.y; y !== to.y; y += dir) {
      path.push({ x: from.x, y, char: '│' });
    }
    path.push({ x: to.x, y: to.y, char: dir > 0 ? '▾' : '▴' });
  } else {
    // Horizontal to midpoint
    const dirX = midX > from.x ? 1 : midX < from.x ? -1 : 0;
    if (dirX !== 0) {
      for (let x = from.x; x !== midX; x += dirX) {
        path.push({ x, y: from.y, char: '─' });
      }
    }
    // Corner: horizontal to vertical (smooth rounded)
    const dirY = to.y > from.y ? 1 : -1;
    path.push({
      x: midX,
      y: from.y,
      char: dirX >= 0 ? (dirY > 0 ? '╮' : '╯') : dirY > 0 ? '╭' : '╰',
    });
    // Vertical segment
    for (let y = from.y + dirY; y !== to.y; y += dirY) {
      path.push({ x: midX, y, char: '│' });
    }
    // Corner: vertical to horizontal (smooth rounded)
    const dirX2 = to.x > midX ? 1 : to.x < midX ? -1 : 0;
    path.push({
      x: midX,
      y: to.y,
      char: dirY > 0 ? (dirX2 >= 0 ? '╰' : '╯') : dirX2 >= 0 ? '╭' : '╮',
    });
    // Horizontal to target
    if (dirX2 !== 0) {
      for (let x = midX + dirX2; x !== to.x; x += dirX2) {
        path.push({ x, y: to.y, char: '─' });
      }
    }
    // Arrow tip — merge with corner when positions coincide
    if (to.x !== midX) {
      path.push({ x: to.x, y: to.y, char: dirX2 >= 0 ? '▸' : '◂' });
    } else {
      // No horizontal segment after corner; path arrives vertically
      path[path.length - 1].char = dirY > 0 ? '▾' : '▴';
    }
  }

  return path;
}

/**
 * Find midpoint of horizontal segment for label placement.
 */
export function computeLabelPosition(path: PathSegment[], label: string): Point | null {
  const hSegments = path.filter(p => p.char === '─');
  if (hSegments.length < label.length + 2) return null;
  const startIdx = Math.floor((hSegments.length - label.length) / 2);
  return { x: hSegments[startIdx].x, y: hSegments[startIdx].y };
}
