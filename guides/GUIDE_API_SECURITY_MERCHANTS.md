# Guide - Securite API pour marchands

## Objectif

Mettre en place un socle securite simple et strict pour integrateurs marchands.

## Regles de base

- Une cle par environnement (dev, staging, prod)
- Aucune cle en dur dans le code frontend public
- Rotation periodique des cles
- Revocation immediate en cas de fuite

## Stockage secret

- Backend: variables d environnement ou secret manager
- Mobile: stockage securise (keystore/keychain)
- CI/CD: variables protegees, jamais en clair dans les logs

## Controle d acces

- Utiliser les scopes/permissions minimales
- Separer roles admin et marchand
- Journaliser toute operation sensible

## Transport

- HTTPS obligatoire en staging/prod
- Refuser certificats invalides
- Timeouts et limite de taille payload

## Defenses applicatives

- Validation stricte des entrees
- Protection replay (nonce/timestamp si applicable)
- Rate limit par cle API
- Blocage automatique apres abus detecte

## Audit minimum

- Qui a utilise quelle cle et quand
- Endpoint cible et resultat (code HTTP)
- Origine IP/agent quand disponible

## Checklist

- Rotation cle active
- Secret scanning active dans repo
- Regles RBAC testees
- Alertes securite configurees
