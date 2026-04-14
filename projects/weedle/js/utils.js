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

function drawLaserDoor(g, gridX, gridY) {
    let pos = getIsoPos(gridX, gridY);
    drawIsoCube(g, gridX, gridY, 4, 30, 0x00ffff, 0.5, 0.3); // Hinten
    drawIsoCube(g, gridX + 0.8, gridY + 0.8, 4, 30, 0x00ffff, 0.5, 0.3); // Vorne
    g.lineStyle(1, 0xff0000, 0.8);
    for(let i=0; i<3; i++) { g.moveTo(pos.x, pos.y - 8 - (i*8)); g.lineTo(pos.x + 28, pos.y + 14 - 8 - (i*8)); }
}
