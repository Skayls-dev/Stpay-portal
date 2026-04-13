# SDK @hey-api pour ST Pay

Ce SDK a été généré pour faciliter l'intégration avec l'API ST Pay. Il fournit des types TypeScript, des clients API, des services et des hooks React pour une utilisation simplifiée.

## Installation et Configuration

Le SDK a été configuré avec les packages suivants :
- `@hey-api/openapi-ts` - Générateur de SDK
- `@hey-api/client-fetch` - Client HTTP basé sur fetch

## Structure du SDK

```
src/api/
├── index.ts          # Point d'entrée principal
├── types.ts          # Types TypeScript
├── client.ts         # Client API principal
├── services.ts       # Services métier
└── hooks.ts          # Hooks React personnalisés
```

## Structure cible SDK stable (Web + React Native)

Le SDK est considere "stable" quand l'API publique ci-dessous reste compatible entre releases mineures:

```text
src/api/
  index.ts            # exports publics stables
  compat-client.ts    # couche fetch compatible web/rn
  client.gen.ts       # client genere openapi
  sdk.gen.ts          # fonctions generees
  services.ts         # facade metier stable
  hooks.ts            # hooks react (web/rn)
  types.ts            # types publics normalises
  keyManagement.ts    # utilitaires de gestion cle API
  client/*            # generated internals
  core/*              # generated internals
```

Regle: les applications integratrices ne doivent consommer que `src/api/index.ts` et les types exposes.

## Workflow de publication SDK (recommande)

1. Regenerer le SDK depuis OpenAPI.
2. Verifier la compatibilite de l'API publique (`index.ts`, `types.ts`, `services.ts`).
3. Valider les exemples Web et React Native.
4. Mettre a jour la documentation et le changelog.
5. Executer les tests et valider le time-to-first-payment.

Checklist complete: [SDK_RELEASE_CHECKLIST.md](SDK_RELEASE_CHECKLIST.md)

## Utilisation Basique

### Import du SDK

```javascript
import { 
  apiClient, 
  paymentService, 
  usePaymentProcess,
  usePaymentStatus 
} from '../api';
```

### Client API Direct

```javascript
import { apiClient } from '../api';

// Traiter un paiement
const response = await apiClient.processPayment({
  amount: 1000,
  currency: 'XOF',
  provider: 'MTN',
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+225123456789'
  },
  merchant: {
    name: 'Ma Boutique',
    id: 'BOUTIQUE001'
  }
});
```

### Services Métier

```javascript
import { paymentService, validationService } from '../api';

// Validation avant envoi
const errors = validationService.validatePaymentRequest(paymentData);
if (errors.length > 0) {
  console.error('Erreurs de validation:', errors);
  return;
}

// Traitement du paiement
const result = await paymentService.processPayment(paymentData);
```

### Hooks React

#### Hook de traitement de paiement

```javascript
import { usePaymentProcess } from '../api';

const PaymentForm = () => {
  const { processPayment, isLoading, error, result } = usePaymentProcess();

  const handleSubmit = async (data) => {
    try {
      await processPayment(data);
      // Succès géré automatiquement
    } catch (error) {
      // Erreur gérée automatiquement
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Votre formulaire */}
      <button disabled={isLoading}>
        {isLoading ? 'Traitement...' : 'Payer'}
      </button>
    </form>
  );
};
```

#### Hook de statut de paiement

```javascript
import { usePaymentStatus } from '../api';

const PaymentStatus = () => {
  const { 
    fetchStatus, 
    status, 
    isLoading, 
    canCancel, 
    isCompleted 
  } = usePaymentStatus();

  return (
    <div>
      {status && (
        <div>
          <p>Statut: {status.status}</p>
          {canCancel && <button>Annuler</button>}
        </div>
      )}
    </div>
  );
};
```

#### Hook d'historique

```javascript
import { usePaymentHistory } from '../api';

const PaymentHistory = () => {
  const { payments, isLoading, refresh } = usePaymentHistory();

  return (
    <div>
      <button onClick={refresh}>Actualiser</button>
      {payments.map(payment => (
        <div key={payment.transactionId}>
          {payment.description} - {payment.amount} {payment.currency}
        </div>
      ))}
    </div>
  );
};
```

## Validation

Le SDK inclut un service de validation complet :

```javascript
import { validationService } from '../api';

// Validation d'une requête de paiement
const errors = validationService.validatePaymentRequest(paymentData);

// Validation d'email
const isValidEmail = validationService.isValidEmail('test@example.com');

// Validation de téléphone
const isValidPhone = validationService.isValidPhoneNumber('+225123456789');

// Formatage de montant
const formatted = validationService.formatAmount(1000, 'XOF');
```

## Gestion des États

Le SDK fournit des utilitaires pour gérer les états de paiement :

```javascript
import { statusService } from '../api';

const status = 'pending';

// Vérifications d'état
const canCancel = statusService.canCancel(status);
const isCompleted = statusService.isCompleted(status);
const isPending = statusService.isPending(status);
const isFailed = statusService.isFailed(status);

// Classe CSS pour l'affichage
const cssClass = statusService.getStatusClass(status);

// Message lisible
const message = statusService.getStatusMessage(status);
```

## Configuration Avancée

### Configuration du client API

```javascript
import { apiClient } from '../api';

// Changer l'URL de base
apiClient.setBaseUrl('https://api.production.com');

// Ajouter des en-têtes personnalisés
apiClient.setDefaultHeaders({
  'X-Custom-Header': 'value'
});

// Authentification
apiClient.setAuthToken('your-jwt-token');
```

### Polling Automatique

```javascript
import { usePaymentPolling } from '../api';

const PaymentMonitor = ({ paymentId }) => {
  const { startPolling, stopPolling, isPolling, status } = usePaymentPolling(
    paymentId, 
    5000 // Intervalle de 5 secondes
  );

  useEffect(() => {
    if (paymentId) {
      startPolling();
    }
    return () => stopPolling();
  }, [paymentId]);

  return (
    <div>
      {isPolling && <p>Surveillance en cours...</p>}
      {status && <p>Statut: {status.status}</p>}
    </div>
  );
};
```

## Génération du SDK

Pour régénérer le SDK à partir de la spécification OpenAPI :

```bash
# À partir de l'API en cours d'exécution
npm run generate-api

# Avec surveillance des changements
npm run generate-api:watch
```

## Configuration OpenAPI

Le fichier `openapi.config.json` contient la configuration :

```json
{
  "input": "http://localhost:5169/swagger/v1/swagger.json",
  "output": {
    "path": "src/api",
    "format": "prettier"
  },
  "client": {
    "name": "@hey-api/client-fetch"
  },
  "types": {
    "dates": "types+transform",
    "export": true
  }
}
```

## Types Disponibles

Le SDK expose tous les types nécessaires :

- `PaymentRequest` - Données de requête de paiement
- `PaymentResponse` - Réponse de traitement de paiement
- `PaymentStatusResponse` - Statut détaillé du paiement
- `CustomerInfo` - Informations client
- `MerchantInfo` - Informations marchand
- `ErrorResponse` - Réponse d'erreur API

## Gestion d'Erreur

Toutes les méthodes du SDK gèrent les erreurs de manière cohérente :

```javascript
try {
  const result = await paymentService.processPayment(data);
} catch (error) {
  // error.status - Code de statut HTTP
  // error.response - Réponse complète de l'API
  // error.message - Message d'erreur
}
```

## Bonnes Pratiques

1. **Utilisez les hooks React** pour l'état de l'interface utilisateur
2. **Validez côté client** avant d'envoyer à l'API
3. **Gérez les erreurs** de manière appropriée
4. **Utilisez les services métier** pour la logique complexe
5. **Configurez l'URL de base** selon l'environnement

## Exemples Complets

Consultez les composants React dans `src/components/` pour des exemples d'utilisation complète du SDK.
