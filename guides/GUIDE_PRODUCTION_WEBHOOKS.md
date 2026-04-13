# Guide - Webhooks de production

## Objectif

Garantir des webhooks fiables, verifiables et idempotents.

## Contrat recommande

- Methode: POST
- Content-Type: application/json
- Identifiant evenement unique
- Horodatage evenement
- Signature HMAC en header

## Verification de signature

1. Recuperer le body brut sans transformation
2. Recalculer la signature avec le secret partage
3. Comparer en temps constant
4. Rejeter si mismatch

Pseudo-code:

```text
expected = HMAC_SHA256(secret, rawBody)
if !constantTimeEquals(expected, headerSignature): reject 401
```

## Idempotence

- Conserver eventId dans une table dediee
- Si eventId deja traite, retourner 200 sans retraiter
- Les traitements metier doivent etre replay-safe

## Politique de retry

- Retry exponentiel cote emetteur
- Timeout cible court (ex: 3-5s)
- Reponse 2xx seulement si traitement principal accepte
- Reponse 5xx pour demander retry

## Ordre des evenements

- Ne pas supposer un ordre strict
- Utiliser paymentId + occurredAt pour reconstruire la chronologie
- Toujours recalculer l etat final par regle metier

## Logging minimum

- requestId
- eventId
- paymentId
- signatureValid
- traitementResult
- latence ms

## Checklist pre-prod

- Endpoint HTTPS valide
- Secret webhook stocke en coffre secret
- Verification signature active
- Idempotence active
- Alertes sur taux d echec webhook

## Incident playbook rapide

1. Identifier eventIds en echec
2. Verifier code HTTP et latence
3. Corriger cause (signature, timeout, bug)
4. Relancer retry manuel si necessaire
5. Documenter la cause racine
