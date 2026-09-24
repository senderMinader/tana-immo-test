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
