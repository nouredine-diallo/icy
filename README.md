# ICY — ce que c'est, et en quoi ça diffère de JARVIS

ICY est un second projet, dans `/home/land/JARVIS/ICY/` et sur `github.com/nouredine-diallo/icy`
(dépôt indépendant, public), séparé du moteur OpenJarvis existant.

## Documents

| Fichier | Contenu | Statut |
|---|---|---|
| [`GUIDE_ATELIER_V2.md`](./GUIDE_ATELIER_V2.md) | **Canonique depuis le 2026-08-17.** ICY = superviseur qui délègue le code (OpenHands/Copilot agent), négocie (Claude), refuse sans preuve, se souvient de 2 types seulement | vivant — la cible actuelle |
| [`GUIDE_ATELIER.md`](./GUIDE_ATELIER.md) | Plan v1.0 — harnais complet avec ses propres nœuds EDIT/DIAGNOSE et sa table de routage. **Historique.** Ce qui en survit tel quel est listé dans v2 §4/§5 | superseded, conservé pour référence |
| [`GUIDE_ATELIER_ADDENDUM_1.md`](./GUIDE_ATELIER_ADDENDUM_1.md) | 6 classes de demandes (BUILD/RESEARCH/DIAGNOSE/REVIEW/OPS/ASK), capacité de recherche, preuve du code | **toujours valable** sous v2 (voir v2 §5, dernier point) |
| [`GUIDE_ATELIER_ADDENDUM_2.md`](./GUIDE_ATELIER_ADDENDUM_2.md) | Modèles et routage — état du marché août 2026 | **partiellement superseded** : la table de routage EDIT/DIAGNOSE multi-fournisseurs devient inutile (OpenHands/Copilot gèrent leur propre inférence) ; le §4 sur Claude Pro reste valable, repris en v2 §4.3 |
| [`TODO_MANUEL.md`](./TODO_MANUEL.md) | Actions qui nécessitent ton intervention (comptes, tokens) | vivant, mis à jour au fil de l'eau |
| Ce fichier | Différence ICY/JARVIS, parcours utilisateur, état d'avancement | vivant |

## État d'avancement

- **Semaine 0 (v2, prescrite avant tout code)** — pas encore faite : tester l'agent Copilot mobile et
  OpenHands seuls sur de vraies étapes, pour confirmer que le superviseur est réellement nécessaire.
- **Substrat déjà construit (Phase 0/1 de v1.0, entièrement réutilisable sous v2 — voir v2 §4.1)** :
  repo public `icy`, gateway (`icy-gateway.nourredinediallo.workers.dev`), PWA Console
  (`icy-app.pages.dev`), boucle déclenchement→fichier→PR vérifiée en conditions réelles, amorce de
  vérification (`verify.yml`). PAT scopé reçu et vérifié (restreint au seul repo `icy`) mais il manque le
  scope Pull Requests pour que la délégation puisse ouvrir des PR — voir `TODO_MANUEL.md` #4.
- **Les 4 sous-systèmes de v2 (§4)** — pas commencés : la porte de vérification (extension de ce qui
  existe déjà), la délégation vers OpenHands/agent Copilot, la négociation (`ARCHITECT` via Claude, sortie
  Spec Kit), la mémoire à 2 types. Ordre de construction détaillé dans `GUIDE_ATELIER_V2.md` §4.

## La différence de fond avec JARVIS

**JARVIS** (`~/.openjarvis`, ce dépôt) est un **assistant personnel généraliste** : conversation Telegram,
recherche web, ingestion de documents, mémoire de faits sur toi, et — depuis cette session — un pipeline
cloud (Cloudflare Worker + GitHub Actions) capable de travailler sur tes repos GitHub quand le PC est
éteint. Il fait beaucoup de choses, et le pipeline de code a été construit en itérant sur des problèmes
concrets au fur et à mesure (bug `<think>` qui fuit, 413 Groq, diffs corrompus, etc.).

**ICY** n'est pas un assistant généraliste. C'est un **atelier logiciel** : un système dont l'unique métier
est de transformer un objectif en code vérifié et déployé, une étape à la fois, depuis le téléphone. Il ne
fait pas de conversation libre, pas de recherche web, pas de mémoire de ta vie personnelle — sa mémoire est
strictement scopée au projet en cours de construction.

La différence n'est pas seulement le périmètre, c'est l'architecture :

| | JARVIS (actuel) | ICY (guide atelier) |
|---|---|---|
| Qui pilote | Le modèle est intégré à une boucle de mission, mais le routage/l'enchaînement s'est construit au fil des besoins | **P1 : le LLM n'est jamais le chef d'orchestre.** La boucle est une machine à états écrite en code ; le modèle est un nœud interchangeable |
| Historique | Le chemin cloud (`/ask` sur le Worker) **accumule l'historique de conversation** (`loadHistory`/`saveTurn` dans D1) | **P2 : aucun appel n'a d'historique.** Chaque appel est reconstruit depuis l'état de la mission — la latence de l'étape 40 = latence de l'étape 1 |
| Contexte envoyé au modèle | Ad hoc selon l'outil (repomix, extraits de repo, mémoire plate) | **P3 : contrat de contexte à budget fixe et nommé par slot** (IDENTITY 400, CONTRACT 700, MEMORY 1200, FILES 12000...) — la sélection est faite par du code, jamais par le modèle |
| Preuve de succès | `run_verification()` + le nouveau Quality Gate (Docker sandboxé) — solide, mais le GHA project agent actuel n'a pas d'échelle d'escalade formelle ni de déduplication par empreinte d'échec | **P4 : rien n'est vert sans preuve machine** (build, tests, commit remote, preview 200), avec échelle d'escalade à 4 paliers et interdiction de retenter deux fois la même empreinte d'échec |
| Autonomie | Contrôlée par les missions, mais pas de STOP global ni de niveaux d'autonomie par classe d'action | **P5 : autonomie révocable** — STOP global, secrets jamais visibles par un modèle |
| Mémoire | Store de faits plat (`memory_facts.jsonl`), extraction post-conversation | **5 types stricts** (FAIT / PRÉFÉRENCE / DÉCISION / RÈGLE / HYPOTHÈSE), chacun avec confiance, preuves, expiration, et contradiction remontée à l'utilisateur — jamais fusionnés |
| Interface | Telegram (texte) | PWA mobile à 5 écrans : Console, Plan, Étape, Preview, Mémoire |
| Cible | N'importe quel repo GitHub que tu nommes | Un stack fixé une fois (Neon, Cloudflare Pages+Workers, GitHub Actions), Telegram réduit aux notifications |

En résumé : **JARVIS est ce qui existe et fonctionne déjà**, construit en résolvant des problèmes réels au fur
et à mesure. **ICY est une reconstruction délibérée**, phase par phase (§5 du guide), qui impose dès le départ
les cinq règles non négociables que JARVIS a partiellement, mais pas systématiquement. Les deux peuvent
coexister : JARVIS reste l'assistant du quotidien (Telegram, mémoire perso, recherche) ; ICY devient l'outil
dédié pour driver la construction de projets logiciels réels, avec une fiabilité et une traçabilité que la
formule "un modèle qui écrit du JSON et on croise les doigts" ne peut pas garantir.

## Parcours utilisateur ICY (téléphone, PC éteint ou absent)

1. **Console.** Tu ouvres la PWA (chargement < 1 s, dernier état en cache même hors ligne). Tu tapes ou dictes
   un objectif : *"Ajoute une page pricing sur LBS avec 3 tiers, connectée à Stripe test mode."* Accusé de
   réception sous 300 ms — la gateway a juste posé le message en file, aucun modèle n'a encore tourné.
2. **Plan.** Quelques secondes/minutes plus tard, une notification arrive. Tu ouvres l'écran Plan : une
   architecture proposée (stack, risques, ce qui nécessite une action manuelle de ta part), une liste
   d'étapes réordonnables (chacune : intention, portée de fichiers, critère de succès vérifiable), et en
   haut les `open_questions` — les points où le système a explicitement besoin de ton arbitrage plutôt que
   de deviner. Tu réordonnes ou modifies deux étapes, tu appuies sur **Valider le plan**.
3. **Étape.** Chaque étape s'exécute seule, à budget fixe (tokens, minutes, tentatives). Tu vois une
   timeline d'événements en direct (sélection des fichiers → génération → application → build → tests),
   pas un flux de texte qui streame. Si ça casse, tu ne vois pas une excuse du modèle : tu vois `BLOCKED`
   avec un diagnostic et un rapport à trois hypothèses, ou `NEEDS_INPUT` avec une question précise
   (secret manquant, choix produit). Jamais un "GREEN" qui ment — c'est la métrique n°1 du système (§8).
4. **Preview.** Dès que le build est vert, une preview Cloudflare par branche est déjà chaude. Tu l'ouvres en
   plein écran sur le téléphone, tu annotes du doigt un défaut visuel, l'annotation repart directement comme
   instruction d'affinage — pas besoin de la reformuler en texte.
5. **Mémoire.** À la clôture de la mission — jamais pendant — ICY propose d'ajouter des entrées. **Sous
   v2 (voir `GUIDE_ATELIER_V2.md` §4.4), seulement deux types** : une DÉCISION que tu as prise
   explicitement, une RÈGLE que tu as énoncée — plus de FAIT/PRÉFÉRENCE/HYPOTHÈSE. Tu vois la source de
   chaque entrée et tu peux *Confirmer* / *Corriger* / *Oublier* chacune. Aucune n'entre en mémoire sans
   être passée par cet écran.

Un bouton **STOP** reste visible en permanence en haut à droite sur les cinq écrans. À tout moment, ça coupe
tout, sans dépendre du bon vouloir du modèle en cours d'exécution.

**Ce que ce parcours suppose déjà construit** : la porte de vérification et la boucle
déclenchement→PR (v2 §4.1, substrat v1.0 Phase 0/1 déjà en place — voir "État d'avancement" plus haut),
avant que la délégation (OpenHands/Copilot) et la négociation (`ARCHITECT`) ne soient branchées. L'étape 4
"Preview" change de sens sous v2 : l'annotation part vers l'exécuteur délégué (pas vers un nœud `EDIT`
maison), et il n'y a plus de `REVIEW` par modèle multimodal — seulement l'œil de l'utilisateur, ce qui
est déjà ce que cette étape décrivait. Voir `GUIDE_ATELIER_V2.md` pour l'architecture cible complète.
