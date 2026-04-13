# Guide - Premier paiement en 10 minutes

## Objectif

Valider un premier paiement de bout en bout avec un minimum d etapes:

1. S authentifier cote marchand
2. Creer un paiement
3. Lire le statut
4. Verifier le webhook (si configure)

## Prerequis

- API backend disponible sur http://localhost:5169
- Compte marchand de test (email + mot de passe)
- Cle API marchand

## Etape 1 - Login marchand

```bash
curl -X POST "http://localhost:5169/api/merchant/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"merchant1@stpay.local","password":"Merchant123!"}'
```

Attendu:

- Reponse 200
- Champ token present

## Etape 2 - Verifier la sante API

```bash
curl -X GET "http://localhost:5169/api/Payment/health" \
  -H "X-Api-Key: sk_test_your_key"
```

Attendu:

- Reponse 200
- Statut provider lisible

## Etape 3 - Creer un paiement

```bash
curl -X POST "http://localhost:5169/api/Payment" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: sk_test_your_key" \
  -d '{
    "amount": 1500,
    "currency": "XAF",
    "provider": "MTN",
    "phoneNumber": "670000001",
    "description": "Premier test integration"
  }'
```

Attendu:

- Reponse 200 ou 201
- paymentId present
- status initial (ex: pending)

## Etape 4 - Lire le statut du paiement

```bash
curl -X GET "http://localhost:5169/api/Payment/<paymentId>" \
  -H "X-Api-Key: sk_test_your_key"
```

Attendu:

- paymentId identique
- status evolue vers success, failed ou reste pending

## Etape 5 - Verifier le webhook (optionnel mais recommande)

- Configurer un endpoint webhook marchand
- Observer la reception des evenements de statut
- Verifier la correlation par paymentId

## Erreurs frequentes

- 401/403: cle API absente ou invalide
- 400: payload incomplet ou format incorrect
- 404: paymentId inconnu
- Timeout: provider indisponible ou probleme reseau

## Definition de Done

- Au moins un paiement cree
- Statut lisible via endpoint GET
- Webhook recu en environnement de test
