const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 700,
    backgroundColor: '#050505',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: MainScene
};

const game = new Phaser.Game(config);
