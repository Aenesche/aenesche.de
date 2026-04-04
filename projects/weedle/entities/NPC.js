// entities/NPC.js
class NPC {
  constructor(scene, x, y, npcData) {
    this.scene = scene;
    this.data = npcData;
    this.dialogueIndex = 0;

    // Sprite or placeholder
    if (scene.textures.exists(npcData.sprite)) {
      this.sprite = scene.physics.add.sprite(x, y, npcData.sprite);
    } else {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x60a5fa, 1);
      gfx.fillRect(0, 0, 24, 32);
      gfx.generateTexture(`npc_ph_${npcData.id}`, 24, 32);
      gfx.destroy();
      this.sprite = scene.physics.add.sprite(x, y, `npc_ph_${npcData.id}`);
    }

    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setImmovable(true);
    this.sprite.body.setSize(20, 24);
    this.sprite.setDepth(9);

    // Name label
    this.nameLabel = scene.add.text(x, y - 24, npcData.name, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 }
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
    const text = this.getNextDialogue();
    this.dialogueBubble = this.scene.add.text(
      this.sprite.x, this.sprite.y - 40, text, {
        fontSize: '11px',
        fontFamily: 'Courier New',
        color: '#0a0a0a',
        backgroundColor: '#e0e0e0',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 160 }
      }
    ).setOrigin(0.5, 1).setDepth(20);

    this.scene.time.delayedCall(3000, () => this.hideDialogue());
  }

  hideDialogue() {
    if (this.dialogueBubble) {
      this.dialogueBubble.destroy();
      this.dialogueBubble = null;
    }
  }

  update() {
    // Keep label above sprite
    this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 24);
  }

  isNear(player, distance = 48) {
    return Phaser.Math.Distance.Between(
      player.sprite.x, player.sprite.y,
      this.sprite.x, this.sprite.y
    ) < distance;
  }

  destroy() {
    this.sprite.destroy();
    this.nameLabel.destroy();
    this.hideDialogue();
  }
}
