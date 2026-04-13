# Guide - Gestion des erreurs et reprise

## Objectif

Offrir une strategie standard de gestion d erreurs pour reduire les echecs visibles utilisateur.

## Typologie

- Erreurs client (4xx): payload, auth, droits
- Erreurs serveur (5xx): indisponibilite, bug, surcharge
- Erreurs provider: timeout, refus operateur, maintenance
- Erreurs reseau: DNS, TLS, connectivite intermittente

## Matrice de reprise

- 400: corriger payload, ne pas retry automatique
- 401/403: rafraichir credentials/cle, puis retry manuel
- 404: verifier identifiant, ne pas retry en boucle
- 409: conflit logique, reconciliation necessaire
- 429: retry avec backoff et jitter
- 500/502/503/504: retry exponentiel borne

## Retry recommande

- Tentative 1 immediate
- Tentative 2 a +2s
- Tentative 3 a +5s
- Tentative 4 a +10s
- Stop ensuite + escalade

## UX minimum cote frontend

- Message utilisateur clair et actionnable
- Etat visuel pending/retry/final
- Bouton Reessayer pour erreurs recuperables
- Journal local de debug en mode dev

## Reconciliation

- Si doute, lire l etat canonique via GET /api/Payment/{paymentId}
- Prioriser etat serveur sur etat local
- Eviter double debit via idempotence metier

## KPI de qualite

- Taux d erreur par endpoint
- Taux de retry reussi
- Temps moyen de reprise
- Taux de tickets lies aux erreurs integrateur
