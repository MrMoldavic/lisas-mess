# Lisa's Mess

Application mobile React Native, basée sur **Expo** (workflow managé) avec
**TypeScript** et **expo-router** (routage par fichiers).

## Prérequis

- Node.js 20 LTS ou plus (actuellement **non installé** sur cette machine)
- L'app Expo Go sur un téléphone, ou un émulateur Android / simulateur iOS

## Démarrage

```bash
npm install
npx expo install --fix   # aligne les versions des paquets sur le SDK Expo installé
npm start                # puis « a » pour Android, « i » pour iOS, « w » pour le web
```

> Les versions listées dans `package.json` correspondent à Expo SDK 54.
> `npx expo install --fix` est la commande de référence pour les recaler si un
> SDK plus récent est utilisé.

## Arborescence

```
app/                  Écrans — un fichier = une route (expo-router)
  _layout.tsx         Layout racine : Stack de navigation + thème + safe area
  index.tsx           Route "/"
  details.tsx         Route "/details" (exemple de paramètre de route)
  +not-found.tsx      Route de repli 404
src/
  components/         Composants réutilisables (Screen, Button)
  hooks/              Hooks partagés (useTheme)
  theme/              Palette, espacements, typographie
  services/           Accès réseau (client api)
  types/              Types métier partagés
assets/               Images, polices (voir assets/README.md)
```

L'alias `@/` pointe vers `src/` (configuré dans `tsconfig.json`).

## Conventions

- **Ajouter un écran** = créer un fichier dans `app/`. Le nom du fichier est la
  route ; un dossier `(groupe)` regroupe des écrans sans ajouter de segment d'URL.
- **Styles** : passer par `useTheme()` plutôt que des couleurs ou des marges en dur,
  pour que le mode sombre suive automatiquement.
- **Réseau** : utiliser `api` depuis `@/services/api`. L'URL de base vient de
  `EXPO_PUBLIC_API_URL` (copier `.env.example` en `.env`).

## Scripts

| Commande | Effet |
|---|---|
| `npm start` | Serveur de développement Expo |
| `npm run android` / `ios` / `web` | Démarre directement sur la plateforme |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
