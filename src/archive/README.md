# Archive — stpay-portal

Dossier de conservation des fichiers écartés lors de la migration vers l'architecture Option A.

## Contenu

### MobilePaymentSimulator.jsx
- **Raison de l'archivage** : Fonctionnalité de simulation de paiement mobile utile pour les démos marchands, hors périmètre du portail d'administration.
- **Statut** : Conservé à titre de référence. Peut être réintégré dans un espace dédié `merchant-portal` si nécessaire.

## Fichiers `.legacy.jsx` (dans `src/components/`)

Ces fichiers sont les sources originales des composants migrés. Ils servent de référence pendant la période de transition.

| Fichier | Remplacé par | Notes |
|---|---|---|
| `Dashboard.legacy.jsx` | `src/pages/Overview.tsx` | Logique stats + transactions récentes extraite |
| `PaymentList.legacy.jsx` | `src/pages/Transactions.tsx` | Logique de filtrage, tri et couleurs de statut extraite |
| `PaymentStatus.legacy.jsx` | `src/pages/Transactions.tsx` | Logique de polling et d'affichage de statut extraite |
| `ApiKeyManager.legacy.jsx` | `src/pages/Merchants.tsx` | API calls migrées vers `src/lib/api/modules.ts` (merchantsApi) |
| `ApiPlayground.legacy.jsx` | `src/pages/ProvidersHealth.tsx` | Logique de santé backend et observabilité extraite |
| `ApiStatus.legacy.jsx` | `src/components/layout/Topbar.tsx` | StatusDot intégré dans la Topbar via React Query |

> **Suppression safe** : ces fichiers peuvent être supprimés **30 jours après** la mise en production de la migration Option A, après validation que tous les tests passent et que la nouvelle architecture est stable.

## Événements archivés (features/event/ + features/reservation/)

Les dossiers `src/features/event/` et `src/features/reservation/` contiennent une fonctionnalité expérimentale de gestion d'événements hors périmètre du portail admin ST Pay. Ils ne sont pas supprimés afin de préserver l'historique Git.
