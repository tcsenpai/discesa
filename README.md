# Discesa

Runner 3D in terza persona: un globo blu sparato dentro cinque tunnel iperspaziali.
Sterzi lungo la parete del tubo, salti, eviti tutto quello che brilla di cattivo.
Muori, riparti all'istante.

Tutto il gioco sta in `index.html`: nessuna build, nessuna dipendenza da installare.

## Avvio

```sh
bun start          # serve la cartella su http://localhost:3000
```

Va bene qualsiasi server statico (`python3 -m http.server`, Caddy, nginx). Aprire il file
direttamente con `file://` di solito funziona, ma alcuni browser limitano audio e gamepad.

Serve una connessione al primo avvio: three.js r128 e il font vengono caricati da CDN
(jsDelivr e Google Fonts). Per l'uso offline o self-hosted vedi sotto.

## Comandi

| | Sterzare | Saltare | Pausa | Ricominciare |
|---|---|---|---|---|
| Tastiera | A/D o frecce | Spazio, W, freccia su | P, Esc | R |
| Touch | trascina | tocco breve, swipe in su, secondo dito | pulsante in alto | dal menu di pausa |
| Controller | levetta sinistra o croce | A, X, RB, RT | Start | Select |

Tenendo premuto il salto si rimbalza a ogni atterraggio.

## Com'è fatto

- **Livelli**: generati proceduralmente da un seed fisso per tunnel, quindi identici a ogni
  partita. Profilo di pendenza, curve, dossi, e una sequenza di pattern (spuntoni, muri,
  slalom, laser, blocchi mobili, corridoi, buchi, trampolini).
- **Fisica**: logica pura, senza rendering, tra i marcatori `LOGIC-START` / `LOGIC-END`
  in `index.html`. Lavora in coordinate (distanza, arco laterale, altezza); il rendering
  le avvolge sulla parete interna del tubo.
- **Grafica**: three.js con materiali PBR, environment map generata dal cielo, parete del
  tunnel e pianeti in shader procedurali, bloom, motion blur per-pixel, raggi di luce,
  lente anamorfica, tone mapping ACES.
- **Audio**: nessun file. La colonna sonora è sintetizzata dal vivo con WebAudio
  (sequencer a sedicesimi), e lo spettro pilota gli effetti sulla parete del tunnel.
- **Salvataggio**: `localStorage`, chiave `discesa.v1` (record, tunnel sbloccati,
  tentativi, audio, qualità grafica).

## Test

```sh
bun test           # oppure: node test/bot.js
```

Un bot gioca tutti e cinque i tunnel con la stessa fisica del gioco e fallisce se un
livello non è completabile. Da rilanciare dopo ogni modifica a generazione o fisica.
Non copre rendering, audio né input.

## Self-hosting senza CDN

In `index.html` ci sono sette `<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/...">`.
Per servire tutto in locale:

```sh
bun add three@0.128.0
```

poi copia i file corrispondenti da `node_modules/three/` (`build/three.min.js` e i sei
sotto `examples/js/`) in una cartella `vendor/` e aggiorna i percorsi. Il font ha già un
fallback di sistema: basta togliere il `<link>` a Google Fonts.

## Limiti noti

- La sterzata copre l'arco basso del tubo, non il giro completo.
- I tunnel 4 e 5 hanno pochi trampolini.
- Il supporto controller non è stato provato su hardware reale.
- Le prestazioni su telefono dipendono molto dalla GPU; se il frame rate cala la qualità
  scende da sola, e si può forzare dal menu.

## Licenza

MIT. three.js è distribuito con la sua licenza MIT.
