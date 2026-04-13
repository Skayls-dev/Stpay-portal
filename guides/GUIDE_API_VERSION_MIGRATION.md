# Guide - Migration de version API

## Objectif

Faire evoluer les integrateurs sans rupture de service.

## Strategie

1. Publier changelog clair et date de deprecation
2. Maintenir compatibilite transitoire
3. Proposer guide de migration pas a pas
4. Mesurer adoption de la nouvelle version

## Contenu d une release note utile

- Ce qui change
- Pourquoi cela change
- Impact integrateur
- Action requise
- Date limite
- Exemple avant/apres

## Plan technique

- Versionner endpoints ou contrats
- Ajouter feature flags si necessaire
- Fournir SDK/collection Postman alignes
- Garder telemetry par version

## Verification

- Tests de non-regression v1
- Tests complets v2
- Monitoring erreurs par version
- Support renforce durant la transition

## Sunset policy

- Communication J-60, J-30, J-7
- Blocage progressif apres date cible
- Canal support prioritaire migration
