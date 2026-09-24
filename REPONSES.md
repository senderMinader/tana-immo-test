# Partie 1

## Anomalies identifiés : 

### Extrait A
| Problème | Gravité | Correction proposé |
| :--- | :---: | :--- |
| Anti-pattern d'utilisation de `useEffect` sans tableau de dépendance, l'effet sera executé à chaque re-rendu | Grave | rajouter un tableau de dépendance, dépandant du variable city `useEffect((), [city])`|
| La requête n'est pas paginé, risque de surcharge mémoire si l'application affiche des milliers d'annonces | Grave | Implémenter un mecanisme de pagination |
| Le composant a plusieurs responsabilités, entrainant des difficultés de maintenance et reduisant la performance | Moyen - bonne pratique | séparation des responsabilités et des logiques requêtes dans d'autre fichiers ou services réutilisable et testable unitairement |
| Manque de gestion d'erreur si la requête échoue, chargement inifini à l'écran | Grave | Ajouter une nouvelle variable d'état `error` `const [error, setError] = useState(false)`, Envelopper l'appel d'API dans un bloc try catch finally, gérer l'erreur dans `catch` et arreter le chargement dans `finally` |
| Utilisation d'une liste sans `key`, anti-pattern dans React, peut affecter les performances | Grave | Rajouter un key `<li key={l.id}>` |
| l'adresse du serveur ambigu dans l'url de la requête, dans le cas ou l'application suis l'architecture client / API | Moyen | Préciser l'adresse du serveur dans un variable d'environnement |
| Amélioration dans l'affichage du prix, si la valeur retournée est nulle ou de type numérique | Moyen | Utiliser Typescript ou rajouter `{l.title} – {l.price?.toLocaleString()} Ar` |

### Extrait B
| Problème | Gravité | Correction proposé |
| :--- | :---: | :--- |
| Pagination inutilisée | Grave | utiliser le query params `page` correctement en calculant un OFFSET `const offset = (page - 1)*limit` |
| Requete SQL `SELECT` sans `limit`, risque de surcharge de mémoire | Grave | utiliser `limit`|
| Risque d'injection SQL avec `${city}` | Critique | Utiliser une requête parametrée |
| Requete SQL mal optimisé, les récupérations de agency et photos peuvent être combinés avec la première requête en utilisant des jointures SQL | Grave | combiner avec des jointures SQL |
| manque de gestion d'erreur | Moyen | Implémenter un mécanisme de gestion d'erreur |

## Extrait C
| Problème | Gravité | Correction proposé |
| :--- | :---: | :--- |
| Absence d'indempotence | Grave | Ajouter un mecanisme d'idempotence |
| Aucune gestion d'erreur au niveau de 3 opérations critiques | Grave | Ajouter un mecanisme de gestion d'erreur |
| Traitement asynchrone lente (notification de 8s) | Grave | Utiliser un système de message queue |
| Aucune validation de données d'entrée | Moyen | Verifier `event` |
|(***Proposition d'une intelligence artificielle) Aucune vérification de signature, chaque utilisateur peut executer la requête POST de l'URL et obtenir un payement | Critique | Ajouter une vérification de signature de payement |


# Partie 3
## 3.1 Scénario
Voici mon plan d'action pour gérer la situation :
**30 premières minutes :**
- Je rassure le client que je suis en cours d'investigation, et que l'on va chercher à retablir le service au plus vite
- Je consulte de suite les logs du serveur, en confirmant que l'API est bien concerné
- Je demande au client de suspendre la campagne SMS pour limiter les nouveaux utilisateurs jusqu'à ce que le bug a été corrigé. De plus, c'est le pic nouveaux utilisateurs qui a déclenché la surcharge
- J'identifie les erreurs et je verifie si c'est le même erreur redondant ou il y a différentes erreurs
- Je repère quelle requête provoque l'erreur le plus redondant
- Je consulte le base code en analysant ce que fait concrètement la requête
- J'analyse les métriques du serveur pour savoir si la forte charge est au niveau du CPU, de la RAM ou d'une connexion avec une base de données ou service tiers
- Je fais une estimation de la suite des actions à faire : 
  1 - continuer à chercher l'origine du bug en sollicitant un collègue/référant technique
  2 - bug trouvé et corrigeable avec un patch de quelques lignes ou une reécriture complète d'une fonctionnalité métier
- Mon hypothèse c'est que l'application commence à enregistrer plusieurs annonces dans la base de données, plusieurs utilisateurs consulte la liste des annonces en même temps avec le code sans pagination, des requêtes SQL avec N+1 query, aucune clé d'indepotence. Ces faits surchargent le serveur.
- Je communique mon estimation au client 
- J'entamme la préparation d'un correctif ciblé (ce que j'ai proposer dans la partie 1)
- Je pousse le correctif en s'assurant d'avoir un rollback rapide en cas de problème inattendu
- Je teste si l'endpoint n'a pas connu de regression après la correction
- Je fais un monitoring des metriques et je m'assure que les charges se stabilisent et le taux d'erreur descent

**Ce que je ferai le lendemain :**
- Je vérifie la stabilité du serveur en consultant les logs (taux d'erreurs, temps de réponse, etc)
- J'améliore la partie du code concernée, en appliquant le principe de séparation des responsabilités (le contrôleur ne doit pas contenir la logique métier).
- J'ajoute des verifications des inputs utilisateurs pour l'API (Joi ou Zod)
- J'implémente un middleware de gestion centralisée des erreurs et je l'applique à l'endpoint.
- J'informe l'équipe de ce qui a provoqué l'incident. Je présente les solutions dont j'ai appliqué et je demande l'avis des autres membres de l'équipe sur comment éviter cet incident la prochaine fois entre autres que mes patchs
- J'audite les autres endpoints pour identifier d'éventuels besoins de refactoring ou d'amélioration de la gestion d'erreurs.
- Effectuer des tests de simulation de forte charge avec des données fictives en pré-production

## 3.2 Avant le lancement:
(Cette partie a été entièrement généré par une intelligence artificelle, je manque encore de l'expérience sur la partie Ops)
Voici les 4 alertes que je mettrai en place pour être prévenu avant les utilisateurs : 
| Métrique surveillée | Seuil de déclenchement | Outil |
| :---: | :---: | :--- |
| Taux d'erreurs HTTP 5xx | > 1 % sur une fenêtre glissante de 5 min | Datadog (ou Grafana + Prometheus)|
| Latence P95 de l'API | > 2 secondes soutenues pendant 3 min | Datadog APM (ou New Relic) |
| Connexions PostgreSQL actives | > 80 % du pool de connexions (max_connections) | Datadog Database Monitoring (ou pgBouncer + Grafana) |
| Taux d'échec des appels CRM externe | > 5 % d'erreurs (timeout, 5xx) sur 5 min | Sentry (ou Datadog Synthetic / Health Checks)|


**Pourquoi ces 4 alertes ?**
Elles couvrent les 3 couches critiques de l'architecture : l'API elle-même (1, 2), la base de données (3), et le service tiers (4). Les seuils sont volontairement bas mais pas trop pour éviter l'alert fatigue tout en détectant une dégradation avant que les utilisateurs ne la ressentent. Chaque alerte est routée vers un canal Slack dédié (#alerts-prod) avec un système d'escalade (PagerDuty) si non acquittée sous 10 minutes.