# Addendum 2 — Modèles et routage, état du marché août 2026

Complète [`GUIDE_ATELIER.md`](./GUIDE_ATELIER.md) §4.8 (le routeur) et prépare la Phase 4 (contrat de
contexte, repo map, routage, comptabilité TPM). **Ne pas construire avant la Phase 4** : ce document fige
les choix pour ce moment-là, il ne dit pas de commencer maintenant. Ce qui est déjà bâti côté ICY
(Phase 0/1 : gateway, PWA) ne dépend d'aucun de ces fournisseurs.

---

## 1. Le constat de fond

L'open-weight est le socle, mais l'auto-hébergement ne l'est pas : les meilleurs coders ouverts de 2026
sont des MoE énormes (DeepSeek V4-Pro, GLM-5.2, Kimi K3) qui demandent du multi-GPU 80 Go ou de la
mémoire unifiée massive. Sans ce matériel, ils se traitent comme des modèles API. Le choix réel n'est donc
pas open-weight vs propriétaire, c'est **chez qui** on les fait tourner gratuitement — et la vraie
ingénierie est dans la couche de routage, pas dans le modèle.

## 2. Les modèles qui comptent (août 2026)

| Modèle | Rôle prévu | Repère |
|---|---|---|
| **Kimi K3** | `EDIT` front-end | #1 Frontend Code Arena (devant Claude Fable 5) ; 93,4 % SWE-bench Verified ; MoE 2,8T, contexte 1M |
| **GLM-5.2** | `EDIT` back-end, agent long-horizon | MoE 744B/40B actifs, MIT, contexte 1M ; 81,0 Terminal-Bench 2.1, ~78,7 % SWE-bench Verified (harnais indépendant Epoch AI) |
| **DeepSeek V4 Pro** | `EDIT` back-end (secours), `DIAGNOSE` | 80,6 % SWE-bench Verified (chiffre éditeur), MIT |
| **Qwen3-Coder-Next / Qwen3.6-27B** | cible du jour où un GPU 24 Go est dispo | Qwen3.6-27B : 77,2 % SWE-bench Verified, point d'équilibre 1 GPU grand public |
| **Gemma 4** (E2B→31B dense) | `SELECT`, classification, `REVIEW` visuel | Apache 2.0, 256K contexte, multimodale, 140+ langues ; agentic tool use 6,6 %→86,4 %, code LiveCodeBench 29,1 %→80,0 % — **mais** derrière Qwen 3.5 27B sur SWE-bench Verified, AA Intelligence Index 29 contre 41 pour le meilleur ouvert US |

**Verdict :** Gemma 4 12B/E4B pour `SELECT`, la classification d'intention et `REVIEW` (multimodale,
Apache 2.0) — jamais pour `EDIT`, elle n'est pas au niveau des trois premiers sur du code.

## 3. Où exécuter gratuitement — classement réel

**NVIDIA Build (`build.nvidia.com`) — base principale.** 100+ modèles dont DeepSeek V4 Pro, GLM-5.2
(depuis le 2 juillet 2026), Llama, Qwen, Mistral, Nemotron. Endpoint compatible OpenAI, clé gratuite sans
carte bancaire, pas d'entraînement sur les prompts/réponses (stateless, sans log de contenu).

Réserves à connaître : ~40 requêtes/minute (confirmé par le staff NVIDIA sur les forums dev, mai 2026) ;
les conditions réservent l'usage au développement/test/recherche/évaluation, l'usage « production »
nécessitant AI Enterprise — un système personnel est en zone grise, à traiter en connaissance de cause.

| Fournisseur | Réalité août 2026 | Rôle |
|---|---|---|
| Cerebras | ~1M tokens/jour, catalogue réduit à 2 modèles (31 mai 2026) | batch hors ligne (`MEMORY_EXTRACT`) |
| Groq | latence imbattable, quotas réduits en 2026 (souvent 1 000 req/jour vs 14 400 avant) | petits nœuds rapides |
| Mistral | ~1 md tokens/mois, **mais entraîne sur tes données** | jamais pour du code |
| GitHub Models | 8K entrée / 4K sortie, concurrence 2 | trop petit pour `EDIT` |
| Cloudflare Workers AI | 20+ modèles, budgets généreux, inférence en périphérie | classification dans la gateway |
| OVHcloud AI Endpoints | tier gratuit permanent anonyme, 2 req/min/IP, sans clé | secours européen d'urgence |

## 4. Claude Pro — les deux pools sont étanches

Depuis le 15 juin 2026, l'usage programmatique (Agent SDK, `claude -p`, intégration GitHub Actions) ne
compte plus contre le pool interactif. Il tire sur un crédit Agent SDK mensuel séparé, facturé au tarif
API standard (20 $/mois sur Pro). L'usage interactif (terminal, IDE, web/desktop/mobile) garde ses limites
d'abonnement comme avant. **JARVIS/ICY ne peut donc plus manger l'usage personnel de Claude.**

Trois précautions :
- Le crédit ne se reporte pas et facture plein tarif une fois épuisé → pas de moyen de paiement attaché,
  ou plafond dur.
- Les jetons OAuth d'un compte Free/Pro/Max sont réservés à Claude.ai et Claude Code — pas autorisés dans
  un autre produit/outil/service. Passer par `claude-code-action` officiel, pas un jeton recopié à la main.
- Le jeton OAuth expire/s'invalide si déconnexion de Claude Code ailleurs (`claude setup-token` pour
  régénérer). Déclenchement **manuel uniquement** — jamais `pull_request: [opened, synchronize]`, la
  consommation grimpe vite.

**Rôle de Claude dans le routage :** `ARCHITECT`, `DIAGNOSE` en tentative 3, `REVIEW` final avant merge —
soit ~20-40 appels/mois, confortable dans 20 $. L'arbitre, pas l'ouvrier.

## 5. Table de routage cible (Phase 4)

| Nœud | Primaire | Secours 1 | Secours 2 |
|---|---|---|---|
| `ARCHITECT` | Claude (crédit Agent SDK) | GLM-5.2 / NVIDIA Build | DeepSeek V4 Pro |
| `EDIT` front | Kimi K3 | GLM-5.2 | Qwen3-Coder |
| `EDIT` back | GLM-5.2 | DeepSeek V4 Pro | Qwen3-Coder-Next |
| `SELECT` | Gemma 4 12B / Groq | Cerebras | heuristique pure (code) |
| `DIAGNOSE` | DeepSeek V4 Pro | GLM-5.2 | Claude si tentative ≥ 3 |
| `REVIEW` visuel | Gemma 4 (multimodal) | Gemini Flash | œil humain |
| `MEMORY_EXTRACT` | Cerebras (batch, nuit) | n'importe lequel | — |
| classification d'intention (6 classes, addendum 1) | **code déterministe** | — | — |

## 6. Sept mécanismes anti-latence / anti-panne (Phase 4)

Les trois premiers font la vraie différence :

1. **Requêtes couvertes (hedged requests).** `EDIT` : pas de premier token après 1,2 s → seconde requête
   chez le fournisseur de secours en parallèle, on garde la première qui finit, on annule l'autre. Gratuit
   sur tiers gratuits, écrase la latence de queue (le vrai problème, pas la médiane).
2. **Seau à jetons local reflétant les quotas fournisseur.** RPM/TPM/RPD comptés côté gateway ; on change
   de fournisseur *avant* le 429, jamais en réaction. Les plafonds varient d'un ordre de grandeur
   (~6 000 TPM Groq vs ~1M tokens/jour Cerebras) — la répartition est ce qui rend le débit utilisable.
3. **Registre de modèles déclaratif + sonde de santé.** Aucun nom de modèle en dur. Un YAML + un cron qui
   interroge `/models` de chaque fournisseur toutes les 6h et désactive ce qui a disparu. Sans ça : un
   catalogue élagué silencieusement casse tout, code inchangé.
4. **Coupe-circuit par fournisseur.** 3 échecs → ouvert 60s → semi-ouvert avec requête sonde.
5. **Registre de quotas avec réserve.** Consommation quotidienne loggée par fournisseur, **20 % réservés**
   au chemin critique (`DIAGNOSE`) — sinon 3 tentatives d'`EDIT` en boucle brûlent le quota du jour et plus
   moyen de diagnostiquer.
6. **Jamais un seul fournisseur sur le chemin critique.** Deux minimum par nœud, ordonnés ; un 429 change
   de route, ne retente jamais le même fournisseur.
7. **Streaming pour le ressenti, premier token comme signal de santé.** Meilleure métrique de santé
   fournisseur que le taux d'erreur.

## 7. Le local — verdict honnête

VM Oracle 2 OCPU/12 Go ARM sans GPU : Gemma 4 E4B y tourne, mais à quelques tokens/seconde — utilisable
pour classification, inutilisable pour du code. **Ne rien construire qui dépende du local.** Secours
uniquement pour les petits nœuds ; cible future si GPU 24 Go disponible : Qwen3.6-27B.
(Note ICY : la piste VM Oracle est de toute façon abandonnée côté JARVIS depuis le 2026-08-12 — non
pertinent pour l'instant ici non plus.)

## 8. Trois pièges avant de coder cette couche

- Certains tiers gratuits sont indisponibles UE/UK/Suisse — vérifier à l'inscription depuis la France
  avant d'en faire une dépendance.
- Mistral Experiment est généreux mais s'entraîne sur tes données → jamais pour du code privé, même de
  test.
- Les noms de modèles changent plus vite que le code. Le registre déclaratif (§6.3) n'est pas du confort :
  c'est ce qui décide si le système tient encore debout dans six mois.
