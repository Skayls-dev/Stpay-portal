# Guide - Tests automatises d integration

## Objectif

Eviter les regressions en validant automatiquement les parcours API critiques.

## Perimetre minimum

- Auth marchand
- Creation paiement
- Lecture statut paiement
- Reception webhook
- Cas erreur principal (auth invalide, payload invalide)

## Stack possible

- Collection Postman + Newman en CI
- Tests API Node ou .NET selon ecosysteme
- Environnement de test isole

## Scenarios a automatiser

1. Happy path paiement
2. Paiement avec provider indisponible
3. Retry apres erreur transitoire
4. Webhook double (idempotence)
5. Verifications RBAC

## Gating CI recommande

- Build OK
- Tests integration critiques OK
- Aucun test flaky connu non justifie
- Rapport archive avec historique

## Qualite des tests

- Deterministes
- Independants entre eux
- Donnees de test versionnees
- Nettoyage post-test

## Resultat attendu

- Feedback en quelques minutes
- Reduction des incidents de release
- Confiance accrue avant go-live
