# JARVIS — Audit critique et version finale (v2.0)

Audit de la v1.0 (Mode Atelier) contre l'état de l'art vérifié en août 2026.

---

# PARTIE A — Séparation des niveaux de certitude

## A.1 Faits vérifiés (sources primaires ou convergentes)

| Fait | Source |
|---|---|
| GitHub Copilot coding agent : Claude et Codex assignables depuis **GitHub Mobile**, produisent une PR brouillon, itèrent sur commentaires `@claude` | GitHub Changelog, 4 et 26 fév. 2026 |
| Accès étendu à Copilot Pro et Business le 26 février 2026 | GitHub Changelog |
| Plan Copilot Student depuis le 12 mars 2026 : complétions illimitées + **200 crédits IA/mois** (~2 $) ; des utilisateurs intensifs épuisent les 200 en une journée de travail agentique | felloai (vérif. août 2026) |
| Inscriptions Copilot Student/Pro suspendues en avril 2026 pour cause de demande de calcul, puis réouvertes | toolsrevis, felloai |
| Usage programmatique Claude (Agent SDK, `claude -p`, Actions) séparé du pool interactif depuis le 15 juin 2026 ; 20 $/mois de crédit Agent sur Pro | Tygart Media, docs Anthropic |
| OpenHands : sandbox Docker + mode API headless, tourne en CI, agnostique du modèle, ~75k étoiles | AIMultiple, Pinggy (mai 2026) |
| AGENTS.md : standard sous la Linux Foundation (Agentic AI Foundation), 60 000+ dépôts, 20+ outils le lisent | codersera, arXiv 2604.21090 |
| **Gloaguen et al. 2026, 138 dépôts réels** : les fichiers de contexte générés par LLM *réduisent* le taux de réussite et augmentent le coût d'inférence de plus de 20 % ; ceux écrits par un humain n'apportent +4 % que s'ils sont minimaux et précis | asdlc.io citant Gloaguen et al. 2026 |
| Gemini CLI retiré le 18 juin 2026 ; Roo Code archivé en mai ; OpenCode a perdu le login Claude Pro/Max | Pinggy (mai 2026) |
| OpenClaw : 9 CVE divulguées en 4 jours en mars 2026, une à CVSS 9.9 | digitalapplied |
| Groq : quotas réduits en 2026, la plupart des modèles à 1 000 req/jour | awesome-free-llm-apis |
| NVIDIA Build : ~40 req/min, sans carte, sans entraînement sur les prompts, mais termes limités au développement/test | forums NVIDIA (mai 2026), decodethefuture |

## A.2 Hypothèses (plausibles, non vérifiées)

- Que le crédit Agent de 20 $ couvre 20 à 40 appels de planification/mois. **Estimation de ma part**, dépendante du tarif exact et de la taille des prompts. À mesurer sur le compteur réel dès la première semaine.
- Que Kimi K3 hébergé gratuitement reste disponible via un fournisseur gratuit. Son classement front-end est documenté ; sa présence durable dans un catalogue gratuit ne l'est pas.
- Que le taux de réussite au premier essai atteigne 60 % sur ses propres dépôts. Aucun benchmark public ne mesure ça sur un stack Next.js 16 / Godot / C++ mélangé.

## A.3 Chiffres à traiter comme du marketing

- « SDD multiplie par 3 à 10 le taux de réussite au premier essai » : retours d'adoptants précoces relayés par GitHub et AWS, non indépendants. La direction est crédible, l'amplitude non.
- Les scores SWE-bench annoncés par les éditeurs (DeepSeek 80,6 %, Kimi K3 93,4 %). Les mesures indépendantes (Epoch AI) sont systématiquement plus basses.
- Hermes Agent : « +40 % de rapidité sur tâches répétées après 20 compétences » — <cite>Hermes n'a pas été testé indépendamment sur SWE-bench Verified, et ses affirmations MoA manquent de confirmation tierce.</cite>

---

# PARTIE B — Audit sans complaisance de la v1.0

## B.1 Le problème central : tu allais reconstruire un composant commodité

La v1.0 te fait construire huit sous-systèmes. Quatre sont désormais des commodités mieux faites ailleurs :

| Ce que la v1.0 te fait construire | Ce qui existe déjà, mieux | Verdict |
|---|---|---|
| Boucle `EDIT → APPLY → VERIFY → DIAGNOSE → REPAIR` | OpenHands headless, sandbox Docker, agnostique modèle, éprouvé | **abandonner le tien** |
| `REPO_MAP`, sélection de fichiers | intégré à tous les harnais matures | **abandonner** |
| Routeur multi-fournisseurs | LiteLLM / models.dev (OpenCode : 75+ fournisseurs) | **adopter, ne pas écrire** |
| Négociation de plan, `.jarvis/plan.md` | GitHub Spec Kit : Specify → Plan → Tasks → Implement, points de contrôle humains, agnostique modèle | **adopter le format** |

Écrire ton propre harnais te met en concurrence avec des projets à 75–165k étoiles, sur le composant le plus difficile, avec ton temps d'étudiant. C'est le mauvais endroit pour dépenser ton effort.

## B.2 Angle mort majeur : ton scénario existe déjà en produit

<cite>Depuis février 2026, tu peux assigner une issue à Claude ou Codex depuis GitHub Mobile, l'agent démarre et soumet une pull request brouillon, puis itère sur tes commentaires via `@claude`, avec suivi de session en temps réel sur web et mobile.</cite>

C'est littéralement ton cahier des charges : téléphone, PC éteint, écriture directe sur GitHub, PR, itération. Et pour toi c'est gratuit : le plan Copilot Student est inclus dans le Student Developer Pack.

**Mais avec un plafond dur** : <cite>200 crédits IA par mois, soit environ 2 $ d'usage mesuré, et des utilisateurs intensifs rapportent épuiser les 200 en une seule journée de travail agentique.</cite> Comptons ~10 à 20 sessions d'agent par mois.

**Conséquence opérationnelle immédiate, avant toute ligne de code :** utilise ce produit pendant une semaine sur Coss by Micky. Deux issues possibles, les deux excellentes :
- il te suffit → JARVIS est inutile, tu viens d'économiser six mois ;
- il ne te suffit pas → tu sais **précisément** quels manques justifient JARVIS, mesurés au lieu d'imaginés.

C'est l'action au meilleur rapport résultat/coût de tout cet audit : une semaine, 0 €.

Ma prédiction (hypothèse, pas fait) : il ne te suffira pas, pour quatre raisons — pas de négociation d'architecture avant le code, pas de porte de vérification (l'agent déclare terminé), pas de mémoire inter-projets, et 200 crédits qui s'évaporent. Mais tu dois le constater, pas me croire.

## B.3 Ton contrat de contexte contient une erreur mesurée

La v1.0 alloue 1 200 tokens de mémoire injectée. La recherche dit l'inverse de ce que dicte l'intuition : <cite>sur 138 dépôts réels, les fichiers de contexte générés par LLM réduisent le taux de réussite des agents tout en augmentant le coût d'inférence de plus de 20 % ; les fichiers écrits par un développeur n'apportent qu'un gain marginal de +4 %, et seulement s'ils sont minimaux et précis.</cite> Le mécanisme est explicite : <cite>les agents suivent fidèlement les instructions, ce qui élargit l'exploration et augmente le coût de raisonnement sans améliorer les résultats.</cite>

Et la règle qui en découle : <cite>si une contrainte peut être imposée de façon déterministe par un outil déjà présent dans le dépôt — linter, formateur, vérificateur de types, hook, porte CI — elle ne doit pas être répétée dans le fichier de contexte. L'outil est la contrainte.</cite>

**Correction chiffrée :** slot `MEMORY` ramené de 1 200 à **400 tokens maximum**, et restreint aux types `DÉCISION` et `RÈGLE`. Les `PRÉFÉRENCE` et `HYPOTHÈSE` ne sont plus jamais injectées dans un appel de codage — elles vont dans la chaîne d'outils ou nulle part. Ta « personnalisation illimitée » devient un fichier de config, pas un prompt.

## B.4 Autres défauts de la v1.0

**Le nœud `REVIEW` visuel par modèle est du gaspillage.** Deux appels multimodaux pour un verdict que ton œil rend en 3 secondes sur la preview. Garde la capture automatique, supprime le juge.

**La phase 7 (proactivité) est un piège.** Coût de construction réel, valeur incertaine, et le mode de panne — le bruit de notifications — te fera tout couper. Supprimée de la v2.

**Le `MEMORY_EXTRACT` sur 5 types est trop ambitieux pour un premier système.** Deux types font 90 % de la valeur : `DÉCISION` (pourquoi tu as tranché) et `RÈGLE` (ce qui est interdit). Le reste est de la collection.

**Risque de sécurité aggravé, pas atténué.** En intégrant un harnais tiers, tu ajoutes sa surface d'attaque à la tienne. Le rappel utile : <cite>OpenClaw a divulgué 9 CVE en 4 jours en mars 2026, dont une à CVSS 9.9.</cite> La séparation worker/secrets passe de « bonne pratique » à condition d'existence.

## B.5 Le point où ta v1.0 avait raison et où personne d'autre ne fait mieux

À vérification faite : **aucun harnais existant ne conditionne la complétion à une preuve machine.** Tous déclarent terminé quand le modèle le dit. Ta porte de vérification et surtout le **rouge-avant-vert** n'existent nulle part dans les outils examinés. C'est ton vrai différenciateur, et il est plus important que tout le reste du système.

---

# PARTIE C — Outils examinés, verdict d'intégration

| Outil | Ce qu'il fait mieux | Décision | Pourquoi |
|---|---|---|---|
| **OpenHands** | boucle de codage + sandbox Docker + mode headless CI | **Intégrer comme exécuteur** | remplace 40 % de ton code par du testé |
| **GitHub Spec Kit** | artefacts spec/plan/tâches avec points de contrôle | **Adopter le format** | ta phase 5, déjà standardisée |
| **AGENTS.md** | conventions lues par 20+ outils, coût token nul | **Adopter par projet** | personnalisation gratuite et portable |
| **Copilot coding agent** | qualité frontier depuis mobile, PR brouillon | **Utiliser comme palier haut** | 200 crédits/mois = les étapes difficiles |
| **Claude (crédit Agent 20 $)** | arbitrage, architecture | **Garder, usage restreint** | pool séparé du personnel |
| **LiteLLM** | routage multi-fournisseurs | **Intégrer** | n'écris pas de routeur |
| **OpenClaw** | multi-canal, mémoire, heartbeat | **S'inspirer, ne pas déployer** | grappe de CVE + tu n'as pas besoin de 50 canaux |
| **Hermes Agent** | apprentissage de compétences (GEPA) | **Observer** | prometteur, non validé indépendamment |
| **mini-SWE-agent** | harnais minimal et lisible | **Lire le code** | meilleure école pour comprendre une boucle |
| **Gemini CLI** | — | **Éviter** | retiré le 18 juin 2026 |
| **OpenCode** | TUI, plan/build | **Non** | interactif, pas headless-CI |
| **NemoClaw** | fork durci, garde-fous NeMo | **Non** | poids entreprise injustifié |

---

# PARTIE D — Graphe de dépendances et chemin critique

## D.1 Les trois artefacts qui débloquent tout le reste

```
        [1] SCHÉMA DE CONTRAT D'ÉTAPE
         (intention + critères + portée + commandes)
                        │
     ┌──────────────────┼──────────────────┬────────────────┐
     ▼                  ▼                  ▼                ▼
 vérification    prompt OpenHands    UI de preuve    extraction mémoire
 rouge-avant-vert                                    
     │
     ▼
        [2] FORMAT DE BUNDLE DE PREUVE
                        │
     ┌──────────────────┼──────────────────┐
     ▼                  ▼                  ▼
   écran mobile    notifications    détection de fausse déclaration
                                    (ton KPI n°1)

        [3] AGENTS.md + chaîne d'outils par projet
                        │
     ┌──────────────────┼──────────────────┬────────────────┐
     ▼                  ▼                  ▼                ▼
 OpenHands      agent Copilot      tes propres nœuds    coût token nul
```

Trois artefacts, tous déclaratifs, aucun n'exige de modèle. Ils conditionnent absolument tout le reste. **Fais-les avant d'écrire une ligne de logique.**

## D.2 Chemin critique

```
séparation secrets/worker
        ↓
schéma de contrat d'étape          ← artefact 1
        ↓
harnais de vérification + rouge-avant-vert    ← ton différenciateur
        ↓
OpenHands headless dans Actions
        ↓
bundle de preuve + surface mobile   ← artefact 2
        ↓
négociation de plan (Spec Kit)
        ↓
mémoire DÉCISION/RÈGLE
```

Tout ce qui n'est pas sur ce chemin est optionnel.

---

# PARTIE E — LA VERSION FINALE

## JARVIS v2.0 — Superviseur, pas harnais

**Définition :** JARVIS ne code pas. Il négocie un plan avec toi, découpe le travail en étapes à critères vérifiables, délègue chaque étape à un exécuteur existant (OpenHands, ou l'agent Copilot pour les étapes difficiles), refuse de déclarer terminé sans preuve machine, et te présente le tout sur une surface mobile conçue pour décider en dix secondes.

---

## E.1 Ce qui change par rapport à la v1.0

| # | Changement | Nature |
|---|---|---|
| 1 | La boucle `EDIT/DIAGNOSE/REPAIR` est déléguée à OpenHands | suppression de code |
| 2 | Semaine 0 : une semaine d'usage réel de l'agent Copilot depuis mobile, avant tout développement | ajout |
| 3 | Slot `MEMORY` : 1 200 → 400 tokens, `DÉCISION` et `RÈGLE` uniquement | correction chiffrée |
| 4 | AGENTS.md par projet devient le porteur des conventions | déplacement |
| 5 | Format Spec Kit adopté pour la négociation de plan | adoption |
| 6 | Nœud `REVIEW` visuel supprimé ; capture conservée | suppression |
| 7 | Proactivité (phase 7) supprimée | suppression |
| 8 | Deux exécuteurs, choisis par difficulté : OpenHands (gratuit, volume) / Copilot (crédits, étapes dures) | ajout |
| 9 | Routeur : LiteLLM au lieu de code maison | adoption |
| 10 | **Rouge-avant-vert promu au rang de fonctionnalité centrale** | promotion |

## E.2 Pourquoi

**1, 9** — Tu ne peux pas battre un harnais à 75k étoiles sur son propre terrain avec ton temps disponible. Tu peux battre tout le monde sur la vérification, parce que personne n'y travaille.

**2** — Sans mesure de référence, tu construiras contre un adversaire imaginaire. Une semaine d'usage réel te donne le delta exact à combler.

**3, 4** — Correction imposée par la mesure : les fichiers de contexte verbeux dégradent la performance de plus de 20 % en coût. Le token le moins cher est celui que tu n'envoies pas.

**5** — L'externalisation d'artefacts intermédiaires est précisément le remède documenté à la fragilité multi-étapes. Autant utiliser le format standard.

**6, 7** — Coût réel, valeur faible ou négative. Ce sont les deux endroits où ta v1.0 dépensait le plus pour le moins.

**8** — Tes 200 crédits Copilot sont un budget de qualité rare. Dépense-les sur les 10 % d'étapes qui bloquent, pas sur les 90 % qui passent avec un modèle ouvert gratuit.

**10** — C'est ta seule vraie invention. Un test qui passait déjà avant le changement ne prouve rien ; le rendre obligatoirement rouge-puis-vert élimine toute la classe des tests décoratifs, pour quelques dizaines de secondes de CI.

## E.3 Impact attendu

**Vérifié / structurel :**
- Code à écrire réduit d'environ 55 % (estimation à partir des huit sous-systèmes de la v1.0, dont quatre supprimés ou remplacés)
- Latence constante quel que soit l'âge du projet (aucun historique accumulé — propriété de conception, pas d'optimisation)
- Coût de contexte par appel réduit de ~800 tokens sur le seul slot mémoire

**Estimé, à mesurer :**
- Taux de réussite au premier essai en hausse grâce aux critères écrits avant le code
- Fausses déclarations de succès à zéro (atteignable par construction, pas par qualité de modèle)

**Là où tu seras réellement plus productif qu'en promptant sur un ordinateur — soyons précis :**
- **Parallélisme.** Le plan Free autorise 20 jobs concurrents. Trois étapes tournent pendant que tu es en cours. Aucun laptop ne fait ça.
- **Discipline imposée.** Critères écrits avant le code, preuve avant merge. Une session laptop ne t'impose jamais ça.
- **Temps morts capturés.** Métro, entre deux cours, salle d'attente.

**Là où ce ne sera jamais mieux, et il faut l'accepter :** debug exploratoire, itération de design où tu veux voir et ajuster dans la seconde, tout ce qui demande un REPL. La v2 ne remplace pas ton laptop — elle prend les heures où tu n'en as pas, à une qualité qu'une session laptop n'atteint pas parce que les portes ne sont pas là.

## E.4 Contraintes et coûts

| Poste | Coût | Contrainte |
|---|---|---|
| Actions (dépôt public) | 0 € | job coupé à 6 h, 20 jobs concurrents |
| Actions (dépôt privé) | 0 € | 2 000 min/mois ≈ 33 h |
| OpenHands | 0 € | tu fournis le modèle ; épingle la version de l'image Docker |
| Modèles ouverts | 0 € | ~40 req/min sur NVIDIA Build ; catalogues volatils |
| Crédit Agent Claude | 0 € dans la limite de 20 $/mois | ne pas attacher de moyen de paiement |
| Copilot Student | 0 € | 200 crédits/mois, vérification académique à maintenir |
| Cloudflare Pages/Workers | 0 € | 100 000 invocations/jour |
| Neon | 0 € | — |
| **Ton temps** | **le seul coût réel** | ~6 week-ends pour les phases 0–4 |

## E.5 Risques

| Risque | Gravité | Atténuation |
|---|---|---|
| Injection de prompt via contenu externe, avec harnais tiers + jeton GitHub | **critique** | worker sans secrets ; contexte non fiable ne déclenche jamais d'effet de bord ; PR jamais auto-mergée |
| Inscriptions Copilot Student refermées (déjà suspendues en avril 2026) | élevé | **postuler cette semaine** |
| Termes NVIDIA : usage limité au développement/test | moyen | zone grise assumée ; garder une alternative européenne configurée |
| Suppression silencieuse de modèles dans un catalogue gratuit | moyen | registre déclaratif + sonde de santé (déjà en v1.0) |
| CVE dans OpenHands | moyen | version épinglée, mise à jour lue avant application, exécution en sandbox uniquement |
| **Six mois de construction pour un outil que tu aurais pu utiliser en semaine 1** | **le plus probable** | la semaine 0 existe exactement pour ça |

## E.6 Ordre d'implémentation

**Semaine 0 — Mesure.** Postule au Student Pack. Utilise l'agent Copilot depuis GitHub Mobile sur Coss by Micky, en assignant de vraies issues. Note : ce qui marche, ce qui manque, combien de crédits consommés. *Ne code rien.*

**Semaine 1 — Les trois artefacts.** Schéma de contrat d'étape (JSON). Format de bundle de preuve. AGENTS.md minimal sur un projet, plus le durcissement de la chaîne d'outils (eslint, tsconfig strict, hooks). Déclaratif uniquement.

**Semaine 2 — Le différenciateur.** Le harnais de vérification, avec rouge-avant-vert. Il tourne sur des PR écrites à la main. Aucun modèle impliqué. *Terminé quand une PR affiche « critère prouvé : rouge avant, vert après ».*

**Semaine 3 — L'exécuteur.** OpenHands headless dans Actions, alimenté par le contrat d'étape, en sortie une branche + PR. Modèle via LiteLLM. *Terminé quand dix étapes passent avec zéro fausse déclaration.*

**Semaine 4 — La surface mobile.** PWA : Console, Étape, Preview. Notifications Telegram. *Terminé quand tu pilotes une étape réelle depuis le téléphone de bout en bout.*

**Semaine 5 — La négociation.** Spec Kit + l'écran Plan éditable. `ARCHITECT` sur le crédit Agent Claude.

**Semaine 6 — La mémoire.** `DÉCISION` et `RÈGLE` uniquement, avec écran de correction. Après dix missions réelles, pas avant.

**Ensuite — Le routage par difficulté.** Étape simple → modèle ouvert gratuit. Étape bloquée deux fois → agent Copilot. Décision d'architecture → Claude. Mesuré, ajusté sur tes chiffres.

## E.7 Ce qui ne vaut PAS la peine d'être fait

- **Ton propre harnais de codage.** Le point le plus important de cet audit.
- **Ton propre routeur multi-fournisseurs.** LiteLLM existe.
- **Le juge visuel par modèle.** Ton œil sur la preview est plus rapide et plus fiable.
- **La proactivité, le digest quotidien, la veille automatique.** Coût réel, bruit garanti, tu couperas au bout d'une semaine.
- **Les cinq types de mémoire.** Deux suffisent. Les trois autres sont de la collection.
- **Déployer OpenClaw comme socle.** 50 canaux dont tu utiliseras un, une grappe de CVE, une surface d'attaque massive. Lis son architecture de gateway, c'est tout.
- **L'inférence locale.** Sur 2 OCPU sans GPU, inutilisable pour du code. Ne construis rien qui en dépende.
- **Hermes Agent maintenant.** L'idée d'apprentissage de compétences est la bonne direction, mais aucune validation indépendante. Regarde-le dans six mois.
- **Le mode `Discover`/`Challenge` du document initial.** Un modèle génère des alternatives plausibles ; il ne juge pas fiablement laquelle est meilleure. Garde la génération d'alternatives dans `ARCHITECT`, abandonne l'idée d'un juge autonome.
- **Poursuivre le « scénario ultime » du document initial comme critère de réussite.** Remplace-le par : zéro fausse déclaration, taux de complétion vérifiée mesuré par classe, minutes d'intervention décroissantes.

---

## En une phrase

**Construis la porte de vérification, la surface de preuve mobile et la mémoire de décisions — délègue tout le reste à des outils qui existent, et mesure-toi contre l'agent Copilot avant d'écrire une ligne.**
