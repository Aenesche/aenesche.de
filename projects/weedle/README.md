# Weedle

Iso-Tycoon. Phaser 3, ES Modules, statisch über GitHub Pages.

## Struktur

```
weedle/
├── index.html              # Entry, lädt Phaser CDN + main.js
├── .nojekyll               # GitHub Pages: keine Jekyll-Verarbeitung
└── src/
    ├── main.js             # Phaser-Config, Scene-Registrierung
    ├── config/
    │   └── constants.js    # TILE_SIZE, Farben, Spielwerte
    ├── utils/
    │   └── iso.js          # Grid<->Iso Koordinaten
    ├── storage/
    │   └── storage.js      # localStorage-Wrapper, später Supabase
    └── scenes/
        ├── BootScene.js    # Preload (aktuell leer)
        └── GameScene.js    # Haupt-Scene
```

## Lokal starten

ES Modules brauchen einen Server (kein `file://`):

```bash
python3 -m http.server 8000
# dann http://localhost:8000
```

## Deployment

Push auf `main`, in den Repo-Settings GitHub Pages auf `main / root` setzen. Fertig.

## Storage

Alles geht über `Storage.save/load/clear`. Wenn Supabase kommt, wird nur diese eine Datei umgeschrieben — der Rest des Codes bleibt unangetastet.
