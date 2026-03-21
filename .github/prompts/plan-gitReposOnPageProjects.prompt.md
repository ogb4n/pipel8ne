# Plan : Afficher les repos Git sur PageProjects

## TL;DR

Ajouter une section "Vos dépôts" sur `PageProjects` qui affiche les repos des providers Git connectés. Cliquer sur un repo ouvre le modal de création de projet pré-rempli. Le bouton "Nouveau projet" existant reste pour la création manuelle. Pas de push.

---

## Contexte

- API backend déjà prête : `GET /api/git-connections/repos/:provider` et `GET /api/git-connections/:id/repos`
- Client frontend OK : `api.gitConnections.listReposByProvider()`, `api.gitConnections.list()`, `api.gitConnections.listRepos()`
- Type `GitRepository` : `{ id, name, fullName, description, url, cloneUrl, defaultBranch, isPrivate, updatedAt }`
- `PageProjects.tsx` = page principale, montre projets + credentials

---

## Steps

### Phase 1 — Section Repos

1. **Fetch connexions + repos au mount** — Appeler `api.gitConnections.list()`, puis pour chaque connexion `api.gitConnections.listRepos(connectionId)`. Stocker les résultats avec le provider associé dans un state `repos: Array<GitRepository & { provider: GitProvider }>`.

2. **Afficher la section "Vos dépôts"** entre le header et la grille de projets existante :
   - Grille responsive 1→3 colonnes (même pattern que les project cards)
   - Chaque repo card : icône provider (SVGs GitHub/GitLab/Azure déjà existants), `fullName`, description tronquée, badge privé/public, branche par défaut
   - État vide (pas de connexion) → CTA "Connectez un provider Git" avec lien vers `/settings/git`
   - Loading spinner pendant le fetch

3. **Clic sur un repo → pré-remplit le modal existant** :
   - `name` = `repo.name`
   - `path` = `repo.fullName`
   - `provider` = provider de la connexion
   - `visibility` = `repo.isPrivate ? "private" : "public"`
   - L'utilisateur peut modifier avant de valider

### Phase 2 — UX

4. **Tabs provider** — Si le user a plusieurs connexions, afficher des tabs (GitHub / GitLab / Azure) pour filtrer

5. **CTA fallback** — Lien vers `/settings/git` si aucune connexion active

---

## Fichiers concernés

- `webapp/src/Pages/PageProjects.tsx` — ajout fetch repos, nouvelle section, pré-remplissage modal
- `webapp/src/Api/types.ts` — déjà complet (`GitRepository`, `GitConnection`)
- `webapp/src/Api/client.ts` — déjà complet (`listRepos`, `listReposByProvider`)

---

## Vérification

1. Avec connexion GitHub active → repos visibles dans la grille
2. Clic repo → modal pré-rempli avec les bonnes valeurs
3. Sans connexion Git → message + CTA vers settings
4. Bouton "Nouveau projet" fonctionne toujours (création manuelle)
5. Pas de régression sur la section Credentials
6. Dark mode correct

---

## Décisions

- Scope **IN** : affichage repos, clic → création projet pré-remplie
- Scope **OUT** : push de pipeline vers repo (sera fait plus tard)
- On utilise `listRepos(connectionId)` pour pouvoir mapper chaque repo à son provider
