const TILE_SIZE = 40;
const OFFSET_X = 500;
const OFFSET_Y = 120; 

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

function drawBedTable(g, gridX, gridY, bedColor, bedAlpha) {
    let height = 15;
    drawIsoCube(g, gridX, gridY, TILE_SIZE, height, 0x00ffff, 0.05, 0.05);
    let pos = getIsoPos(gridX, gridY);
    drawIsoTile(g, pos.x, pos.y - height, TILE_SIZE, bedColor, bedAlpha, 1);
}

function drawPlant(g, gridX, gridY, scale, color, elevation) {
    let pos = getIsoPos(gridX, gridY);
    let cx = pos.x; 
    let cy = pos.y + (TILE_SIZE / 2) - elevation;
    let h = 30 * scale; let w = 15 * scale;
    g.lineStyle(2, color, 1); g.fillStyle(color, 0.2);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - w, cy - h/2); g.lineTo(cx, cy - h); g.lineTo(cx + w, cy - h/2); g.closePath();
    g.fillPath(); g.strokePath();
    g.fillStyle(color, 1); g.fillEllipse(cx, cy - h/2, w/2, h/4);
}

function drawSeedHologram(g, gridX, gridY, height) {
    let pos = getIsoPos(gridX, gridY);
    let cx = pos.x; let cy = pos.y + TILE_SIZE/2 - height;
    g.lineStyle(2, 0xffff00, 1); g.strokeEllipse(cx, cy, 16, 8);
    g.fillStyle(0xffff00, 1); g.fillCircle(cx, cy, 3);
}
