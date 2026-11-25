# BRUTE LEGENDS — Jeu Web RPG / Clicker Chibi Anime

Un jeu web **RPG / Clicker / Auto-Battler** complet inspiré de *My Brute* avec une direction artistique originale **chibi anime cel-shaded**, des personnages personnalisables multi-couches animés en **11 animations fluides** sous **Phaser 3**, une interface **React + TypeScript** doublement adaptée **PC & Mobile portrait**, et un **backend Node.js / Express + Neon PostgreSQL** autoritatif.

---

## Architecture Technique

```text
bruta/
├── shared/                 # Contrats TypeScript purs, catalogues & moteur de combat déterministe (Client + Serveur)
│   ├── types.ts            # Modèles de domaine (Fighter, Appearance, Equipment, Skill, BattleResult...)
│   ├── constants.ts        # Courbe XP, raretés, palettes, grille spritesheet 160x160 (11 animations)
│   ├── equipmentCatalog.ts # 44 objets sur 6 emplacements et 5 raretés + effets spéciaux
│   ├── skillsCatalog.ts    # 12 compétences actives & passives
│   ├── upgradesCatalog.ts  # 12 améliorations Clicker / Auto-DPS / Dojo
│   ├── opponentsCatalog.ts # 12 adversaires & Boss + 6 rivaux PvP de départ
│   ├── missionsCatalog.ts  # 16 missions/succès + calendrier 7 jours
│   ├── progression.ts      # Stats dérivées, gains hors-ligne, boutique & coffres
│   └── combatEngine.ts     # Moteur de combat auto déterministe synchronisé avec Phaser 3
├── src/
│   ├── engine/
│   │   ├── art/            # Rig chibi 11 animations, rendu cel-shaded multi-couches, spritesheet baker & VFX
│   │   ├── phaser/         # Scènes Phaser 3 (ShowcaseScene, ArenaScene, ClickerScene) & pont React
│   │   └── audio/          # Moteur SFX procédural Web Audio API
│   ├── state/              # Client REST typé + GameContext (optimistic clicker batching & sync)
│   ├── styles/             # Design system cel-shaded Vanilla CSS (PC Rail + Mobile Bottom Nav)
│   └── components/         # Layout responsive, modales et les 11 vues fonctionnelles
├── server/
│   ├── db/                 # Schéma PostgreSQL Neon (schema.sql) + adaptateur dual PG / local JSON
│   ├── middleware/         # Authentification JWT + hachage bcryptjs
│   └── routes/             # API autoritative (auth, player, combat, inventory, shop, skills, upgrades, missions, leaderboard)
├── scripts/                # Générateur de métadonnées & grille spritesheet (chibi_atlas.json, chibi_base_grid.svg)
├── public/assets/          # Arènes illustrées (coliseum, dojo, volcano) & spritesheets
└── tests/                  # Suite de tests Vitest (combat, progression, spritesheets, API intégration)
```

---

## Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Lancer le jeu (API Backend + Frontend Vite)
```bash
npm run dev
```
- Frontend : `http://localhost:5173`
- Backend API : `http://localhost:3001`

Par défaut, sans configuration supplémentaire, le backend démarre en mode persistant local (`server/data/db.json`).

### 3. Activer Neon PostgreSQL (Production / Cloud)
1. Copier `.env.example` vers `.env`.
2. Renseigner votre chaîne de connexion Neon :
   ```env
   DATABASE_URL=postgres://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=une-cle-secrete-robuste
   ```
3. Démarrer le serveur : les tables `users`, `fighters` et `battle_history` de `server/db/schema.sql` sont initialisées automatiquement au démarrage.

---

## Scripts disponibles

- `npm run dev` — Démarre le backend Express (`3001`) et le frontend Vite (`5173`) en parallèle.
- `npm run build` — Vérifie les types TypeScript et génère le bundle de production dans `dist/`.
- `npm test` — Exécute la suite de tests automatisés Vitest (moteur de combat, progression, spritesheets, API).
- `npm run generate:sprites` — Régénère `public/assets/spritesheets/chibi_atlas.json` et `chibi_base_grid.svg`.

---

## Spécification des Spritesheets Chibi (11 Animations)

Chaque combattant est assemblé dynamiquement sur une grille régulière **1280 × 1760 px** (8 colonnes × 11 lignes de cellules **160 × 160 px**, fond transparent) avec superposition multi-couches (ombre, aura, cape/accessoire arrière, jambes/bottes, torse/armure, tête/expression/cheveux/casque, bras/gants, arme surdimensionnée + arc de frappe).

| Ligne | Animation | Frames | FPS | Boucle |
|---:|---|---:|---:|---|
| 0 | `idle` | 6 | 8 | Oui |
| 1 | `walk` | 6 | 10 | Oui |
| 2 | `run` | 6 | 14 | Oui |
| 3 | `attack` | 6 | 15 | Non |
| 4 | `heavy_attack` | 8 | 14 | Non |
| 5 | `hit` | 4 | 12 | Non |
| 6 | `dodge` | 6 | 16 | Non |
| 7 | `block` | 4 | 12 | Non |
| 8 | `victory` | 6 | 10 | Oui |
| 9 | `defeat` | 6 | 8 | Non |
| 10 | `special` | 8 | 14 | Non |
