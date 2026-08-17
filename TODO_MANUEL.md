# Actions manuelles en attente (ICY)

Rien ici ne bloque le développement en cours — je continue sur tout ce qui ne dépend pas de ces
actions. Coche au fur et à mesure ; dis-moi quand c'est fait ou donne-moi directement la valeur produite.

## 1. GitHub Student Developer Pack — optionnel, non bloquant
- Où : https://education.github.com/pack, avec l'email Lyon 1.
- Pourquoi : GitHub Pro gratuit + quota Codespaces relevé.
- Impact si pas fait : aucun pour l'instant — le repo `icy` est déjà public, donc déjà en minutes
  Actions illimitées sans ce pack.

## 2. Compte Neon (base de données) — pas bloquant avant la Phase 2
- Où : https://neon.tech (signup).
- Pourquoi : persistance des objets Mission / Étape / Mémoire typée (§1 du guide) à partir de la
  Phase 2 (VERIFY + preuves + statuts GREEN/BLOCKED).
- Une fois créé : donne-moi la connection string (`postgres://...`), je la mets en secret GitHub +
  Cloudflare, jamais ailleurs.

## 3. Bot Telegram ICY — bloquant pour finir la Phase 1
- Comment : ouvrir Telegram → chercher **@BotFather** → `/newbot` → suivre les étapes → il te donne
  un token (`123456:ABC-...`).
- Pourquoi : Phase 1 se termine quand une notification Telegram arrive avec le lien de la PR après un
  déclenchement depuis le téléphone. Sans bot, cette dernière brique manque.
- Une fois créé : donne-moi le token (et si tu veux réutiliser le bot JARVIS existant plutôt qu'en
  créer un nouveau, dis-le — plus simple mais mélange les notifications des deux projets).

## 4. PAT fine-grained scopé au repo `icy` — reçu, mais il manque un scope
- **Statut : reçu et vérifié le 2026-08-17** — bien restreint au seul repo `icy` (testé : 404 sur LBS,
  jarvis-control-plane, jarvis-artifacts — tous privés ; 200 sur JARVIS mais c'est normal, ce repo est
  public donc lisible par n'importe qui, pas une preuve de fuite).
- **Mais** : `Contents: Read and write` + `Actions: Read and write` ne suffisent pas pour ouvrir une PR.
  Testé en conditions réelles le 2026-08-17 17:00 : `gh pr create` échoue avec
  `Resource not accessible by personal access token (createPullRequest)`. Il manque le scope
  **Pull requests: Read and write**.
- **Action requise :** retourne sur https://github.com/settings/personal-access-tokens, ouvre le token
  `icy-gateway`, ajoute la permission **Pull requests → Read and write**, sauvegarde. Si l'édition en
  place n'est pas proposée par l'interface, régénère le token avec ce scope en plus et renvoie-moi la
  nouvelle valeur (l'ancienne sera remplacée partout où elle est stockée : Cloudflare + secret GitHub
  `ICY_PAT`).
- Où (si nouveau token) : https://github.com/settings/personal-access-tokens/new
- Réglages : **Repository access → Only select repositories → icy** (uniquement celui-là) ;
  Permissions → **Contents: Read and write**, **Actions: Read and write**, **Pull requests: Read and
  write**.
- Pourquoi : c'est ce qui permet au Gateway (Cloudflare Worker) de déclencher `repository_dispatch`
  sur `icy` depuis ton téléphone, sans passer par le PC.
- Vérification que je ferai avant de l'utiliser : test contre un autre de tes repos (doit renvoyer 404,
  sinon le scope est trop large — même méthode que pour le PAT du projet LBS plus tôt dans ce projet).
- **Deuxième raison, trouvée en testant `verify.yml` (Phase 2, amorce) :** GitHub n'enchaîne jamais un
  workflow sur un événement `pull_request`/`push` produit par le `GITHUB_TOKEN` par défaut — protection
  anti-boucle native de la plateforme, vérifié en conditions réelles (la PR #2 ouverte par `bootstrap.yml`
  n'a déclenché aucun run de `verify.yml`, conclusion `action_required`, 0 job). Tant que `bootstrap.yml`
  utilise `github.token` pour committer/ouvrir la PR, aucune vérification automatique ne pourra tourner
  dessus. Le PAT scopé réglera aussi ça : dès qu'il remplace `github.token` dans `bootstrap.yml`, les PR
  qu'il ouvre redeviennent capables de déclencher `verify.yml` normalement.

---

## Déployé et vérifié (Phase 1)
- Gateway : https://icy-gateway.nourredinediallo.workers.dev (`/health` → 200, `/dispatch` → 401 sans
  bon secret, 503 tant que le point 4 n'est pas fait — comportement voulu).
- PWA Console : https://icy-app.pages.dev (ouvre-la sur ton téléphone, ajoute-la à l'écran d'accueil pour
  l'effet app).
- Dans la PWA, ouvre "Configuration du gateway" et renseigne l'URL ci-dessus et le secret partagé.
  **Le secret n'est jamais écrit ici : ce repo est public.** Il est dans `ICY/.env` en local
  (gitignoré) — récupère-le avec `grep ICY_SHARED_SECRET /home/land/JARVIS/ICY/.env`, ou demande-le-moi
  dans le chat.

---

**Déjà fait, pas d'action nécessaire :** compte Cloudflare (réutilisé, `CLOUDFLARE_API_TOKEN` déjà dans
`.env`, revérifié fonctionnel avec Node 22) ; compte GitHub (déjà authentifié, `gh` a les scopes
`repo`+`workflow`) ; VM Oracle (abandonnée le 2026-08-12, non pertinente ici).
