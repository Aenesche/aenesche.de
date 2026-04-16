// A* auf dem CollisionGrid. Liefert eine Liste von Grid-Tiles {x, y}
// vom Start zum Ziel. Diagonal erlaubt (kostet √2). Kunden können sich
// also auch durch enge Lücken zwischen Stationen bewegen.

import { ISO } from '../config/constants.js';

export function findPath(collision, start, goal) {
    const N = ISO.GRID_SIZE;
    const sx = Math.floor(start.x), sy = Math.floor(start.y);
    const gx = Math.floor(goal.x),  gy = Math.floor(goal.y);

    // Ziel selbst muss nicht walkable sein (z.B. die Kasse).
    // Daher: Wenn Goal blockiert, suchen wir den begehbaren Nachbar mit kleinster Distanz.
    let actualGoal = { x: gx, y: gy };
    if (!collision.isWalkable(gx, gy)) {
        const neighbor = nearestWalkableNeighbor(collision, gx, gy);
        if (!neighbor) return null;
        actualGoal = neighbor;
    }

    const key = (x, y) => `${x},${y}`;
    const open = new Map(); // key -> node
    const closed = new Set();

    const startNode = { x: sx, y: sy, g: 0, h: heuristic(sx, sy, actualGoal.x, actualGoal.y), parent: null };
    startNode.f = startNode.g + startNode.h;
    open.set(key(sx, sy), startNode);

    while (open.size > 0) {
        // Knoten mit kleinstem f
        let current = null;
        for (const node of open.values()) {
            if (!current || node.f < current.f) current = node;
        }

        if (current.x === actualGoal.x && current.y === actualGoal.y) {
            return reconstruct(current);
        }

        open.delete(key(current.x, current.y));
        closed.add(key(current.x, current.y));

        for (const [dx, dy] of NEIGHBORS) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            // Erweiterte Bounds für Extra-Tiles (z.B. Tür/Gehweg)
            if (nx < -2 || nx >= N + 10 || ny < -2 || ny >= N + 10) continue;
            if (closed.has(key(nx, ny))) continue;
            if (!collision.isWalkable(nx, ny)) continue;

            // Diagonale: nicht durch Ecken zwischen zwei Wänden cutten
            if (dx !== 0 && dy !== 0) {
                if (!collision.isWalkable(current.x + dx, current.y) ||
                    !collision.isWalkable(current.x, current.y + dy)) {
                    continue;
                }
            }

            const stepCost = (dx !== 0 && dy !== 0) ? 1.414 : 1;
            const tentativeG = current.g + stepCost;

            const k = key(nx, ny);
            const existing = open.get(k);
            if (!existing || tentativeG < existing.g) {
                const node = {
                    x: nx, y: ny,
                    g: tentativeG,
                    h: heuristic(nx, ny, actualGoal.x, actualGoal.y),
                    parent: current,
                };
                node.f = node.g + node.h;
                open.set(k, node);
            }
        }
    }
    return null;
}

const NEIGHBORS = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
];

function heuristic(x1, y1, x2, y2) {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); // Octile
}

function reconstruct(node) {
    const path = [];
    let cur = node;
    while (cur) {
        path.unshift({ x: cur.x, y: cur.y });
        cur = cur.parent;
    }
    return path;
}

function nearestWalkableNeighbor(collision, x, y) {
    for (const [dx, dy] of NEIGHBORS) {
        if (collision.isWalkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
    return null;
}
