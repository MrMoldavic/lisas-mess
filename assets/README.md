# assets

Déposer ici les ressources statiques (images, polices).

Pour brancher l'icône et le splash screen, ajouter les fichiers puis déclarer les
chemins dans `app.json` :

```json
"icon": "./assets/icon.png",
"splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#ffffff" },
"android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#ffffff" } },
"web": { "favicon": "./assets/favicon.png" }
```

Tailles attendues : `icon.png` 1024×1024, `adaptive-icon.png` 1024×1024,
`splash.png` ~1284×2778, `favicon.png` 48×48.

Tant que ces fichiers n'existent pas, les clés correspondantes doivent rester
absentes de `app.json` (Expo échoue sur un chemin d'asset manquant).
