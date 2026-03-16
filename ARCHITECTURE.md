# Architecture & Règles de développement — pipel8ne backend

> Ce document fait référence. Toute feature backend doit respecter les règles décrites ici.

---

## 1. Vue d'ensemble — Architecture hexagonale (Ports & Adapters)

Le backend est structuré en **trois couches strictement séparées** :

```
src/
├── Domain/          ← Cœur métier pur (aucune dépendance externe)
├── Infrastructure/  ← Implémentations concrètes (Mongoose, JWT, crypto…)
└── Application/     ← Adaptateur HTTP (Fastify : routes, plugins, schémas)
```

### Principe fondamental

> **Le Domain ne connaît pas l'Infrastructure. L'Infrastructure ne connaît pas l'Application.**

Le flux de dépendances va toujours vers l'intérieur :

```
Application → Domain ← Infrastructure
```

- L'**Application** consomme les services du Domain.
- L'**Infrastructure** implémente les ports (interfaces) définis par le Domain.
- Le **Domain** ne contient aucun `import` de Fastify, Mongoose, JWT, etc.

---

## 2. Couche Domain

### Rôle

Contient toute la logique métier. Doit pouvoir tourner sans base de données ni framework HTTP.

### Structure par feature

```
Domain/
└── <feature>/
    ├── <Entity>.ts           ← Interface TypeScript pure (entité)
    ├── I<Entity>Repository.ts ← Port sortant (contrat du repository)
    ├── <Entity>Service.ts    ← Service domaine (logique métier)
    └── [Optionnel] <SubEntity>.ts, errors spécifiques, etc.
```

### Entités

- Définies comme des **interfaces TypeScript**, jamais comme des classes décorées ORM.
- Le champ `id` est toujours un `string` (ObjectId MongoDB sérialisé).
- Les dates sont typées `Date`, pas `string`.

```typescript
// ✅ Correct
export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Ports (interfaces de repository)

- Préfixés par `I` : `IUserRepository`, `IProjectRepository`…
- Définis dans le Domain, jamais dans l'Infrastructure.
- Les méthodes manipulent uniquement des types domaine.

```typescript
// ✅ Correct
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name?: string; passwordHash: string }): Promise<User>;
  updateById(id: string, data: Partial<Pick<User, "name" | "passwordHash">>): Promise<User | null>;
  delete(id: string): Promise<void>;
}
```

### Services domaine

- Injectés avec leurs dépendances via le **constructeur** (injection de dépendances manuelle).
- Ne dépendent que de ports (interfaces), jamais d'implémentations concrètes.
- Encapsulent la logique métier et lèvent des **erreurs domaine typées**.

```typescript
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getById(id: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findById(id);
    return user ? toPublicUser(user) : null;
  }
}
```

### Erreurs domaine

- Définies dans `Domain/errors.ts` (erreurs génériques) ou dans le fichier du service (erreurs spécifiques).
- Étendent `Error` avec un champ `readonly type` ou `readonly code` pour le typage.
- **Jamais de code HTTP dans le Domain.**

```typescript
// Domain/errors.ts
export class NotFoundError extends Error {
  readonly type = "NotFoundError" as const;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  readonly type = "ForbiddenError" as const;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Domain/auth/AuthService.ts — erreur spécifique avec code
export class AuthError extends Error {
  constructor(
    public readonly code: "EMAIL_IN_USE" | "INVALID_CREDENTIALS",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
```

---

## 3. Couche Infrastructure

### Rôle

Implémente les ports du Domain. Contient tout ce qui est technique : Mongoose, JWT, chiffrement, etc.

### Structure

```
Infrastructure/
├── database/
│   ├── client.ts                    ← Connexion/déconnexion MongoDB
│   ├── models/
│   │   └── <Entity>Model.ts         ← Schéma Mongoose + interface document
│   └── repositories/
│       └── <Entity>Repository.ts    ← Implémentation du port I<Entity>Repository
├── JwtTokenService.ts               ← Implémentation de ITokenService
└── SecretsService.ts                ← Chiffrement AES-256-GCM
```

### Modèles Mongoose

- Définis avec `mongoose.Schema` et une interface `IXxxDocument extends Document`.
- Rôle uniquement : structure de la collection MongoDB.
- **Aucune logique métier** dans les modèles.

### Repositories

- Implémentent le port correspondant du Domain : `class UserRepository implements IUserRepository`.
- Contiennent un mapper privé `toXxx(doc)` qui convertit le document Mongoose en type Domain.
- La plomberie MongoDB (`.lean()`, `.findByIdAndUpdate()`, etc.) est **confinée ici**.

```typescript
export class UserRepository implements IUserRepository {
  // Mapper privé : document Mongoose → type Domain
  private toUser(doc: InstanceType<typeof UserModel>): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name ?? null,
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    return doc ? this.toUser(doc) : null;
  }
  // ...
}
```

### Services infrastructure

- Implémentent des ports définis dans le Domain (ex : `ITokenService`).
- Exemple : `JwtTokenService` implémente `ITokenService` via `@fastify/jwt`.
- La feature de chiffrement (`SecretsService`) est aussi confinée ici.

---

## 4. Couche Application

### Rôle

Adaptateur HTTP. Câble les services du Domain aux endpoints Fastify. Ne contient **aucune logique métier**.

### Structure

```
Application/
├── plugins/
│   ├── container.ts   ← Conteneur DI : instancie et câble toutes les dépendances
│   ├── jwt.ts         ← Plugin JWT + décorateur app.authenticate
│   ├── swagger.ts     ← Documentation OpenAPI (dev only)
│   └── static.ts      ← Fichiers statiques + SPA fallback
└── routes/
    ├── index.ts       ← Enregistrement centralisé de toutes les routes
    └── <feature>/
        ├── <feature>.routes.ts   ← Handlers HTTP
        └── <feature>.schemas.ts  ← JSON Schemas (validation + Swagger)
```

### Conteneur DI (`container.ts`)

- **Unique point** où l'on instancie les repositories et services concrets.
- Utilise `fastify-plugin` (`fp`) pour que les décorateurs soient visibles dans tout le scope.
- Expose les services via `app.decorate("xxxService", ...)`.
- Déclare les types dans `declare module "fastify" { interface FastifyInstance { ... } }`.

```typescript
export default fp(async function containerPlugin(app: FastifyInstance) {
  // Infrastructure
  const userRepository = new UserRepository();
  const tokenService = new JwtTokenService(app.jwt);

  // Domain services (injectés avec les ports concrets)
  const userService = new UserService(userRepository);
  const authService = new AuthService(userService, tokenService, refreshTokenRepository);

  // Exposition sur l'instance Fastify
  app.decorate("userService", userService);
  app.decorate("authService", authService);
});
```

### Handlers de routes

- Consomment uniquement `app.<feature>Service` — ils ne connaissent pas les repositories.
- Traduisent les erreurs domaine en codes HTTP appropriés via `instanceof`.
- Ne contiennent **aucune logique métier** : la validation est déléguée aux schémas JSON, les règles au service.

```typescript
// ✅ Correct : handler fin, délègue au service, traduit les erreurs en HTTP
app.post("/api/auth/login", { schema: { ... } }, async (request, reply) => {
  try {
    const result = await app.authService.login(request.body.email, request.body.password);
    return reply.status(200).send(result);
  } catch (err) {
    if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
      return reply.status(401).send({ message: err.message });
    }
    throw err; // Fastify handle les erreurs inattendues
  }
});
```

### Schémas JSON (`<feature>.schemas.ts`)

- Chaque module de route a son propre fichier de schémas.
- Les schémas servent à la fois à la **validation automatique** (Fastify ajv) et à la **documentation Swagger**.
- Toujours définir `body`, `response` (avec les codes pertinents), et `params`/`querystring` si nécessaire.
- Utiliser `additionalProperties: false` sur les bodies pour rejeter les champs inconnus.

---

## 5. Ordre de démarrage (`index.ts`)

L'ordre d'enregistrement des plugins est strict :

```
1. connectDatabase()       ← MongoDB avant tout
2. swaggerPlugin           ← Avant les routes (collecte les schémas)
3. jwtPlugin               ← Avant les routes (app.authenticate doit exister)
4. containerPlugin         ← Avant les routes (app.<service> doit exister)
5. registerRoutes(app)     ← Routes
6. staticPlugin            ← En dernier (SPA fallback catchall)
```

---

## 6. Conventions de nommage

| Élément                     | Convention               | Exemple                         |
| --------------------------- | ------------------------ | ------------------------------- |
| Entité Domain               | `PascalCase.ts`          | `User.ts`, `Project.ts`         |
| Port (interface repository) | `I<Name>Repository.ts`   | `IUserRepository.ts`            |
| Port (autre interface)      | `I<Name>.ts`             | `ITokenService.ts`              |
| Service domaine             | `<Name>Service.ts`       | `UserService.ts`                |
| Repository (infra)          | `<Name>Repository.ts`    | `UserRepository.ts`             |
| Modèle Mongoose             | `<Name>Model.ts`         | `UserModel.ts`                  |
| Routes                      | `<feature>.routes.ts`    | `auth.routes.ts`                |
| Schémas                     | `<feature>.schemas.ts`   | `auth.schemas.ts`               |
| Dossiers Domain             | `lowercase/`             | `domain/user/`, `domain/graph/` |
| Classes                     | `PascalCase`             | `class AuthService`             |
| Interfaces                  | `PascalCase` (préfixe I) | `interface IUserRepository`     |

---

## 7. Démarche pour implémenter une nouvelle feature

Toujours suivre cet ordre : **Domain → Infrastructure → Application**.

### Étape 1 — Domain : entité + port

1. Créer `Domain/<feature>/<Entity>.ts` : interface TypeScript pure de l'entité.
2. Créer `Domain/<feature>/I<Entity>Repository.ts` : port avec les méthodes nécessaires.
3. Si des erreurs métier spécifiques sont nécessaires, les définir dans `Domain/errors.ts` ou dans le service.

### Étape 2 — Domain : service

4. Créer `Domain/<feature>/<Entity>Service.ts` : logique métier, injecté avec le port.
   - Constructeur avec les dépendances en `private readonly`.
   - Méthodes qui délèguent au repository et encapsulent les règles métier.

### Étape 3 — Infrastructure : modèle Mongoose

5. Créer `Infrastructure/database/models/<Entity>Model.ts` :
   - Interface `IXxxDocument extends Document`
   - Schéma Mongoose avec les bons types
   - Export du modèle

### Étape 4 — Infrastructure : repository

6. Créer `Infrastructure/database/repositories/<Entity>Repository.ts` :
   - `class <Entity>Repository implements I<Entity>Repository`
   - Mapper privé `to<Entity>(doc)` : Mongoose → type Domain
   - Implémentation de chaque méthode du port

### Étape 5 — Application : câblage DI

7. Dans `Application/plugins/container.ts` :
   - Instancier le repository et le service
   - Ajouter les types dans `declare module "fastify" { interface FastifyInstance { ... } }`
   - Exposer via `app.decorate("<feature>Service", ...)`

### Étape 6 — Application : schémas

8. Créer `Application/routes/<feature>/<feature>.schemas.ts` :
   - JSON Schemas pour les bodies, params, querystrings, responses
   - `additionalProperties: false` sur les bodies

### Étape 7 — Application : routes

9. Créer `Application/routes/<feature>/<feature>.routes.ts` :
   - Fonction `export default async function <feature>Routes(app: FastifyInstance)`
   - Handlers fins : validation → service → traduction des erreurs domaine en HTTP

10. Enregistrer dans `Application/routes/index.ts` :

```typescript
await app.register(featureRoutes);
```

---

## 8. Règles absolues

| Règle                                                                               | Raison                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Le Domain n'importe jamais Fastify, Mongoose, argon2 ou une implémentation concrète | Préserver l'isolement du cœur métier                   |
| Les handlers HTTP ne contiennent jamais de logique métier                           | Séparation des responsabilités                         |
| Les erreurs domaine ne contiennent jamais de code HTTP                              | Le Domain ignore qui le consomme                       |
| Chaque repository a un mapper `toXxx()` privé                                       | Éviter les fuites de types Mongoose vers le Domain     |
| `additionalProperties: false` sur tous les JSON Schema de body                      | Sécurité contre l'injection de champs inattendus       |
| Les services sont injectés via le constructeur, jamais instanciés dans les routes   | Testabilité, inversion de dépendances                  |
| Un nouveau service est toujours exposé via `app.decorate()` dans `container.ts`     | Point d'entrée unique pour la DI                       |
| Les imports dans le Domain utilisent des extensions `.js` (ESM natif)               | Compatible avec `"type": "module"` dans `package.json` |

---

## 9. Exemple complet : ajouter la feature "Pipeline"

```
// 1. Domain
Domain/pipeline/Pipeline.ts              ← interface Pipeline { id, name, projectId, ... }
Domain/pipeline/IPipelineRepository.ts  ← interface IPipelineRepository { ... }
Domain/pipeline/PipelineService.ts      ← class PipelineService { constructor(repo) }

// 2. Infrastructure
Infrastructure/database/models/PipelineModel.ts         ← Schéma Mongoose
Infrastructure/database/repositories/PipelineRepository.ts ← implements IPipelineRepository

// 3. Application
Application/plugins/container.ts                 ← instancier + app.decorate("pipelineService")
Application/routes/pipelines/pipeline.schemas.ts ← JSON Schemas
Application/routes/pipelines/pipeline.routes.ts  ← handlers HTTP
Application/routes/index.ts                      ← enregistrement
```
