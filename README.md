# ICY — ce que c'est, et en quoi ça diffère de JARVIS

ICY est un second projet, dans `/home/land/JARVIS/ICY/` et sur `github.com/nouredine-diallo/icy`
(dépôt indépendant, public), séparé du moteur OpenJarvis existant.

## Documents

| Fichier | Contenu | Statut |
|---|---|---|
| [`GUIDE_ATELIER_V2.md`](./GUIDE_ATELIER_V2.md) | **Canonique depuis le 2026-08-17.** Audit complet (faits sourcés / hypothèses / marketing séparés) + version finale : ICY = superviseur qui délègue à OpenHands/agent Copilot, adopte Spec Kit + AGENTS.md + LiteLLM au lieu de les réécrire, garde le rouge-avant-vert comme seul vrai différenciateur. Plan semaine par semaine en §E.6 | vivant — la cible actuelle |
| [`GUIDE_ATELIER.md`](./GUIDE_ATELIER.md) | Plan v1.0 — harnais complet avec ses propres nœuds EDIT/DIAGNOSE et sa table de routage. **Historique.** Ce qui en survit tel quel est listé dans v2 §4/§5 | superseded, conservé pour référence |
| [`GUIDE_ATELIER_ADDENDUM_1.md`](./GUIDE_ATELIER_ADDENDUM_1.md) | 6 classes de demandes (BUILD/RESEARCH/DIAGNOSE/REVIEW/OPS/ASK), capacité de recherche, preuve du code | classification et rouge-avant-vert toujours valables ; non contredit par v2 (pas mentionné explicitement dedans, mais compatible) |
| [`GUIDE_ATELIER_ADDENDUM_2.md`](./GUIDE_ATELIER_ADDENDUM_2.md) | Modèles et routage — état du marché août 2026 | **superseded pour le routage** : v2 tranche "adopte LiteLLM, n'écris pas de routeur" (§B.1, §C, §E.1 point 9) — la table multi-fournisseurs maison ne sera pas construite. Le §4 (Claude Pro, pools séparés) reste factuellement valable et corrobore v2 §A.1 |
| [`TODO_MANUEL.md`](./TODO_MANUEL.md) | Actions qui nécessitent ton intervention (comptes, tokens) | vivant, mis à jour au fil de l'eau |
| Ce fichier | Différence ICY/JARVIS, parcours utilisateur, état d'avancement | vivant |

## État d'avancement (par rapport au plan §E.6 de `GUIDE_ATELIER_V2.md`)

**Honnêteté d'abord : l'ordre prescrit par le document n'a pas été respecté.** Sa Semaine 0 dit
explicitement "ne code rien" avant d'avoir mesuré l'agent Copilot + OpenHands seuls sur de vraies issues.
Le gateway, la PWA et la boucle bootstrap ont été construits *avant* cette mesure (héritage de la v1.0,
quand le plan était encore "harnais complet dès la Phase 0"). Ce n'est pas perdu — tout est gratuit et
réutilisable, voir ci-dessous — mais ce n'était pas le bon ordre selon le document lui-même.

- **Semaine 0 (mesure — prescrite en premier, pas encore faite)** : candidater au Student Pack, utiliser
  l'agent Copilot depuis GitHub Mobile sur de vraies issues Coss by Micky, noter ce qui manque et les
  crédits consommés. **Rien à coder ici.**
- **Ce qui existe déjà et recouvre des morceaux des Semaines 1/2/4** : repo public `icy`, gateway
  (`icy-gateway.nourredinediallo.workers.dev`), PWA Console (`icy-app.pages.dev`), boucle
  déclenchement→fichier→PR vérifiée en conditions réelles, amorce de vérification (`verify.yml` — pas
  encore le vrai rouge-avant-vert de la Semaine 2). PAT scopé reçu et vérifié (restreint au seul repo
  `icy`) mais il manque le scope Pull Requests — voir `TODO_MANUEL.md` #4.
- **Semaines 1 à 6+** : pas commencées. Détail complet, avec critères "terminé quand" par semaine, dans
  `GUIDE_ATELIER_V2.md` §E.6.

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
