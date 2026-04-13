# Guide - Go-live checklist

## Objectif

Valider qu une integration est prete pour la production sans angle mort.

## Checklist technique

- [ ] Variables d environnement prod configurees
- [ ] Cles API prod distinctes des cles test
- [ ] Endpoint webhook prod en HTTPS
- [ ] Verification signature webhook active
- [ ] Idempotence active sur paiements et webhooks
- [ ] Rate limiting active
- [ ] Alertes erreurs et latence configurees

## Checklist fonctionnelle

- [ ] Paiement reussi en pre-prod
- [ ] Paiement echoue gere proprement
- [ ] Statut recupere via endpoint GET
- [ ] Webhook recu et traite
- [ ] Cas timeout et retry verifies

## Checklist securite

- [ ] Secrets hors code
- [ ] Rotation cle planifiee
- [ ] Roles admin/marchand testes
- [ ] Journaux securite actifs

## Plan de rollback

- [ ] Procedure rollback documentee
- [ ] Point de contact incident defini
- [ ] Communication client prete
- [ ] Script de desactivation partielle disponible

## Fenetre de mise en prod

1. Freeze de changements non critiques
2. Go-live progressif (canary si possible)
3. Surveillance renforcee 24-48h
4. Retrospective et actions correctives
