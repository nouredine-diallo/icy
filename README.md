# ICY — ce que c'est, et en quoi ça diffère de JARVIS

ICY est un second projet, dans `/home/land/JARVIS/ICY/`, indépendant du moteur OpenJarvis existant.
Le guide de construction de référence est [`GUIDE_ATELIER.md`](./GUIDE_ATELIER.md) (déplacé ici tel quel,
non modifié) — c'est le document à suivre phase par phase pour tout développement futur d'ICY.

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
5. **Mémoire.** À la clôture de la mission — jamais pendant — ICY propose d'ajouter des entrées : un FAIT
   vérifié dans le repo, une DÉCISION que tu as prise explicitement, une RÈGLE que tu as énoncée. Tu vois
   la source et la confiance de chaque entrée, et tu peux *Confirmer* / *Corriger* / *Oublier* chacune.
   Aucune n'entre en mémoire sans être passée par cet écran.

Un bouton **STOP** reste visible en permanence en haut à droite sur les cinq écrans. À tout moment, ça coupe
tout, sans dépendre du bon vouloir du modèle en cours d'exécution.

**Ce que ce parcours suppose déjà construit** : les phases 0 à 2 du guide (fondations, boucle nue sans LLM,
vérificateur + preuves) doivent être vertes avant qu'un seul nœud LLM ne soit branché (phase 3) — c'est
l'ordre de construction, pas l'ordre d'usage final. Rien n'a encore été codé pour ICY à ce stade ; ce dossier
contient uniquement le guide et ce document de cadrage, en attente du feu vert pour démarrer la Phase 0.
