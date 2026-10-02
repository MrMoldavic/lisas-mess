# Lisa's Mess

Application mobile de garde-robe : photographier ses vêtements comme des
**pièces** classées par type, les combiner en **tenues**, et repérer celles qu'on
ne porte jamais pour faire du tri.

React Native sur **Expo SDK 57** (workflow managé), **TypeScript**, **expo-router**
(routage par fichiers).

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

Il n’y a volontairement **pas de `babel.config.js`** : Expo applique
`babel-preset-expo` depuis son propre `node_modules`. N'en ajouter un qu'avec
`npx expo customize babel.config.js`, qui installe aussi le preset en dépendance
— un fichier écrit à la main échoue au bundling avec
`Cannot find module 'babel-preset-expo'`.

### Environnement Android (Windows)

L'émulateur exige la virtualisation matérielle. Si un AVD démarre puis se referme
aussitôt, vérifier dans l'ordre :

```bash
emulator -accel-check          # doit répondre 0
```

- `6` avec « hypervisor driver is not installed » et `HypervisorPresent = False` :
  la virtualisation est désactivée dans l'UEFI. Sur AMD l'option s'appelle
  **SVM Mode**. Une fois activée, Windows Hypervisor Platform suffit — le pilote
  AEHD n'est pas nécessaire.
- Expo a besoin de `ANDROID_HOME` et de `platform-tools` dans le PATH pour
  trouver le SDK.

## Arborescence

```
app/                    Écrans — un fichier = une route (expo-router)
  _layout.tsx           Layout racine : Stack + thème + safe area
  index.tsx             "/"        accueil animé (dégradé, titre, « Ouvrir »)
  pieces.tsx            "/pieces"  garde-robe : Pièces / Tenues, filtres, grille
  +not-found.tsx        repli 404
src/
  components/           Screen, Button, Reveal, ModeSwitch,
                        FilterPills (+ CategoryPills, SeasonPills), CategorySheet
  hooks/useTheme.ts     Thème clair/sombre suivi du système
  hooks/useWeather.ts   Météo du jour, relue au retour sur l'écran
  theme/                Palette, dégradés, espacements, typographie
  services/             pieces (stockage disque), cutout (détourage), api,
                        weather (météo annoncée par Bobine)
  types/                Catégories, saisons, familles
assets/                 Images, polices (voir assets/README.md)
```

L'alias `@/` pointe vers `src/` (configuré dans `tsconfig.json`).

## Conventions

- **Ajouter un écran** = créer un fichier dans `app/`. Le nom du fichier est la
  route ; un dossier `(groupe)` regroupe des écrans sans ajouter de segment d'URL.
- **Styles** : passer par `useTheme()` plutôt que des couleurs ou des marges en
  dur, pour que le mode sombre suive automatiquement. Les couleurs de famille
  (`top`, `bottom`, `shoes`) et de saison sont dans la palette, pas dans les écrans.
- **Une rangée de pilules** se fait avec `FilterPills`. Ne pas en réécrire une :
  la `ScrollView` horizontale de React Native a `flexGrow: 1` par défaut et
  se partage la hauteur de son parent au lieu de s'y adapter. Le correctif est
  dans ce composant et nulle part ailleurs.
- **Stockage des pièces** : un fichier par photo dans le dossier `document` de
  l'app, nommé `<horodatage>__<catégorie>.<ext>`. Le dossier **est** l'index — pas
  de base de données. Reclasser = renommer. Ça tiendra jusqu'à ce qu'une pièce
  porte plusieurs attributs (couleur, saison, compteur de port) ; il faudra alors
  une vraie table.

## Variables d'environnement

Copier `.env.example` en `.env` (**copier**, ne pas renommer : le modèle est
versionné). Toute variable `EXPO_PUBLIC_` est embarquée **en clair** dans le
bundle de l'app, donc lisible par quiconque l'installe.

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de base du client `api` (inutilisée pour l'instant) |
| `EXPO_PUBLIC_CUTOUT_ENABLED` | `true` active le détourage. **Éteint par défaut.** |
| `EXPO_PUBLIC_REPLICATE_API_TOKEN` | Jeton Replicate, si le détourage est activé |

Les variables sont injectées **au démarrage du bundler** : après modification de
`.env`, redémarrer `npm start`. Un rechargement de l'app ne suffit pas.

## Météo

Bobine annonce la météo dans l'atelier, avec un conseil de tenue tiré de la
maxi (l'après-midi), de la mini (le matin) et de la pluie ; à partir de 18 h, c'est celle du
lendemain. Prévisions **Open-Meteo**, sans clé ni compte, donc rien à mettre
dans `.env`. La position (`expo-location`) n'est demandée qu'une fois et arrondie
à une dizaine de kilomètres avant l'appel. Sans autorisation ou sans réseau,
Bobine ne dit simplement rien de la météo.

L'offre gratuite d'Open-Meteo est réservée à un usage **non commercial** : à
revoir avant toute publication, comme le détourage.

## Décision : le détourage doit finir sur l'appareil

**État actuel** — le détourage est implémenté contre l'API Replicate
(`src/services/cutout.ts`) mais **éteint**, faute de crédit sur le compte.
L'interrupteur est séparé du jeton volontairement : posséder un jeton ne veut pas
dire vouloir appeler l'API, et sans crédit chaque photo déclenchait un appel voué
à l'échec. Le repli est déjà en place — si le détourage échoue, la photo brute est
conservée et l'utilisateur est averti.

**Pourquoi ne pas rester sur le cloud** — le coût est à l'image. Indolore pour une
garde-robe personnelle (quelques euros une fois), il devient linéaire en
utilisateurs × photos dès la publication, sans plafond et à la charge de l'éditeur.

**Pourquoi le natif ne coûte rien de plus, une fois publié** — c'est le point
contre-intuitif à ne pas reperdre : le détourage sur l'appareil exige un
*development build*, ce qui semble être un surcoût. Mais **publier l'impose déjà**.
Expo Go est un outil de développement : un app bundle Android ou un build iOS pour
l'App Store passent forcément par `expo run` ou EAS Build. Le jour de la
publication, l'obstacle a donc disparu de lui-même, et le détourage devient gratuit
et illimité.

**Deux raisons de plus** :

- *Juridique* — envoyer les photos des utilisateurs à un tiers impose une
  politique de confidentialité, un contrat de sous-traitance RGPD et une
  déclaration de collecte sur les stores. En local, rien ne sort du téléphone.
- *Licence* — les poids ouverts de RMBG (le modèle exécuté par Replicate) sont
  disponibles pour usage **non commercial**. ML Kit et Vision sont gratuits et
  utilisables commercialement.

**Cible** — `VNGenerateForegroundInstanceMaskRequest` (Apple Vision, iOS 17+) et
ML Kit Subject Segmentation sur Android. Plusieurs modules communautaires les
enveloppent déjà, mais aucun n'est officiel Expo et plusieurs dépôts partagent le
même nom : **auditer le code source avant d'en installer un**, c'est du natif qui
reçoit les photos des utilisateurs.

**Coût de la bascule** — faible et localisé. Tout passe par `removeBackground()`
dans `src/services/cutout.ts` ; seule la sortie change, un fichier local au lieu
d'une URL distante, ce qui remplace `addPieceFromUrl()` par `addPiece()` au point
d'appel. Aucun écran n'est concerné.

## Scripts

| Commande | Effet |
|---|---|
| `npm start` | Serveur de développement Expo |
| `npm run android` / `ios` / `web` | Démarre directement sur la plateforme |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npx expo export --platform web` | Bundle de vérification : compile tout le code |

`expo-file-system` n'existe pas sur le web : la cible web sert à valider que tout
compile, pas à tester l'écran garde-robe.
