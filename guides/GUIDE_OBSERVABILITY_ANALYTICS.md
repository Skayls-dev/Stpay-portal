# Guide - Observabilite et analytics d integration

## Objectif

Mesurer la qualite de l integration et detecter vite les regressions.

## Evenements recommandes

- merchant_login_success
- api_key_created
- first_payment_requested
- payment_status_checked
- webhook_received
- webhook_failed
- postman_minimal_downloaded

## KPI noyau

- Taux de conversion onboarding dev
- Taux de succes premier paiement
- Temps median premier paiement
- Taux de succes webhook
- Erreurs 4xx/5xx par endpoint

## Dashboards minimum

1. Funnel onboarding developpeur
2. Sante API par endpoint
3. Sante providers par operateur
4. Qualite webhooks

## Alertes recommandees

- Erreurs 5xx > seuil pendant 5 min
- Chute brutale taux succes paiement
- Hausse latence p95
- Echec webhook > seuil

## Bonnes pratiques

- Correlation ID sur chaque requete
- Conserver contexte user/merchant
- Eviter donnees sensibles en clair dans les logs
- Standardiser les noms d evenements

## Cadence operationnelle

- Revue quotidienne des KPI critiques
- Revue hebdo des tendances
- Plan d action mensuel sur causes racines
