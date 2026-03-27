# Pipeline concepts

## Data model

A pipeline is organized in three nested levels:

```
Pipeline (Graph)
└── Stage[]
    └── Job[]
        └── Step[] (GraphNode)
```

### Pipeline (Graph)

Top-level entity. Belongs to a project.

| Field        | Type              | Description                                 |
|---|---|---|
| `id`         | string            | Unique identifier                           |
| `projectId`  | string            | Parent project                              |
| `name`       | string            | Display name                                |
| `status`     | `draft` \| `active` | Pipeline status                           |
| `trigger`    | TriggerNodeParams | Pipeline-level trigger configuration (optional in draft) |
| `stages`     | Stage[]           | Ordered list of stages                      |
| `stageEdges` | GraphEdge[]       | Dependency edges between stages             |
| `viewport`   | Viewport          | Last saved canvas position/zoom             |

#### Trigger

The trigger defines when the pipeline runs. It is configured at the pipeline level (not as a step).

| Field         | Type       | Description                                          |
|---|---|---|
| `triggerType` | TriggerType | `push`, `pull_request`, `schedule`, `manual`, `tag` |
| `branches`    | string[]   | Branch patterns (for push/pull_request triggers)     |
| `schedule`    | string     | Cron expression (for schedule triggers)              |
| `tags`        | string[]   | Tag patterns (for tag triggers)                      |

A trigger is required when activating a pipeline (`status: "active"`). Draft pipelines may omit it.

### Stage

A stage groups parallel jobs. Stages are connected by edges that define execution order.

| Field       | Type       | Description                                        |
|---|---|---|
| `id`        | string     |                                                    |
| `name`      | string     |                                                    |
| `jobs`      | Job[]      | Jobs in this stage (run in parallel by default)    |
| `jobEdges`  | GraphEdge[]| Dependencies between jobs within the stage         |
| `position`  | `{x, y}`   | Canvas position                                    |

**Stage edges** define execution order only — there are no execution conditions between stages.

### Job

A job runs on a specific runner. It contains an ordered sequence of steps.

| Field        | Type        | Description                          |
|---|---|---|
| `id`         | string      |                                      |
| `name`       | string      |                                      |
| `runsOn`     | string      | Runner label (e.g. `ubuntu-latest`)  |
| `steps`      | GraphNode[] | Steps executed in array order        |
| `position`   | `{x, y}`    | Canvas position in stage view        |

### Step (GraphNode)

The smallest unit of work. Each step has a type that determines its configuration.

| Field       | Type     | Description                                      |
|---|---|---|
| `id`        | string   |                                                  |
| `type`      | NodeType | See step types below                             |
| `positionX` | number   | Canvas X position in job view                    |
| `positionY` | number   | Canvas Y position in job view                    |
| `data`      | NodeData | Label, description, params, env, secrets         |

---

## Step types

| Type            | Description                                               |
|---|---|
| `shell_command` | Run a shell script (bash, sh, zsh, powershell, cmd)       |
| `docker`        | Docker operations (build, run, push, pull, compose)       |
| `git`           | Git operations (clone, checkout, pull, fetch, tag, push)  |
| `test`          | Run tests (jest, vitest, pytest, go_test, cargo_test…)    |
| `build`         | Build artifacts (npm, yarn, maven, gradle, cargo, go…)    |
| `deploy`        | Deploy to a target (kubernetes, aws_ecs, aws_lambda, ssh…)|
| `notification`  | Send a notification (slack, teams, email, discord…)       |

Each step type has its own typed params, validated both in the frontend config panel and by the backend.

---

## Canvas navigation

The graph editor has three levels. Navigating between levels is done by clicking into a node:

```
Pipeline view  →  double-click a Stage card  →  Stage view
Stage view     →  double-click a Job card    →  Job view
```

Going back uses the breadcrumb at the top of the editor. At each level, the canvas state is snapshotted so returning is instant and changes are preserved.

---

## YAML export

A pipeline can be exported as a CI/CD configuration file. The export performs a topological sort of stages based on their dependency edges, then generates a format-specific structure. The pipeline-level trigger is used to populate the CI provider's trigger/on configuration.

| Format           | Output file              |
|---|---|
| GitHub Actions   | `pipeline.yml`           |
| GitLab CI        | `.gitlab-ci.yml`         |
| Azure DevOps     | `azure-pipelines.yml`    |

The export is a client-side operation — no server call is made. It reads the current canvas state and downloads the file directly.
