// entities/NPC.js
class NPC {
  constructor(scene, x, y, npcData) {
    this.scene = scene;
    this.data = npcData;
    this.dialogueIndex = 0;

    const gfx = scene.add.graphics();
    gfx.fillStyle(0x000000, 0.15);
    gfx.fillEllipse(16, 40, 20, 6);
    const bodyColor = npcData.role === 'buyer' ? 0x60a5fa : 0xa78bfa;
    gfx.fillStyle(bodyColor, 1);
    gfx.fillRoundedRect(4, 10, 24, 26, 6);
    gfx.fillStyle(0xfbbf24, 1);
    gfx.fillCircle(16, 10, 9);
    gfx.fillStyle(0x1a1a2e, 1);
    gfx.fillCircle(13, 9, 2);
    gfx.fillCircle(19, 9, 2);
    gfx.generateTexture(`npc_${npcData.id}_modern`, 32, 46);
    gfx.destroy();

    this.sprite = scene.physics.add.sprite(x, y, `npc_${npcData.id}_modern`);
    this.sprite.setOrigin(0.5, 0.7);
    this.sprite.setImmovable(true);
    this.sprite.body.setSize(20, 16);
    this.sprite.body.setOffset(6, 24);
    this.sprite.setDepth(9);

    this.nameLabel = scene.add.text(x, y - 30, npcData.name, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#e4e4e7',
      backgroundColor: '#18181bcc', padding: { x: 5, y: 2 }
    }).setOrigin(0.5, 1).setDepth(11);

    this.dialogueBubble = null;
  }

  getNextDialogue() {
    const d = this.data.dialogues[this.dialogueIndex];
    this.dialogueIndex = (this.dialogueIndex + 1) % this.data.dialogues.length;
    return d;
  }

  showDialogue() {
    this.hideDialogue();
    this.dialogueBubble = this.scene.add.text(
      this.sprite.x, this.sprite.y - 48, this.getNextDialogue(), {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#18181b',
        backgroundColor: '#e4e4e7', padding: { x: 8, y: 5 },
        wordWrap: { width: 180 }
      }
    ).setOrigin(0.5, 1).setDepth(20);
    this.scene.time.delayedCall(3000, () => this.hideDialogue());
  }

  hideDialogue() {
    if (this.dialogueBubble) { this.dialogueBubble.destroy(); this.dialogueBubble = null; }
  }

  update() { this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 30); }

  isNear(player, distance = 48) {
    return Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, this.sprite.x, this.sprite.y) < distance;
  }

  destroy() { this.sprite.destroy(); this.nameLabel.destroy(); this.hideDialogue(); }
}
