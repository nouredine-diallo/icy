# ICY v2.0 — le superviseur qui ne code pas

Document canonique à partir du 2026-08-17. **Remplace l'architecture de
[`GUIDE_ATELIER.md`](./GUIDE_ATELIER.md)** (v1.0 : harnais complet avec ses propres nœuds EDIT/DIAGNOSE
et sa propre table de routage multi-fournisseurs). v1.0 reste conservé pour l'historique et pour ce qui
survit tel quel (voir §4 "Ce qui est repris"). Le document source appelle le système "JARVIS v2.0" ;
dans ce dépôt, c'est ICY v2.0.

---

## 1. La version, décrite simplement

**ICY v2.0 est un chef de projet qui ne code pas.**

Il fait quatre choses, et refuse d'en faire d'autres :

1. **Il négocie.** Un objectif entre, il propose une architecture et un plan découpé en étapes, chacune
   avec des critères vérifiables écrits *avant* le code. L'utilisateur modifie, valide.
2. **Il délègue.** Chaque étape part chez un exécuteur existant — OpenHands pour le volume, l'agent
   Copilot pour les étapes qui bloquent, Claude pour les arbitrages.
3. **Il refuse.** Une étape n'est jamais terminée parce qu'un modèle l'affirme. Le test doit être rouge
   avant le changement et vert après, le commit doit exister sur le remote, la preview doit répondre.
4. **Il se souvient.** Uniquement les décisions et les règles, avec la raison et la date. Rien d'autre.

Le reste — la boucle de codage, le routage multi-fournisseurs, la carte du dépôt — n'est plus son
problème : ce sont des problèmes déjà résolus par les exécuteurs délégués.

## 2. Ce qui change, concrètement

| | v1.0 (`GUIDE_ATELIER.md`) | v2.0 (ce document) |
|---|---|---|
| Rôle | harnais complet | superviseur |
| Qui code | boucle `EDIT`/`DIAGNOSE`/`REPAIR` maison | OpenHands / agent Copilot |
| Code à écrire | 8 sous-systèmes | 4 (~55 % en moins) |
| Mémoire injectée | 1 200 tokens, 5 types (FAIT/PRÉFÉRENCE/DÉCISION/RÈGLE/HYPOTHÈSE) | 400 tokens, 2 types (DÉCISION/RÈGLE) |
| Conventions | dans le prompt | dans `AGENTS.md` + la chaîne d'outils (lint/format/templates) |
| Format de plan | `.jarvis/plan.md` maison | Spec Kit |
| Juge visuel | un modèle multimodal (`REVIEW`) | l'œil de l'utilisateur sur la preview |
| Proactivité | Phase 7 du guide v1.0 | supprimée |
| Première action | coder la boucle nue (Phase 0/1) | **une semaine sans coder** |
| Reste 100 % côté utilisateur | — | la porte de vérification, le rouge-avant-vert, la surface de preuve, la mémoire de décisions |

Le changement de nature en une phrase : passer d'un projet où on construit l'intelligence à un projet où
on construit la confiance. La première est un combat perdu contre des équipes entières (Kimi K3, GLM-5.2,
DeepSeek V4 Pro sont faits par des labs, pas par un projet perso). La seconde, personne ne la mène à ta
place.

## 3. Semaine 0 — ne pas coder

**C'est la première étape prescrite, avant tout code.** Objectif : savoir si le superviseur est
réellement nécessaire, ou si l'agent Copilot depuis GitHub Mobile suffit déjà seul.

- Tester l'agent Copilot (GitHub Mobile) directement sur 2-3 vraies étapes d'un projet réel (Coss by
  Micky, LBS, ou autre), sans aucune couche ICY par-dessus.
- Tester OpenHands sur les mêmes étapes ou des étapes comparables.
- Observer précisément : la négociation de plan change-t-elle le résultat ? Le taux de "faux GREEN" (un
  modèle qui affirme un succès non prouvé) est-il un problème réel avec ces outils tels quels, sans porte
  de vérification externe ?
- Décision à la fin de la semaine, avec des faits observés, pas une intuition : construire ICY v2.0, ou
  s'arrêter là parce que les outils existants suffisent déjà.

**Rien dans ce document ne doit être codé avant que cette semaine soit faite et que la décision soit
"oui, construire".**

## 4. Si la décision est "construire" — les 4 sous-systèmes, dans l'ordre

### 4.1 Il refuse — la porte de vérification (le plus autonome, à faire en premier)
La partie la moins dépendante des trois autres, et déjà amorcée côté ICY (`bootstrap.yml` +
`verify.yml`, Phase 0/1 de v1.0, tous deux réutilisables tels quels comme substrat).

- Critères d'acceptation écrits et gelés **avant** la délégation d'une étape.
- Rouge avant vert : le test d'acceptation doit échouer sur le commit d'avant, réussir sur celui d'après
  (repris tel quel de l'addendum 1 §3, mécanisme 2 — inchangé par le passage à v2.0).
- Les fichiers de test sont hors de portée de l'exécuteur délégué (OpenHands/Copilot) — même logique que
  le mécanisme 1 de l'addendum 1, appliquée à un exécuteur externe plutôt qu'à un nœud `EDIT` maison.
- Preuve committée : commit sur le remote, build, tests, preview qui répond.

### 4.2 Il délègue — le routage vers des exécuteurs existants, pas des modèles
Remplace toute la table de routage multi-fournisseurs de l'addendum 2 pour la partie codage : plus besoin
de choisir entre Kimi K3/GLM-5.2/DeepSeek V4 Pro/Qwen3-Coder soi-même, ni de gérer 40 req/min NVIDIA Build,
hedged requests, coupe-circuits, etc. — OpenHands et l'agent Copilot gèrent déjà leur propre exécution.

- Règle de délégation, simple : volume normal → OpenHands ; étape bloquée après escalade (même empreinte
  d'échec vue 2 fois, cf. §3.2 du guide v1.0, logique inchangée) → agent Copilot.
- À construire : le branchement technique vers OpenHands (API/CLI, probablement en conteneur GitHub
  Actions) et vers l'agent Copilot (assignation d'issue ou déclenchement via l'API GitHub) — vérifier les
  interfaces réelles de ces deux outils avant de coder dessus, ne rien supposer.

### 4.3 Il négocie — `ARCHITECT` sur Claude, sortie Spec Kit
- Reprend le nœud `ARCHITECT` du guide v1.0 §4.2 et sa place dans la table de routage de l'addendum 2
  (crédit Agent SDK Claude, ~20-40 appels/mois) — **inchangé**.
- Change le format de sortie : Spec Kit au lieu du JSON `.jarvis/plan.md` maison du guide v1.0 — vérifier
  la structure réelle de Spec Kit avant de l'adopter, ne pas la deviner.
- Les `open_questions` en haut de l'écran Plan restent (narrées dans l'exemple Coss by Micky : deux
  questions ouvertes, réponse en deux taps).

### 4.4 Il se souvient — mémoire réduite à 2 types
- Reprend §1.3 et §4.7 du guide v1.0, **en supprimant FAIT, PRÉFÉRENCE et HYPOTHÈSE**. Ne restent que
  `DÉCISION` (explicite, datée, citation de l'utilisateur) et `RÈGLE` (absolue, citation de
  l'utilisateur).
- Budget : 400 tokens au lieu de 1 200 — tient dans le slot `MEMORY` du contrat de contexte du guide v1.0
  §2.2 sans le redimensionner.
- Extraction toujours post-mission uniquement, jamais pendant (règle inchangée).

## 5. Ce qui est supprimé purement et simplement

- **`REVIEW` (modèle multimodal).** Remplacé par l'œil de l'utilisateur sur la preview. Aucun code à
  écrire pour ce nœud.
- **Phase 7 du guide v1.0 (proactivité gouvernée, brief quotidien, veille, budget de notifications, voix).**
  Supprimée entièrement de la v2.0.
- **La table de routage multi-fournisseurs de l'addendum 2, pour la partie codage uniquement**
  (`EDIT`/`SELECT`/`DIAGNOSE` chez Kimi K3/GLM-5.2/DeepSeek/Gemma 4/Groq/Cerebras/NVIDIA Build, les 7
  mécanismes anti-latence). Cette partie devient inutile : OpenHands et l'agent Copilot gèrent leur
  propre inférence. **Ce qui reste valable de l'addendum 2 :** tout le §4 sur Claude Pro (séparation des
  pools Agent SDK / interactif depuis le 15/06/2026, les 3 précautions, le rôle de Claude en
  `ARCHITECT`/arbitrage) — directement réutilisé en §4.3 ci-dessus.
- Les 6 classes de demandes de l'addendum 1 (BUILD/RESEARCH/DIAGNOSE/REVIEW/OPS/ASK) **restent valables
  telles quelles** comme couche de classification côté gateway — seule leur exécution change pour BUILD
  (délégué, pas exécuté par un nœud `EDIT` maison) et REVIEW (œil humain, plus de nœud LLM).

## 6. Une journée type, pour se représenter la cible (Coss by Micky)

8h40 (tram) : objectif dicté, incertitude assumée → `RESEARCH` part, 3 sources hiérarchisées + une
contradiction signalée + ce qui n'a pas pu être vérifié, ADR committé. 8h52 : `ARCHITECT` (Claude) rend un
plan à 7 étapes + 2 questions ouvertes, ajusté en 2 taps. 9h05 : 3 étapes indépendantes en parallèle (20
jobs concurrents, plan Free). 9h31 : étape 1 VERTE, preuve affichée. 9h34 : étape 2 BLOQUÉE (même
empreinte 2×) → escalade vers l'agent Copilot avec le contexte de l'échec, pas une 3e tentative aveugle.
11h15 : étape 2 VERTE ; étape 4 NEEDS_INPUT (variable d'environnement manquante, déclarée dans `missing`,
jamais inventée). 13h20 : défaut visuel annoté au doigt sur la preview, relance ciblée. 18h40 : 7 étapes
vertes, merge depuis l'app. 18h41 : `MEMORY_EXTRACT` propose 1 DÉCISION + 1 RÈGLE, confirmées d'un tap.
Zéro fausse déclaration, une escalade, aucun ordinateur ouvert.

## 7. Honnêteté sur ce que ça n'est pas

Ce n'est pas le JARVIS d'Iron Man : pas d'initiative propre, pas de modèle du monde, chaque étape doit
être déclenchée par l'utilisateur, il ne découvrira pas seul qu'il faut refactorer l'auth. La partie
"intelligence autonome" reste hors d'atteinte en 2026.

Ce qu'il a réellement : la propriété qu'on oublie toujours dans les films — dire "je ne peux pas le
confirmer" plutôt que bluffer. Annoncer l'incertitude, montrer les mesures, ne jamais prétendre qu'une
étape est finie sans preuve. C'est la seule partie que personne d'autre ne construit à la place de
l'utilisateur, et c'est ce que ce document appelle "un JARVIS honnête" plutôt qu'un JARVIS omniscient.
