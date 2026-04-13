# ST Pay - Guides Integration

Ce dossier regroupe des guides pratiques pour accelerer l integration, la mise en production et le support.

## Catalogue

1. [Premier paiement en 10 minutes](./GUIDE_FIRST_PAYMENT_10_MIN.md)
2. [Webhooks de production](./GUIDE_PRODUCTION_WEBHOOKS.md)
3. [Gestion des erreurs et reprise](./GUIDE_ERROR_HANDLING_RECOVERY.md)
4. [Securite API pour marchands](./GUIDE_API_SECURITY_MERCHANTS.md)
5. [Parcours mobile money multi-operateurs](./GUIDE_MULTI_OPERATOR_MOBILE_MONEY.md)
6. [Go-live checklist](./GUIDE_GO_LIVE_CHECKLIST.md)
7. [Observabilite et analytics d integration](./GUIDE_OBSERVABILITY_ANALYTICS.md)
8. [Tests automatises d integration](./GUIDE_AUTOMATED_INTEGRATION_TESTS.md)
9. [Migration de version API](./GUIDE_API_VERSION_MIGRATION.md)
10. [Support niveau 1 pour juniors](./GUIDE_L1_SUPPORT_PLAYBOOK.md)

## Ordre recommande

1. Guide 1 (premier paiement)
2. Guide 2 (webhooks)
3. Guide 6 (go-live)
4. Guides 3 et 4 (stabilite + securite)
5. Guides 7 et 8 (pilotage + qualite continue)
6. Guides 9 et 10 (evolution + support)

## Prerequis

- URL API locale: http://localhost:5169
- Portail frontend: http://localhost:5173
- Compte admin et compte marchand de test
- Cle API marchand valide

## Notes

- Le guide wearables/companion est disponible dans le fichier principal a la racine: WEARABLES_COMPANION_GUIDE.html
- Les exemples ci-dessous utilisent des URLs locales de dev. Adapter pour staging/prod.
