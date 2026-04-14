const TILE_SIZE = 40;
const OFFSET_X = 500;
const OFFSET_Y = 150;

function getIsoPos(gridX, gridY) {
    return {
        x: OFFSET_X + (gridX - gridY) * TILE_SIZE,
        y: OFFSET_Y + (gridX + gridY) * (TILE_SIZE / 2)
    };
}

function drawIsoTile(g, x, y, size, fillHex, fillAlpha, strokeAlpha) {
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + size, y + size / 2); g.lineTo(x, y + size); g.lineTo(x - size, y + size / 2); g.closePath();
    if (fillAlpha > 0) { g.fillStyle(fillHex, fillAlpha); g.fillPath(); }
    if (strokeAlpha > 0) { g.lineStyle(2, fillHex, strokeAlpha); g.strokePath(); }
}

function drawIsoCube(g, gridX, gridY, size, height, color, topAlpha, sideAlpha) {
    let pos = getIsoPos(gridX, gridY); let x = pos.x, y = pos.y;
    g.fillStyle(color, sideAlpha * 0.6); g.beginPath(); g.moveTo(x, y + size); g.lineTo(x + size, y + size/2); g.lineTo(x + size, y + size/2 - height); g.lineTo(x, y + size - height); g.closePath(); g.fillPath(); g.lineStyle(1, color, 1); g.strokePath();
    g.fillStyle(color, sideAlpha); g.beginPath(); g.moveTo(x, y + size); g.lineTo(x - size, y + size/2); g.lineTo(x - size, y + size/2 - height); g.lineTo(x, y + size - height); g.closePath(); g.fillPath(); g.strokePath();
    drawIsoTile(g, x, y - height, size, color, topAlpha, 1);
}

// NEU: Zeichnet die Rückwände des Raums
function drawRoomWalls(g, gridSize, height) {
    let color = 0x00ffff;
    g.fillStyle(color, 0.05);
    g.lineStyle(2, color, 0.5);

    // Linke Wand (gridX = 0)
    let top = getIsoPos(0, 0);
    let left = getIsoPos(0, gridSize);
    g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(left.x, left.y); g.lineTo(left.x, left.y - height); g.lineTo(top.x, top.y - height); g.closePath();
    g.fillPath(); g.strokePath();

    // Rechte Wand (gridY = 0)
    let right = getIsoPos(gridSize, 0);
    g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(right.x, right.y); g.lineTo(right.x, right.y - height); g.lineTo(top.x, top.y - height); g.closePath();
    g.fillPath(); g.strokePath();
}

function drawLaserDoor(g, gridX, gridY) {
    let pos = getIsoPos(gridX, gridY);
    // Integriert in die Wand
    drawIsoCube(g, gridX, gridY, 4, 60, 0x00ffff, 0.5, 0.3); // Türrahmen Vorne
    drawIsoCube(g, gridX, gridY + 1, 4, 60, 0x00ffff, 0.5, 0.3); // Türrahmen Hinten
    g.lineStyle(1, 0xff0000, 0.8);
    for(let i=0; i<6; i++) { g.moveTo(pos.x, pos.y - 10 - (i*8)); g.lineTo(pos.x - 40, pos.y + 20 - 10 - (i*8)); }
}

function drawPlant(g, x, y, scale, color) {
    let h = 30 * scale; let w = 15 * scale;
    g.lineStyle(2, color, 1); g.fillStyle(color, 0.2);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - w, y - h/2); g.lineTo(x, y - h); g.lineTo(x + w, y - h/2); g.closePath();
    g.fillPath(); g.strokePath();
    g.fillStyle(color, 1); g.fillEllipse(x, y - h/2, w/2, h/4);
}
