// Level-Intros von Tío Nando.
//
// Jeder Eintrag: Array von Zeilen. Eine Zeile = eine Dialogbox
// (Weiter mit Klick/Leertaste/E).
// voice: optionaler Pfad zu einer Sprachaufnahme, z.B. 'assets/voice/l1_1.mp3'.
//        Fehlt der Eintrag, kommen die Schreibmaschinen-Blips.

export const SPEAKER = {
    name: 'TÍO NANDO',
    color: 0xffaa00,
};

export const DIALOGUES = {
    1: [
        { text: '¡Ey, sobrino! Da bist du ja endlich. Der Laden gehört jetzt dir.' },
        { text: 'Ganz einfach: Samen am Terminal holen, ins Beet pflanzen, warten.' },
        { text: 'Wenn sie reif ist ernten und an der Kasse verkaufen. Fünf Stück. ¡Vamos!' },
    ],
    2: [
        { text: 'Nicht schlecht, sobrino. Aber ein Beet? Das ist ein Hobby, kein Geschäft.' },
        { text: 'Siehst du die leuchtenden Felder am Boden? Da baust du. Zwei Beete, mínimo.' },
    ],
    3: [
        { text: 'Ay, es wird warm hier drin. Deine Pflanzen verfaulen doppelt so schnell.' },
        { text: 'Verfaultes Zeug wandert in den Mülleimer draußen. Halt festhalten, hasta que weg.' },
        { text: 'Ein sauberer Laden ist ein guter Laden. Das hat mir mein Vater beigebracht.' },
    ],
    4: [
        { text: 'Zeit für Qualität. Drück [Q] neben einer Station — dann siehst du, was geht.' },
        { text: 'Ein besseres Beet wächst schneller. Schneller wachsen heißt schneller Geld.' },
    ],
    5: [
        { text: 'Du siehst müde aus, sobrino. Weißt du, was reiche Leute machen? Delegieren.' },
        { text: 'An der Mitarbeiterstation stellst du einen Gärtner ein. Der pflanzt und erntet für dich.' },
        { text: 'Vertrau ihm. Meistens.' },
    ],
    6: [
        { text: 'Die Leute reden über dich. Gut für das Geschäft, schlecht für die Warteschlange.' },
        { text: 'Zweite Kasse, ein Kassierer dazu. Niemand wartet gern, das weiß ich aus Erfahrung.' },
    ],
    7: [
        { text: '¡Escúchame! Ein alter Freund hat mir Haze-Samen besorgt. Feinste Ware.' },
        { text: 'Aber feine Ware braucht feine Erde. Rüste ein Beet auf Tier 1 auf, sonst wächst da nada.' },
    ],
    8: [
        { text: 'Kush. Das Zeug, mit dem ich damals angefangen habe. Gute Zeiten.' },
        { text: 'Zweitausend Euro, sobrino. Und halt die Kunden bei Laune.. Ruf ist alles.' },
    ],
    9: [
        { text: 'Crystal. Teuer im Einkauf, sehr teuer im Verkauf. Kalkulier gut.' },
        { text: 'Wer hier hektisch wird, verliert Geld. Ruhig bleiben, planen, liefern.' },
    ],
    10: [
        { text: 'Der letzte Schritt, sobrino. OG. Die Königin.' },
        { text: 'Ich habe dreißig Jahre gebraucht für das, was du hier aufgebaut hast.' },
        { text: 'Mach es fertig. Und dann rufst du deinen Tío an, ¿entiendes?' },
    ],
};

export function getDialogue(levelId) {
    return DIALOGUES[levelId] || null;
}
