# Plan : Intégration Azure DevOps comme provider Git

L'architecture Git Connection existante (GitHub + GitLab) est construite sur un **pattern Adapter extensible**. Ajouter Azure DevOps consiste à : (1) étendre le union type `GitProvider`, (2) créer un `AzureDevOpsAdapter` implémentant `IGitPlatformAdapter`, (3) mettre à jour routes/schemas/container, (4) mettre à jour le frontend. **Aucune modification structurelle nécessaire** — le pattern est déjà en place.

---

### Analyse de l'existant

L'intégration Git repose sur 4 couches bien séparées :

| Couche | Fichier clé | Rôle |
|---|---|---|
| **Domain** | `backend/src/domain/gitconnection/GitConnection.ts` | Union type `GitProvider = "github" \| "gitlab"`, entité `GitConnection`, `PublicGitConnection` |
| **Domain** | `backend/src/domain/gitconnection/IGitPlatformAdapter.ts` | Port (interface) avec 3 méthodes : `exchangeCodeForToken`, `getUserProfile`, `listRepositories` |
| **Domain** | `backend/src/domain/gitconnection/GitConnectionService.ts` | Stocke les adapters dans une `Map<GitProvider, IGitPlatformAdapter>`, résolution dynamique. Gère OAuth connect, disconnect, listing repos |
| **Infra** | `backend/src/infrastructure/git/GitHubAdapter.ts` | Implémente `IGitPlatformAdapter` pour GitHub (OAuth, profil, repos paginés) |
| **Infra** | `backend/src/infrastructure/git/GitLabAdapter.ts` | Idem pour GitLab (supporte self-hosted via `GITLAB_BASE_URL`) |
| **Infra** | `backend/src/infrastructure/database/models/GitConnectionModel.ts` | Modèle Mongoose avec index unique `{ userId, provider }` |
| **Application** | `backend/src/Application/plugins/container.ts` | Chargement conditionnel des adapters selon env vars |
| **Application** | `backend/src/Application/routes/git-connections/git-connections.routes.ts` | 6 endpoints REST, construction manuelle des authUrls dans `/oauth/config` |
| **Frontend** | `webapp/src/Api/types.ts`, `webapp/src/Api/client.ts` | Types `GitProvider`, `OAuthConfig` avec clés hardcodées `github` + `gitlab` |
| **Frontend** | `webapp/src/Pages/PageOAuthCallback.tsx` | Décode state base64, valide le provider, échange le code |
| **Frontend** | `webapp/src/Components/GitOnboardingModal.tsx`, `webapp/src/Pages/PageSettings.tsx` | UI des boutons de connexion, `PROVIDER_META`, section "Connexions Git" |

**Flux OAuth complet** : Frontend redirige → Provider consent → Callback `/oauth/callback?code=X&state=Y` → Frontend décode state → POST `/api/git-connections/oauth/callback` → Backend échange code via adapter → Stocke token chiffré AES-256-GCM → Retourne `PublicGitConnection`.

**Points clés** : le `GitConnectionService` ne connaît pas les providers concrets — il les résout via la `Map`. L'ajout d'un nouveau provider ne touche **aucune logique métier**.

---

### Steps

#### Phase 1 — Backend Domain

1. **Étendre `GitProvider`** dans `backend/src/domain/gitconnection/GitConnection.ts`
   - `export type GitProvider = "github" | "gitlab" | "azure_devops"`

#### Phase 2 — Backend Infrastructure (*dépend de 1*)

2. **Créer `AzureDevOpsAdapter`** — nouveau fichier `backend/src/infrastructure/git/AzureDevOpsAdapter.ts`
   - Implémenter `IGitPlatformAdapter`, pattern identique à `GitHubAdapter`/`GitLabAdapter`
   - `exchangeCodeForToken(code)` : POST `https://app.vssps.visualstudio.com/oauth2/token` avec `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`, `client_assertion=<CLIENT_SECRET>`, `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, `assertion=<code>`, `redirect_uri` (body url-encoded, pas JSON)
   - `getUserProfile(token)` : GET `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0` → mapper `displayName`/`emailAddress` vers `GitUserProfile`
   - `listRepositories(token)` : (1) GET `https://app.vssps.visualstudio.com/_apis/accounts?memberId={profileId}&api-version=7.0` pour lister les orgs, (2) pour chaque org GET `https://dev.azure.com/{org}/_apis/git/repositories?api-version=7.0` → mapper vers `GitRepository[]`
   - Env vars : `AZURE_DEVOPS_CLIENT_ID`, `AZURE_DEVOPS_CLIENT_SECRET`, optionnel `AZURE_DEVOPS_REDIRECT_URI`

3. **Mettre à jour le modèle Mongoose** dans `backend/src/infrastructure/database/models/GitConnectionModel.ts` — ajouter `"azure_devops"` à l'enum `provider`

#### Phase 3 — Backend Application (*dépend de 2*)

4. **Mettre à jour `container.ts`** dans `backend/src/Application/plugins/container.ts` — ajouter un bloc conditionnel : si `AZURE_DEVOPS_CLIENT_ID` + `AZURE_DEVOPS_CLIENT_SECRET` présents → import dynamique `AzureDevOpsAdapter`, push dans `gitAdapters[]`

5. **Mettre à jour `git-connections.routes.ts`** dans `backend/src/Application/routes/git-connections/git-connections.routes.ts` :
   - `GET /oauth/config` : ajouter section `azure_devops` dans la réponse (authUrl = `https://app.vssps.visualstudio.com/oauth2/authorize?client_id=...&response_type=Assertion&scope=vso.code+vso.project&redirect_uri=...&state=...`)
   - Types `OAuthCallbackBody` et `ReposByProviderParams` : ajouter `"azure_devops"`

6. **Mettre à jour `git-connections.schemas.ts`** dans `backend/src/Application/routes/git-connections/git-connections.schemas.ts` — ajouter `"azure_devops"` dans toutes les enums `provider` + dans `oauthConfigSchema`

#### Phase 4 — Frontend (*dépend de 3, parallélisable entre fichiers*)

7. **`webapp/src/Api/types.ts`** : `GitProvider` → ajouter `"azure_devops"`, `OAuthConfig` → ajouter clé `azure_devops` (*parallèle avec 8-11*)

8. **`webapp/src/Api/client.ts`** : remplacer types inline `"github" | "gitlab"` par `GitProvider` (*parallèle*)

9. **`webapp/src/Pages/PageOAuthCallback.tsx`** : ajouter `"azure_devops"` à `VALID_PROVIDERS` (*parallèle*)

10. **`webapp/src/Components/GitOnboardingModal.tsx`** : ajouter bouton Azure DevOps (icône SVG logo Azure DevOps, couleur bleue `#0078d7`), conditionnel sur `oauthConfig.azure_devops.enabled` (*parallèle*)

11. **`webapp/src/Pages/PageSettings.tsx`** : ajouter `azure_devops` dans `PROVIDER_META` (label "Azure DevOps", `bg-blue-600 text-white`, icône SVG). Le reste de `SectionGitConnections` fonctionne déjà dynamiquement via `Object.entries(oauthConfig)` (*parallèle*)

#### Phase 5 — Documentation

12. Documenter les env vars dans `docs/development.md` et `backend/.env.example`
13. Mettre à jour `docs/project-state.md`

---

### Fichiers concernés

**À créer :**
- `backend/src/infrastructure/git/AzureDevOpsAdapter.ts` — nouvel adapter (~150 lignes), copier la structure de `GitHubAdapter`

**À modifier :**
- `backend/src/domain/gitconnection/GitConnection.ts` — union type `GitProvider`
- `backend/src/infrastructure/database/models/GitConnectionModel.ts` — enum Mongoose
- `backend/src/Application/plugins/container.ts` — chargement conditionnel adapter
- `backend/src/Application/routes/git-connections/git-connections.routes.ts` — `/oauth/config` + types
- `backend/src/Application/routes/git-connections/git-connections.schemas.ts` — enums JSON Schema
- `webapp/src/Api/types.ts` — `GitProvider`, `OAuthConfig`
- `webapp/src/Api/client.ts` — types inline
- `webapp/src/Pages/PageOAuthCallback.tsx` — `VALID_PROVIDERS`
- `webapp/src/Components/GitOnboardingModal.tsx` — bouton UI
- `webapp/src/Pages/PageSettings.tsx` — `PROVIDER_META`
- `docs/development.md`, `docs/project-state.md`

---

### Vérification

1. **Sans env vars** : démarrer l'app → `GET /oauth/config` retourne `azure_devops: { enabled: false, authUrl: "" }` → bouton grisé "non configuré" en frontend
2. **Avec env vars** : créer une Azure DevOps OAuth App dans `https://app.vssps.visualstudio.com/app/register` → configurer `AZURE_DEVOPS_CLIENT_ID` + `AZURE_DEVOPS_CLIENT_SECRET` → tester le flow OAuth complet (connect → consent → callback → connexion créée)
3. **Listing repos** : après connexion, appeler `GET /api/git-connections/{id}/repos` et vérifier que les repos de toutes les organisations sont retournés
4. **Non-régression** : vérifier que les connexions GitHub et GitLab fonctionnent toujours
5. **UI** : vérifier le bouton Azure DevOps dans le modal d'onboarding et dans Settings → Git

---

### Décisions

- **Nom du provider** : `"azure_devops"` (snake_case, cohérent avec le domaine CI/CD)
- **Flow OAuth** : API OAuth2 vssps (`app.vssps.visualstudio.com`), pas Microsoft Entra ID — c'est le standard Azure DevOps
- **Scope exclu** : pas de support Azure DevOps Server (self-hosted) dans cette V1, uniquement `dev.azure.com`

### Considérations

1. **Complexité du listing repos** : Azure DevOps nécessite d'itérer sur les organisations puis les repos de chaque org (N+1 appels), contrairement à GitHub/GitLab (1 endpoint paginé). C'est isolé dans l'adapter — le service et le frontend n'en voient rien.

2. **Expiration des tokens** : les access tokens Azure DevOps expirent (~1h). Pour cette V1, si le token expire l'utilisateur devra se reconnecter. Une V2 pourrait stocker le `refresh_token` et gérer le renouvellement automatique dans l'adapter (nécessiterait d'ajouter un champ `encryptedRefreshToken` à `GitConnection`).

3. **Format du token exchange** : Azure DevOps utilise `application/x-www-form-urlencoded` (pas JSON) et des noms de champs non-standard (`client_assertion`, `assertion` au lieu de `code`). L'adapter doit gérer cette spécificité.
