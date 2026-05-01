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

## Formation marchands - Gestion securisee des cles API

Les marchands doivent etre formes sur les pratiques suivantes avant toute mise en production :

### Stockage par variables d environnement
- Ne jamais inscrire une cle API en dur dans le code source (ni frontend, ni backend)
- Utiliser des variables d environnement (`.env`, secret manager, vault) pour stocker les cles
- Les fichiers `.env` doivent etre dans `.gitignore` et ne jamais etre commites

### Rotation obligatoire tous les 90 jours
- Planifier une rotation de cle tous les 90 jours minimum
- Generer la nouvelle cle depuis le portail marchand, la deployer, puis revoquer l ancienne
- En cas de doute sur une fuite, revoquer immediatement sans attendre l echeance

### Ne jamais committer une cle
- Activer le secret scanning sur le depot (GitHub Advanced Security, GitGuardian, etc.)
- En cas de commit accidentel : revoquer la cle immediatement, purger l historique git, auditer les acces
- Former l equipe de developpement a verifier les fichiers stagges avant chaque `git commit`

## Checklist

- Rotation cle active (echeance <= 90 jours)
- Variables d environnement utilisees, aucune cle en dur dans le code
- Secret scanning active dans repo
- Regles RBAC testees
- Alertes securite configurees
- Equipe formee aux bonnes pratiques de gestion des cles