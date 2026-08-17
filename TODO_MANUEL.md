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

## 4. PAT fine-grained scopé au repo `icy` — bloquant pour finir la Phase 1
- Où : https://github.com/settings/personal-access-tokens/new
- Réglages : **Repository access → Only select repositories → icy** (uniquement celui-là) ;
  Permissions → **Contents: Read and write**, **Actions: Read and write**.
- Pourquoi : c'est ce qui permet au Gateway (Cloudflare Worker) de déclencher `repository_dispatch`
  sur `icy` depuis ton téléphone, sans passer par le PC.
- Vérification que je ferai avant de l'utiliser : test contre un autre de tes repos (doit renvoyer 404,
  sinon le scope est trop large — même méthode que pour le PAT du projet LBS plus tôt dans ce projet).

---

**Déjà fait, pas d'action nécessaire :** compte Cloudflare (réutilisé, `CLOUDFLARE_API_TOKEN` déjà dans
`.env`, revérifié fonctionnel avec Node 22) ; compte GitHub (déjà authentifié, `gh` a les scopes
`repo`+`workflow`) ; VM Oracle (abandonnée le 2026-08-12, non pertinente ici).
