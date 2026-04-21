// src/pages/IntegrationGuides.tsx
import React, { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { guideVideosApi, type GuideVideoConfig } from '../lib/api/modules'

// ─── types ────────────────────────────────────────────────────────────────────

type Tag = 'Onboarding' | 'Production' | 'Résilience' | 'Sécurité' | 'Paiement' | 'Release' | 'Pilotage' | 'Qualité' | 'Évolution' | 'Support'

interface VideoBlock {
  /** YouTube video ID, e.g. "dQw4w9WgXcQ" */
  youtubeId: string
  title: string
  /** Optional short description shown below the player */
  description?: string
}

interface Block {
  type: 'h3' | 'p' | 'ul' | 'ol' | 'code' | 'checklist' | 'video'
  content: string | string[] | VideoBlock
}

interface Guide {
  id: string
  num: number
  tag: Tag
  title: string
  tagline: string
  blocks: Block[]
}

// ─── data ─────────────────────────────────────────────────────────────────────

const TAG_COLOR: Record<Tag, { bg: string; text: string; border: string }> = {
  'Onboarding': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'Production': { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  'Résilience': { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  'Sécurité':   { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  'Paiement':   { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  'Release':    { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  'Pilotage':   { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  'Qualité':    { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
  'Évolution':  { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  'Support':    { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
}

const GUIDES: Guide[] = [
  {
    id: 'first-payment', num: 1, tag: 'Onboarding',
    title: 'Premier paiement en 10 minutes',
    tagline: 'Valider un premier paiement de bout en bout, sans se perdre dans la doc.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : premier paiement en 10 minutes', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Avant de plonger dans la documentation complète, faites tourner un vrai paiement. C\'est la meilleure façon de comprendre le flux : vous verrez concrètement ce que l\'API renvoie, comment le statut évolue, et où brancher votre webhook.' },
      { type: 'h3' as const, content: 'Ce qu\'il vous faut pour démarrer' },
      { type: 'p', content: 'L\'API ST Pay est accessible en ligne — pas besoin d\'installer quoi que ce soit. Vous avez besoin d\'un compte marchand de test et de la clé API associée — vous les trouvez dans l\'onglet Clés API du portail.' },
      { type: 'h3', content: 'Étape 1 — Récupérer un token de session' },
      { type: 'p', content: 'L\'authentification se fait par email/mot de passe. La réponse contient votre token JWT et votre clé API.' },
      { type: 'code', content: `curl -X POST "https://api.stpay.io/api/merchant/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"merchant1@stpay.local","password":"Merchant123!"}'` },
      { type: 'h3', content: 'Étape 2 — Vérifier que l\'API répond' },
      { type: 'p', content: 'Avant de créer un paiement, confirmez que votre clé est valide et que les providers sont joignables.' },
      { type: 'code', content: `curl -X GET "https://api.stpay.io/api/Payment/health" \\
  -H "X-Api-Key: sk_test_your_key"` },
      { type: 'h3', content: 'Étape 3 — Créer le paiement' },
      { type: 'p', content: 'Le corps de la requête est volontairement simple. Le champ provider indique l\'opérateur mobile money (MTN ou ORANGE). Le montant est en XAF, sans décimales.' },
      { type: 'code', content: `curl -X POST "https://api.stpay.io/api/Payment" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_your_key" \\
  -d '{
    "amount": 1500,
    "currency": "XAF",
    "provider": "MTN",
    "phoneNumber": "670000001",
    "description": "Premier test integration"
  }'` },
      { type: 'p', content: 'La réponse contient un transactionId. Copiez-le, vous en avez besoin pour l\'étape suivante.' },
      { type: 'h3', content: 'Étape 4 — Lire le statut' },
      { type: 'p', content: 'Le paiement mobile money est asynchrone : l\'utilisateur doit valider sur son téléphone. Interrogez le statut toutes les quelques secondes jusqu\'à obtenir SUCCESSFUL ou FAILED.' },
      { type: 'code', content: `curl -X GET "https://api.stpay.io/api/Payment/<transactionId>" \\
  -H "X-Api-Key: sk_test_your_key"` },
      { type: 'h3', content: 'Si quelque chose ne marche pas' },
      { type: 'p', content: 'Un 401 ou 403 signifie que votre clé API est absente ou invalide — vérifiez que vous passez bien le header X-Api-Key. Un 400 indique un problème de format : vérifiez que le montant est un entier et que le provider est en majuscules. Si vous obtenez un timeout, le provider de test est probablement en mode mock — consultez les logs du backend.' },
      { type: 'h3', content: 'Vous avez réussi quand…' },
      { type: 'checklist', content: ['Vous avez créé au moins un paiement (statut PENDING)', 'Vous avez lu le statut via GET et vu SUCCESSFUL', 'Vous avez reçu un webhook sur votre endpoint de test'] },
    ],
  },
  {
    id: 'webhooks', num: 2, tag: 'Production',
    title: 'Webhooks de production',
    tagline: 'Recevoir des notifications fiables, les vérifier, et ne jamais traiter deux fois le même événement.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Webhooks de production', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Un webhook, c\'est ST Pay qui frappe à votre porte pour vous dire qu\'un paiement vient d\'aboutir — ou d\'échouer. C\'est beaucoup plus fiable que de poller le statut en boucle. Mais il faut le faire correctement : vérifier que c\'est bien ST Pay qui appelle, et ne traiter chaque événement qu\'une seule fois.' },
      { type: 'h3', content: 'Vérifier la signature avant tout' },
      { type: 'p', content: 'ST Pay signe chaque requête avec HMAC-SHA256. Sans cette vérification, n\'importe qui peut envoyer une fausse notification de paiement à votre endpoint. Ne sautez jamais cette étape en production.' },
      { type: 'code', content: `// Principe de la vérification (pseudo-code)
expected = HMAC_SHA256(webhookSecret, rawRequestBody)
received = request.headers["X-Signature"]

// Comparer en temps constant pour éviter les timing attacks
if !constantTimeEquals(expected, received):
    return HTTP 401` },
      { type: 'p', content: 'Important : calculez le HMAC sur le corps brut de la requête, avant tout parsing JSON. Si vous parsez d\'abord et re-sérialisez, les espaces peuvent différer et la signature ne correspondra plus.' },
      { type: 'h3', content: 'Garantir l\'idempotence' },
      { type: 'p', content: 'ST Pay peut livrer le même événement plusieurs fois — c\'est le comportement normal en cas de timeout réseau ou de retry. Votre handler doit donc être idempotent : traiter deux fois le même paiement ne doit pas débiter deux fois le client.' },
      { type: 'p', content: 'La solution la plus simple est une table d\'eventIds déjà traités. À chaque réception, vérifiez si l\'eventId est présent. Si oui, renvoyez 200 sans rien faire. Si non, traitez l\'événement puis insérez l\'eventId.' },
      { type: 'h3', content: 'Répondre vite, traiter en arrière-plan' },
      { type: 'p', content: 'ST Pay attend votre réponse pendant 5 secondes. Si vous dépassez ce délai, l\'envoi est considéré en échec et sera retenté. Ne faites donc pas de traitement lourd dans le handler : répondez 200 immédiatement, puis poussez le travail dans une queue.' },
      { type: 'h3', content: 'Checklist avant la mise en production' },
      { type: 'checklist', content: ['Endpoint en HTTPS avec certificat valide', 'Secret webhook stocké dans les variables d\'environnement, jamais dans le code', 'Vérification de signature active et testée', 'Idempotence active (table d\'eventIds)', 'Alertes sur le taux d\'échec webhook configurées'] },
      { type: 'h3', content: 'Que faire si un webhook échoue ?' },
      { type: 'ol', content: ['Identifier les eventIds en échec dans les logs', 'Vérifier le code HTTP retourné et la latence de votre handler', 'Corriger la cause (mauvaise signature ? handler trop lent ? bug ?)', 'Déclencher un replay manuel depuis le portail admin si nécessaire', 'Documenter la cause pour éviter que ça se reproduise'] },
    ],
  },
  {
    id: 'error-handling', num: 3, tag: 'Résilience',
    title: 'Gestion des erreurs et reprise',
    tagline: 'Distinguer ce qui peut se reprendre de ce qui ne peut pas, et en informer l\'utilisateur clairement.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Gestion des erreurs et reprise', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'La première erreur à éviter est de traiter toutes les erreurs de la même façon. Un 400 et un 503 ne demandent pas la même réaction : le premier est un bug dans votre code, le second est une indisponibilité temporaire. Votre stratégie de reprise doit refléter cette différence.' },
      { type: 'h3', content: 'Les quatre familles d\'erreurs' },
      { type: 'p', content: 'Les erreurs 4xx viennent de votre côté : payload malformé, clé invalide, droits insuffisants. Elles ne méritent pas de retry automatique — corrigez d\'abord votre code.' },
      { type: 'p', content: 'Les erreurs 5xx viennent du serveur ou du provider : surcharge momentanée, maintenance, bug. Là, un retry avec backoff exponentiel est approprié.' },
      { type: 'p', content: 'Les timeouts réseau sont une catégorie à part : vous ne savez pas si le paiement a été créé ou non. Ne retry pas aveuglément — vérifiez d\'abord le statut via GET /api/Payment/{id} avec votre référence interne.' },
      { type: 'h3', content: 'Quoi faire selon le code reçu' },
      { type: 'ul', content: [
        '400 Bad Request — corrigez le payload, ne retentez pas à l\'identique',
        '401 / 403 — rafraîchissez vos credentials ou votre clé avant de retenter',
        '404 — vérifiez l\'identifiant, ne tentez pas en boucle',
        '409 Conflict — situation de conflit logique, réconciliez l\'état avant de continuer',
        '429 Too Many Requests — attendez le délai indiqué dans Retry-After puis retenez avec jitter',
        '500 / 502 / 503 / 504 — retry exponentiel avec un maximum de 4 tentatives',
      ] },
      { type: 'h3', content: 'Séquence de retry sûre' },
      { type: 'p', content: 'Un backoff exponentiel avec jitter évite que tous vos clients réessaient au même instant quand le service revient. Voici la séquence recommandée :' },
      { type: 'ol', content: ['Tentative immédiate', 'Attendre 2 s + jitter aléatoire', 'Attendre 5 s + jitter', 'Attendre 10 s + jitter', 'Abandonner et alerter'] },
      { type: 'h3', content: 'Ce que voit l\'utilisateur' },
      { type: 'p', content: 'Ne montrez jamais un message technique à l\'utilisateur final. "Erreur 503" ne l\'aide pas. Montrez un état visuel clair (en cours, échoué, réessayer), et proposez un bouton Réessayer uniquement si l\'erreur est récupérable. En cas d\'échec définitif, dirigez vers le support.' },
      { type: 'h3', content: 'En cas de doute sur l\'état d\'un paiement' },
      { type: 'p', content: 'Si vous n\'êtes pas certain qu\'un paiement a été créé — après un timeout par exemple — ne créez pas un second paiement sans vérifier. Appelez GET /api/Payment/{votre-référence-interne} : si le paiement existe, son statut est la vérité. L\'état local est secondaire.' },
    ],
  },
  {
    id: 'api-security', num: 4, tag: 'Sécurité',
    title: 'Sécurité API pour marchands',
    tagline: 'Protéger ses clés, chiffrer ses échanges, tracer ses accès — les trois piliers non négociables.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Sécurité API pour marchands', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Une clé API donne accès à vos paiements et à vos données marchands. Si elle fuite, quelqu\'un peut initier des paiements à votre nom ou lire toutes vos transactions. La sécurité n\'est pas optionnelle — mais elle n\'est pas non plus compliquée si on la pense dès le départ.' },
      { type: 'h3', content: 'Une clé par environnement, jamais en dur dans le code' },
      { type: 'p', content: 'Vos clés de test et de production doivent être distinctes. Ne les mettez jamais directement dans votre code source — même dans un fichier .env commité dans Git. Utilisez des variables d\'environnement injectées au runtime, ou un gestionnaire de secrets (Vault, AWS Secrets Manager, etc.).' },
      { type: 'p', content: 'Sur mobile, utilisez le keystore Android ou le keychain iOS. En CI/CD, vérifiez que vos pipelines n\'affichent pas les secrets dans les logs en clair — la plupart des plateformes le font automatiquement si vous déclarez la variable comme "protégée".' },
      { type: 'h3', content: 'HTTPS partout, toujours' },
      { type: 'p', content: 'N\'acceptez jamais de transporter une clé API sur HTTP en clair, même en environnement de staging. TLS est gratuit avec Let\'s Encrypt et disponible sur toutes les plateformes d\'hébergement. Configurez votre client HTTP pour rejeter les certificats invalides — ne désactivez jamais la vérification TLS, même en développement.' },
      { type: 'h3', content: 'Rotation et révocation' },
      { type: 'p', content: 'Planifiez une rotation périodique de vos clés — au moins une fois par an, ou après tout départ d\'un membre de l\'équipe qui y avait accès. En cas de suspicion de fuite, révoquez immédiatement depuis le portail : la clé est invalide dans la seconde. Créez-en une nouvelle et déployez avant de communiquer sur l\'incident.' },
      { type: 'h3', content: 'Tracer qui fait quoi' },
      { type: 'p', content: 'Conservez un journal de chaque appel API : quelle clé, quel endpoint, quel résultat, quelle IP. Cela vous permettra de détecter une utilisation anormale (volume inhabituel, horaires suspects, IP inconnue) avant qu\'elle ne devienne un incident.' },
      { type: 'h3', content: 'Checklist sécurité' },
      { type: 'checklist', content: ['Rotation de clé planifiée dans le calendrier', 'Secret scanning actif dans le dépôt Git (ex: GitHub Secret Scanning)', 'Règles RBAC testées (un marchand ne peut pas accéder aux données d\'un autre)', 'Alertes de sécurité configurées (volume anormal, échecs auth répétés)'] },
    ],
  },
  {
    id: 'multi-operator', num: 5, tag: 'Paiement',
    title: 'Mobile money multi-opérateurs',
    tagline: 'Offrir MTN et Orange à vos clients sans doubler la complexité de votre code.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Mobile money multi-opérateurs', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Au Cameroun, votre client peut payer MTN ou Orange selon son opérateur. La bonne nouvelle : ST Pay expose un contrat d\'API unique pour les deux. Vous n\'avez qu\'un seul endpoint à appeler — le champ provider dans le payload suffit pour router vers le bon opérateur.' },
      { type: 'h3', content: 'Le payload est le même pour tous les opérateurs' },
      { type: 'p', content: 'Changez simplement la valeur de provider : "MTN" ou "ORANGE". Tout le reste — la gestion du statut, le webhook, le format de réponse — est identique.' },
      { type: 'code', content: `{
  "amount": 2000,
  "currency": "XAF",
  "provider": "MTN",
  "phoneNumber": "670000001",
  "description": "Paiement commande #123"
}` },
      { type: 'h3', content: 'Ce qui diffère en coulisses' },
      { type: 'p', content: 'Même si votre code ne change pas, les comportements des opérateurs sont différents. MTN et Orange ont des délais de confirmation différents, des fenêtres de maintenance distinctes, et des codes d\'erreur internes qui leur sont propres. ST Pay normalise tout ça — mais vous devez savoir que le délai entre PENDING et SUCCESSFUL peut varier de quelques secondes à quelques minutes selon l\'opérateur.' },
      { type: 'h3', content: 'Stratégie de fallback' },
      { type: 'p', content: 'Si un opérateur est indisponible au moment du paiement, ne laissez pas l\'utilisateur bloqué. Si votre politique commerciale le permet, proposez-lui de basculer sur l\'autre opérateur. Dans tous les cas, journalisez la tentative initiale et le fallback : c\'est indispensable pour la réconciliation et pour mesurer la disponibilité réelle par provider.' },
      { type: 'h3', content: 'Ce qu\'il faut tester pour chaque opérateur' },
      { type: 'ul', content: [
        'Le happy path complet (paiement initié → confirmé → webhook reçu)',
        'Un timeout côté provider — votre code gère-t-il l\'absence de réponse ?',
        'Un refus de l\'utilisateur sur son téléphone — quel statut retourne l\'API ?',
        'Un numéro de téléphone au mauvais format — le 400 est-il bien géré ?',
        'Un webhook reçu hors ordre (statut FAILED après un SUCCESSFUL antérieur)',
      ] },
      { type: 'h3', content: 'Surveillance par opérateur' },
      { type: 'p', content: 'Construisez un dashboard séparé par provider : taux de succès, latence P95, taux de timeout. Si Orange chute à 60 % de succès un mardi matin, vous voulez le savoir avant vos marchands. La surveillance multi-opérateurs est la différence entre réagir et anticiper.' },
    ],
  },
  {
    id: 'go-live', num: 6, tag: 'Release',
    title: 'Go-live checklist',
    tagline: 'Une mise en production sans surprise : validez chaque point avant d\'ouvrir le trafic réel.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Go-live checklist', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'La majorité des incidents de mise en production viennent d\'une variable manquante, d\'une clé de test laissée en prod, ou d\'un webhook non testé en conditions réelles. Cette checklist couvre les angles morts les plus fréquents. Cochez chaque point — si vous ne pouvez pas cocher, bloquez le go-live.' },
      { type: 'h3', content: 'Infrastructure et configuration' },
      { type: 'checklist', content: [
        'Toutes les variables d\'environnement de production sont définies sur le serveur cible',
        'Les clés API de production sont distinctes des clés de test',
        'L\'URL de webhook de production est en HTTPS avec un certificat valide',
        'Le secret webhook de production est différent de celui de test',
        'Le rate limiting est actif et configuré sur les endpoints critiques',
        'Les alertes sur les erreurs et la latence sont configurées et testées',
      ] },
      { type: 'h3', content: 'Validation fonctionnelle' },
      { type: 'p', content: 'Effectuez ces tests en environnement de pré-production avec les vraies clés de production (ou un compte de staging dédié). Ne faites pas ça directement en prod pour la première fois.' },
      { type: 'checklist', content: [
        'Un paiement réel de faible montant a été créé et est passé SUCCESSFUL',
        'Un paiement échoué (refus utilisateur) est retourné proprement avec FAILED',
        'Le statut est récupérable via GET avec le transactionId',
        'Le webhook de production a été reçu, la signature vérifiée, le traitement déclenché',
        'Les cas de timeout et de retry ont été testés avec un provider en mode dégradé',
      ] },
      { type: 'h3', content: 'Sécurité' },
      { type: 'checklist', content: [
        'Aucun secret n\'est commité dans le dépôt Git (vérifiez l\'historique, pas seulement le HEAD)',
        'Une rotation de clé est planifiée dans les 90 jours',
        'Les accès admin et marchand ont été testés séparément (un marchand ne voit pas les données des autres)',
        'Les journaux de sécurité sont actifs et consultables',
      ] },
      { type: 'h3', content: 'Plan de rollback' },
      { type: 'p', content: 'Avant de couper le ruban, sachez exactement quoi faire si ça tourne mal dans les 30 premières minutes. Qui prend la décision de rollback ? Comment désactiver rapidement l\'intégration sans couper l\'application entière ?' },
      { type: 'checklist', content: [
        'La procédure de rollback est documentée et accessible à l\'équipe',
        'Un point de contact incident est défini (pas une liste de diffusion — une personne joignable)',
        'Un script ou une procédure de désactivation rapide est disponible',
        'La communication client en cas d\'incident est rédigée et prête à envoyer',
      ] },
      { type: 'h3', content: 'Fenêtre de mise en production' },
      { type: 'ol', content: [
        'Figer les autres changements non critiques pendant 24 h avant et après',
        'Ouvrir progressivement si possible (10 % du trafic d\'abord)',
        'Surveiller en temps réel pendant les 24–48 premières heures',
        'Faire une rétrospective rapide 48 h après pour noter les surprises',
      ] },
    ],
  },
  {
    id: 'observability', num: 7, tag: 'Pilotage',
    title: 'Observabilité et analytics',
    tagline: 'Savoir ce qui se passe dans votre intégration avant que vos marchands ne vous le signalent.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Observabilité et analytics', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Une bonne observabilité, c\'est être averti avant vos utilisateurs. Sans elle, vous découvrez les problèmes par les tickets de support ou les tweets de mécontents. L\'objectif est simple : instrumenter ce qui compte, ne pas noyer les logs, et déclencher les bonnes alertes.' },
      { type: 'h3', content: 'Les événements à tracer en priorité' },
      { type: 'p', content: 'Ne loggez pas tout — loggez ce qui sert à diagnostiquer. À chaque paiement, enregistrez au minimum : le transactionId, le provider, le statut, la durée, et si un webhook a été reçu ou non. Ajoutez un correlationId commun à la requête initiale et à tous les événements liés, pour pouvoir retracer un flux complet en cas d\'incident.' },
      { type: 'ul', content: [
        'merchant_login_success / failure — pour détecter une vague d\'échecs d\'auth',
        'payment_initiated / completed / failed — avec montant, provider et durée',
        'webhook_received / webhook_failed — avec eventId et latence de traitement',
        'api_key_rotated / api_key_revoked — pour l\'audit de sécurité',
      ] },
      { type: 'h3', content: 'Les KPI qui comptent vraiment' },
      { type: 'p', content: 'Évitez les KPI vanité. Ces quatre indicateurs suffisent à piloter la santé de votre intégration au quotidien :' },
      { type: 'ul', content: [
        'Taux de succès paiement par provider — chute = problème opérateur ou bug',
        'Latence P95 par endpoint — hausse = saturation ou régression de performance',
        'Taux de livraison webhook — en dessous de 99 % = problème à investiguer',
        'Taux d\'erreurs 4xx / 5xx par endpoint — pour distinguer bugs clients de bugs serveur',
      ] },
      { type: 'h3', content: 'Quand déclencher une alerte ?' },
      { type: 'p', content: 'Trop d\'alertes tuent les alertes : les équipes finissent par les ignorer. Soyez sélectif. Déclenchez une alerte quand :' },
      { type: 'ul', content: [
        'Le taux d\'erreurs 5xx dépasse 1 % pendant plus de 5 minutes consécutives',
        'Le taux de succès des paiements chute de plus de 10 points en 15 minutes',
        'La latence P95 dépasse le double de sa valeur normale',
        'Le taux d\'échec webhook dépasse 5 % sur une fenêtre de 30 minutes',
      ] },
      { type: 'h3', content: 'Bonnes pratiques de logging' },
      { type: 'p', content: 'Tout log contenant un numéro de téléphone, un montant ou un identifiant marchand doit être traité comme donnée sensible. N\'incluez jamais de clés API, de tokens ou de mots de passe dans les logs — même masqués partiellement. Standardisez le format et les noms de champs pour que vos logs soient interrogeables par des outils comme Loki, Elastic ou CloudWatch.' },
    ],
  },
  {
    id: 'automated-tests', num: 8, tag: 'Qualité',
    title: 'Tests automatisés d\'intégration',
    tagline: 'Détecter les régressions avant la mise en production, pas après.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Tests automatisés d\'intégration', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Un changement dans le contrat d\'API, une dépendance mise à jour, une configuration modifiée — n\'importe lequel de ces événements peut casser votre intégration silencieusement. Sans tests automatisés, vous le découvrez en production. Avec, vous le découvrez en 3 minutes dans votre pipeline CI.' },
      { type: 'h3', content: 'Commencez par le parcours critique' },
      { type: 'p', content: 'Inutile de viser 100 % de couverture dès le départ. Concentrez-vous sur le parcours qui coûte le plus cher en cas de panne : l\'authentification marchand, la création d\'un paiement, la lecture de son statut et la réception du webhook. Ces cinq cas couvrent 90 % des régressions importantes.' },
      { type: 'checklist', content: [
        'Authentification marchand (succès et échec)',
        'Création d\'un paiement avec payload valide',
        'Lecture du statut d\'un paiement existant',
        'Tentative de paiement avec clé API invalide → doit retourner 401',
        'Tentative de paiement avec payload incomplet → doit retourner 400',
      ] },
      { type: 'h3', content: 'L\'environnement de test doit être isolé' },
      { type: 'p', content: 'Vos tests doivent tourner contre un environnement de test dédié — jamais contre la production. Utilisez le MockAdapter de ST Pay pour avoir des réponses déterministes : un paiement vers le numéro 670000001 réussit toujours, vers 670000002 échoue toujours. Cela rend vos tests stables et rapides.' },
      { type: 'h3', content: 'Scénarios avancés à automatiser ensuite' },
      { type: 'ol', content: [
        'Provider indisponible — votre code bascule-t-il proprement en erreur ?',
        'Webhook livré deux fois — votre handler est-il idempotent ?',
        'Retry après une erreur 503 transitoire',
        'Tentative d\'accès aux données d\'un autre marchand — doit retourner 403',
      ] },
      { type: 'h3', content: 'Intégrez les tests dans votre CI' },
      { type: 'p', content: 'Les tests ne servent à rien si personne ne les regarde. Bloquez les merges si les tests critiques échouent. Archivez les rapports pour suivre les tendances dans le temps. Un test qui "flake" de temps en temps — qui échoue aléatoirement — doit être corrigé immédiatement ou retiré de la suite critique : il érode la confiance dans l\'ensemble.' },
      { type: 'h3', content: 'Qualité des tests eux-mêmes' },
      { type: 'p', content: 'Un bon test d\'intégration est déterministe (même entrée → même résultat), indépendant des autres tests (l\'ordre d\'exécution ne change rien), et nettoie ses propres données après exécution. Versionnez vos données de test avec votre code.' },
    ],
  },
  {
    id: 'api-migration', num: 9, tag: 'Évolution',
    title: 'Migration de version API',
    tagline: 'Faire évoluer l\'API sans forcer vos intégrateurs à migrer en urgence sous peine de panne.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Migration de version API', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'Une migration d\'API mal gérée peut casser les intégrations de dizaines de marchands du jour au lendemain. Le principe fondamental : toute modification incompatible doit être accompagnée d\'une période de cohabitation. L\'ancienne version reste disponible pendant que les marchands migrent à leur rythme.' },
      { type: 'h3', content: 'Distinguer les changements compatibles des changements cassants' },
      { type: 'p', content: 'Ajouter un champ optionnel dans une réponse est compatible — les clients qui ne le lisent pas ne sont pas affectés. Supprimer un champ, changer son type ou modifier la sémantique d\'un statut est cassant. Pour tout changement cassant, prévoyez une cohabitation d\'au moins 60 jours.' },
      { type: 'h3', content: 'Annoncer clairement et tôt' },
      { type: 'p', content: 'Une bonne release note répond à quatre questions : qu\'est-ce qui change ? pourquoi ça change ? qu\'est-ce que ça implique pour moi ? que dois-je faire et avant quelle date ? Évitez le jargon interne — vos intégrateurs n\'ont pas votre contexte. Donnez un exemple concret "avant / après".' },
      { type: 'h3', content: 'Calendrier de déprécation' },
      { type: 'ol', content: [
        'J−60 : annonce publique, documentation de migration disponible',
        'J−30 : rappel avec compteur de marchands non encore migrés',
        'J−7 : dernier rappel, canal de support prioritaire ouvert',
        'J0 : l\'ancienne version commence à retourner des warnings dans les réponses',
        'J+30 : coupure effective (si adoption suffisante)',
      ] },
      { type: 'h3', content: 'Mesurer l\'adoption' },
      { type: 'p', content: 'Instrumentez votre API pour savoir quelle version chaque marchand utilise. Sans cette mesure, vous ne savez pas quand il est sûr de couper l\'ancienne version. Un tableau de bord simple avec le pourcentage de trafic par version vous dira tout.' },
      { type: 'h3', content: 'Ne coupez jamais sans confirmation' },
      { type: 'p', content: 'Même après la date annoncée, si 30 % des marchands n\'ont pas encore migré, repoussez la coupure. Le coût d\'une coupure forcée — incidents, tickets support, perte de confiance — est toujours supérieur au coût de maintenir une version dépréciée quelques semaines de plus.' },
    ],
  },
  {
    id: 'l1-support', num: 10, tag: 'Support',
    title: 'Support L1 pour juniors',
    tagline: 'Résoudre 80 % des incidents courants en moins de 10 minutes, sans escalader.',
    blocks: [
      { type: 'video' as const, content: { youtubeId: 'dQw4w9WgXcQ', title: 'ST Pay — Tutoriel : Support L1 pour juniors', description: 'Remplacez l\'ID YouTube par celui de votre vrai tutoriel.' } },
      { type: 'p' as const, content: 'La majorité des incidents d\'intégration ont une cause simple. Avant d\'escalader, posez-vous cinq questions : quel endpoint, quel code HTTP, quel identifiant, quelle clé API, est-ce reproductible ? Ces cinq réponses résolvent ou orientent 80 % des tickets.' },
      { type: 'h3', content: 'Les cinq questions de triage' },
      { type: 'ol', content: [
        'Quel endpoint a été appelé, et à quelle heure exactement ?',
        'Quel code HTTP a été reçu en retour ?',
        'Quel est le paymentId ou le requestId concerné ?',
        'La clé API est-elle la bonne pour cet environnement (test vs prod) ?',
        'L\'erreur est-elle reproductible à la demande, ou intermittente ?',
      ] },
      { type: 'h3', content: 'Diagnostics rapides par code d\'erreur' },
      { type: 'p', content: 'Un 401 ou 403 : vérifiez que le header X-Api-Key est présent, que la clé correspond à l\'environnement, et que le compte marchand n\'a pas été suspendu.' },
      { type: 'p', content: 'Un 400 : ouvrez le corps de la réponse — ST Pay retourne toujours un message d\'erreur explicite qui indique quel champ pose problème. Ne lisez pas juste le code HTTP.' },
      { type: 'p', content: 'Un 404 : l\'identifiant n\'existe pas ou n\'appartient pas à ce marchand. Vérifiez que le paymentId vient bien de ce compte et de cet environnement.' },
      { type: 'p', content: 'Un 5xx : collectez le correlationId dans les headers de réponse. Sans lui, l\'escalade L2 sera impossible à investiguer côté serveur.' },
      { type: 'p', content: 'Webhook absent : vérifiez dans l\'ordre — l\'URL configurée est-elle correcte ? Le handler répond-il en moins de 5 s ? Les logs montrent-ils une tentative de livraison ? La signature est-elle bien vérifiée ?' },
      { type: 'h3', content: 'Quand escalader en L2 ?' },
      { type: 'p', content: 'Escaladez quand plus de 3 marchands sont impactés simultanément, quand l\'incident dure depuis plus de 30 minutes sans cause identifiée, ou quand vous obtenez des 5xx persistants sur un endpoint qui fonctionnait normalement. L\'escalade sans correlationId fait perdre du temps à tout le monde.' },
      { type: 'h3', content: 'Ce que vous devez joindre à chaque escalade' },
      { type: 'ul', content: [
        'Le correlationId ou requestId de la requête concernée',
        'L\'endpoint exact (méthode + chemin) et l\'heure précise',
        'Le payload envoyé (avec données sensibles masquées)',
        'Le code HTTP reçu et le corps de réponse',
        'L\'impact business estimé (nombre de marchands, montant bloqué)',
      ] },
    ],
  },
]

// ─── sub-components ───────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: Tag }) {
  const c = TAG_COLOR[tag]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
          style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {tag}
    </span>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="relative group rounded-[10px] overflow-hidden border border-[var(--border)]"
         style={{ background: '#0f172a' }}>
      <button onClick={copy}
              className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity
                         text-[10px] font-semibold px-2 py-0.5 rounded-[5px]"
              style={{ background: '#1e293b', color: copied ? '#4ade80' : '#94a3b8' }}>
        {copied ? '✓ Copié' : 'Copier'}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5 text-[12px] leading-relaxed m-0"
           style={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function CheckItem({ text, defaultChecked = false }: { text: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <li className="flex items-start gap-2.5 py-1 cursor-pointer select-none"
        onClick={() => setChecked(v => !v)}>
      <span className="mt-[1px] w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors"
            style={checked
              ? { background: 'var(--orange)', borderColor: 'var(--orange)' }
              : { background: 'transparent', borderColor: 'var(--border)' }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span className="text-[13px] leading-snug"
            style={{ color: checked ? 'var(--text-4)' : 'var(--text-2)', textDecoration: checked ? 'line-through' : 'none' }}>
        {text}
      </span>
    </li>
  )
}

function VideoEmbed({ video }: { video: VideoBlock }) {
  const [playing, setPlaying] = useState(false)
  const thumbUrl = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`

  return (
    <div className="rounded-[12px] overflow-hidden border border-[var(--border)] my-2">
      {playing ? (
        <iframe
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video block border-0"
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video flex items-center justify-center group block"
          style={{ background: '#0f172a' }}
          aria-label={`Lancer : ${video.title}`}
        >
          {/* thumbnail */}
          <img
            src={thumbUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          {/* play button */}
          <div className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center
                          shadow-xl transition-transform group-hover:scale-110"
               style={{ background: '#ff0000' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M8 5.14v13.72L19 12 8 5.14z"/>
            </svg>
          </div>
          {/* title overlay */}
          <span className="absolute bottom-0 left-0 right-0 px-4 py-3 text-[13px] font-semibold text-white
                           bg-gradient-to-t from-black/70 to-transparent text-left line-clamp-2">
            {video.title}
          </span>
        </button>
      )}
      {video.description && (
        <div className="px-4 py-2.5 border-t border-[var(--border-soft)]"
             style={{ background: 'var(--bg-card)' }}>
          <p className="text-[12px] leading-snug" style={{ color: 'var(--text-3)' }}>{video.description}</p>
        </div>
      )}
    </div>
  )
}

function GuideContent({ guide, videoOverrides }: { guide: Guide; videoOverrides: Record<string, GuideVideoConfig> }) {
  // Merge API video config into blocks: if the API has a non-placeholder value for this guide, override.
  const resolvedBlocks = guide.blocks.map(block => {
    if (block.type !== 'video') return block
    const override = videoOverrides[guide.id]
    if (!override) return block
    return {
      ...block,
      content: {
        youtubeId: override.youtubeId,
        title: override.title,
        description: override.description ?? undefined,
      } as VideoBlock,
    }
  })
  return (
    <div className="space-y-4">
      {resolvedBlocks.map((block, i) => {
        if (block.type === 'h3') {
          return (
            <h3 key={i} className="text-[14px] font-bold mt-6 mb-1"
                style={{ color: 'var(--text-1)' }}>
              {block.content as string}
            </h3>
          )
        }
        if (block.type === 'p') {
          return <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{block.content as string}</p>
        }
        if (block.type === 'code') {
          return <CodeBlock key={i} code={block.content as string} />
        }
        if (block.type === 'video') {
          return <VideoEmbed key={i} video={block.content as VideoBlock} />
        }
        if (block.type === 'checklist') {
          return (
            <ul key={i} className="space-y-0.5 pl-0 list-none">
              {(block.content as string[]).map((item, j) => (
                <CheckItem key={j} text={item} />
              ))}
            </ul>
          )
        }
        if (block.type === 'ul') {
          return (
            <ul key={i} className="space-y-1.5 pl-0 list-none">
              {(block.content as string[]).map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: 'var(--text-2)' }}>
                  <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--orange)' }} />
                  {item}
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={i} className="space-y-1.5 pl-0 list-none">
              {(block.content as string[]).map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: 'var(--text-2)' }}>
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: 'var(--orange)', marginTop: '1px' }}>
                    {j + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          )
        }
        return null
      })}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function IntegrationGuides() {
  const [activeId, setActiveId] = useState(GUIDES[0].id)
  const [search, setSearch] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch video configs from backend (admin-configurable)
  const { data: videoConfigs = [] } = useQuery({
    queryKey: ['guide-videos'],
    queryFn: guideVideosApi.list,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const videoOverrides: Record<string, GuideVideoConfig> = Object.fromEntries(
    videoConfigs.map(c => [c.guideId, c])
  )

  const filtered = search.trim()
    ? GUIDES.filter(g =>
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.tag.toLowerCase().includes(search.toLowerCase()) ||
        g.tagline.toLowerCase().includes(search.toLowerCase())
      )
    : GUIDES

  const activeGuide = GUIDES.find(g => g.id === activeId) ?? GUIDES[0]

  function selectGuide(id: string) {
    setActiveId(id)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // If current active not in filtered results, don't change — just highlight in list
  useEffect(() => {
    if (filtered.length > 0 && !filtered.find(g => g.id === activeId)) {
      setActiveId(filtered[0].id)
    }
  }, [search])

  return (
    <div className="flex h-full min-h-0">

      {/* ── Left sidebar: guide list ────────────────────────────────────── */}
      <aside className="w-[240px] min-w-[240px] flex flex-col border-r border-[var(--border)]
                        bg-[var(--bg-card)] overflow-hidden">

        {/* search */}
        <div className="px-3 pt-3 pb-2 border-b border-[var(--border-soft)]">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
                 width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un guide…"
              className="w-full pl-7 pr-3 py-1.5 rounded-[7px] text-[12px] border border-[var(--border)]
                         bg-[var(--bg)] text-[var(--text-1)] placeholder:text-[var(--text-4)]
                         focus:outline-none focus:ring-1 focus:ring-[var(--orange)]"
            />
          </div>
          <p className="text-[10px] text-[var(--text-4)] mt-2 px-0.5">
            {filtered.length} guide{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* list */}
        <nav className="flex-1 overflow-y-auto py-1.5 px-2">
          {filtered.map(guide => {
            const active = guide.id === activeId
            const tc = TAG_COLOR[guide.tag]
            return (
              <button key={guide.id}
                      onClick={() => selectGuide(guide.id)}
                      className="w-full text-left px-2.5 py-2.5 rounded-[8px] mb-0.5 transition-colors group"
                      style={{ background: active ? 'var(--orange-bg, #fff7ed)' : 'transparent' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono w-5 text-center rounded"
                        style={{ color: active ? 'var(--orange)' : 'var(--text-4)' }}>
                    {String(guide.num).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-px rounded border"
                        style={{ background: tc.bg, color: tc.text, borderColor: tc.border }}>
                    {guide.tag}
                  </span>
                </div>
                <p className="text-[12px] font-semibold leading-snug pl-7"
                   style={{ color: active ? 'var(--orange-dark, var(--orange))' : 'var(--text-2)' }}>
                  {guide.title}
                </p>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <p className="text-center text-[12px] text-[var(--text-4)] py-8">Aucun résultat.</p>
          )}
        </nav>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">

        {/* sticky guide header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-[var(--border)]
                        bg-[var(--bg-card)] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded"
                  style={{ background: 'var(--orange-bg, #fff7ed)', color: 'var(--orange)' }}>
              #{activeGuide.num}
            </span>
            <div className="min-w-0">
              <h1 className="text-[16px] font-extrabold text-[var(--text-1)] leading-tight truncate">
                {activeGuide.title}
              </h1>
              <p className="text-[12px] text-[var(--text-3)] mt-0.5 leading-snug line-clamp-1">
                {activeGuide.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <TagBadge tag={activeGuide.tag} />
          </div>
        </div>

        {/* guide body */}
        <div className="px-6 py-6 max-w-[760px]">
          <GuideContent guide={activeGuide} videoOverrides={videoOverrides} />

          {/* navigation bas de page */}
          <div className="flex items-center justify-between mt-10 pt-5 border-t border-[var(--border-soft)]">
            {(() => {
              const idx = GUIDES.findIndex(g => g.id === activeId)
              const prev = GUIDES[idx - 1]
              const next = GUIDES[idx + 1]
              return (
                <>
                  {prev ? (
                    <button onClick={() => selectGuide(prev.id)}
                            className="flex items-center gap-2 text-[12px] font-semibold
                                       text-[var(--text-2)] hover:text-[var(--orange)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {prev.title}
                    </button>
                  ) : <span />}
                  {next ? (
                    <button onClick={() => selectGuide(next.id)}
                            className="flex items-center gap-2 text-[12px] font-semibold
                                       text-[var(--text-2)] hover:text-[var(--orange)] transition-colors">
                      {next.title}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  ) : <span />}
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
