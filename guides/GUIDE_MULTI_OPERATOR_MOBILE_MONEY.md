# Guide - Parcours mobile money multi-operateurs

## Objectif

Unifier un flux de paiement unique malgre les differences entre operateurs.

## Design recommande

1. API interne unique cote marchand
2. Mapping provider-specific dans une couche adaptateur
3. Etats normalises: pending, success, failed, canceled

## Differences frequentes a couvrir

- Delai de confirmation
- Format numero telephone
- Codes erreur operateur
- Fenetres de maintenance

## Payload normalise exemple

```json
{
  "amount": 2000,
  "currency": "XAF",
  "provider": "MTN",
  "phoneNumber": "670000001",
  "description": "Paiement commande #123"
}
```

## Strategie de fallback

- Si provider A indisponible et politique autorisee: proposer provider B
- Informer clairement l utilisateur final
- Journaliser tentative initiale + fallback

## Monitoring multi-operateurs

- Taux succes par provider
- P95 latence par provider
- Taux timeout par provider
- Disponibilite /health par provider

## Tests indispensables

- Happy path pour chaque operateur
- Timeout provider
- Refus utilisateur
- Erreur format numero
- Webhook hors ordre

## Definition de Done

- Un seul contrat frontend
- Mapping provider documente
- Alertes comparees par provider
