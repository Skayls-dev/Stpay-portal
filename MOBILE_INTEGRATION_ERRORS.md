# ST Pay Mobile Integration - Erreurs frequentes

Ce guide cible les integrations mobiles (React Native, Flutter, Kotlin Android, Swift iOS, Wearables via companion app).

## 1. Erreurs reseau et connectivite

### Erreur
- `TypeError: Network request failed`
- `SocketTimeoutException`
- `NSURLErrorDomain -1009`

### Causes probables
- API indisponible
- Appareil sur un reseau bloque
- URL backend locale inaccessible depuis un vrai device

### Correctifs
- Verifier `GET /api/Payment/health` depuis le device.
- Utiliser une URL reachable publiquement (pas `localhost` sur telephone reel).
- Ajouter timeout/retry progressif cote client mobile.

## 2. Erreurs auth (401/403)

### Erreur
- `401 Unauthorized`
- `403 Forbidden`

### Causes probables
- Header `X-Api-Key` absent/invalide
- Melange portail/admin et portail/marchand
- Token admin utilise sur routes marchand (ou inverse)

### Correctifs
- Pour routes marchand: `X-Api-Key: sk_test_...` ou `sk_live_...`.
- Pour routes admin: `Authorization: Bearer <token>`.
- Rejouer avec la collection Postman minimale pour isoler l'erreur.

## 3. Erreurs de payload (400)

### Erreur
- `400 Bad Request`
- Message de validation sur provider ou champs manquants

### Causes probables
- JSON incomplet
- provider invalide
- format telephone invalide

### Correctifs
- Partir d'un payload minimal valide puis enrichir.
- Providers attendus: `MTN`, `ORANGE`, `MOOV`, `WAVE`.
- Garder un `transactionId` pour toute operation de suivi.

## 4. Webhooks non recus

### Erreur
- Aucun evenement webhook recu
- Signature invalide

### Causes probables
- URL webhook non publique
- verification HMAC absente
- endpoint webhook trop lent

### Correctifs
- Exposer une URL HTTPS publique.
- Verifier la signature HMAC-SHA256.
- Repondre rapidement et traiter en asynchrone.

## 5. Cas React Native

### Probleme
- Variables d'environnement indisponibles
- Fetch fonctionne en debug mais pas en release

### Correctifs
- Injecter les cles via config securisee (pas hardcode).
- Verifier permissions reseau Android/iOS en mode release.
- Activer logs reseau en build de test.

## 6. Cas Flutter

### Probleme
- Exception TLS/certificat
- Echec de serialisation JSON

### Correctifs
- Utiliser `https` et certificats valides en production.
- Utiliser `jsonEncode` avec objets strictement conformes.
- Journaliser reponse brute en environnement de test.

## 7. Cas Android Kotlin

### Probleme
- `Cleartext HTTP traffic not permitted`
- timeout OkHttp

### Correctifs
- Preferer HTTPS.
- Configurer Network Security Config si necessaire en dev.
- Ajuster connect/read timeout avec retry.

## 8. Cas iOS Swift

### Probleme
- ATS bloque une URL non securisee
- callback URL invalide

### Correctifs
- Utiliser HTTPS avec certificat valide.
- Valider URL callback avant appel API.
- Conserver le tracing request-id dans les logs.

## 9. Cas wearables (Wear OS / watchOS)

### Probleme
- Paiement initie depuis la montre sans contexte securise

### Correctifs
- Ne jamais stocker la cle API sur la montre.
- Utiliser une architecture companion: montre -> mobile -> ST Pay API.
- La montre affiche le statut uniquement.

## 10. Check rapide de diagnostic

1. `GET /api/Payment/health` retourne 200.
2. Appel `POST /api/Payment` OK via Postman minimal.
3. Meme payload rejoue depuis app mobile.
4. `transactionId` recupere et suivi via `GET /api/Payment/{paymentId}`.
5. Webhook recu et signature validee.

## Ressources liees

- SDK guide: [SDK_README.md](SDK_README.md)
- Quick start: [QUICK_START.md](QUICK_START.md)
- API key management: [API_KEY_MANAGEMENT.md](API_KEY_MANAGEMENT.md)
