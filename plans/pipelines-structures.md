# CI Pipeline Structure — Reference Documentation

## Hierarchy Overview

| Concept        | GitLab CI                     | GitHub Actions                    | Azure DevOps                        |
| -------------- | ----------------------------- | --------------------------------- | ----------------------------------- |
| Config file    | `.gitlab-ci.yml`              | `.github/workflows/*.yml`         | `azure-pipelines.yml`               |
| Hierarchy      | `stages` → `jobs`             | `jobs` → `steps`                  | `stages` → `jobs` → `steps`         |
| Runner/Agent   | `tags:`                       | `runs-on:`                        | `pool: vmImage` / self-hosted agent |
| Trigger        | `rules:` / `only:`            | `on: push/pull_request/...`       | `trigger: branches`                 |
| Variables      | `variables:` (global/job)     | `env:` (global/job/step)          | `variables:` (global/stage/job)     |
| Artifacts      | `artifacts: paths:`           | `actions/upload-artifact`         | `PublishBuildArtifacts@1`           |
| Job dependency | `needs:`                      | `needs:`                          | `dependsOn:`                        |
| Conditions     | `rules:` / `when:`            | `if:`                             | `condition:`                        |
| Parallelism    | `parallel:`                   | `strategy.matrix`                 | `matrix:`                           |
| Reusability    | `include:` / `extends:`       | `uses:` (reusable workflows)      | `template:`                         |
| Environments   | `environment:` + manual gates | `environment:` + protection rules | `environment:` + deployment gates   |

---

## GitLab CI

### Structure

```yaml
stages:
  - build
  - test
  - deploy

variables:
  IMAGE: registry.example.com/app

build:
  stage: build
  tags: [docker]
  image: docker:latest
  script:
    - docker build -t $IMAGE .
  artifacts:
    paths:
      - dist/
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'

test:
  stage: test
  needs: [build]
  script:
    - run tests

deploy:
  stage: deploy
  environment:
    name: production
  when: manual
  script:
    - kubectl apply -f k8s/
```

### Key concepts

- `stages:` définis globalement en haut du fichier
- Chaque job déclare son `stage:`
- `needs:` permet le DAG (parallélisation fine sans respecter l'ordre des stages)
- `rules:` remplace `only:/except:` (recommandé)
- `include:` pour importer des templates externes ou depuis un projet référence
- `extends:` pour hériter d'un job template défini dans le même fichier
- Runners auto-hébergés identifiés via `tags:`
- Support natif des **parent-child pipelines** et **merge trains**

---

## GitHub Actions

### Structure

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

env:
  IMAGE: ghcr.io/org/app

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t $IMAGE .
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: run tests

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: kubectl apply -f k8s/
```

### Key concepts

- Pas de `stages` : la hiérarchie est `jobs` → `steps`
- L'ordonnancement se fait exclusivement via `needs:`
- `on:` supporte de nombreux événements : `push`, `pull_request`, `schedule`, `workflow_dispatch`, `workflow_call`
- Réutilisabilité via **reusable workflows** (`workflow_call`) ou **composite actions**
- Self-hosted runners déclarés via `runs-on: [self-hosted, linux]`
- Secrets via `${{ secrets.NAME }}`, variables via `${{ vars.NAME }}`
- Marketplace GitHub pour les actions tierces (`uses: org/action@v1`)

---

## Azure DevOps

### Structure

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

variables:
  IMAGE: myregistry.azurecr.io/app

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: Docker@2
            inputs:
              command: build
              repository: $(IMAGE)

  - stage: Test
    dependsOn: Build
    jobs:
      - job: TestJob
        steps:
          - script: run tests

  - stage: Deploy
    dependsOn: Test
    condition: succeeded()
    jobs:
      - deployment: DeployProd
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: kubectl apply -f k8s/
```

### Key concepts

- Hiérarchie stricte : `stages` → `jobs` → `steps`
- `task:` = brique Microsoft versionnée (ex. `Docker@2`, `KubernetesManifest@1`)
- `dependsOn:` pour les dépendances de stages/jobs
- `condition:` pour les conditions d'exécution (`succeeded()`, `failed()`, `always()`)
- `deployment` job (vs `job`) pour les déploiements avec stratégie (`runOnce`, `rolling`, `canary`)
- Templates YAML réutilisables via `template:` (fichiers locaux ou depuis un autre repo)
- Variable groups depuis Azure Key Vault ou la bibliothèque
- Approbations manuelles configurables au niveau `environment`

---

## Cross-platform Cheat Sheet

| Besoin                      | GitLab CI                  | GitHub Actions             | Azure DevOps               |
| --------------------------- | -------------------------- | -------------------------- | -------------------------- |
| Déclencher manuellement     | `when: manual`             | `workflow_dispatch`        | Manual trigger / Gate      |
| Job conditionnel            | `rules: - if:`             | `if: ${{ condition }}`     | `condition: eq(...)`       |
| Secret                      | CI/CD Variables (masked)   | `secrets.NAME`             | Variable group / Key Vault |
| Image Docker custom         | `image:`                   | `container:`               | `container:`               |
| Cache                       | `cache: paths:`            | `actions/cache`            | `Cache@2` task             |
| Self-hosted runner          | GitLab Runner + `tags:`    | `runs-on: [self-hosted]`   | Self-hosted agent pool     |
| Multi-arch / Matrix         | `parallel: matrix:`        | `strategy.matrix`          | `matrix:`                  |
| Deploy vers Kubernetes      | `kubectl` + `environment:` | `kubectl` / Helm action    | `KubernetesManifest@1`     |
| Réutiliser du code pipeline | `include:` + `extends:`    | Reusable workflow / Action | `template:`                |
