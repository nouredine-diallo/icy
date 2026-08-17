# JARVIS — Mode Atelier
## Plan de construction A→Z, loop graph et prompts

Version 1.0 — Document de référence de construction.

---

## 0. Les cinq principes non négociables

Tout le reste découle de ces cinq règles. Quand tu hésiteras sur une décision technique, reviens ici.

**P1 — Le LLM ne pilote jamais la boucle.**
La boucle est une machine à états déterministe écrite en code. Elle décide quand appeler un modèle, avec quel contexte, et ce qu'elle fait de la réponse. Le modèle est un *nœud*, jamais le chef d'orchestre. C'est ce qui empêche « le LLM ne sait plus quoi faire » : il n'a jamais eu à le savoir.

**P2 — Aucun appel n'a d'historique de conversation.**
Chaque appel est reconstruit à partir de l'état de la mission, jamais par accumulation de messages. Conséquence directe : le temps de réponse à l'étape 40 est identique à celui de l'étape 1. C'est la réponse structurelle à « que ça ne mette pas plus de temps à répondre ».

**P3 — Le contexte a un budget fixe.**
La personnalisation est illimitée *en stockage*, plafonnée *en injection*. Voir §2. Un contexte qui gonfle est la cause n°1 d'un modèle qui divague.

**P4 — Une étape n'est terminée que si une machine l'a prouvé.**
Build vert, tests verts, commit présent sur le remote, preview qui répond 200. Jamais parce qu'un modèle écrit « c'est fait ».

**P5 — Toute autonomie est révocable.**
Un bouton STOP qui coupe tout, un niveau d'autonomie par classe d'action, et aucun secret jamais visible par un modèle. La différence entre JARVIS et Ultron n'est pas la puissance : c'est l'existence d'un chemin de révocation que le système ne contrôle pas lui-même.

---

## 1. Modèle de données

Trois objets. Tout tient dedans.

### 1.1 Mission
```
mission_id
objectif           (texte brut de l'utilisateur)
projet_id
architecture       (proposée puis validée)
plan[]             (liste d'étapes, versionnée)
statut             DRAFT | VALIDATED | RUNNING | PAUSED | CLOSED
créée_le, maj_le
```

### 1.2 Étape
```
step_id, mission_id, index
titre
intention          (une phrase : ce que ça doit produire)
critères[]         (conditions vérifiables, écrites AVANT le code)
portée[]           (chemins de fichiers autorisés)
statut             PENDING | RUNNING | GREEN | BLOCKED | NEEDS_INPUT | ABORTED
branche, pr_url, preview_url
tentatives[]       (fingerprint, action, résultat)
budget             {tokens_max, minutes_max, tentatives_max}
preuves{}          (build, tests, diff, screenshots, commit sha)
```

Les `critères` sont le cœur du système. Ils sont écrits pendant la négociation du plan, **avant** toute génération. Une étape sans critère vérifiable est refusée par le système.

### 1.3 Mémoire typée
Cinq types, jamais mélangés. Chaque entrée est corrigeable et supprimable depuis l'interface.

| Type | Exemple | Confiance | Périme ? |
|---|---|---|---|
| `FAIT` | « le projet utilise Tailwind v4 » | vérifiable dans le repo | oui, revérifié à chaque mission |
| `PRÉFÉRENCE` | « préfère les composants serveur par défaut » | comptage d'observations | s'affaiblit sans confirmation |
| `DÉCISION` | « pas de Prisma, SQL brut — 2026-08 » | explicite, datée | non, mais peut être annulée |
| `RÈGLE` | « jamais de secret côté client » | absolue | non |
| `HYPOTHÈSE` | « semble vouloir du dark-first » | faible | expire après 30 j sans preuve |

```
memory_id, type, portée (global | projet_id), contenu,
confiance (0-1), preuves[] (mission_ids), créée_le, confirmée_le, expire_le
```

**Règle d'écriture :** rien n'entre en mémoire pendant une mission. L'extraction se fait après clôture, par un nœud dédié (§4.7), et une observation unique n'entre jamais en `RÈGLE` — au mieux en `HYPOTHÈSE`.

---

## 2. Le Contrat de Contexte

C'est la pièce qui répond à « personnalisation illimitée sans que le LLM soit perdu ».

### 2.1 L'idée
Tu peux stocker dix mille préférences. Le modèle n'en verra jamais plus de huit. La sélection est faite par le code, pas par le modèle.

### 2.2 Budget par appel de codage (cible : 24 000 tokens, plafond dur 32 000)

| Slot | Plafond | Contenu | Si dépassement |
|---|---|---|---|
| `IDENTITY` | 400 | rôle + format de sortie | jamais dépassé (statique) |
| `CONTRACT` | 700 | intention + critères + portée de l'étape | l'étape est trop grosse → re-découper |
| `PROJECT_CARD` | 900 | stack, conventions, arborescence clé | tronqué par ancienneté |
| `MEMORY` | 1 200 | max 8 entrées, triées par pertinence×confiance | on garde le top 8 |
| `REPO_MAP` | 1 800 | signatures + exports, pas le code | carte compressée |
| `FILES` | 12 000 | max 6 fichiers, choisis par le nœud SELECT | **on re-scope, on ne tronque jamais** |
| `LAST_FAILURE` | 2 500 | 1 seul échec, le plus récent, dédupliqué | on garde la queue de la stack |
| `OUTPUT_SCHEMA` | 500 | JSON schema attendu | jamais dépassé |

### 2.3 Règles anti-dérive
1. **Jamais de `messages[]` qui grandit.** Chaque appel est `[system, user]`, point.
2. **Un seul artefact par appel.** Un appel produit soit un plan, soit un diff, soit un diagnostic. Jamais deux.
3. **Les échecs sont dédupliqués par empreinte.** On n'envoie pas trois fois la même erreur ; on envoie la dernière + « vu 3× ».
4. **Si `FILES` dépasse le plafond, on ne tronque pas : on découpe l'étape.** Tronquer produit du code qui casse ce qu'il ne voit pas.
5. **Aucun secret n'entre dans un slot.** Le worker a les secrets, le modèle jamais.

### 2.4 La personnalisation qui ne coûte aucun token
Le meilleur endroit pour encoder tes préférences n'est pas le prompt, c'est la chaîne d'outils. Chaque préférence encodable en config est une préférence qui devient **déterministe, gratuite et impossible à oublier** :

- Style de code → `eslint` + `prettier` + `tsconfig` strict
- Conventions de composants → dossier `templates/` que le générateur copie
- Structure de projet → un scaffold `create-jarvis-app` à toi
- Nommage, commits → hooks + commitlint
- Palette, tokens de design → `theme.css` versionné

Ne réserve les tokens de mémoire qu'à ce qui **ne peut pas** être encodé : tes arbitrages, tes refus passés, tes raisons.

---

## 3. Le Loop Graph

### 3.1 États

```
                      ┌──────────┐
                      │  PENDING │
                      └────┬─────┘
                           │ tu déclenches
                      ┌────▼─────┐
                      │  SELECT  │  choisir les fichiers + rappeler la mémoire
                      └────┬─────┘
                           │
                      ┌────▼─────┐
                      │   EDIT   │  produire un diff (nœud LLM)
                      └────┬─────┘
                           │
                      ┌────▼─────┐
                      │  APPLY   │  appliquer, commit sur branche (déterministe)
                      └────┬─────┘
                           │
                  ┌────────▼────────┐
                  │     VERIFY      │  build ∥ lint ∥ types ∥ tests  (parallèle)
                  └────┬───────┬────┘
                  vert │       │ rouge
                       │       │
              ┌────────▼──┐  ┌─▼──────────┐
              │   PROVE   │  │  DIAGNOSE  │  classifier l'échec (nœud LLM)
              │ preview,  │  └─┬────────┬─┘
              │ captures  │    │        │
              └────┬──────┘    │        │
                   │      RETRY│        │RESCOPE / ASK / ABORT
              ┌────▼────┐      │        │
              │  GREEN  │      └──►EDIT │
              └────┬────┘               │
                   │              ┌─────▼──────┐
              tu valides           │  BLOCKED   │
                   │              │ NEEDS_INPUT│
              ┌────▼────┐         │  ABORTED   │
              │  MERGED │         └────────────┘
              └─────────┘
```

### 3.2 Conditions de sortie (obligatoires, toutes vérifiées à chaque tour)

```
SORTIR EN GREEN   si   tous les critères de l'étape sont satisfaits
                       ET commit présent sur le remote
                       ET preview répond 200 (si étape UI)

SORTIR EN BLOCKED si   tentatives_total   >= 4
                  OU   minutes_écoulées   >= budget (défaut 25)
                  OU   tokens_consommés   >= budget (défaut 120 000)
                  OU   même empreinte d'échec vue 2 fois
                  OU   le diff proposé sort de la portée déclarée

SORTIR EN NEEDS_INPUT si le diagnostic renvoie need_user_input
                       (identifiant manquant, choix produit, secret absent)
```

**La règle qui empêche les boucles infinies :** on ne retente jamais deux fois la même empreinte d'échec avec la même stratégie. L'empreinte est un hash de `(type d'erreur normalisé + fichier + message sans numéros de ligne)`. Même empreinte = escalade obligatoire, pas nouvelle tentative.

### 3.3 Échelle d'escalade

| Tentative | Stratégie | Modèle | Contexte ajouté |
|---|---|---|---|
| 1 | correction directe | rapide | dernier échec |
| 2 | correction guidée | fort | + fichier de test + fichiers voisins |
| 3 | re-scope | fort | revert au dernier vert, l'étape est coupée en 2 sous-étapes |
| 4 | abandon propre | — | `BLOCKED` + rapport à 3 hypothèses, branche conservée |

Un `BLOCKED` n'est pas un échec du système : c'est le système qui fait son travail. Le mode de panne à éviter absolument est un `GREEN` mensonger.

### 3.4 Budgets par défaut (à calibrer avec tes mesures)

```
étape UI simple      : 15 min,  60k tokens,  3 tentatives
étape backend/API    : 25 min, 120k tokens,  4 tentatives
étape migration/infra: 20 min,  80k tokens,  2 tentatives  (risque élevé)
étape recherche      : 10 min,  40k tokens,  2 tentatives
```

---

## 4. Les prompts

Écrits en anglais : plus stable sur les modèles ouverts, plus dense en tokens, et cohérent avec ton code. Chaque nœud renvoie du **JSON strict** — c'est ce qui permet à la boucle de décider sans interpréter du texte libre.

Convention : `{{SLOT}}` = injecté par le contrat de contexte.

---

### 4.1 IDENTITY (préfixe commun, ~350 tokens, jamais modifié en cours de mission)

```
You are the execution engine of a personal build system. You are one node in a
deterministic state machine. You do not manage the loop, decide what happens next,
or judge whether the overall task is finished. You perform exactly one operation
and return JSON matching the given schema.

Hard rules:
- Output valid JSON only. No prose, no markdown fences, no explanation outside the schema.
- Never invent file paths, APIs, package names, or config keys. If you need something
  you were not given, declare it in `missing` and stop.
- Never touch files outside `scope`.
- Never write, read, or reference secrets, tokens, or credentials.
- If the task as specified cannot be done within scope, say so in `blocked_reason`
  rather than producing a partial or speculative result.
- Uncertainty is reported, never smoothed over.
```

---

### 4.2 ARCHITECT — proposer architecture + plan

Appelé une fois par mission. C'est le seul nœud qui a le droit d'être long.

```
{{IDENTITY}}

TASK: Propose an architecture and a step-by-step build plan.

USER GOAL:
{{OBJECTIVE}}

KNOWN CONTEXT ABOUT THIS DEVELOPER (facts, decisions and rules only —
preferences are advisory, rules are binding):
{{MEMORY}}

CONSTRAINTS (binding):
- Zero paid services. Free tiers only.
- Deployment target and datastore are already fixed by the user; do not re-litigate.
- Every step must be completable in under 30 minutes of machine work.
- Every step must be independently verifiable by a command that exits 0 or non-zero.

Produce a plan where each step:
- changes at most 6 files
- has at least one automated acceptance check
- does not depend on a later step
- is ordered so the app is runnable (even if incomplete) after every step

Return JSON:
{
  "architecture": {
    "summary": "3 sentences max",
    "stack": [{"layer": "", "choice": "", "why": "", "alternative_rejected": ""}],
    "risks": [{"risk": "", "mitigation": ""}],
    "manual_setup_required": [{"what": "", "where": "", "why_human": ""}]
  },
  "plan": [
    {
      "index": 1,
      "title": "",
      "intent": "one sentence: what exists after this step that did not before",
      "scope": ["path/glob"],
      "acceptance": [
        {"check": "human-readable criterion", "command": "shell command", "expect": "exit 0"}
      ],
      "estimated_files": 3,
      "risk": "low|medium|high"
    }
  ],
  "open_questions": ["questions that would change the plan if answered differently"],
  "missing": []
}
```

**Note UX :** `open_questions` s'affiche en haut de l'écran Plan. C'est ce qui donne la sensation « il a réfléchi avant de foncer ».

---

### 4.3 SELECT — choisir les fichiers (peut être déterministe au début)

```
{{IDENTITY}}

TASK: Select the minimum set of files needed to implement this step.

STEP CONTRACT:
{{CONTRACT}}

REPOSITORY MAP (paths, exports, signatures — not full source):
{{REPO_MAP}}

Rules:
- Maximum 6 files. Fewer is better.
- Include a file only if it will be read or modified. Do not include files "for context".
- If more than 6 files are genuinely required, do not select: return needs_split=true.

Return JSON:
{
  "files_to_read": ["path"],
  "files_to_modify": ["path"],
  "files_to_create": ["path"],
  "needs_split": false,
  "split_suggestion": [{"title": "", "scope": []}],
  "reasoning": "2 sentences max"
}
```

`needs_split=true` est un signal précieux : il attrape les étapes mal dimensionnées **avant** de brûler des tokens.

---

### 4.4 EDIT — produire le diff

Le nœud le plus appelé. Le contexte est ici au plus serré.

```
{{IDENTITY}}

TASK: Implement the step. Produce complete file contents for every file you change.

STEP CONTRACT:
{{CONTRACT}}

PROJECT CONVENTIONS (binding — violating these fails review):
{{PROJECT_CARD}}

RELEVANT MEMORY:
{{MEMORY}}

FILES:
{{FILES}}

{{LAST_FAILURE}}

Rules:
- Return FULL file contents, never partial snippets, never "// ... rest unchanged".
- Do not add dependencies unless the step contract allows it. If one is unavoidable,
  declare it in `new_dependencies` with a justification.
- Do not add TODOs, placeholders, mock data, or commented-out alternatives.
- Match the existing code style exactly. Copy the patterns you see; do not improve them.
- If a required value is unknown (an ID, a key, an endpoint), do NOT invent it:
  add it to `missing` and reference it as an environment variable.

Return JSON:
{
  "files": [{"path": "", "content": "", "action": "create|modify"}],
  "new_dependencies": [{"name": "", "reason": ""}],
  "commands_to_run": ["shell commands needed before verification, e.g. migrations"],
  "commit_message": "conventional commit format",
  "missing": [{"key": "", "what_it_is": "", "where_user_gets_it": ""}],
  "self_check": [
    {"criterion": "copied from acceptance", "satisfied": true, "how": "one line"}
  ],
  "blocked_reason": null
}
```

`self_check` n'est **pas** une preuve — c'est un signal de qualité. Si un modèle coche un critère que la vérification machine invalide ensuite, c'est un indicateur direct de fiabilité du modèle que tu logges. Au bout de 30 étapes, tu sauras lequel de tes modèles ment.

---

### 4.5 DIAGNOSE — classifier l'échec (le nœud qui rend la boucle intelligente)

```
{{IDENTITY}}

TASK: Diagnose why verification failed. Do NOT fix anything.

STEP CONTRACT:
{{CONTRACT}}

WHAT WAS CHANGED:
{{DIFF_SUMMARY}}

FAILURE OUTPUT (stdout/stderr, truncated to the last 200 lines):
{{FAILURE}}

ATTEMPT HISTORY (fingerprints already seen — do not propose a strategy that was
already tried for the same fingerprint):
{{ATTEMPTS}}

Return JSON:
{
  "category": "syntax|type|missing_dependency|wrong_api_usage|test_expectation|
               environment|config|out_of_scope|ambiguous_requirement|external_service",
  "root_cause": "one sentence, specific, naming the file and symbol",
  "confidence": 0.0,
  "fix_locality": "same_file|adjacent_file|outside_scope|unknown",
  "recommended_action": "RETRY_EDIT|RESCOPE|ASK_USER|ABORT",
  "action_argument": {
    "hint_for_editor": "specific instruction, max 2 sentences",
    "question_for_user": "only if ASK_USER",
    "split_into": [{"title": "", "scope": []}]
  },
  "same_as_previous_attempt": false
}
```

Câblage dans la boucle :
- `confidence < 0.4` → escalade d'un cran (pas de retry aveugle)
- `fix_locality = outside_scope` → `RESCOPE` forcé
- `same_as_previous_attempt = true` → escalade forcée, jamais de retry
- `category = external_service` → `ASK_USER`, pas de retry (rate limit, quota, service down)

---

### 4.6 REVIEW — jugement qualitatif (uniquement sur étapes UI, optionnel)

```
{{IDENTITY}}

TASK: Review a UI change against its intent. You are shown a screenshot.

INTENT: {{INTENT}}
DESIGN CONSTRAINTS: {{PROJECT_CARD.design}}
ACCEPTANCE CRITERIA: {{CRITERIA}}

Judge only what is visible. Do not speculate about code.
For each criterion, state visible evidence or mark it unverifiable from a screenshot.

Return JSON:
{
  "criteria": [{"criterion": "", "verdict": "met|not_met|unverifiable", "evidence": ""}],
  "visual_defects": [{"severity": "blocker|major|minor", "what": "", "where": ""}],
  "verdict": "pass|fail|needs_human_eye"
}
```

`needs_human_eye` est un verdict légitime et fréquent. Il te renvoie la preview sur le téléphone, ce qui est de toute façon plus rapide que trois allers-retours de modèle.

---

### 4.7 MEMORY_EXTRACT — après clôture de mission uniquement

```
{{IDENTITY}}

TASK: Extract durable memory from a completed mission. Be extremely conservative.

MISSION SUMMARY: {{MISSION}}
USER INTERVENTIONS (corrections, rejections, rewrites): {{INTERVENTIONS}}
EXISTING MEMORY (do not duplicate; propose updates instead): {{MEMORY}}

Classification rules — apply strictly:
- FACT: verifiable in the repository right now. Must cite the file.
- DECISION: the user explicitly chose A over B. Must quote the user.
- RULE: the user stated something as always/never. Must quote the user.
- PREFERENCE: observed at least twice across missions, never stated. Confidence <= 0.6.
- HYPOTHESIS: observed once. Confidence <= 0.3. Everything uncertain goes here.

Never promote a single observation above HYPOTHESIS.
Never infer a rule from the absence of an objection.

Return JSON:
{
  "add": [{"type": "", "scope": "", "content": "", "confidence": 0.0, "evidence": ""}],
  "update": [{"memory_id": "", "new_confidence": 0.0, "why": ""}],
  "contradict": [{"memory_id": "", "contradicted_by": "", "suggest": "weaken|delete"}]
}
```

`contradict` est ce qui empêche la mémoire de pourrir. Rien n'est supprimé automatiquement : ça remonte dans l'écran Mémoire pour ton arbitrage.

---

### 4.8 Le routeur : pas de LLM

Le choix du modèle est une table, pas un raisonnement. Ça économise un aller-retour complet (1 à 3 s) sur chaque étape.

```
EDIT (UI, < 3 fichiers)      → modèle rapide
EDIT (backend, logique)      → modèle fort
DIAGNOSE                     → modèle fort  (le diagnostic rate rarement deux fois)
SELECT                       → modèle rapide, ou heuristique pure
ARCHITECT                    → modèle fort, une fois par mission
MEMORY_EXTRACT               → modèle fort, hors ligne, latence sans importance
REVIEW (vision)              → modèle multimodal
```

Sélection du fournisseur au sein d'une catégorie : celui qui a le plus de marge TPM restante dans sa fenêtre courante. Les plafonds diffèrent fortement (de l'ordre de 6 000 chez Groq à ~30 000 chez Cerebras à ~50 000 chez Mistral), donc répartir évite qu'une seule fenêtre par minute bloque toute la file.

---

## 5. Les sept phases de construction

Règle absolue : **on ne passe pas à la phase suivante tant que le « terminé quand » de la phase courante n'est pas vrai.** L'ordre est choisi pour que chaque phase produise quelque chose d'utilisable seul.

### Phase 0 — Fondations (une soirée)
- Repo `jarvis`, public si possible (minutes Actions illimitées sur les repos publics ; les repos privés sont plafonnés à 2 000 min/mois sur le plan Free).
- **GitHub Student Developer Pack** avec ton mail Lyon 1 → GitHub Pro gratuit, quota Codespaces relevé. À faire en premier, c'est 10 minutes.
- Comptes : Neon (base), Cloudflare (Pages + Workers), bot Telegram (notifications seules).
- Secrets déposés dans GitHub Secrets et Cloudflare. Jamais ailleurs, jamais dans le repo, jamais dans un prompt.
- ⚠️ Si tu utilises une VM Oracle : les instances Always Free dépassant 2 OCPU / 12 Go sont supprimées à partir du 18 août 2026. Provisionne directement à la nouvelle limite.

**Terminé quand :** un `curl` authentifié depuis ton téléphone déclenche un workflow GitHub qui écrit un fichier et ouvre une PR.

### Phase 1 — La boucle nue (un week-end, zéro LLM)
Gateway (Cloudflare Worker) + PWA minimale + `workflow_dispatch` + commit + PR + notification Telegram.

**Piège :** la tentation de brancher un modèle tout de suite. Ne le fais pas. Cette phase valide toute la plomberie sans le bruit d'un modèle.

**Terminé quand :** depuis ton téléphone, tu tapes « crée un fichier test.md », et 90 s plus tard tu reçois une notification avec un lien de PR qui existe vraiment.

### Phase 2 — Le vérificateur et les preuves
`VERIFY` (lint ∥ types ∥ build ∥ tests en jobs parallèles), collecte des preuves, statuts `GREEN` / `BLOCKED`, déploiement de preview Cloudflare par branche, capture d'écran automatique.

**Terminé quand :** une PR affiche automatiquement build, tests, URL de preview, et un statut que tu n'as pas eu à interpréter.

### Phase 3 — Un seul nœud LLM
`EDIT` uniquement, sur un projet jetable, avec la boucle complète et l'escalade. Pas de mémoire, pas d'architecte, pas de routage.

**Terminé quand :** dix étapes consécutives sur un projet jouet, avec **zéro fausse déclaration de succès**. Si tu as un `GREEN` menteur, tu ne passes pas la phase.

### Phase 4 — Contrat de contexte, repo map, routage
Le budget de tokens, la carte du repo en cache invalidée par SHA, la table de routage, la comptabilité TPM par fournisseur, et une mission hebdomadaire qui interroge la liste de modèles vivants de chaque fournisseur (les catalogues gratuits changent sans préavis — un modèle codé en dur peut disparaître entre deux exécutions).

**Terminé quand :** la latence de l'étape 30 est égale à celle de l'étape 1, mesurée.

### Phase 5 — Architecte et négociation de plan
`ARCHITECT`, l'écran Plan éditable, `.jarvis/plan.md` versionné, `open_questions`.

**Terminé quand :** tu lances un projet réel (pas jouet) depuis le téléphone, tu modifies deux étapes du plan proposé, et les cinq premières étapes passent au vert.

### Phase 6 — Mémoire typée
`MEMORY_EXTRACT`, l'écran Mémoire avec correction et suppression, la contradiction, l'expiration des hypothèses.

**Piège :** la construire plus tôt. À vide, tu ne produis que des devinettes. Attends d'avoir dix missions réelles à en extraire.

**Terminé quand :** sur un nouveau projet, JARVIS applique spontanément trois de tes conventions sans que tu les aies redites.

### Phase 7 — Proactivité gouvernée et voix
Brief quotidien, veille sur tes dépôts, dictée vocale, et un budget de notifications strict (règle de départ : maximum trois messages non sollicités par jour, sinon tu couperas tout au bout d'une semaine).

---

## 6. Performance — les neuf leviers

La performance perçue et la performance réelle sont deux problèmes différents. Traite les deux.

**Perçue**
1. **Accusé de réception sous 300 ms, toujours.** La gateway écrit dans la file et répond immédiatement. Aucune requête utilisateur n'attend un modèle.
2. **Timeline d'événements en direct** plutôt que streaming de texte : `sélection des fichiers → génération → application → build → tests`. Tu vois que ça avance, pas que ça parle.
3. **Optimisme sur les étapes à faible risque** : l'UI affiche l'état visé, corrigé si la vérification échoue.

**Réelle**
4. **Contexte à taille constante** (§2). Le levier le plus important et le plus souvent négligé.
5. **Vérifications en parallèle.** Lint, types, build et tests sont des jobs distincts — le plan Free autorise 20 jobs concurrents.
6. **Cache agressif.** `actions/cache` sur les dépendances transforme couramment une installation de plusieurs minutes en quelques dizaines de secondes. Cache aussi le repo map, invalidé par SHA.
7. **Routeur déterministe** : un appel LLM en moins par étape.
8. **Comptabilité TPM côté gateway** : router vers le fournisseur ayant de la marge évite les attentes de rate limit, qui dominent la latence sur les tiers gratuits.
9. **Preview lancée dès le build vert**, en parallèle des tests. Quand les tests finissent, l'URL est déjà chaude.

**Contraintes plateforme à connaître** (elles cadrent le découpage des étapes) : un job GitHub Actions est annulé au bout de 6 heures ; une exécution de workflow au bout de 35 jours ; 1 000 requêtes API GitHub par heure et par dépôt. Aucune n'est contraignante si tes étapes font 15 à 30 minutes — ce qui est une raison de plus de les garder petites.

---

## 7. UX — cinq écrans, une action primaire par écran

**1. Console.** Une ligne de saisie, un bouton micro, la timeline des missions en cours. C'est l'écran d'accueil. Il doit se charger en moins d'une seconde même hors ligne (dernier état en cache).

**2. Plan.** Liste d'étapes réordonnables, éditables, supprimables. Les `open_questions` en haut. Un seul bouton primaire : **Valider le plan**.

**3. Étape.** Statut, diff repliable, logs, preuves. Quatre actions : *Valider* · *Relancer* · *Affiner* (champ texte libre) · *Revert*. Toujours au même endroit, toujours dans cet ordre.

**4. Preview.** Webview plein écran de l'URL Cloudflare, avec un bouton capture qui te laisse annoter au doigt et renvoyer l'annotation comme instruction d'affinage. C'est la fonctionnalité qui rendra le système agréable au quotidien.

**5. Mémoire.** Ce que JARVIS croit savoir, par type, avec la source et la confiance. Chaque entrée : *Confirmer* · *Corriger* · *Oublier*. C'est ici que se construit la confiance — un système dont on ne peut pas inspecter les croyances devient inquiétant, puis inutilisé.

**Détails qui comptent plus qu'ils n'en ont l'air :** file d'attente hors ligne (métro, avion) ; un STOP global permanent en haut à droite ; notifications qui contiennent le verdict, pas juste « terminé » ; et jamais deux boutons primaires sur un écran.

---

## 8. Ce que tu mesures, dès la phase 3

Six chiffres, relevés automatiquement, affichés sur la Console.

| Indicateur | Cible | Pourquoi |
|---|---|---|
| Taux de fausse déclaration de succès | **0** | non négociable, c'est la métrique de confiance |
| Étapes vertes au 1er essai | > 60 % | qualité du découpage plus que du modèle |
| Étapes vertes en ≤ 3 essais | > 85 % | efficacité de l'escalade |
| Durée d'étape p50 / p95 | < 4 min / < 15 min | performance réelle |
| Minutes Actions consommées / mois | sous quota | survie du budget zéro |
| Interventions manuelles par mission | décroissant | c'est ça, « ça me facilite la vie » |

Un `self_check` coché par le modèle mais invalidé par la machine se logge séparément : c'est ton indice de fiabilité par modèle, et il te dira lequel garder quand les catalogues gratuits changeront.

---

## 9. Ce que ce plan ne fait pas

Dit franchement, pour que tu ne le découvres pas au bout de trois mois :

- **Il ne code pas un projet entier sans toi.** Il code une étape à la fois, à ton signal. C'est un choix, et c'est ce qui le rend fiable aujourd'hui plutôt que fascinant et inutilisable.
- **Il ne juge pas bien le design.** `REVIEW` attrape les défauts grossiers ; ton œil sur la preview reste le juge. La phase 4 rend cet aller-retour rapide, c'est tout ce qui compte.
- **Il ne survit pas seul aux changements de fournisseurs.** La mission de capacité hebdomadaire te prévient ; c'est toi qui décides.
- **Il n'est pas sûr face à du contenu hostile.** Tant que tu lui fais ingérer des URL et des dépôts tiers avec un jeton GitHub dans les parages, la séparation worker/secrets de la phase 0 est ta seule vraie protection. Ne la contourne jamais « juste pour tester ».
