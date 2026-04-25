# PSI-STPAY-2025-001 — Politique de Sécurité de l'Information

**Référence :** PSI-STPAY-2025-001  
**Version :** 1.0  
**Date d'émission :** Avril 2025  
**Date de révision :** Avril 2026  
**Émis par :** Direction Générale — ST Pay Cameroun SARL  
**Classification :** CONFIDENTIEL — Usage interne  
**Statut :** APPROUVÉ

---

## 1. Introduction et Contexte

### 1.1 Présentation de l'Organisation

ST Pay Cameroun SARL (ci-après « ST Pay ») est une société à responsabilité limitée de droit camerounais, dont le siège social est établi à Douala, Cameroun. ST Pay opère en qualité d'agrégateur de paiement mobile money, permettant aux marchands et entreprises d'accéder de manière unifiée aux infrastructures des opérateurs MTN Mobile Money, Orange Money, Wave et Moov sur la zone CEMAC.

La plateforme propose notamment :

- Un moteur d'agrégation multi-opérateurs avec basculement automatique entre providers
- Un module d'escrow natif permettant la séquestre et la libération conditionnelle de fonds
- Une passerelle de paiement transfrontalier XAF ↔ international
- Des API sécurisées à destination des marchands, développeurs et partenaires
- Un portail d'administration et des tableaux de bord d'observabilité en temps réel

### 1.2 Objet de la Politique

La présente Politique de Sécurité de l'Information (PSI) constitue le document fondateur du cadre de sécurité de ST Pay. Elle énonce les principes directeurs, les obligations et les règles de conduite applicables à l'ensemble des actifs informationnels de l'organisation.

Cette politique vise à garantir la confidentialité, l'intégrité et la disponibilité (triade CIA) des informations traitées par ST Pay, qu'il s'agisse de données de transaction, de données personnelles de clients, de données techniques ou de données commerciales.

### 1.3 Cadre Légal et Réglementaire Applicable

ST Pay reconnaît et se conforme aux textes suivants :

- Loi n° 2010/012 relative à la cybersécurité et à la cybercriminalité au Cameroun (articles 7, 13, 14, 32 et 61)
- Décret n° 2012/1643/PM du 14 juin 2012 fixant les conditions et modalités d'audit obligatoire des réseaux de communications électroniques
- Décision n° 0000039/MINPOSTEL du 04 avril 2025 fixant les modalités des plateformes numériques ouvertes au public
- Règlement COBAC EMF/2017/01 sur les établissements de monnaie électronique
- Directives BEAC sur les systèmes de paiement dans la zone CEMAC
- Recommandations FATF/GAFI sur la lutte contre le blanchiment d'argent (AML) et le financement du terrorisme (CFT)
- Norme PCI-DSS v4.0 (Payment Card Industry Data Security Standard)
- Normes ISO 27001:2022 et ISO 27002:2022 (Système de Management de la Sécurité de l'Information)

---

## 2. Périmètre d'Application

### 2.1 Personnes Concernées

La présente politique s'applique, sans exception, à :

1. Tout le personnel salarié de ST Pay Cameroun SARL, quel que soit son département ou niveau hiérarchique
2. Les prestataires, sous-traitants et consultants ayant accès aux systèmes ou données de ST Pay
3. Les partenaires intégrateurs et marchands disposant d'un accès API à la plateforme ST Pay
4. Tout acteur tiers participant aux opérations de la plateforme

### 2.2 Systèmes et Actifs Couverts

Le périmètre technique couvert inclut :

- La plateforme backend ST Pay (ASP.NET Core 8, PostgreSQL, Redis, Hangfire) hébergée en environnement cloud et/ou datacenter partenaire
- Le portail d'administration front-end (React/TypeScript)
- Les interfaces API exposées aux marchands (endpoints REST authentifiés par clé API HMAC-SHA256)
- Les adaptateurs d'intégration opérateurs : MTN MoMo, Orange Money CM, Wave, Moov (adaptateurs `IProviderAdapter`)
- Les systèmes de messagerie et de notification (webhooks, alertes Sentry)
- Les environnements de développement, de test (sandbox) et de production
- Les postes de travail et équipements utilisés par le personnel pour accéder aux systèmes ST Pay
- Tout système tiers connecté par API ou flux de données

### 2.3 Exclusions

Sont exclus du périmètre direct de cette politique, mais restent soumis aux accords contractuels de sécurité :

- Les infrastructures internes des opérateurs partenaires (MTN, Orange) sous leur propre gouvernance
- Les terminaux personnels des clients finaux (porteurs de comptes mobile money)

---

## 3. Principes Fondamentaux de Sécurité

### 3.1 La Triade CIA

| Pilier | Définition | Application ST Pay |
|---|---|---|
| Confidentialité | Seules les personnes autorisées accèdent aux informations | Hachage SHA-256 des clés API, chiffrement TLS 1.3 en transit, PIN Orange jamais loggé |
| Intégrité | Les informations ne sont pas altérées de manière non autorisée | Signatures HMAC-SHA256 sur les webhooks, audit log immuable en base de données |
| Disponibilité | Les systèmes sont accessibles quand nécessaire | Redis cache, retry exponentiel sur provider failure, dead-letter queue, PgBouncer |

### 3.2 Principes Complémentaires

- **Moindre privilège :** chaque acteur dispose uniquement des droits strictement nécessaires à sa fonction
- **Défense en profondeur :** les contrôles de sécurité sont organisés en couches indépendantes
- **Séparation des tâches :** les fonctions critiques (initiation et validation d'une opération financière) ne peuvent être exercées par un seul individu
- **Traçabilité :** toute action sur les systèmes ST Pay est journalisée de manière immuable
- **Privacy by design :** la protection des données personnelles est intégrée dès la conception des fonctionnalités
- **Amélioration continue :** la posture de sécurité fait l'objet d'évaluations régulières et d'un processus formel de révision

---

## 4. Classification des Données et Actifs Informationnels

### 4.1 Niveaux de Classification

| Niveau | Exemples ST Pay | Règles de traitement |
|---|---|---|
| STRICTEMENT CONFIDENTIEL | PIN Orange Money, clés API production, credentials base de données, clés de signature HMAC | Jamais loggé, jamais transmis en clair, jamais persisté. Chiffrement AES-256 au repos. Accès restreint au RSSI et à la Direction. |
| CONFIDENTIEL | Données de transaction (montants, numéros de téléphone), données KYC marchands, logs d'audit | Accès sur autorisation explicite. Chiffrement TLS en transit. Rétention 7 ans minimum. Accès tracé. |
| INTERNE | Code source, documentation technique, configurations non-prod, données sandbox | Accès réservé au personnel ST Pay et prestataires sous NDA. Ne pas diffuser à l'extérieur. |
| PUBLIC | Documentation API publique, landing page, communiqués de presse | Peut être diffusé librement après validation par la Direction. |

### 4.2 Traitement des Données à Caractère Personnel

Conformément aux recommandations COBAC et aux bonnes pratiques internationales, ST Pay s'engage à :

- Collecter uniquement les données strictement nécessaires à l'exécution du service (principe de minimisation)
- Ne jamais stocker ni journaliser le code PIN des utilisateurs Orange Money — ce code transite exclusivement en mémoire vive lors de l'appel API et n'est jamais écrit sur disque ou dans les logs
- Appliquer une durée de rétention définie pour chaque catégorie de données, en conformité avec les obligations légales
- Permettre aux marchands d'accéder à leurs propres données sur demande formelle

---

## 5. Gouvernance et Responsabilités

### 5.1 Structure de Gouvernance

| Rôle | Titulaire | Responsabilités clés |
|---|---|---|
| Directeur Général | Direction ST Pay | Approbation de la politique, allocation des ressources de sécurité, validation des risques acceptés |
| Responsable Sécurité SI (RSSI) | Direction Technique | Pilotage opérationnel de la sécurité, gestion des incidents, revue des politiques, liaison ANTIC |
| Responsable Technique | Équipe Ingénierie | Implémentation des contrôles techniques, revue de code sécurisé, gestion des accès API |
| Tout collaborateur | Ensemble du personnel | Respect de la politique, signalement des incidents de sécurité, participation aux formations |
| Marchands partenaires | Entités tierces | Respect des conditions d'utilisation sécurisée de l'API, protection des clés API transmises |

---

## 6. Politique de Contrôle d'Accès

### 6.1 Authentification et Gestion des Clés API

L'accès à la plateforme ST Pay repose sur un mécanisme d'authentification par clé API à deux couches :

- **Couche 1 — Validation :** La clé API soumise est hachée en SHA-256 et comparée à la valeur stockée en base de données. Aucune clé en clair n'est conservée.
- **Couche 2 — Cache :** Le résultat de validation est mis en cache dans Redis avec une durée de vie de 5 minutes, limitant la charge sur la base de données tout en maintenant une expiration rapide en cas de révocation.
- **Couche 3 — RBAC :** Chaque clé est associée à un ensemble de permissions granulaires (ex : `transactions.view_own`, `merchants.manage`) et à un rôle (merchant, admin).

### 6.2 Règles d'Accès

- Principe du moindre privilège : aucun compte ne dispose de droits supérieurs à ceux requis par sa fonction
- Les accès administrateurs sont nominatifs, tracés et font l'objet d'une revue trimestrielle
- Toute clé API compromise doit être révoquée immédiatement — la procédure de révocation est documentée dans la Politique de Contrôle d'Accès (PCA-STPAY-2025-002)
- Les clés de test (sandbox) sont isolées des clés de production et ne peuvent pas initier de transactions réelles
- Le partage de clés API entre plusieurs entités est strictement interdit

### 6.3 Gestion des Accès Privilégiés

- Les accès à la base de données PostgreSQL de production sont restreints aux seuls administrateurs système et au processus applicatif
- Les connexions administratives sont journalisées et font l'objet d'alertes en temps réel
- L'accès au dashboard Sentry, aux métriques Prometheus et aux configurations Redis est restreint aux membres de l'équipe technique

---

## 7. Contrôles de Sécurité Technologique

### 7.1 Chiffrement et Protection des Données en Transit

- Toutes les communications entre clients, API ST Pay et providers opérateurs transitent exclusivement via TLS 1.2 minimum (TLS 1.3 préféré)
- Les webhooks envoyés aux marchands sont signés par HMAC-SHA256 avec le header `X-STpay-Signature`, permettant au destinataire de vérifier l'authenticité et l'intégrité du message
- Aucune donnée sensible (PIN, credential) ne transite en clair dans les logs applicatifs, les variables d'environnement non chiffrées, ou le code source

### 7.2 Sécurité Applicative

- Validation systématique des entrées API côté serveur avec rejet des requêtes malformées (HTTP 400 avec code d'erreur explicite)
- Protection contre les attaques par injection SQL via l'utilisation exclusive d'Entity Framework Core avec requêtes paramétrées
- Rate limiting et détection de fraude intégrés dans le `PaymentOrchestrator` avec 6 règles de vélocité Redis (fréquence, montant, géolocalisation)
- En-têtes de sécurité HTTP appliqués sur tous les endpoints (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options)
- Idempotence des appels API : chaque transaction est associée à une clé d'idempotence pour éviter les double-déductions en cas de retry

### 7.3 Infrastructure et Résilience

- PgBouncer déployé en frontal de PostgreSQL pour la gestion du pool de connexions et la résistance aux surcharges
- Redis utilisé comme couche de cache et comme support des règles de détection de fraude en temps réel
- Hangfire pour l'ordonnancement des tâches de fond (relance webhooks, expiration escrow) avec persistance en base
- Dead-letter queue avec retry exponentiel (délais : 1 min → 5 min → 15 min → 1h → 24h) pour les webhooks en échec
- Surveillance en temps réel via Prometheus (métriques) et Sentry (erreurs applicatives) avec alertes configurées

### 7.4 Gestion des Vulnérabilités

ST Pay s'engage à :

- Effectuer une revue de sécurité du code (code review) sur toute modification affectant les modules d'authentification, de paiement ou d'escrow
- Appliquer les mises à jour de sécurité des dépendances (packages NuGet, npm) dans un délai maximum de 30 jours après publication d'un correctif critique
- Coopérer pleinement avec les scans de vulnérabilité réalisés par l'ANTIC (réseau, application web, base de données) en mettant à disposition un environnement de staging dédié

---

## 8. Journalisation et Traçabilité

### 8.1 Événements Journalisés

| Niveau | Événements | Système |
|---|---|---|
| Logs applicatifs | Paiement initié/complété/échoué, fraude détectée, webhook livré/échoué, timeout provider | Serilog (structured logging) avec corrélation `transactionId` |
| Logs d'audit | Création/modification de transaction, changements de statut escrow, actions administratives | Table `AuditLogs` PostgreSQL — immuable (INSERT uniquement, pas de UPDATE ni DELETE) |
| Logs de base de données | Connexions, requêtes lentes, erreurs, modifications de schéma | PostgreSQL statement logging + PgBouncer logs |

### 8.2 Rétention et Intégrité

- Durée de rétention minimale : 7 ans pour les logs de transaction (conformité réglementaire fintech CEMAC)
- Les logs d'audit sont en insertion seule (append-only) — toute tentative de modification ou suppression déclenche une alerte
- Les logs sont horodatés en UTC avec corrélation par `transactionId` et `merchantId`
- L'accès aux logs de production est restreint au RSSI et aux administrateurs système autorisés

---

## 9. Gestion des Incidents de Sécurité

### 9.1 Classification des Incidents

| Priorité | Nature | Exemples | Délai de réponse |
|---|---|---|---|
| P1 — CRITIQUE | Violation de données, fraude avérée, compromission de clés | Fuite de données clients, transaction frauduleuse massive, accès non autorisé aux systèmes de production | Réponse immédiate < 1h. Notification ANTIC sous 72h (loi 2010/012) |
| P2 — ÉLEVÉ | Interruption de service, indisponibilité provider | Indisponibilité MTN MoMo ou Orange Money, erreur système bloquant les paiements | Prise en charge < 4h, résolution < 24h |
| P3 — MODÉRÉ | Défaillance partielle, échec de webhooks | Retards de livraison webhook, erreurs applicatives non critiques | Prise en charge < 24h, résolution < 72h |

### 9.2 Procédure de Réponse

1. **Détection :** via Sentry (alertes automatiques) ou signalement manuel par un collaborateur
2. **Confinement :** isolation du composant affecté, révocation des accès compromis si applicable
3. **Analyse :** collecte des logs, identification de la cause racine
4. **Notification :** en cas d'incident P1, notification à l'ANTIC dans un délai maximum de 72 heures conformément à la loi n° 2010/012
5. **Résolution :** application du correctif, restauration du service
6. **Post-mortem :** rédaction d'un rapport d'incident documentant la chronologie, l'impact, les mesures correctives et les leçons apprises

---

## 10. Continuité d'Activité et Résilience

### 10.1 Mesures de Résilience Opérationnelle

- Basculement automatique entre providers (MTN → Orange → Wave) en cas d'indisponibilité d'un opérateur, géré par le `PaymentOrchestrator`
- Cache Redis en mémoire pour absorber les pics de charge et maintenir la disponibilité pendant les micro-indisponibilités de base de données
- Pool de connexions PgBouncer limitant les risques d'épuisement des connexions PostgreSQL
- Retry exponentiel automatique sur les webhooks (jusqu'à 5 tentatives sur 24 heures)
- File d'attente dead-letter pour préserver les événements non livrés et permettre leur replay manuel

### 10.2 Sauvegarde et Restauration

- Sauvegardes quotidiennes automatisées de la base de données PostgreSQL
- Les procédures détaillées de sauvegarde et restauration sont documentées dans la Politique de Backup (PBK-STPAY-2025-005)
- Les sauvegardes font l'objet de tests de restauration trimestriels

### 10.3 Hébergement

ST Pay opère en environnement cloud/datacenter. Les garanties de disponibilité, les obligations de sécurité physique et les procédures de notification en cas d'incident sont encadrées par les contrats de service avec les fournisseurs d'hébergement, disponibles sur demande de l'ANTIC.

---

## 11. Sécurité Physique et Environnementale

### 11.1 Principes

- Contrôle d'accès physique aux locaux hébergeant des équipements informatiques (badges, verrous, registre des entrées)
- Aucune donnée de production n'est stockée sur des équipements portables non chiffrés
- Les postes de travail sont configurés avec verrouillage automatique après 5 minutes d'inactivité
- Les visiteurs sont systématiquement accompagnés dans les zones à accès restreint

### 11.2 Datacenter

Les serveurs de production ST Pay sont hébergés dans un datacenter tiers disposant de ses propres certifications de sécurité physique (contrôle d'accès biométrique, surveillance vidéo, alimentation redondante, climatisation). Les attestations de conformité du datacenter partenaire sont disponibles sur demande.

---

## 12. Sécurité des Ressources Humaines

### 12.1 Recrutement et Onboarding

- Vérification des antécédents professionnels et judiciaires pour tout poste ayant accès aux systèmes de production
- Signature d'un accord de confidentialité (NDA) dès l'entrée en fonction, avant tout accès aux systèmes
- Formation initiale à la sécurité de l'information dans les 30 jours suivant la prise de poste
- Attribution des accès sur la base du rôle défini, selon le principe du moindre privilège

### 12.2 Formation et Sensibilisation

- Programme de sensibilisation annuel à la sécurité de l'information pour l'ensemble du personnel
- Sessions spécifiques sur les risques fintech : phishing, ingénierie sociale, fraude au virement
- Communication régulière sur les nouvelles menaces et les bonnes pratiques

### 12.3 Fin de Contrat et Offboarding

- Révocation immédiate de l'ensemble des accès (systèmes, clés API, outils collaboratifs) le jour du départ
- Restitution de l'ensemble des équipements et documents appartenant à ST Pay
- Rappel des obligations de confidentialité post-contractuelles lors de l'entretien de départ
- Archivage sécurisé du compte de l'utilisateur avant suppression définitive

---

## 13. Gestion de la Sécurité avec les Tiers

### 13.1 Opérateurs Mobile Money

Les partenariats avec MTN Mobile Money Cameroun et Orange Money Cameroun sont encadrés par des conventions d'agrégateur définissant les obligations mutuelles en matière de sécurité, de conformité KYC/KYB et de gestion des incidents. ST Pay respecte les exigences de sécurité spécifiées par chaque opérateur, notamment :

- **MTN MoMo :** authentification OAuth2, respect des limites de transaction et de vélocité, confidentialité des tokens d'accès
- **Orange Money CM :** protection absolue du PIN client (jamais persisté, jamais loggé), correspondance exacte du statut `"SUCCESSFULL"` dans le traitement des réponses

### 13.2 Marchands et Intégrateurs

Tout marchand accédant à l'API ST Pay est soumis aux Conditions Générales d'Utilisation Technique qui incluent :

- L'obligation de stocker les clés API de manière sécurisée (variables d'environnement serveur, vault)
- L'interdiction de partager les clés API ou de les exposer dans des dépôts de code publics
- L'obligation de vérifier la signature HMAC-SHA256 des webhooks reçus
- La notification à ST Pay de tout incident de sécurité affectant l'intégration

### 13.3 Fournisseurs Cloud et Infrastructure

Les contrats avec les fournisseurs d'infrastructure (hébergement, CDN, monitoring) incluent des clauses de sécurité et de confidentialité. ST Pay procède à une évaluation de sécurité préalable avant tout nouveau fournisseur ayant accès aux données de production.

---

## 14. Conformité et Audit

### 14.1 Audit ANTIC

ST Pay reconnaît l'autorité de l'ANTIC (Agence Nationale des Technologies de l'Information et de la Communication) dans le cadre des audits de sécurité des systèmes d'information, conformément à la loi n° 2010/012 et au décret n° 2012/1643/PM du 14 juin 2012.

ST Pay s'engage à :

- Mettre à disposition de l'équipe d'audit l'ensemble des documents de politique de sécurité dans les délais requis
- Faciliter l'accès à un environnement de test représentatif pour les scans de vulnérabilité
- Désigner un point de contact unique (RSSI) pour la coordination de l'audit
- Mettre en œuvre le plan d'actions correctives dans les délais définis par le rapport d'audit

### 14.2 Revue Interne

- La présente politique fait l'objet d'une revue annuelle ou à chaque évolution significative du périmètre ou de la réglementation applicable
- Des audits internes de conformité sont conduits semestriellement par le RSSI
- Les résultats des audits internes sont présentés à la Direction Générale et consignés dans un registre de conformité

### 14.3 Indicateurs de Sécurité Suivis

| Indicateur | Cible | Fréquence de suivi |
|---|---|---|
| Disponibilité API (uptime) | > 99,5% | Temps réel (Prometheus) |
| Délai moyen de traitement paiement | < 10 secondes | Quotidien |
| Taux de livraison webhooks | > 99% | Quotidien |
| Incidents de sécurité P1 | 0 par trimestre | Mensuel |
| Délai d'application des correctifs critiques | < 30 jours | Par patch |
| Revue des accès privilégiés | 100% du périmètre | Trimestriel |

---

## 15. Non-Conformité et Sanctions

Tout manquement à la présente politique expose son auteur à des mesures disciplinaires, pouvant aller de l'avertissement formel au licenciement, sans préjudice des poursuites pénales et civiles prévues par la loi n° 2010/012 relative à la cybersécurité et à la cybercriminalité au Cameroun.

Les violations les plus graves incluent, sans s'y limiter :

- La divulgation non autorisée de données confidentielles ou de clés d'accès
- Le contournement délibéré des contrôles de sécurité
- L'accès non autorisé aux systèmes, comptes ou données d'un tiers
- La non-déclaration d'un incident de sécurité dont l'auteur a connaissance

---

## 16. Documents Associés

| Référence | Titre | Statut |
|---|---|---|
| PSI-STPAY-2025-001 | Politique de Sécurité de l'Information (présent document) | Approuvé |
| PGR-STPAY-2025-002 | Politique de Gestion des Risques | En cours |
| CRR-STPAY-2025-003 | Registre des Risques (Cartographie) | En cours |
| PBC-STPAY-2025-004 | Politique de Continuité et Résilience | En cours |
| PGI-STPAY-2025-005 | Politique de Gestion des Incidents | En cours |
| PCA-STPAY-2025-006 | Politique de Contrôle d'Accès | En cours |
| PDP-STPAY-2025-007 | Politique de Protection des Données | En cours |
| PGL-STPAY-2025-008 | Politique de Gestion des Logs | En cours |
| PBK-STPAY-2025-009 | Politique de Backup et Procédure de Restauration | En cours |
| PCH-STPAY-2025-010 | Procédure de Gestion des Changements | En cours |

---

## 17. Déclaration d'Engagement de la Direction

La Direction Générale de ST Pay Cameroun SARL affirme son engagement total envers la sécurité de l'information comme condition indispensable à la confiance de ses clients, partenaires opérateurs et autorités de régulation. La sécurité n'est pas un accessoire de notre activité fintech — elle en est le fondement.

La présente politique est approuvée et entre en vigueur à compter de la date de signature ci-dessous.

---

**Pour la Direction Générale**

Signature et Cachet

Douala, le _____ / _____ / 2025

---

**Pour le Responsable Sécurité (RSSI)**

Signature

Douala, le _____ / _____ / 2025

---

*— FIN DU DOCUMENT PSI-STPAY-2025-001 —*

*© 2025 ST Pay Cameroun SARL — Ce document est CONFIDENTIEL. Toute reproduction non autorisée est interdite.*
