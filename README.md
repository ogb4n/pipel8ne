# Pipel8ne Template - React & Tailwind

Ce projet est un template moderne et léger conçu pour démarrer rapidement le développement d'applications web performantes. Il est propulsé par les dernières versions de l'écosystème React : **Vite 7**, **React 19**, et **Tailwind CSS 4**.

## 🚀 Fonctionnalités Clés

- **⚡ Stack Ultra-Rapide** : Utilise [Vite 7](https://vitejs.dev/) pour un démarrage instantané et un HMR (Hot Module Replacement) fulgurant.
- **🎨 Styling Moderne** : Intègre [Tailwind CSS v4](https://tailwindcss.com/) pour un design utility-first, entièrement typé.
- **🌙 Dark Mode Natif** : Gestion du thème (Clair/Sombre) incluse via un Context React, avec détection automatique des préférences système et persistance locale.
- **Routage** : Configuration prête à l'emploi avec [React Router v7](https://reactrouter.com/).
- **✅ Testing** : Environnement de test préconfiguré avec [Vitest](https://vitest.dev/) et React Testing Library.
- **TypeScript** : Configuration stricte pour une meilleure sécurité de type et une meilleure expérience développeur.

## 📂 Structure du Frontend

Le code source de l'application se trouve dans le dossier `webapp/`.

```bash
webapp/
├── src/
│   ├── Components/ # Composants réutilisables (Header, ThemeToggle...)
│   ├── Context/    # Gestion d'état global (ThemeContext)
│   ├── Pages/      # Vues de l'application (Home, RTL, Tailwind demo)
│   ├── App.tsx     # Point d'entrée principal avec le Routing
│   └── main.tsx    # Montage de l'application React
├── public/         # Fichiers statiques
└── ...config files # (vite.config.ts, tailwind.config.js, etc.)
```

## 🛠️ Installation et Démarrage

### Prérequis

- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- npm ou yarn

### 1. Installation des dépendances

Rendez-vous dans le dossier de l'application :

```bash
cd webapp
npm install
```

### 2. Lancer le serveur de développement

Pour démarrer l'application en mode local :

```bash
npm run dev
```

L'application sera accessible à l'adresse indiquée dans le terminal (généralement `http://localhost:5173`).

## 📜 Scripts Disponibles

Dans le dossier `webapp`, vous pouvez exécuter :

| Commande          | Description                                                      |
| :---------------- | :--------------------------------------------------------------- |
| `npm run dev`     | Lance le serveur de développement Vite.                          |
| `npm run build`   | Compile l'application pour la production dans le dossier `dist`. |
| `npm run preview` | Prévisualise la version de production localement.                |
| `npm test`        | Lance la suite de tests unitaires avec Vitest.                   |

## 🧩 Personnalisation

### Thèmes et Couleurs

La gestion du thème se trouve dans `src/Context/ThemeContext.tsx`.
Le design utilise les classes utilitaires de Tailwind. Vous pouvez modifier la configuration globale dans `src/App.css` ou via les variables CSS natives.

### Ajouter une nouvelle page

1. Créez un composant dans `src/Pages/`.
2. Importez-le dans `src/App.tsx`.
3. Ajoutez une nouvelle `<Route>` dans la section `<Routes>` :
   ```tsx
   <Route path="/ma-nouvelle-page" element={<MaNouvellePage />} />
   ```

## 📦 Déploiement

Le projet est configuré pour être build statiquement.

1. Exécutez `npm run build`.
2. Le contenu du dossier `dist` généré peut être hébergé sur n'importe quel serveur statique (Nginx, Vercel, Netlify, S3, etc.).
