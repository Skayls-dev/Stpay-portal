# Guide - Support niveau 1 pour juniors

## Objectif

Permettre au support L1 de resoudre rapidement les incidents frequents d integration.

## Script de triage (5 questions)

1. Quel endpoint et a quelle heure ?
2. Quel code HTTP recu ?
3. Quel paymentId ou requestId ?
4. Cle API valide et environnement correct ?
5. Incident reproductible ou intermittent ?

## Arbre de decision rapide

- 401/403 -> verifier cle, role, environnement
- 400 -> verifier payload et champs obligatoires
- 404 -> verifier identifiant ressource
- 5xx -> collecter correlation ID et escalader L2
- Webhook absent -> verifier URL, signature, logs retries

## Reponses types

- "Nous avons identifie une erreur d authentification, merci de regenerer la cle et retester."
- "Le payload est incomplet, merci d ajouter les champs requis et renvoyer la requete."
- "Nous observons une instabilite provider, un retry est en cours."

## Conditions d escalade L2

- Plus de 3 marchands impactes
- Incident > 30 minutes
- Echec reproductible sans cause evidente
- Erreur 5xx persistante

## Donnees minimales a joindre a l escalade

- requestId/correlationId
- endpoint + methode
- payload masque
- timestamp
- impact business

## KPI support

- Temps de premiere reponse
- Taux resolution L1
- Temps moyen resolution
- Top causes racines mensuelles
