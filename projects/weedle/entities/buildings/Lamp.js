// entities/buildings/Lamp.js
class Lamp extends Building {
  constructor(scene, x, y) {
    super(scene, x, y, {
      id: 'lamp',
      name: 'Beleuchtung',
      width: 32,
      height: 32,
      color: 0xf59e0b
    });
  }

  interact(player, systems) {
    // Open upgrade menu for lamps
    return { action: 'upgrade', category: 'lamps' };
  }
}
