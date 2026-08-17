# Addendum 1 — Classes de demandes, recherche, et preuve du code

Complète [`GUIDE_ATELIER.md`](./GUIDE_ATELIER.md), ne le remplace pas. Répond à trois questions posées
après la V1.0 du guide : comment le système distingue les types de demandes, s'il peut chercher sur le
web, et si le code produit est réellement prouvé ou seulement estimé correct.

---

## 1. Les six classes de demandes

Chaque classe a son budget, sa boucle et son type de preuve. Le système les distingue **avant** de lancer
quoi que ce soit.

**BUILD** — « étape 3 » · « refais la palette en plus sombre, garde le layout » · « ajoute la pagination sur
la liste produits »
→ Preuve : diff, build, tests, commit, preview.

**RESEARCH** — « Zustand ou Context pour ce cas ? » · « comment les autres gèrent le panier invité » ·
« est-ce que Next 16 casse mon middleware »
→ Preuve : sources, contradictions, ce qu'il n'a pas pu vérifier.

**DIAGNOSE** — « pourquoi le build casse depuis hier » · « la preview est lente, trouve pourquoi »
→ Preuve : hypothèse + expérience qui la confirme ou l'infirme. Pas de correction sans accord.

**REVIEW** — « audite l'auth » · « ce composant est-il accessible » · « où sont mes secrets exposés »
→ Preuve : liste de constats localisés fichier+ligne, sévérité, aucun changement de code.

**OPS** — « déploie » · « relance la migration » · « ouvre une PR de la branche step-7 »
→ Preuve : exit code, URL vivante, capture de l'état après.

**ASK** — « c'est quoi le nom de ma table users déjà » · « où j'en suis sur Coss by Micky »
→ Réponse directe en 1–3 s, aucune mission créée.

**Point de performance :** la classification est une règle déterministe côté gateway, jamais un modèle. Une
question ne doit jamais déclencher un pipeline de six minutes. En cas de doute persistant, l'interface
demande — un tap, pas une devinette.

---

## 2. La recherche — oui, avec deux réserves

**Ce que renvoie une mission RESEARCH :** la question reformulée, 3 à 6 sources hiérarchisées (doc
officielle > code source > article > forum), les points de contradiction entre sources, une
recommandation, et explicitement ce qui n'a pas pu être vérifié. Quand la recherche débouche sur un choix,
elle produit un `docs/adr/00X-choix.md` commité (décision, date, alternatives écartées, raisons) — c'est ce
fichier qui alimente ensuite la mémoire `DÉCISION`.

**Réserve 1 — la recherche gratuite est contrainte et instable.** Brave a supprimé son tier gratuit
(remplacé par 5 $ de crédit mensuel, ~1 000 recherches avant facturation). Options encore gratuites :
Tavily (1 000 crédits/mois, sans carte — meilleur défaut), Firecrawl (1 000 crédits/mois), SerpApi
(250 recherches/mois). SearXNG auto-hébergé sur ta VM est la seule option réellement illimitée à 0 €.
Traduction concrète : ~30 recherches/jour gratuites — assez pour de la décision, pas pour de la veille
automatique agressive. Donc **la recherche se déclenche à la demande ou quand un nœud déclare un manque**,
jamais « au cas où ».

**Réserve 2, non négociable.** Tout ce qui vient du web entre dans un contexte marqué non-fiable, dont la
sortie ne peut **jamais** déclencher directement une action à effet de bord. Un résultat de recherche peut
proposer une décision ; il ne peut pas déclencher un commit. C'est le vecteur d'injection déjà identifié
dans le guide (§9) — cette séparation est la seule vraie protection.

---

## 3. Non, le code n'est pas « estimé correct »

**Prouvé, sans intervention d'un modèle :**

| Niveau | Ce qui est vérifié | Comment |
|---|---|---|
| 0 | le code existe vraiment sur le remote | SHA du commit interrogé via l'API |
| 1 | ça compile, les types passent | `tsc`, `build`, exit code |
| 2 | conventions respectées | lint, format, exit code |
| 3 | les tests passent | runner, exit code |
| 4 | le parcours marche | E2E Playwright, exit code |
| 5 | c'est en ligne | preview qui répond 200 |

**Non prouvable par machine :** « c'est joli », « c'est ce que je voulais » — c'est l'œil sur la preview,
d'où le verdict `needs_human_eye` (déjà dans `REVIEW`, §4.6).

**Le vrai piège :** si le même modèle écrit le code *et* le test, il peut écrire un test qui passe sans
rien prouver. Deux mécanismes contre ça :

1. **Critères gelés avant le code.** Les commandes d'acceptation sont écrites pendant la négociation du
   plan, validées par l'utilisateur, inscrites dans le contrat d'étape. Le nœud EDIT ne peut pas les
   modifier : les fichiers de test correspondants sont **hors de sa portée déclarée** (`scope`) — un diff
   qui les touche est rejeté automatiquement.
2. **Rouge avant vert.** La vérification tourne deux fois : sur le commit d'avant, puis sur celui d'après.
   Le test d'acceptation doit **échouer avant** et **réussir après**. S'il passait déjà avant, il ne teste
   rien de nouveau → étape `BLOCKED`, raison « test non discriminant ».

Combiné au `self_check` déjà prévu au §4.4 (coché par le modèle, invalidé ou non par la machine, loggé
séparément comme indice de fiabilité par modèle) : au bout de trente étapes, le taux de mensonge de chaque
modèle est mesuré, pas supposé.
