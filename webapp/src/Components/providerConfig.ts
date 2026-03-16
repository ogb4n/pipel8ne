/**
 * Provider Config Registry — design pattern "schema-driven form".
 *
 * Chaque provider déclare :
 *  - label          : nom affiché dans le select
 *  - description    : sous-titre contextuel affiché dans le form
 *  - docsUrl        : lien vers la doc officielle pour créer le token
 *  - labelSuggestion: valeur pré-remplie dans le champ "Libellé"
 *  - fields         : tableau de champs à afficher pour la valeur secrète.
 *                     Le premier field est toujours la valeur principale envoyée au backend.
 *                     Les suivants sont des champs d'aide (non envoyés).
 *  - valueLabel     : libellé du champ valeur secrète (remplace "Valeur secrète")
 *  - valuePlaceholder: placeholder du champ valeur secrète
 *  - valueHint      : aide contextuelle sous le champ valeur
 *  - validationPattern: regex optionnelle pour valider le format
 *  - validationHint : message affiché si le format ne correspond pas
 */

export interface ProviderConfig {
  label: string;
  description: string;
  docsUrl?: string;
  labelSuggestion: string;
  valueLabel: string;
  valuePlaceholder: string;
  valueHint: string;
  validationPattern?: RegExp;
  validationHint?: string;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  github: {
    label: "GitHub",
    description:
      "Personal Access Token (classic ou fine-grained) pour interagir avec l'API GitHub et vos repos.",
    docsUrl: "https://github.com/settings/tokens/new",
    labelSuggestion: "Mon token GitHub",
    valueLabel: "Personal Access Token",
    valuePlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    valueHint:
      "Générez un token sur github.com → Settings → Developer settings → Personal access tokens.",
    validationPattern: /^(ghp_|github_pat_)[A-Za-z0-9_]+$/,
    validationHint: "Le token doit commencer par ghp_ ou github_pat_",
  },
  gitlab: {
    label: "GitLab",
    description: "Personal Access Token ou Project Access Token GitLab.",
    docsUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    labelSuggestion: "Mon token GitLab",
    valueLabel: "Access Token",
    valuePlaceholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
    valueHint: "Générez un token sur gitlab.com → Preferences → Access Tokens.",
    validationPattern: /^glpat-[A-Za-z0-9_-]+$/,
    validationHint: "Le token doit commencer par glpat-",
  },
  dockerhub: {
    label: "Docker Hub",
    description:
      "Access Token Docker Hub pour pousser et tirer des images sans exposer votre mot de passe.",
    docsUrl: "https://hub.docker.com/settings/security",
    labelSuggestion: "Mon token Docker Hub",
    valueLabel: "Access Token",
    valuePlaceholder: "dckr_pat_xxxxxxxxxxxxxxxxxxxx",
    valueHint:
      "Créez un token sur hub.docker.com → Account Settings → Security → New Access Token.",
    validationPattern: /^dckr_pat_[A-Za-z0-9_-]+$/,
    validationHint: "Le token doit commencer par dckr_pat_",
  },
  aws: {
    label: "AWS",
    description:
      "Clé d'accès IAM (Access Key ID + Secret Access Key) pour interagir avec les services AWS.",
    docsUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
    labelSuggestion: "Clé AWS IAM",
    valueLabel: "Secret Access Key",
    valuePlaceholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    valueHint:
      "Renseignez ici la Secret Access Key. Stockez l'Access Key ID dans le libellé ou une variable d'env séparée.",
  },
  gcp: {
    label: "Google Cloud",
    description: "Clé de compte de service (JSON) ou token OAuth2 pour les APIs Google Cloud.",
    docsUrl: "https://console.cloud.google.com/iam-admin/serviceaccounts",
    labelSuggestion: "Compte de service GCP",
    valueLabel: "Service Account JSON / Token",
    valuePlaceholder: '{"type":"service_account","project_id":"..."}',
    valueHint:
      "Collez le contenu JSON du fichier de clé de compte de service téléchargé depuis la console GCP.",
  },
  azure: {
    label: "Azure",
    description: "Client Secret ou token d'accès pour les APIs Azure / Azure DevOps.",
    docsUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    labelSuggestion: "Client Secret Azure",
    valueLabel: "Client Secret / Token",
    valuePlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    valueHint: "Créez un App Registration dans Azure AD, puis générez un Client Secret.",
  },
  npm: {
    label: "npm",
    description:
      "Token d'authentification npm pour publier des packages ou accéder à des registres privés.",
    docsUrl: "https://www.npmjs.com/settings/~/tokens",
    labelSuggestion: "Mon token npm",
    valueLabel: "Access Token",
    valuePlaceholder: "npm_xxxxxxxxxxxxxxxxxxxx",
    valueHint: "Générez un token sur npmjs.com → Access Tokens → Generate New Token.",
    validationPattern: /^npm_[A-Za-z0-9]+$/,
    validationHint: "Le token doit commencer par npm_",
  },
  openai: {
    label: "OpenAI",
    description: "Clé API OpenAI pour utiliser GPT, DALL·E, Whisper et autres modèles.",
    docsUrl: "https://platform.openai.com/api-keys",
    labelSuggestion: "Clé API OpenAI",
    valueLabel: "API Key",
    valuePlaceholder: "sk-proj-xxxxxxxxxxxxxxxxxxxx",
    valueHint:
      "Créez une clé sur platform.openai.com → API Keys. Attention : elle n'est affichée qu'une seule fois.",
    validationPattern: /^sk-/,
    validationHint: "La clé API OpenAI doit commencer par sk-",
  },
  anthropic: {
    label: "Anthropic",
    description: "Clé API Anthropic pour utiliser Claude.",
    docsUrl: "https://console.anthropic.com/settings/keys",
    labelSuggestion: "Clé API Anthropic",
    valueLabel: "API Key",
    valuePlaceholder: "sk-ant-xxxxxxxxxxxxxxxxxxxx",
    valueHint: "Créez une clé sur console.anthropic.com → API Keys.",
    validationPattern: /^sk-ant-/,
    validationHint: "La clé Anthropic doit commencer par sk-ant-",
  },
  other: {
    label: "Autre",
    description: "Token ou clé d'accès générique pour une plateforme non listée.",
    labelSuggestion: "",
    valueLabel: "Valeur secrète",
    valuePlaceholder: "Votre token ou clé d'accès",
    valueHint: "Chiffrée avant stockage — jamais exposée en clair.",
  },
};

/** Ordre d'affichage dans le select */
export const PROVIDER_ORDER = [
  "github",
  "gitlab",
  "dockerhub",
  "aws",
  "gcp",
  "azure",
  "npm",
  "openai",
  "anthropic",
  "other",
];
