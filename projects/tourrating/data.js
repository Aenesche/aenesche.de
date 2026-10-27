/* ============ TOUR RATING — data.js ============
   Alle Kategorien zentral hier. Neue Unterpunkte einfach ergänzen –
   die DB speichert alles als JSON (scores), keine Migration nötig.

   key   → Schlüssel im scores-JSON (nie umbenennen, sonst sind alte Werte weg)
   max   → 5 = Sterne, 10 = Meter (1–10)
   flags → Ja/Nein-Optionen (werden als "x von y" angezeigt)
   ================================================ */
window.TOUR_CATEGORIES = [
  {
    key: 'general',
    label: 'Generell',
    short: 'Gesamt',
    required: true,
    comment: true,
    subs: [],
    flags: []
  },
  {
    key: 'food',
    label: 'Essen',
    short: 'Essen',
    skipLabel: 'Kein Essen',
    flags: [
      { key: 'food_bio', label: 'Bio' },
      { key: 'food_vegan', label: 'Vegan' },
      { key: 'food_vegetarian', label: 'Vegetarisch' },
      { key: 'food_free', label: 'Kostenlos vor Ort' }
    ],
    subs: [
      { key: 'food_taste', label: 'Geschmack', max: 5 },
      { key: 'food_quality', label: 'Lebensmittelqualität', max: 5 },
      { key: 'food_portion', label: 'Portionsgröße', hint: 'Wird man satt?', max: 5 }
    ]
  },
  {
    key: 'stay',
    label: 'Unterkunft',
    short: 'Pennen',
    skipLabel: 'Keine Unterkunft',
    flags: [],
    subs: [
      { key: 'stay_smell', label: 'Geruch', max: 5 },
      { key: 'stay_ambience', label: 'Ambiente', max: 5 },
      { key: 'stay_showers', label: 'Duschen', max: 5 },
      { key: 'stay_sleep', label: 'Schlafqualität', max: 5 }
    ]
  },
  {
    key: 'concert',
    label: 'Konzert',
    short: 'Konzert',
    skipLabel: 'Kein Konzert',
    flags: [],
    subs: [
      { key: 'concert_stage', label: 'Bühne', max: 5 },
      { key: 'concert_music', label: 'Musik', max: 5 },
      { key: 'concert_crowd_size', label: 'Publikum Größe', max: 5 },
      { key: 'concert_crowd_energy', label: 'Publikum Energie', max: 5 },
      { key: 'concert_soundcheck', label: 'Soundcheck', max: 5 },
      { key: 'concert_gabi', label: 'Gabi-Meter', max: 10 }
    ]
  },
  {
    key: 'school',
    label: 'Schule',
    short: 'Schule',
    skipLabel: 'Keine Schule',
    flags: [],
    subs: [
      { key: 'school_wifi', label: 'WLAN', max: 5 },
      { key: 'school_waldi', label: 'Waldi-Meter', max: 10 },
      { key: 'school_teacher_waldi', label: 'Lehrer*innen-Waldi-Meter', max: 10 },
      { key: 'school_grounds', label: 'Gelände-Optik', max: 5 }
    ]
  }
];
