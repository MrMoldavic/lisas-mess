# Lisa's Mess

Application mobile React Native, basée sur **Expo SDK 54** (workflow managé) avec
**TypeScript** et **expo-router** (routage par fichiers).

## Prérequis

- Node.js 20 LTS ou plus (validé avec Node 24.19.0 / npm 11.17.0)
- L'app Expo Go sur un téléphone, ou un émulateur Android / simulateur iOS

## Démarrage

```bash
npm install
npm start                # puis « a » pour Android, « i » pour iOS, « w » pour le web
```

> Utiliser `npx expo install <paquet>` plutôt que `npm install <paquet>` pour tout
> module natif : la commande choisit la version compatible avec le SDK.
> `npx expo install --fix` recale l'ensemble après une mise à jour.

Il n'y a volontairement **pas de `babel.config.js`** : depuis le SDK 54, Expo
applique `babel-preset-expo` depuis son propre `node_modules`. N'en ajouter un
qu'avec `npx expo customize babel.config.js`, qui installe aussi le preset en
dépendance — un fichier écrit à la main échoue au bundling avec
`Cannot find module 'babel-preset-expo'`.

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
| `npx expo export --platform web` | Bundle de vérification : compile tout le code |
