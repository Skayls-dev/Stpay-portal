// src/pages/DeveloperPortal.tsx
// Developer Portal — intégré dans le portail marchand.
// Sections : clés API · playground · docs endpoints · snippets · statut providers · simulateur USSD

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_MAX_ATTEMPTS,
  buildPaymentInitiationPayload,
  isFailedPaymentStatus,
  isSuccessfulPaymentStatus,
  merchantsApi,
  normalizePaymentStatus,
  providersHealthApi,
} from '../lib/api/modules'
import { Badge } from '../components/ui'
import client, { type ApiClientError } from '../lib/api/client'
import {
  markDxStep,
  recordDxFirstApiCall,
  recordDxFirstSuccessPayment,
  startDxSession,
} from '../lib/dxAnalytics'
import { useAuth } from '../hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'wizard' | 'quickstart' | 'keys' | 'playground' | 'docs' | 'escrow' | 'snippets' | 'status' | 'simulator'
type ApiKey = { key: string; mode: 'test' | 'live'; createdAt?: string }
type PlaygroundEndpoint = { id: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; label: string; body?: object; params?: Record<string, string> }
type AuthMode = false | 'api-key' | 'bearer'
type DocEndpoint = { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; desc: string; auth: AuthMode }
type Lang = 'curl' | 'js' | 'php' | 'python' | 'dotnet' | 'java'
type SimState = 'idle' | 'initiating' | 'waiting_phone' | 'confirming' | 'success' | 'failed' | 'cancelled' | 'timeout'
type PhoneScreen = 'idle' | 'ussd' | 'processing' | 'success' | 'failed' | 'cancelled'

interface PaymentForm {
  amount: number; phone: string; name: string; ref: string; description: string
  scenario: 'success' | 'failure' | 'timeout'
}

interface LogEntry { time: string; message: string; type: 'info' | 'ok' | 'err' | 'warn' }

interface TxResult { txId: string; providerRef?: string; status: string; amount: number; duration: number }

interface ApiErrorDetails {
  message: string
  hint?: string
  status?: number
  body?: unknown
  url?: string
}

interface OrangeWebhookForm {
  orderId: string
  payToken: string
  status: string
  message: string
  txnId: string
  subscriberMsisdn: string
  amount: string
}

interface RequestLogEntry { time: string; method: string; path: string; status: number | null; duration: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'wizard',     label: 'Wizard',      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.5 3 3.5.5-2.5 2.5.6 3.5L7 9.5l-3.1 1.5.6-3.5L2 5l3.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'quickstart', label: 'Quickstart', icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'keys',       label: 'Clés API',    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5a3 3 0 010 6H8l-1 1H5.5v1.5H4V11.5H2.5V10L6.8 5.7A3 3 0 019.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><circle cx="9.5" cy="4.5" r=".8" fill="currentColor"/></svg> },
  { id: 'playground', label: 'Playground',  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4l4 3-4 3V4zM8 9h4M8 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'docs',       label: 'Endpoints',   icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 5h4M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { id: 'escrow',     label: 'Escrow',      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5C4 1.5 2 3.5 2 6c0 3 5 6.5 5 6.5s5-3.5 5-6.5c0-2.5-2-4.5-5-4.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 6l1.5 1.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'snippets',   label: 'Code',        icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 4.5L2 7l2.5 2.5M9.5 4.5L12 7l-2.5 2.5M7.5 3l-1 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'status',     label: 'Statut',      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 7h1.5l1-2 2 4 1-2H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'simulator',  label: 'Simulateur',  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3h4M5 10h4M6.5 7.5l1.5-1.5L6.5 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg> },
]

const PLAYGROUND_ENDPOINTS: PlaygroundEndpoint[] = [
  { id: 'list-payments',  method: 'GET',    path: '/api/Payment',                label: 'Lister les paiements' },
  { id: 'create-payment', method: 'POST',   path: '/api/Payment',                label: 'Créer un paiement',
    body: { amount: 5000, currency: 'XAF', provider: 'MTN', countryCode: 'CM', customer: { phoneNumber: '237677123456', name: 'Test User', email: 'test@example.com' }, merchant: { reference: 'MERCHANT_REF', callbackUrl: 'https://example.com/callback', name: 'Ma Boutique' }, description: 'Test paiement ST Pay' } },
  { id: 'get-payment',    method: 'GET',    path: '/api/Payment/{paymentId}',     label: 'Statut paiement',    params: { paymentId: '' } },
  { id: 'cancel-payment', method: 'DELETE', path: '/api/Payment/{paymentId}',     label: 'Annuler paiement',   params: { paymentId: '' } },
  { id: 'list-providers', method: 'GET',    path: '/api/Payment/providers',      label: 'Lister les providers' },
  { id: 'merchant-me',    method: 'GET',    path: '/api/merchant/me',             label: 'Profil marchand' },
  { id: 'merchant-update',method: 'PUT',    path: '/api/merchant/me',             label: 'Mettre à jour le profil', body: { name: 'Ma Boutique ST Pay', webhookUrl: 'https://example.com/webhook' } },
  { id: 'list-keys',      method: 'GET',    path: '/api/keys',                    label: 'Lister les clés API' },
  { id: 'list-escrow',    method: 'GET',    path: '/api/escrow',                  label: 'Lister les escrows' },
  { id: 'health',         method: 'GET',    path: '/api/Payment/health',           label: 'Santé API' },
  { id: 'list-webhooks',  method: 'GET',    path: '/api/webhooks',                label: 'Lister webhooks' },
  { id: 'orange-webhook', method: 'POST',   path: '/api/webhooks/orange',         label: 'Tester webhook Orange', body: { orderId: 'ORDER_001', status: 'SUCCESS', message: 'Webhook test', txnId: 'txn-001', subscriberMsisdn: '237677123456', amount: '5000' } },
]

const DOCS_ENDPOINTS: Array<{ tag: string; color: 'blue' | 'orange' | 'amber' | 'green' | 'slate' | 'red'; routes: DocEndpoint[] }> = [
  { tag: 'Auth Portails', color: 'slate', routes: [
    { method: 'POST',   path: '/api/merchant/register',                      desc: 'Créer un compte portail marchand',                 auth: false },
    { method: 'POST',   path: '/api/merchant/login',                         desc: 'Connexion portail marchand',                       auth: false },
    { method: 'GET',    path: '/api/merchant/me',                            desc: 'Profil marchand authentifié',                      auth: 'api-key' },
    { method: 'PUT',    path: '/api/merchant/me',                            desc: 'Mettre à jour le profil marchand',                 auth: 'api-key' },
    { method: 'PUT',    path: '/api/merchant/me/password',                   desc: 'Changer le mot de passe marchand',                 auth: 'api-key' },
    { method: 'POST',   path: '/api/admin/login',                            desc: 'Connexion portail admin',                          auth: false },
    { method: 'GET',    path: '/api/admin/me',                               desc: 'Profil super admin authentifié',                   auth: 'bearer' },
  ]},
  { tag: 'Paiements', color: 'blue', routes: [
    { method: 'POST',   path: '/api/Payment',                    desc: 'Initier un paiement mobile money',    auth: 'api-key' },
    { method: 'GET',    path: '/api/Payment/{paymentId}',        desc: "Récupérer le statut d'un paiement",  auth: 'api-key' },
    { method: 'DELETE', path: '/api/Payment/{paymentId}',        desc: 'Annuler un paiement en cours',        auth: 'api-key' },
    { method: 'POST',   path: '/api/Payment/{paymentId}/refund', desc: 'Rembourser un paiement',              auth: 'api-key' },
    { method: 'GET',    path: '/api/Payment/health',             desc: "Vérifier la santé de l'API",          auth: false },
    { method: 'GET',    path: '/api/Payment/providers',          desc: 'Lister les providers activés',        auth: 'api-key' },
    { method: 'GET',    path: '/api/Payment/providers/{name}/health', desc: "Santé d'un provider spécifique", auth: 'api-key' },
  ]},
  { tag: 'Clés API', color: 'orange', routes: [
    { method: 'GET',    path: '/api/keys',          desc: 'Lister les clés actives (merchant ou super admin)', auth: 'api-key' },
    { method: 'POST',   path: '/api/keys/generate', desc: 'Générer une nouvelle clé marchand',                auth: 'api-key' },
    { method: 'POST',   path: '/api/keys/rotate',   desc: 'Rotation de clé marchand',                         auth: 'api-key' },
    { method: 'DELETE', path: '/api/keys/revoke',   desc: 'Révoquer une clé marchand',                        auth: 'api-key' },
  ]},
  { tag: 'Webhooks', color: 'amber', routes: [
    { method: 'GET',  path: '/api/webhooks',                  desc: 'Lister les webhooks du marchand authentifié', auth: 'api-key' },
    { method: 'POST', path: '/api/webhooks/orange',           desc: 'Recevoir un webhook Orange Money entrant',    auth: false },
    { method: 'POST', path: '/api/webhooks/{id}/replay',      desc: 'Rejouer un webhook (super admin uniquement)', auth: 'bearer' },
    { method: 'GET',  path: '/api/webhooks/pending-retries',  desc: 'Webhooks en attente de retry (super admin)',  auth: 'bearer' },
  ]},
  { tag: 'Escrow', color: 'green', routes: [
    { method: 'POST',   path: '/api/escrow',                      desc: 'Créer un escrow lié à un paiement',     auth: 'api-key' },
    { method: 'GET',    path: '/api/escrow',                      desc: 'Lister les séquestres actifs',          auth: 'api-key' },
    { method: 'GET',    path: '/api/escrow/{id}',                 desc: 'Détail d\'un séquestre',               auth: 'api-key' },
    { method: 'POST',   path: '/api/escrow/{id}/ship',            desc: 'Confirmer l\'expédition (marchand)',   auth: 'api-key' },
    { method: 'POST',   path: '/api/escrow/{id}/confirm-pickup',  desc: 'Valider le code de retrait (acheteur)', auth: 'api-key' },
    { method: 'POST',   path: '/api/escrow/{id}/buyer-confirm',   desc: 'Confirmation acheteur (DualConfirm)',   auth: 'api-key' },
    { method: 'POST',   path: '/api/escrow/{id}/release',         desc: 'Libérer les fonds (livré)',             auth: 'api-key' },
    { method: 'POST',   path: '/api/escrow/{id}/dispute',         desc: 'Ouvrir un litige',                      auth: 'api-key' },
  ]},
  { tag: 'Config Admin', color: 'red', routes: [
    { method: 'GET',    path: '/api/admin/config/merchant-portal-blocked-emails', desc: 'Lire la blocklist du portail marchand (super admin)',  auth: 'bearer' },
    { method: 'PUT',    path: '/api/admin/config/merchant-portal-blocked-emails', desc: 'Mettre à jour la blocklist du portail marchand',       auth: 'bearer' },
  ]},
]

const POSTMAN_SCHEMA_URL = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
type PostmanCollectionVariant = 'complete' | 'minimal'

const MINIMAL_POSTMAN_ROUTES = new Set([
  'POST /api/merchant/login',
  'GET /api/merchant/me',
  'GET /api/Payment/health',
  'POST /api/Payment',
  'GET /api/Payment/{paymentId}',
])

function postmanRawPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1')
}

function exampleBody(path: string): unknown | undefined {
  if (path === '/api/Payment') {
    return {
      amount: 5000,
      currency: 'XAF',
      provider: 'MTN',
      customer: { phoneNumber: '237677123456', name: 'Jean Dupont', email: 'jean@example.com' },
      merchant: { reference: 'ORDER_001', callbackUrl: 'https://example.com/callback', name: 'Ma Boutique' },
      description: 'Paiement de test',
    }
  }

  if (path === '/api/merchant/me') {
    return {
      name: 'Ma Boutique ST Pay',
      webhookUrl: 'https://example.com/webhook',
    }
  }

  if (path === '/api/merchant/me/password') {
    return {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    }
  }

  if (path.includes('/confirm-pickup')) return { pickupCode: '123456' }
  if (path.includes('/dispute')) return { reason: 'Produit non conforme' }
  if (path.endsWith('/merchant-portal-blocked-emails')) return { blockedEmails: ['security@stpay.local'] }
  if (path.endsWith('/admin/login') || path.endsWith('/merchant/login')) {
    return { email: 'admin@stpay.local', password: 'Admin123!' }
  }
  if (path.endsWith('/merchant/register')) {
    return {
      name: 'Merchant Demo',
      email: 'merchant.demo@stpay.local',
      password: 'Merchant123!',
      webhookUrl: 'https://example.com/webhook',
      isTestMode: true,
    }
  }

  return undefined
}

function createPostmanCollection(variant: PostmanCollectionVariant = 'complete') {
  const items = DOCS_ENDPOINTS.map((group) => {
    const selectedRoutes = variant === 'minimal'
      ? group.routes.filter((route) => MINIMAL_POSTMAN_ROUTES.has(`${route.method} ${route.path}`))
      : group.routes

    return {
      name: group.tag,
      item: selectedRoutes.map((route) => {
      const rawPath = postmanRawPath(route.path)
      const headers: Array<{ key: string; value: string }> = []
      if (route.auth === 'api-key') headers.push({ key: 'X-Api-Key', value: '{{apiKey}}' })
      if (route.auth === 'bearer') headers.push({ key: 'Authorization', value: 'Bearer {{adminToken}}' })

      const body = exampleBody(route.path)
      if (body && (route.method === 'POST' || route.method === 'PUT')) {
        headers.push({ key: 'Content-Type', value: 'application/json' })
      }

      return {
        name: `${route.method} ${route.path}`,
        request: {
          method: route.method,
          header: headers,
          description: route.desc,
          url: {
            raw: `{{baseUrl}}${rawPath}`,
            host: ['{{baseUrl}}'],
            path: rawPath.replace(/^\//, '').split('/'),
          },
          ...(body && (route.method === 'POST' || route.method === 'PUT')
            ? {
                body: {
                  mode: 'raw',
                  raw: JSON.stringify(body, null, 2),
                },
              }
            : {}),
        },
      }
      }),
    }
  }).filter((group) => group.item.length > 0)

  const name = variant === 'minimal'
    ? 'ST Pay API - Collection Minimal'
    : 'ST Pay API - Developer Portal'
  const description = variant === 'minimal'
    ? 'Collection Postman minimale pour demarrer rapidement (auth + flux paiement principal).'
    : 'Collection Postman complete generee depuis le Developer Portal ST Pay.'

  return {
    info: {
      name,
      description,
      schema: POSTMAN_SCHEMA_URL,
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:5169' },
      { key: 'apiKey', value: 'sk_test_votre_cle' },
      { key: 'adminToken', value: 'votre_token_bearer_admin' },
    ],
    item: items,
  }
}

function downloadPostmanCollectionFile(variant: PostmanCollectionVariant) {
  const collection = createPostmanCollection(variant)
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = variant === 'minimal'
    ? 'stpay-postman-collection-minimal.json'
    : 'stpay-postman-collection-complete.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const DEVELOPER_GUIDE_COPY_SNIPPETS: Record<string, string> = {
  'curl-payment': `curl -X POST http://localhost:5169/api/Payment
  -H "Content-Type: application/json"
  -H "X-Api-Key: sk_test_votre_cle"
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "provider": "MTN",
    "customer": {
      "phoneNumber": "237677123456",
      "name": "Jean Dupont",
      "email": "jean@example.com"
    },
    "merchant": {
      "reference": "ORDER_001",
      "callbackUrl": "https://example.com/callback",
      "name": "Ma Boutique"
    },
    "description": "Paiement de test"
  }'`,
  'js-payment': `const response = await fetch('http://localhost:5169/api/Payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'sk_test_votre_cle'
  },
  body: JSON.stringify({
    amount: 5000,
    currency: 'XAF',
    provider: 'MTN',
    customer: {
      phoneNumber: '237677123456',
      name: 'Jean Dupont',
      email: 'jean@example.com'
    },
    merchant: {
      reference: 'ORDER_001',
      callbackUrl: 'https://example.com/callback',
      name: 'Ma Boutique'
    },
    description: 'Paiement de test'
  })
})

const data = await response.json()
console.log(data.transactionId)
console.log(data.status)`,
  'polling-status': `async function waitForFinalStatus(paymentId, apiKey) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const res = await fetch('http://localhost:5169/api/Payment/' + paymentId, {
      headers: { 'X-Api-Key': apiKey }
    })

    const payment = await res.json()
    const status = String(payment.status || '').toUpperCase()

    if (status.includes('SUCCESS')) return payment
    if (status.includes('FAILED') || status.includes('ERROR') || status.includes('CANCELLED')) {
      throw new Error('Paiement termine en echec: ' + status)
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  throw new Error('Timeout: aucun statut final recu')
}`,
  'dotnet-payment': `using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var http = new HttpClient { BaseAddress = new Uri("http://localhost:5169") };
http.DefaultRequestHeaders.Add("X-Api-Key", "sk_test_votre_cle");

var payload = new
{
    amount = 5000,
    currency = "XAF",
    provider = "MTN",
    customer = new { phoneNumber = "237677123456", name = "Jean Dupont", email = "jean@example.com" },
    merchant = new { reference = "ORDER_001", callbackUrl = "https://example.com/callback", name = "Ma Boutique" },
    description = "Paiement de test"
};

var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var response = await http.PostAsync("/api/Payment", content);
var json = await response.Content.ReadAsStringAsync();

Console.WriteLine($"HTTP {(int)response.StatusCode}");
Console.WriteLine(json);`,
  'java-payment': `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class StPayExample {
  public static void main(String[] args) throws Exception {
    HttpClient client = HttpClient.newHttpClient();

    String body = """
      {
        \"amount\": 5000,
        \"currency\": \"XAF\",
        \"provider\": \"MTN\",
        \"customer\": {
          \"phoneNumber\": \"237677123456\",
          \"name\": \"Jean Dupont\",
          \"email\": \"jean@example.com\"
        },
        \"merchant\": {
          \"reference\": \"ORDER_001\",
          \"callbackUrl\": \"https://example.com/callback\",
          \"name\": \"Ma Boutique\"
        },
        \"description\": \"Paiement de test\"
      }
      """;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create("http://localhost:5169/api/Payment"))
      .header("Content-Type", "application/json")
      .header("X-Api-Key", "sk_test_votre_cle")
      .POST(HttpRequest.BodyPublishers.ofString(body))
      .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    System.out.println("HTTP " + response.statusCode());
    System.out.println(response.body());
  }
}`,
}

const DEVELOPER_GUIDE_HTML = `
  <section style="display:grid;gap:16px;line-height:1.65;color:#1f2937;">
    <div style="padding:16px;border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;">
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#9a3412;">Guide complet ST Pay</h3>
      <p style="margin:0;font-size:13px;">Cette documentation explique <strong>quoi envoyer</strong>, <strong>dans quel ordre</strong>, <strong>quel header utiliser</strong> et <strong>comment lire la reponse</strong>. Si vous debutez, commencez par le parcours "Premier paiement" ci-dessous.</p>
    </div>

    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">
      <div style="padding:14px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 6px;font-size:14px;font-weight:800;">1. Choisir le bon portail</h4>
        <p style="margin:0;font-size:13px;">Un <strong>marchand</strong> utilise sa cle API pour les paiements. Un <strong>super admin</strong> utilise un token Bearer pour les endpoints admin.</p>
      </div>
      <div style="padding:14px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 6px;font-size:14px;font-weight:800;">2. Authentification</h4>
        <p style="margin:0;font-size:13px;">Routes marchand: header <code style="background:#f3f4f6;padding:2px 6px;border-radius:6px;">X-Api-Key</code>. Routes admin: header <code style="background:#f3f4f6;padding:2px 6px;border-radius:6px;">Authorization: Bearer ...</code>.</p>
      </div>
      <div style="padding:14px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 6px;font-size:14px;font-weight:800;">3. Tester progressivement</h4>
        <p style="margin:0;font-size:13px;">Validez d'abord <code style="background:#f3f4f6;padding:2px 6px;border-radius:6px;">GET /api/Payment/health</code>, puis un profil marchand, puis un vrai paiement.</p>
      </div>
    </div>

    <div style="padding:16px;border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;">
      <h4 style="margin:0 0 10px;font-size:16px;font-weight:800;color:#1d4ed8;">Premier paiement: parcours recommande</h4>
      <ol style="margin:0;padding-left:18px;font-size:13px;display:grid;gap:8px;">
        <li>Connectez-vous comme marchand et recuperez une cle API dans l'onglet <strong>Clés API</strong>.</li>
        <li>Appelez <code style="background:#ffffff;padding:2px 6px;border-radius:6px;">POST /api/Payment</code> avec un montant, un provider et les informations client.</li>
        <li>Recuperez le <code style="background:#ffffff;padding:2px 6px;border-radius:6px;">transactionId</code> retourne par l'API.</li>
        <li>Interrogez <code style="background:#ffffff;padding:2px 6px;border-radius:6px;">GET /api/Payment/{paymentId}</code> jusqu'a obtenir un statut final.</li>
        <li>Si besoin, remboursez via <code style="background:#ffffff;padding:2px 6px;border-radius:6px;">POST /api/Payment/{paymentId}/refund</code>.</li>
      </ol>
    </div>

    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
      <div style="padding:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;">Exemple cURL minimal</h4>
        <div style="margin-bottom:10px;display:flex;justify-content:flex-end;">
          <button type="button" data-copy-doc="curl-payment" style="border:1px solid #fdba74;background:#fff7ed;color:#9a3412;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">Copier l'exemple</button>
        </div>
        <pre style="margin:0;overflow:auto;background:#111827;color:#f9fafb;padding:14px;border-radius:10px;font-size:12px;">curl -X POST http://localhost:5169/api/Payment
  -H "Content-Type: application/json"
  -H "X-Api-Key: sk_test_votre_cle"
  -d '{
    "amount": 5000,
    "currency": "XAF",
    "provider": "MTN",
    "customer": {
      "phoneNumber": "237677123456",
      "name": "Jean Dupont",
      "email": "jean@example.com"
    },
    "merchant": {
      "reference": "ORDER_001",
      "callbackUrl": "https://example.com/callback",
      "name": "Ma Boutique"
    },
    "description": "Paiement de test"
  }'</pre>
      </div>

      <div style="padding:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;">Exemple JavaScript simple</h4>
        <div style="margin-bottom:10px;display:flex;justify-content:flex-end;">
          <button type="button" data-copy-doc="js-payment" style="border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">Copier l'exemple</button>
        </div>
        <pre style="margin:0;overflow:auto;background:#111827;color:#f9fafb;padding:14px;border-radius:10px;font-size:12px;">const response = await fetch('http://localhost:5169/api/Payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'sk_test_votre_cle'
  },
  body: JSON.stringify({
    amount: 5000,
    currency: 'XAF',
    provider: 'MTN',
    customer: {
      phoneNumber: '237677123456',
      name: 'Jean Dupont',
      email: 'jean@example.com'
    },
    merchant: {
      reference: 'ORDER_001',
      callbackUrl: 'https://example.com/callback',
      name: 'Ma Boutique'
    },
    description: 'Paiement de test'
  })
})

const data = await response.json()
console.log(data.transactionId)
console.log(data.status)</pre>
      </div>
    </div>

    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
      <div style="padding:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;">Exemple .NET (HttpClient)</h4>
        <div style="margin-bottom:10px;display:flex;justify-content:flex-end;">
          <button type="button" data-copy-doc="dotnet-payment" style="border:1px solid #bae6fd;background:#f0f9ff;color:#0c4a6e;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">Copier l'exemple</button>
        </div>
        <pre style="margin:0;overflow:auto;background:#111827;color:#f9fafb;padding:14px;border-radius:10px;font-size:12px;">using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var http = new HttpClient { BaseAddress = new Uri("http://localhost:5169") };
http.DefaultRequestHeaders.Add("X-Api-Key", "sk_test_votre_cle");

var payload = new
{
    amount = 5000,
    currency = "XAF",
    provider = "MTN",
    customer = new { phoneNumber = "237677123456", name = "Jean Dupont", email = "jean@example.com" },
    merchant = new { reference = "ORDER_001", callbackUrl = "https://example.com/callback", name = "Ma Boutique" },
    description = "Paiement de test"
};

var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var response = await http.PostAsync("/api/Payment", content);
var json = await response.Content.ReadAsStringAsync();

Console.WriteLine($"HTTP {(int)response.StatusCode}");
Console.WriteLine(json);</pre>
      </div>

      <div style="padding:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
        <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;">Exemple Java (HttpClient)</h4>
        <div style="margin-bottom:10px;display:flex;justify-content:flex-end;">
          <button type="button" data-copy-doc="java-payment" style="border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">Copier l'exemple</button>
        </div>
        <pre style="margin:0;overflow:auto;background:#111827;color:#f9fafb;padding:14px;border-radius:10px;font-size:12px;">import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class StPayExample {
  public static void main(String[] args) throws Exception {
    HttpClient client = HttpClient.newHttpClient();

    String body = """
      {
        \"amount\": 5000,
        \"currency\": \"XAF\",
        \"provider\": \"MTN\",
        \"customer\": {
          \"phoneNumber\": \"237677123456\",
          \"name\": \"Jean Dupont\",
          \"email\": \"jean@example.com\"
        },
        \"merchant\": {
          \"reference\": \"ORDER_001\",
          \"callbackUrl\": \"https://example.com/callback\",
          \"name\": \"Ma Boutique\"
        },
        \"description\": \"Paiement de test\"
      }
      """;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create("http://localhost:5169/api/Payment"))
      .header("Content-Type", "application/json")
      .header("X-Api-Key", "sk_test_votre_cle")
      .POST(HttpRequest.BodyPublishers.ofString(body))
      .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    System.out.println("HTTP " + response.statusCode());
    System.out.println(response.body());
  }
}</pre>
      </div>
    </div>

    <div style="padding:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
      <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;">Exemple de polling du statut</h4>
      <div style="margin-bottom:10px;display:flex;justify-content:flex-end;">
        <button type="button" data-copy-doc="polling-status" style="border:1px solid #86efac;background:#f0fdf4;color:#166534;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">Copier l'exemple</button>
      </div>
      <pre style="margin:0;overflow:auto;background:#111827;color:#f9fafb;padding:14px;border-radius:10px;font-size:12px;">async function waitForFinalStatus(paymentId, apiKey) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const res = await fetch('http://localhost:5169/api/Payment/' + paymentId, {
      headers: { 'X-Api-Key': apiKey }
    })

    const payment = await res.json()
    const status = String(payment.status || '').toUpperCase()

    if (status.includes('SUCCESS')) return payment
    if (status.includes('FAILED') || status.includes('ERROR') || status.includes('CANCELLED')) {
      throw new Error('Paiement termine en echec: ' + status)
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  throw new Error('Timeout: aucun statut final recu')
}</pre>
    </div>

    <div style="padding:16px;border:1px solid #fecaca;background:#fef2f2;border-radius:12px;">
      <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;color:#b91c1c;">Erreurs frequentes et interpretation</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #fca5a5;">Code</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #fca5a5;">Cause probable</th>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #fca5a5;">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;"><strong>400</strong></td>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;">Payload invalide, provider incorrect, champ manquant</td>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;">Verifier le JSON envoye et les noms de champs</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;"><strong>401</strong></td>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;">Header d'auth manquant ou invalide</td>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;">Verifier X-Api-Key ou Bearer token</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;"><strong>403</strong></td>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;">Bon login, mauvais role ou mauvais portail</td>
            <td style="padding:8px;border-bottom:1px solid #fee2e2;">Utiliser le portail correspondant au compte</td>
          </tr>
          <tr>
            <td style="padding:8px;"><strong>500</strong></td>
            <td style="padding:8px;">Erreur serveur</td>
            <td style="padding:8px;">Consulter les logs backend et re-tester avec un payload minimal</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="padding:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:12px;">
      <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;">Bonnes pratiques</h4>
      <ul style="margin:0;padding-left:18px;font-size:13px;display:grid;gap:8px;">
        <li>Commencez toujours avec un payload minimal qui marche, puis ajoutez les options une par une.</li>
        <li>Logguez la requete envoyee et la reponse recue pendant vos tests.</li>
        <li>Ne mettez jamais une cle <strong>sk_live_</strong> dans votre code frontend public.</li>
        <li>Conservez le <code style="background:#f3f4f6;padding:2px 6px;border-radius:6px;">transactionId</code> des sa creation: il sert a suivre tout le cycle du paiement.</li>
        <li>Quand vous voyez un 403, demandez-vous d'abord: <em>suis-je sur le bon portail avec le bon type d'auth ?</em></li>
      </ul>
    </div>

    <div style="padding:16px;border:1px solid #ddd6fe;background:#f5f3ff;border-radius:12px;">
      <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;color:#5b21b6;">Glossaire express</h4>
      <div style="display:grid;gap:10px;font-size:13px;">
        <div><strong>Payload</strong>: le contenu JSON que vous envoyez dans le body d'une requete.</div>
        <div><strong>Bearer token</strong>: jeton de connexion envoye dans le header Authorization pour les routes admin.</div>
        <div><strong>API key</strong>: cle marchande envoyee dans le header X-Api-Key pour prouver l'identite du marchand.</div>
        <div><strong>Polling</strong>: technique qui consiste a reinterroger regulierement une route pour suivre un statut.</div>
        <div><strong>Webhook</strong>: appel HTTP envoye automatiquement par le backend vers votre systeme quand un evenement se produit.</div>
        <div><strong>Provider</strong>: operateur ou canal de paiement utilise, par exemple MTN, ORANGE, MOOV ou WAVE.</div>
        <div><strong>transactionId</strong>: identifiant unique d'un paiement. Gardez-le toujours pour suivre le paiement ou le rembourser.</div>
      </div>
    </div>
  </section>
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  const parts = key.split('_')
  if (parts.length >= 2) {
    const prefix = parts.slice(0, 2).join('_')
    const suffix = key.slice(-4)
    return `${prefix}_${'•'.repeat(Math.max(8, key.length - prefix.length - 4))}${suffix}`
  }
  return `${'•'.repeat(key.length - 4)}${key.slice(-4)}`
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const CHECKLIST_LABELS = [
  'Générer une clé de test',
  'Envoyer un premier appel API',
  'Recevoir une réponse 200',
  'Configurer un webhook',
]

function methodColor(m: string) {
  if (m === 'GET')    return 'bg-[var(--blue-bg)] text-[var(--blue)]'
  if (m === 'POST')   return 'bg-[var(--green-bg)] text-[var(--green)]'
  if (m === 'PUT')    return 'bg-[var(--amber-bg)] text-[var(--amber)]'
  if (m === 'DELETE') return 'bg-[var(--red-bg)] text-[var(--red)]'
  return 'bg-[var(--amber-bg)] text-[var(--amber)]'
}

function fmtXAF(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' XAF' }
function nowTime() { return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }

function extractApiMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return typeof body === 'string' && body.trim() ? body : undefined

  const record = body as Record<string, unknown>
  const direct = record.message || record.Message || record.error || record.Error || record.detail || record.title
  if (typeof direct === 'string' && direct.trim()) return direct

  if (record.errors && typeof record.errors === 'object') {
    const entries = Object.entries(record.errors as Record<string, unknown>)
      .flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${field}: ${String(item)}`)
        }
        return `${field}: ${String(value)}`
      })
      .filter(Boolean)

    if (entries.length > 0) {
      return entries.join(' | ')
    }
  }

  return undefined
}

function getApiHint(status?: number, url?: string): string | undefined {
  if (!status) {
    return url?.includes('localhost:5169')
      ? 'Le backend est probablement indisponible ou refuse la connexion sur localhost:5169.'
      : 'La requête a échoué avant de recevoir une réponse du serveur.'
  }

  if (status === 400) return 'La requête est arrivée au backend, mais le payload ou les paramètres ne respectent pas le contrat attendu.'
  if (status === 401) return 'Authentification invalide ou absente. Vérifiez le bearer token ou le header X-Api-Key.'
  if (status === 403) return 'La requête est authentifiée mais interdite pour ce rôle ou cette permission.'
  if (status === 404) return 'Route ou ressource introuvable. Vérifiez le path et les paramètres dynamiques.'
  if (status >= 500) return 'Le backend a échoué pendant le traitement. Il faut consulter les logs serveur.'
  return undefined
}

function buildApiError(input: { message?: string; status?: number; body?: unknown; url?: string }): ApiErrorDetails {
  const providerErrors =
    input.body && typeof input.body === 'object' && 'errors' in (input.body as Record<string, unknown>)
      ? ((input.body as Record<string, unknown>).errors as Record<string, unknown> | undefined)
      : undefined
  const providerInvalid = Array.isArray(providerErrors?.Provider)
    && providerErrors?.Provider.some((v) => String(v).toLowerCase().includes('invalid provider'))

  const message = input.message || extractApiMessage(input.body) || 'Erreur API'
  return {
    message,
    status: input.status,
    body: input.body,
    url: input.url,
    hint: providerInvalid
      ? 'Provider invalide. Utilisez une valeur acceptee par l API: MTN, ORANGE, MOOV ou WAVE.'
      : getApiHint(input.status, input.url),
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-extrabold text-[16px] text-[var(--text-1)] tracking-tight">{title}</h2>
      {sub && <p className="text-[12px] text-[var(--text-3)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Wizard Tab ───────────────────────────────────────────────────────────────

function WizardTab({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const [step, setStep] = useState(() => {
    try {
      const stored = localStorage.getItem('stpay_wizard_step')
      if (stored !== null) return Math.min(parseInt(stored, 10), 4)
    } catch { /* ignore */ }
    return 0
  })
  const { data: keys = [] } = useQuery({ queryKey: ['dev-keys'], queryFn: merchantsApi.list })
  const testKey = (keys as ApiKey[]).find((k) => k.mode === 'test')

  const advanceTo = (n: number) => {
    setStep(n)
    localStorage.setItem('stpay_wizard_step', String(n))
  }

  const STEPS = [
    { title: "Créer une clé de test", desc: "Générez votre première clé sk_test_ depuis l'onglet Clés API." },
    { title: "Appeler l'API", desc: "Effectuez votre premier appel via le Playground interactif." },
    { title: "Vérifier la réponse", desc: "Lisez la réponse et comprenez les codes de statut HTTP." },
    { title: "Configurer un webhook", desc: "Enregistrez un endpoint pour recevoir les notifications de paiement." },
    { title: "Passer en production", desc: "Vous avez complété les étapes essentielles. Générez une clé sk_live_ pour aller en production." },
  ]

  return (
    <div className="space-y-5">
      <SectionHeader title="Guide d'intégration pas à pas" sub="Suivez ces 5 étapes pour intégrer ST Pay dans votre application" />

      {/* Progress dots */}
      <div className="flex items-center gap-1 px-1">
        {STEPS.map((_, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => advanceTo(i)}
              className={`w-4 h-4 rounded-full flex-shrink-0 border-2 transition-all ${
                i < step ? 'bg-[var(--green)] border-[var(--green)]' :
                i === step ? 'bg-[var(--orange)] border-[var(--orange)]' :
                'bg-transparent border-[var(--border-med)]'
              }`}
              title={`Étape ${i + 1}`}
            />
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 transition-colors ${i < step ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Active step card */}
      {STEPS.map((s, i) => i !== step ? null : (
        <div key={i} className="panel">
          <div className="panel-header">
            <span className="panel-title">Étape {i + 1} / {STEPS.length} — {s.title}</span>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-[13px] text-[var(--text-2)]">{s.desc}</p>

            {/* Step 0: API key check */}
            {i === 0 && (
              testKey ? (
                <div className="flex items-center gap-3 p-3 rounded-[var(--r-sm)] bg-[var(--green-bg)] border border-[var(--green-border)]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--green)]">Clé de test détectée !</p>
                    <code className="text-[11px] font-mono text-[var(--text-2)]">{testKey.key.slice(0, 24)}…</code>
                  </div>
                </div>
              ) : (
                <button className="btn-secondary text-[12px]" onClick={() => goToTab('keys')}>
                  Aller dans Clés API →
                </button>
              )
            )}

            {/* Step 1: Playground */}
            {i === 1 && (
              <button className="btn-secondary text-[12px]" onClick={() => goToTab('playground')}>
                Ouvrir le Playground →
              </button>
            )}

            {/* Step 2: Docs */}
            {i === 2 && (
              <button className="btn-secondary text-[12px]" onClick={() => goToTab('docs')}>
                Voir la documentation →
              </button>
            )}

            {/* Step 3: Webhook info */}
            {i === 3 && (
              <div className="p-3 bg-[var(--bg-subtle)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
                <p className="text-[11px] text-[var(--text-3)]">
                  Configurez votre URL de webhook dans le profil marchand.
                  Chaque événement (payment.completed, payment.failed) sera envoyé vers votre endpoint.
                </p>
              </div>
            )}

            {/* Step 4: Checklist + go live */}
            {i === 4 && (
              <div className="space-y-3">
                {CHECKLIST_LABELS.map((label, ci) => (
                  <div key={ci} className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
                    <div className="w-4 h-4 rounded-full bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="var(--green)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    {label}
                  </div>
                ))}
                <button className="btn-primary text-[12px] mt-2" onClick={() => goToTab('keys')}>
                  Voir mes clés live →
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
              {i > 0 ? (
                <button className="btn-ghost text-[11px]" onClick={() => advanceTo(i - 1)}>← Précédent</button>
              ) : <span />}
              {i < STEPS.length - 1 && (
                <button className="btn-primary text-[12px]" onClick={() => advanceTo(i + 1)}>Suivant →</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB 1 : API Keys ─────────────────────────────────────────────────────────

function KeysTab() {
  const { user } = useAuth()
  const dxActor = { userId: user.id, userName: user.name, role: user.role, merchantId: user.merchantId }
  const qc = useQueryClient()
  const { data: keys = [], isLoading } = useQuery({ queryKey: ['dev-keys'], queryFn: merchantsApi.list })
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [newKey, setNewKey] = useState<string | null>(null)
  const [genMode, setGenMode] = useState<'test' | 'live'>('test')

  const generate = useMutation({
    mutationFn: () => merchantsApi.create({ isTestMode: genMode === 'test' }),
    onSuccess: (data) => {
      markDxStep('api_key_generated', dxActor)
      setNewKey(data.apiKey)
      qc.invalidateQueries({ queryKey: ['dev-keys'] })
      toast.success('Nouvelle clé générée !')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const revoke = useMutation({
    mutationFn: (key: string) => merchantsApi.revokeKey(key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-keys'] }); toast.success('Clé révoquée') },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleReveal = (k: string) => setRevealed((prev) => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copié !') }

  const liveKeys = (keys as ApiKey[]).filter((k) => k.mode === 'live')
  const testKeysAll = (keys as ApiKey[]).filter((k) => k.mode === 'test')
  const sandboxBannerKey = !isLoading && liveKeys.length === 0 && testKeysAll.length > 0 ? testKeysAll[0] : null

  return (
    <div className="space-y-5">
      <SectionHeader title="Gestion des clés API" sub="Toutes les requêtes doivent inclure votre clé dans le header X-Api-Key" />

      {sandboxBannerKey && (
        <div className="p-4 rounded-[var(--r-md)] border border-[var(--amber-border)] bg-[var(--amber-bg)]">
          <p className="text-[12px] font-bold text-[var(--amber)] mb-2">Mode Sandbox — Vous n'avez pas encore de clé live</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 text-[11px] font-mono text-[var(--text-1)] bg-white px-2 py-1.5 rounded border border-[var(--amber-border)] break-all">{sandboxBannerKey.key}</code>
            <button className="btn-secondary text-[11px] flex-shrink-0" onClick={() => copy(sandboxBannerKey.key)}>Copier</button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Générer une clé</span></div>
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px]">
            {(['test', 'live'] as const).map((m) => (
              <button key={m} onClick={() => setGenMode(m)}
                      className={`px-4 py-1.5 rounded-[5px] text-[12px] font-semibold transition-colors ${genMode === m ? 'bg-white text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
                {m === 'test' ? 'Test  sk_test_…' : 'Live  sk_live_…'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? 'Génération…' : '+ Nouvelle clé'}
          </button>
        </div>
        {newKey && (
          <div className="mx-4 mb-4 p-3 rounded-[var(--r-sm)] bg-[var(--green-bg)] border border-[var(--green-border)]">
            <p className="text-[11px] font-semibold text-[var(--green)] mb-2">Clé générée — copiez-la maintenant, elle ne sera plus affichée en clair.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-[var(--text-1)] bg-white px-3 py-2 rounded-[5px] border border-[var(--green-border)] break-all">{newKey}</code>
              <button className="btn-secondary text-[11px]" onClick={() => copy(newKey)}>Copier</button>
              <button className="btn-ghost text-[11px]" onClick={() => setNewKey(null)}>✕</button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Clés actives</span>
          <span className="text-[11px] text-[var(--text-3)]">{keys.length} clé{keys.length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="h-12 rounded animate-pulse bg-[var(--border)]"/>)}</div>
        ) : keys.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-[var(--text-3)]">Aucune clé active</p>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]">
            {keys.map((k: ApiKey) => (
              <div key={k.key} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)]">
                <Badge color={k.mode === 'live' ? 'emerald' : 'amber'}>{k.mode.toUpperCase()}</Badge>
                <code className="flex-1 text-[11px] font-mono text-[var(--text-2)] truncate">{revealed.has(k.key) ? k.key : maskKey(k.key)}</code>
                <span className="text-[11px] text-[var(--text-4)]">{fmtDate(k.createdAt)}</span>
                <button className="btn-ghost text-[11px] py-1" onClick={() => toggleReveal(k.key)}>{revealed.has(k.key) ? 'Masquer' : 'Afficher'}</button>
                <button className="btn-secondary text-[11px] py-1" onClick={() => copy(k.key)}>Copier</button>
                <button className="btn-danger text-[11px] py-1" disabled={revoke.isPending}
                        onClick={() => { if (confirm('Révoquer cette clé ? Action irréversible.')) revoke.mutate(k.key) }}>
                  Révoquer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Bonnes pratiques</span></div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          {[
            { icon: '🔒', title: 'Ne jamais exposer vos clés', desc: "Ne commitez pas vos clés dans Git. Utilisez des variables d'environnement." },
            { icon: '🧪', title: 'Test vs Live', desc: 'Utilisez sk_test_ en développement. sk_live_ uniquement en production.' },
            { icon: '🔄', title: 'Rotation régulière', desc: 'Faites une rotation de vos clés tous les 90 jours ou en cas de compromission.' },
            { icon: '📋', title: 'Header X-Api-Key', desc: 'Chaque requête doit inclure : X-Api-Key: sk_test_votre_clé' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 bg-[var(--bg-subtle)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
              <span className="text-[18px] flex-shrink-0">{icon}</span>
              <div>
                <p className="text-[12px] font-semibold text-[var(--text-1)]">{title}</p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── ErrorHint ────────────────────────────────────────────────────────────────

function ErrorHint({ status, hasError, goToTab }: { status?: number; hasError: boolean; goToTab: (tab: Tab) => void }) {
  if (!hasError) return null

  type HintEntry = { text: string; severity: 'red' | 'amber' }
  const hints: Record<number | string, HintEntry> = {
    401: { text: "Authentification invalide — vérifiez votre clé API dans le header X-Api-Key.", severity: 'red' },
    403: { text: "Accès refusé — votre clé n'a pas les droits sur cette route.", severity: 'red' },
    422: { text: "Payload invalide — vérifiez les champs requis et les valeurs envoyées.", severity: 'amber' },
    429: { text: "Trop de requêtes — attendez quelques secondes avant de réessayer.", severity: 'amber' },
    500: { text: "Erreur serveur — consultez les logs backend et réessayez avec un payload minimal.", severity: 'red' },
    none: { text: "Pas de réponse serveur — vérifiez que le backend est démarré sur localhost:5169.", severity: 'red' },
  }

  const key = status !== undefined ? status : 'none'
  const hint = hints[key] ?? { text: `Erreur HTTP ${status} — consultez la documentation des endpoints.`, severity: 'amber' as const }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-[var(--r-sm)] border-l-4 ${hint.severity === 'red' ? 'bg-[var(--red-bg)] border-[var(--red)]' : 'bg-[var(--amber-bg)] border-[var(--amber)]'}`}>
      <p className={`flex-1 text-[12px] font-medium ${hint.severity === 'red' ? 'text-[var(--red)]' : 'text-[var(--amber)]'}`}>{hint.text}</p>
      <button className="btn-ghost text-[11px] flex-shrink-0" onClick={() => goToTab('docs')}>Voir la doc →</button>
    </div>
  )
}

// ─── TAB 2 : Playground ───────────────────────────────────────────────────────

function PlaygroundTab({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const { user } = useAuth()
  const dxActor = { userId: user.id, userName: user.name, role: user.role, merchantId: user.merchantId }
  const [selectedEndpoint, setSelectedEndpoint] = useState<PlaygroundEndpoint>(PLAYGROUND_ENDPOINTS[0])
  const [params, setParams] = useState<Record<string, string>>({})
  const [bodyStr, setBodyStr] = useState('')
  const [apiKey, setApiKey] = useState(localStorage.getItem('stpay_api_key') || '')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ status: number; body: unknown; duration: number } | null>(null)
  const [error, setError] = useState<ApiErrorDetails | null>(null)
  const [orangeWebhook, setOrangeWebhook] = useState<OrangeWebhookForm>({
    orderId: 'ORDER_001',
    payToken: 'paytok_demo_001',
    status: 'SUCCESS',
    message: 'Orange webhook sandbox',
    txnId: 'txn-demo-001',
    subscriberMsisdn: '237677123456',
    amount: '5000',
  })
  const [orangeWebhookLoading, setOrangeWebhookLoading] = useState(false)
  const [orangeWebhookResponse, setOrangeWebhookResponse] = useState<{ status: number; body: unknown } | null>(null)
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([])

  const selectEndpoint = (ep: PlaygroundEndpoint) => {
    setSelectedEndpoint(ep); setParams(ep.params ? { ...ep.params } : {})
    setBodyStr(ep.body ? JSON.stringify(ep.body, null, 2) : ''); setResponse(null); setError(null)
  }

  const buildUrl = () => {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5169'
    let path = selectedEndpoint.path
    Object.entries(params).forEach(([k, v]) => { path = path.replace(`{${k}}`, v || `{${k}}`) })
    return base + path
  }

  const run = async () => {
    if (!apiKey.trim()) { toast.error('Entrez votre clé API'); return }
    recordDxFirstApiCall(dxActor)
    setLoading(true); setResponse(null); setError(null)
    const t0 = Date.now()
    const logTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const logMethod = selectedEndpoint.method
    const logPath = selectedEndpoint.path
    try {
      const opts: RequestInit = { method: selectedEndpoint.method, headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey.trim() } }
      if (selectedEndpoint.method !== 'GET' && bodyStr.trim()) opts.body = bodyStr
      const res = await fetch(buildUrl(), opts)
      const rawText = await res.text()
      let body: unknown = null
      if (rawText) {
        try {
          body = JSON.parse(rawText)
        } catch {
          body = rawText
        }
      }
      const duration = Date.now() - t0
      setResponse({ status: res.status, body, duration })
      setRequestLog((prev) => [{ time: logTime, method: logMethod, path: logPath, status: res.status, duration }, ...prev].slice(0, 10))
      if (!res.ok) {
        setError(buildApiError({
          status: res.status,
          body,
          url: buildUrl(),
          message: extractApiMessage(body) || res.statusText || 'Erreur API',
        }))
      }
    } catch (e: unknown) {
      const duration = Date.now() - t0
      setRequestLog((prev) => [{ time: logTime, method: logMethod, path: logPath, status: null, duration }, ...prev].slice(0, 10))
      setError(buildApiError({
        message: e instanceof Error ? e.message : 'Erreur réseau',
        url: buildUrl(),
      }))
    } finally { setLoading(false) }
  }

  const runOrangeWebhookTest = async () => {
    setOrangeWebhookLoading(true)
    setOrangeWebhookResponse(null)
    try {
      const response = await client.post('/api/webhooks/orange', orangeWebhook)
      setOrangeWebhookResponse({ status: response.status, body: response.data })
      toast.success('Webhook Orange envoyé')
    } catch (error: unknown) {
      const apiError = error as ApiClientError
      setOrangeWebhookResponse({
        status: apiError.status || 500,
        body: apiError.data || { message: apiError.message },
      })
      toast.error(apiError.message || 'Échec du test webhook Orange')
    } finally {
      setOrangeWebhookLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Playground interactif" sub="Testez les endpoints ST Pay directement depuis votre navigateur" />

      <div className="panel">
        <div className="p-4 flex items-center gap-3">
          <label className="text-[12px] font-semibold text-[var(--text-2)] flex-shrink-0">X-Api-Key</label>
          <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('stpay_api_key', e.target.value) }}
                 placeholder="sk_test_…"
                 className="flex-1 rounded-[6px] border border-[var(--border-med)] px-3 py-1.5 text-[12px] font-mono bg-white text-[var(--text-1)] outline-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]" />
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${apiKey.startsWith('sk_live') ? 'bg-[var(--green-bg)] text-[var(--green)]' : apiKey.startsWith('sk_test') ? 'bg-[var(--amber-bg)] text-[var(--amber)]' : 'bg-[var(--border)] text-[var(--text-3)]'}`}>
            {apiKey.startsWith('sk_live') ? 'LIVE' : apiKey.startsWith('sk_test') ? 'TEST' : 'NON DÉFINI'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Endpoints</span></div>
          <div className="divide-y divide-[var(--border-soft)]">
            {PLAYGROUND_ENDPOINTS.map((ep) => (
              <button key={ep.id} onClick={() => selectEndpoint(ep)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${selectedEndpoint.id === ep.id ? 'bg-[var(--orange-bg)] border-r-2 border-[var(--orange)]' : 'hover:bg-[var(--bg-subtle)]'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${methodColor(ep.method)}`}>{ep.method}</span>
                </div>
                <p className={`text-[11px] font-medium ${selectedEndpoint.id === ep.id ? 'text-[var(--orange-dark)]' : 'text-[var(--text-1)]'}`}>{ep.label}</p>
                <p className="text-[10px] font-mono text-[var(--text-4)] mt-0.5 truncate">{ep.path}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="panel">
            <div className="p-3 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded font-mono flex-shrink-0 ${methodColor(selectedEndpoint.method)}`}>{selectedEndpoint.method}</span>
              <code className="flex-1 text-[12px] font-mono text-[var(--text-2)] truncate">{buildUrl()}</code>
              <button className="btn-primary text-[12px] flex-shrink-0" onClick={run} disabled={loading}>{loading ? 'Envoi…' : '▶ Envoyer'}</button>
            </div>
          </div>

          {Object.keys(params).length > 0 && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Paramètres</span></div>
              <div className="p-4 space-y-2">
                {Object.entries(params).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <label className="text-[12px] font-mono text-[var(--text-2)] w-28 flex-shrink-0">{k}</label>
                    <input value={v} onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))} placeholder={`{${k}}`}
                           className="flex-1 rounded-[6px] border border-[var(--border-med)] px-3 py-1.5 text-[12px] font-mono bg-white outline-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEndpoint.method !== 'GET' && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Corps (JSON)</span></div>
              <div className="p-3">
                <textarea value={bodyStr} onChange={(e) => setBodyStr(e.target.value)} rows={8}
                          className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[12px] font-mono bg-[var(--bg-subtle)] text-[var(--text-1)] outline-none resize-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]" />
              </div>
            </div>
          )}

          {(response || error) && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Réponse</span>
                {response && (
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${response.status < 300 ? 'bg-[var(--green-bg)] text-[var(--green)]' : response.status < 500 ? 'bg-[var(--amber-bg)] text-[var(--amber)]' : 'bg-[var(--red-bg)] text-[var(--red)]'}`}>{response.status}</span>
                    <span className="text-[11px] text-[var(--text-3)]">{response.duration}ms</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                {error ? (
                  <div className="space-y-3">
                    <div className="rounded-[6px] border border-[var(--red-border)] bg-[var(--red-bg)] p-3">
                      <p className="text-[12px] font-semibold text-[var(--red)]">{error.message}</p>
                      {error.hint && <p className="mt-1 text-[11px] text-[var(--text-2)]">{error.hint}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-[var(--text-3)]">
                        {typeof error.status === 'number' && <span>HTTP {error.status}</span>}
                        {error.url && <span>{error.url}</span>}
                      </div>
                    </div>
                    {typeof error.body !== 'undefined' && error.body !== null && (
                      <pre className="text-[11px] font-mono text-[var(--text-1)] bg-[var(--bg-subtle)] p-3 rounded-[6px] border border-[var(--border-soft)] overflow-auto max-h-64">{JSON.stringify(error.body, null, 2)}</pre>
                    )}
                  </div>
                ) : (
                  <pre className="text-[11px] font-mono text-[var(--text-1)] bg-[var(--bg-subtle)] p-3 rounded-[6px] border border-[var(--border-soft)] overflow-auto max-h-64">{JSON.stringify(response?.body, null, 2)}</pre>
                )}
              </div>
            </div>
          )}

          <ErrorHint status={response?.status} hasError={!!error} goToTab={goToTab} />

          {requestLog.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Journal des appels</span>
                <button className="btn-ghost text-[11px]" onClick={() => setRequestLog([])}>Vider</button>
              </div>
              <div className="overflow-y-auto divide-y divide-[var(--border-soft)]" style={{ maxHeight: 240 }}>
                {requestLog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 px-3" style={{ height: 36 }}>
                    <span className="text-[10px] font-mono text-[var(--text-4)] flex-shrink-0 w-16">{entry.time}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 w-14 text-center ${methodColor(entry.method)}`}>{entry.method}</span>
                    <code className="flex-1 text-[11px] font-mono text-[var(--text-2)] truncate">{entry.path}</code>
                    {entry.status !== null ? (
                      <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${entry.status < 300 ? 'text-[var(--green)]' : entry.status < 500 ? 'text-[var(--amber)]' : 'text-[var(--red)]'}`}>{entry.status}</span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--red)] flex-shrink-0">ERR</span>
                    )}
                    <span className="text-[10px] font-mono text-[var(--text-4)] flex-shrink-0">{entry.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Sandbox webhook Orange</span>
              <span className="text-[11px] text-[var(--text-3)]">POST /api/webhooks/orange</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ['orderId', 'OrderId'],
                  ['payToken', 'PayToken'],
                  ['status', 'Status'],
                  ['message', 'Message'],
                  ['txnId', 'TxnId'],
                  ['subscriberMsisdn', 'SubscriberMsisdn'],
                  ['amount', 'Amount'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">{label}</label>
                    <input
                      value={orangeWebhook[key as keyof OrangeWebhookForm]}
                      onChange={(e) => setOrangeWebhook((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[12px] font-mono bg-white outline-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-[var(--text-3)]">Utilisez cette zone pour valider rapidement le mapping de statut Orange côté backend sans attendre un callback opérateur.</p>
                <button className="btn-primary text-[12px]" onClick={runOrangeWebhookTest} disabled={orangeWebhookLoading}>
                  {orangeWebhookLoading ? 'Envoi…' : 'Envoyer le webhook'}
                </button>
              </div>
              {orangeWebhookResponse && (
                <pre className="text-[11px] font-mono text-[var(--text-1)] bg-[var(--bg-subtle)] p-3 rounded-[6px] border border-[var(--border-soft)] overflow-auto max-h-64">{JSON.stringify(orangeWebhookResponse, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3 : Docs ─────────────────────────────────────────────────────────────

function DocsTab() {
  const { user } = useAuth()
  const dxActor = { userId: user.id, userName: user.name, role: user.role, merchantId: user.merchantId }
  const [open, setOpen] = useState<string | null>(null)
  const TAG_COLORS: Record<string, string> = {
    blue:   'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue-border)]',
    orange: 'bg-[var(--orange-bg)] text-[var(--orange-dark)] border-[var(--orange-border)]',
    amber:  'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber-border)]',
    green:  'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-border)]',
    slate:  'bg-[var(--bg-subtle)] text-[var(--text-2)] border-[var(--border)]',
    red:    'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red-border)]',
  }

  const authBadge = (auth: AuthMode) => {
    if (auth === 'api-key') return '🔒 API key'
    if (auth === 'bearer') return '🔒 Bearer'
    return null
  }

  const authHint = (auth: AuthMode) => {
    if (auth === 'api-key') return 'Header requis : X-Api-Key: sk_test_your_key'
    if (auth === 'bearer') return 'Header requis : Authorization: Bearer <admin_token>'
    return null
  }

  const handleGuideClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest('[data-copy-doc]') as HTMLElement | null
    const copyKey = button?.getAttribute('data-copy-doc')
    if (!copyKey) return

    const snippet = DEVELOPER_GUIDE_COPY_SNIPPETS[copyKey]
    if (!snippet) return

    try {
      await navigator.clipboard.writeText(snippet)
      toast.success('Exemple copie dans le presse-papiers')
    } catch {
      toast.error('Impossible de copier cet exemple')
    }
  }

  const downloadPostmanCollection = (variant: PostmanCollectionVariant) => {
    try {
      downloadPostmanCollectionFile(variant)
      if (variant === 'minimal') markDxStep('postman_minimal_downloaded', dxActor)
      toast.success(variant === 'minimal' ? 'Collection Postman minimale telechargee' : 'Collection Postman complete telechargee')
    } catch {
      toast.error('Impossible de générer la collection Postman')
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Référence des endpoints" sub="Tous les endpoints disponibles dans l'API ST Pay v1" />

      <div className="panel">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-1)]">Collection Postman</p>
            <p className="text-[11px] text-[var(--text-3)]">Telechargez la collection complete ou une version minimale pour un demarrage rapide.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary text-[12px]" onClick={() => downloadPostmanCollection('minimal')}>
              Collection minimale
            </button>
            <button className="btn-primary text-[12px]" onClick={() => downloadPostmanCollection('complete')}>
              Collection complete
            </button>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="panel-header">
          <span className="panel-title">Documentation HTML complete</span>
          <span className="text-[11px] text-[var(--text-3)]">Guide pas a pas avec exemples pratiques</span>
        </div>
        <div className="p-4 bg-[var(--bg-subtle)]">
          <div
            className="rounded-[var(--r-md)] border border-[var(--border)] bg-white p-4"
            onClick={handleGuideClick}
            dangerouslySetInnerHTML={{ __html: DEVELOPER_GUIDE_HTML }}
          />
        </div>
      </div>

      <div className="panel">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-1)]">Wearables & Companion Apps</p>
            <p className="text-[11px] text-[var(--text-3)]">Guide dedie smartwatch + mobile companion avec scenarios, sequence diagrams et snippets Android/iOS.</p>
          </div>
          <a
            className="btn-primary text-[12px]"
            href="/WEARABLES_COMPANION_GUIDE.html"
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir le guide wearables
          </a>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">All Integration Guides</span>
          <span className="text-[11px] text-[var(--text-3)]">10 guides pratiques pour onboarding, fiabilite, securite et go-live</span>
        </div>
        <div className="p-4 bg-[var(--bg-subtle)] space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <a className="btn-primary text-[12px]" href="/ALL_INTEGRATION_GUIDES.html" target="_blank" rel="noreferrer">Ouvrir le guide complet HTML</a>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#first-payment" target="_blank" rel="noreferrer">1. Premier paiement</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#webhooks" target="_blank" rel="noreferrer">2. Webhooks production</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#error-handling" target="_blank" rel="noreferrer">3. Gestion des erreurs</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#api-security" target="_blank" rel="noreferrer">4. Securite API</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#multi-operator" target="_blank" rel="noreferrer">5. Multi-operateurs</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#go-live" target="_blank" rel="noreferrer">6. Go-live checklist</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#observability" target="_blank" rel="noreferrer">7. Observabilite</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#automated-tests" target="_blank" rel="noreferrer">8. Tests automatises</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#api-migration" target="_blank" rel="noreferrer">9. Migration API</a>
            <a className="btn-secondary text-[11px] justify-center" href="/ALL_INTEGRATION_GUIDES.html#l1-support" target="_blank" rel="noreferrer">10. Support L1</a>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-[var(--r-md)] bg-[var(--orange-bg)] border border-[var(--orange-border)]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
          <path d="M12 6a4 4 0 00-8 0v1H3a1 1 0 00-1 1v5a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1V6z" stroke="var(--orange)" strokeWidth="1.3"/>
          <circle cx="8" cy="11" r="1" fill="var(--orange)"/>
        </svg>
        <div>
          <p className="text-[12px] font-semibold text-[var(--orange-dark)]">Authentification requise</p>
          <p className="text-[11px] text-[var(--text-2)] mt-0.5">
            Les routes marquées utilisent soit{' '}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[var(--orange-border)]">X-Api-Key</code>{' '}
            pour le contexte marchand, soit{' '}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[var(--orange-border)]">Authorization: Bearer</code>{' '}
            pour le contexte super admin.
          </p>
        </div>
      </div>

      {DOCS_ENDPOINTS.map((group) => (
        <div key={group.tag} className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TAG_COLORS[group.color]}`}>{group.tag}</span>
              <span className="text-[11px] text-[var(--text-3)]">{group.routes.length} endpoint{group.routes.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="divide-y divide-[var(--border-soft)]">
            {group.routes.map((route) => {
              const id = `${group.tag}-${route.method}-${route.path}`, isOpen = open === id
              return (
                <div key={id}>
                  <button onClick={() => setOpen(isOpen ? null : id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors text-left">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 w-14 text-center ${methodColor(route.method)}`}>{route.method}</span>
                    <code className="text-[12px] font-mono text-[var(--text-1)] flex-1">{route.path}</code>
                    <span className="text-[11px] text-[var(--text-3)] hidden sm:block">{route.desc}</span>
                    {route.auth && <span className="text-[var(--text-4)] text-[11px] flex-shrink-0">{authBadge(route.auth)}</span>}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`flex-shrink-0 text-[var(--text-4)] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 bg-[var(--bg-subtle)]">
                      <p className="text-[12px] text-[var(--text-2)] py-3">{route.desc}</p>
                      {route.auth && <div className="text-[11px] font-mono bg-white border border-[var(--border)] rounded-[6px] px-3 py-2 text-[var(--text-2)]">{authHint(route.auth)}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB : Escrow ────────────────────────────────────────────────────────────

function EscrowTab() {
  const [integLang, setIntegLang] = useState<'curl' | 'js' | 'php' | 'python'>('js')
  const [faqOpen, setFaqOpen]     = useState<number | null>(null)

  /* ── états du cycle de vie ─────────────────────────────────────────────── */
  const lifecycle: { id: string; label: string; color: string; desc: string }[] = [
    { id: 'PENDING',   label: 'En attente',  color: 'bg-amber-100 border-amber-300 text-amber-800',  desc: 'Paiement initié, fonds retenus chez ST Pay. Le vendeur est notifié.' },
    { id: 'SHIPPED',   label: 'Expédié',     color: 'bg-blue-100 border-blue-300 text-blue-800',     desc: 'Vendeur a fourni le numéro de suivi. L\'acheteur attend le colis.' },
    { id: 'DELIVERED', label: 'Livré',       color: 'bg-violet-100 border-violet-300 text-violet-800', desc: 'Acheteur a confirmé la réception physique avec le code de retrait.' },
    { id: 'RELEASED',  label: 'Libéré',      color: 'bg-green-100 border-green-300 text-green-800',  desc: 'Fonds transférés au vendeur. Transaction terminée.' },
    { id: 'DISPUTED',  label: 'Litige',      color: 'bg-red-100 border-red-300 text-red-800',        desc: 'Acheteur a ouvert un litige. ST Pay arbitre la situation.' },
    { id: 'CANCELLED', label: 'Annulé',      color: 'bg-slate-100 border-slate-300 text-slate-600',  desc: 'Transaction annulée avant expédition. Fonds remboursés.' },
  ]

  /* ── étapes d'intégration ──────────────────────────────────────────────── */
  const steps = [
    { n: '1', title: 'Créer un paiement escrow', api: 'POST /api/Payment',   actor: 'Votre backend',  color: 'bg-blue-500' },
    { n: '2', title: 'Expédier les marchandises', api: 'POST /api/escrow/{id}/ship', actor: 'Votre backend (vendeur)', color: 'bg-violet-500' },
    { n: '3', title: 'Confirmer la réception',    api: 'POST /api/escrow/{id}/confirm-pickup', actor: 'Backend acheteur / app', color: 'bg-amber-500' },
    { n: '4', title: 'Valider et libérer',        api: 'POST /api/escrow/{id}/buyer-confirm',  actor: 'Backend acheteur / app', color: 'bg-green-500' },
  ]

  /* ── snippets par étape et langage ─────────────────────────────────────── */
  const stepCode: Record<number, Record<'curl' | 'js' | 'php' | 'python', string>> = {
    0: {
      curl: `curl -X POST https://api.stpay.africa/api/Payment \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: $STPAY_API_KEY" \\
  -d '{
    "amount": 25000, "currency": "XAF", "provider": "MTN",
    "customer": { "phoneNumber": "237677123456", "name": "Acheteur" },
    "merchant": { "reference": "CMD-001", "callbackUrl": "https://votre-site.cm/webhook" },
    "description": "Smartphone Samsung Galaxy — commande #CMD-001",
    "useEscrow": true
  }'
# Réponse : { "transactionId": "ST-PAY-…", "escrowId": "ESC-…", "status": "PENDING" }`,
      js: `import { StPay } from 'stpay-js';
const client = new StPay({ apiKey: process.env.STPAY_API_KEY });

const payment = await client.payments.create({
  amount: 25000,
  currency: 'XAF',
  provider: 'MTN',
  customer: { phoneNumber: '237677123456', name: 'Acheteur' },
  merchant: {
    reference: 'CMD-001',
    callbackUrl: 'https://votre-site.cm/webhook',
  },
  description: 'Smartphone Samsung Galaxy — commande #CMD-001',
  useEscrow: true,
});

// Sauvegarder payment.escrowId en base (nécessaire pour les étapes suivantes)
console.log(payment.escrowId);  // ESC-XXXXXXXX
console.log(payment.status);    // PENDING`,
      php: `<?php
require_once 'vendor/autoload.php';
use StPay\\StPay;

$client  = new StPay(['api_key' => getenv('STPAY_API_KEY')]);
$payment = $client->payments->create([
    'amount'      => 25000,
    'currency'    => 'XAF',
    'provider'    => 'MTN',
    'customer'    => ['phone_number' => '237677123456', 'name' => 'Acheteur'],
    'merchant'    => ['reference' => 'CMD-001', 'callback_url' => 'https://votre-site.cm/webhook'],
    'description' => 'Smartphone Samsung Galaxy — commande #CMD-001',
    'use_escrow'  => true,
]);
// Sauvegarder $payment['escrow_id'] en base !
echo $payment['escrow_id'];  // ESC-XXXXXXXX`,
      python: `from stpay import StPayClient
import os

client  = StPayClient(api_key=os.environ['STPAY_API_KEY'])
payment = client.payments.create(
    amount=25000,
    currency='XAF',
    provider='MTN',
    customer={'phone_number': '237677123456', 'name': 'Acheteur'},
    merchant={'reference': 'CMD-001', 'callback_url': 'https://votre-site.cm/webhook'},
    description='Smartphone Samsung Galaxy — commande #CMD-001',
    escrow=True,
)
# Sauvegarder payment['escrow_id'] en base !
print(payment['escrow_id'])  # ESC-XXXXXXXX`,
    },
    1: {
      curl: `curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/ship \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: $STPAY_API_KEY" \\
  -d '{ "trackingNumber": "DHL-987654321", "carrier": "DHL" }'
# L'acheteur reçoit une notification avec le numéro de suivi.`,
      js: `const escrowId = 'ESC-XXXXXXXX'; // récupéré depuis votre base

await client.escrow.ship(escrowId, {
  trackingNumber: 'DHL-987654321',
  carrier: 'DHL',
});
// Webhook "escrow.shipped" envoyé à votre callbackUrl`,
      php: `$client->escrow->ship('ESC-XXXXXXXX', [
    'tracking_number' => 'DHL-987654321',
    'carrier'         => 'DHL',
]);
// Webhook "escrow.shipped" envoyé à votre callbackUrl`,
      python: `client.escrow.ship('ESC-XXXXXXXX', tracking_number='DHL-987654321')
# Webhook "escrow.shipped" envoyé à votre callbackUrl`,
    },
    2: {
      curl: `# L'acheteur reçoit un code de retrait par SMS/notification.
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/confirm-pickup \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: $STPAY_API_KEY" \\
  -d '{ "pickupCode": "4827" }'`,
      js: `// Le code de retrait est envoyé à l'acheteur par ST Pay
const pickupCode = '4827'; // saisi par l'acheteur dans votre app

await client.escrow.confirmPickup(escrowId, { pickupCode });
// Statut → DELIVERED`,
      php: `$client->escrow->confirmPickup('ESC-XXXXXXXX', ['pickup_code' => '4827']);
// Statut → DELIVERED`,
      python: `client.escrow.confirm_pickup('ESC-XXXXXXXX', pickup_code='4827')
# Statut → DELIVERED`,
    },
    3: {
      curl: `# Acheteur satisfait → libère les fonds au vendeur
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/buyer-confirm \\
  -H "X-Api-Key: $STPAY_API_KEY"

# Alternative : ouvrir un litige si problème
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/dispute \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: $STPAY_API_KEY" \\
  -d '{ "reason": "Article non conforme à la description" }'`,
      js: `// Acheteur satisfait → libérer les fonds
await client.escrow.buyerConfirm(escrowId);
// Webhook "escrow.released" → statut RELEASED ✅

// OU : acheteur insatisfait → ouvrir un litige
await client.escrow.dispute(escrowId, {
  reason: 'Article non conforme à la description',
});
// Webhook "escrow.disputed" → statut DISPUTED`,
      php: `// Acheteur satisfait
$client->escrow->buyerConfirm('ESC-XXXXXXXX');

// OU litige
$client->escrow->dispute('ESC-XXXXXXXX', [
    'reason' => 'Article non conforme à la description',
]);`,
      python: `# Acheteur satisfait → libérer les fonds
client.escrow.buyer_confirm('ESC-XXXXXXXX')

# OU litige
client.escrow.dispute('ESC-XXXXXXXX', reason='Article non conforme à la description')`,
    },
  }

  const [activeStep, setActiveStep] = useState(0)

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: 'Combien de temps les fonds sont-ils retenus ?',
      a: 'ST Pay retient les fonds tant que l\'acheteur n\'a pas confi rmé la réception. Si aucune action n\'est effectuée dans un délai configurable (défaut 14 jours), l\'escrow est automatiquement libéré au vendeur.',
    },
    {
      q: 'Que se passe-t-il en cas de litige ?',
      a: 'L\'équipe ST Pay intervient comme arbitre. Elle examine les preuves (numéro de suivi, photos, communications) et décide de libérer les fonds au vendeur ou de rembourser l\'acheteur. La résolution prend généralement 2–5 jours ouvrables.',
    },
    {
      q: 'Peut-on annuler un escrow après que le vendeur a expédié ?',
      a: 'Non. Une fois le statut SHIPPED atteint, seule la confirmation de réception ou l\'ouverture d\'un litige est possible. Avant expédition (statut PENDING), l\'annulation est possible via DELETE /api/Payment/{id}.',
    },
    {
      q: 'L\'escrow est-il disponible pour tous les opérateurs ?',
      a: <>Oui — l'escrow est indépendant de l'opérateur mobile money (MTN, Orange, Wave, Moov). La rétention des fonds se fait côté ST Pay, pas côté opérateur.</>,
    },
    {
      q: 'Le vendeur est-il notifié à chaque étape ?',
      a: <>Oui, via webkit. Écoutez les événements <code className="font-mono text-[10px]">escrow.shipped</code>, <code className="font-mono text-[10px]">escrow.released</code>, et <code className="font-mono text-[10px]">escrow.disputed</code> sur votre <code className="font-mono text-[10px]">callbackUrl</code>.</>,
    },
    {
      q: 'Peut-on faire un remboursement partiel avec l\'escrow ?',
      a: 'Pas directement via l\'API escrow. En cas de litige résolu avec remboursement partiel, l\'équipe ST Pay effectue l\'opération manuellement après arbitrage.',
    },
  ]

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--accent-bg,#eef4ff)] to-[var(--bg-subtle)] px-5 py-4 flex flex-col gap-2 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[var(--accent)]">
              <path d="M10 2C6.5 2 3 4.5 3 8.5c0 4.5 7 10 7 10s7-5.5 7-10C17 4.5 13.5 2 10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[15px] font-bold text-[var(--text-1)]">Paiement Escrow ST Pay</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-white font-semibold">Sécurisé</span>
          </div>
          <p className="text-[12px] text-[var(--text-2)] leading-relaxed max-w-2xl">
            L'escrow est un mécanisme de <strong>séquestre des fonds</strong> : l'argent de l'acheteur est collecté et <em>retenu par ST Pay</em> jusqu'à
            confirmation de réception par l'acheteur. Cela protège les deux parties dans les transactions e-commerce.
          </p>
        </div>

        {/* ── Avantages ───────────────────────────────────────────────── */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🛡️', title: 'Acheteur protégé', desc: 'Fonds libérés uniquement après confirmation de réception. Aucun risque de perte.' },
            { icon: '💰', title: 'Vendeur garanti',  desc: 'Paiement assuré dès que l\'acheteur valide. Pas de chargeback surprise.' },
            { icon: '⚖️', title: 'Arbitrage ST Pay', desc: 'En cas de litige, ST Pay intervient comme tiers de confiance neutre.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-soft)]">
              <span className="text-[18px] flex-shrink-0">{icon}</span>
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-1)]">{title}</p>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cycle de vie ────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Cycle de vie d'une transaction escrow</span>
          <span className="text-[10px] text-[var(--text-3)]">Cliquez sur un état pour en savoir plus</span>
        </div>
        <div className="p-4 flex flex-col gap-4">

          {/* Flow diagram */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Happy path */}
            {(['PENDING','SHIPPED','DELIVERED','RELEASED'] as const).map((id, i, arr) => {
              const s = lifecycle.find(l => l.id === id)!
              return (
                <React.Fragment key={id}>
                  <div className={`rounded-[8px] border-2 px-3 py-2 text-[11px] font-semibold cursor-default select-none ${s.color}`}>
                    {s.label}
                  </div>
                  {i < arr.length - 1 && (
                    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="flex-shrink-0 text-[var(--text-4)]">
                      <path d="M1 5h13M9 1l5 4-5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </React.Fragment>
              )
            })}
            {/* Branch labels */}
            <span className="text-[10px] text-[var(--text-4)] font-mono ml-1">← chemin nominal</span>
          </div>

          {/* Alternative paths */}
          <div className="flex flex-wrap items-center gap-2 ml-2">
            <span className="text-[10px] text-[var(--text-4)]">Alternatives :</span>
            {(['DISPUTED','CANCELLED'] as const).map((id) => {
              const s = lifecycle.find(l => l.id === id)!
              return (
                <div key={id} className={`rounded-[8px] border-2 px-3 py-2 text-[11px] font-semibold cursor-default select-none ${s.color}`}>
                  {s.label}
                </div>
              )
            })}
          </div>

          {/* State descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
            {lifecycle.map((s) => (
              <div key={s.id} className={`rounded-[8px] border p-2.5 flex flex-col gap-1 ${s.color}`}>
                <span className="text-[10px] font-bold font-mono">{s.id}</span>
                <span className="text-[10px] leading-relaxed">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Acteurs ─────────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Les acteurs</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '👤', role: 'Acheteur', actions: ['Initie le paiement escrow', 'Confirme la réception physique', 'Valide ou ouvre un litige', 'Reçoit un remboursement si litige résolu en sa faveur'] },
            { icon: '🏦', role: 'ST Pay (séquestre)', actions: ['Collecte et retient les fonds', 'Génère le code de retrait', 'Notifie les deux parties à chaque étape', 'Arbitre les litiges comme tiers de confiance'] },
            { icon: '🏪', role: 'Vendeur (vous)', actions: ['Reçoit la commande et expédie', 'Fournit le numéro de suivi', 'Reçoit les fonds après confirmation acheteur', 'Peut déclencher une libération directe (accord amiable)'] },
          ].map(({ icon, role, actions }) => (
            <div key={role} className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">{icon}</span>
                <span className="text-[12px] font-semibold text-[var(--text-1)]">{role}</span>
              </div>
              <ul className="flex flex-col gap-1">
                {actions.map((a) => (
                  <li key={a} className="text-[10px] text-[var(--text-2)] flex gap-1.5">
                    <span className="text-[var(--accent)] flex-shrink-0 mt-0.5">›</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Intégration pas à pas ────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Intégration — 4 étapes</span>
          <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[6px]">
            {(['curl','js','php','python'] as const).map((l) => (
              <button key={l} onClick={() => setIntegLang(l)}
                className={`px-2.5 py-1 rounded-[4px] text-[10px] font-mono transition-colors ${integLang === l ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
                {l === 'js' ? 'JS' : l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 flex flex-col gap-4">

          {/* Step tabs */}
          <div className="flex gap-1 flex-wrap">
            {steps.map((s, i) => (
              <button key={i} onClick={() => setActiveStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-[7px] border text-[11px] transition-all ${activeStep === i ? 'border-[var(--accent)] bg-[var(--accent-bg,#eef4ff)] text-[var(--accent)] font-semibold' : 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
                <span className={`w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${activeStep === i ? 'bg-[var(--accent)]' : 'bg-[var(--text-4)]'}`}>{s.n}</span>
                <span className="hidden sm:block">{s.title}</span>
                <span className="sm:hidden">Étape {s.n}</span>
              </button>
            ))}
          </div>

          {/* Step detail */}
          <div className="rounded-[8px] border border-[var(--border-soft)] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-soft)]">
              <span className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${steps[activeStep].color}`}>{steps[activeStep].n}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--text-1)]">{steps[activeStep].title}</p>
                <p className="text-[10px] text-[var(--text-3)] font-mono">{steps[activeStep].api}</p>
              </div>
              <span className="text-[10px] text-[var(--text-3)] hidden sm:block">Appelé par : {steps[activeStep].actor}</span>
              <button
                className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors ml-auto flex-shrink-0"
                onClick={() => navigator.clipboard.writeText(stepCode[activeStep][integLang]).then(() => {})}
              >
                Copier
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap overflow-x-auto bg-[var(--bg)]">
              {stepCode[activeStep][integLang]}
            </pre>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              className="btn-secondary text-[11px]"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
            >
              ← Précédent
            </button>
            <span className="text-[10px] text-[var(--text-3)]">Étape {activeStep + 1} / {steps.length}</span>
            <button
              className="btn-primary text-[11px]"
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>

      {/* ── Webhooks escrow ──────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Webhooks escrow</span>
          <span className="text-[10px] text-[var(--text-3)]">Événements à écouter sur votre callbackUrl</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="rounded-[6px] bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed">
            ⚠️ Vérifiez toujours la signature <code className="font-mono">Stpay-Signature</code> avant de traiter un webhook (<a href="#" className="underline">voir onglet Code → Guide SDK → Webhooks</a>).
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  <th className="text-left py-2 pr-4 text-[var(--text-2)] font-semibold">Événement</th>
                  <th className="text-left py-2 pr-4 text-[var(--text-2)] font-semibold">Déclencheur</th>
                  <th className="text-left py-2 text-[var(--text-2)] font-semibold">Action recommandée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {[
                  ['payment.completed', 'Fonds retenus avec succès (PENDING)', 'Confirmer la commande, notifier le vendeur pour préparer l\'envoi'],
                  ['escrow.shipped',    'Vendeur a fourni le numéro de suivi',  'Notifier l\'acheteur par email/push avec le lien de suivi'],
                  ['escrow.released',   'Fonds libérés au vendeur (RELEASED)',  'Créditer le compte vendeur, clôturer la commande'],
                  ['escrow.disputed',   'Litige ouvert par l\'acheteur',         'Alerter le support, geler les actions sur la commande'],
                  ['payment.failed',    'Échec de collecte du paiement',         'Notifier l\'acheteur, annuler la réservation de stock'],
                ].map(([event, trigger, action]) => (
                  <tr key={event} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-2 pr-4"><code className="font-mono text-[10px] text-[var(--accent)]">{event}</code></td>
                    <td className="py-2 pr-4 text-[var(--text-2)]">{trigger}</td>
                    <td className="py-2 text-[var(--text-3)]">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <pre className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed overflow-x-auto">{`// Exemple de payload escrow.released
{
  "type": "escrow.released",
  "escrowId": "ESC-XXXXXXXX",
  "transactionId": "ST-PAY-2024-XXXXXXXX",
  "merchantReference": "CMD-001",
  "amount": 25000,
  "currency": "XAF",
  "releasedAt": "2024-08-15T14:22:00Z"
}`}</pre>
        </div>
      </div>

      {/* ── Checklist d'intégration ──────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Checklist avant mise en production</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Passer `useEscrow: true` uniquement sur les commandes qui le nécessitent',
            'Sauvegarder `escrowId` en base dès la création du paiement',
            'Implémenter les 4 webhooks escrow sur votre endpoint callback',
            'Vérifier la signature `Stpay-Signature` sur chaque webhook',
            'Afficher le numéro de suivi à l\'acheteur après `escrow.shipped`',
            'Prévoir une UI pour que l\'acheteur saisisse le code de retrait',
            'Gérer le cas `DISPUTED` côté back-office (alerte support)',
            'Tester le flux complet en sandbox avec des clés `sk_test_`',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-[var(--text-2)]">
              <span className="text-[var(--accent)] flex-shrink-0 mt-0.5 font-bold">✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Questions fréquentes</span>
        </div>
        <div className="divide-y divide-[var(--border-soft)]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors text-left">
                <span className="text-[12px] font-medium text-[var(--text-1)] flex-1">{faq.q}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`flex-shrink-0 text-[var(--text-4)] transition-transform ${faqOpen === i ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {faqOpen === i && (
                <div className="px-4 pb-4 text-[11px] text-[var(--text-2)] leading-relaxed bg-[var(--bg-subtle)]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── TAB 4 : Code Snippets ────────────────────────────────────────────────────

function SnippetsTab() {
  const [mode, setMode]       = useState<'raw' | 'sdk'>('raw')
  const [sdk, setSdk]         = useState<SdkLang>('js')
  const [section, setSection] = useState<SdkSection>('install')
  const [lang, setLang]       = useState<Lang>('curl')
  const [scenario, setScenario] = useState(0)

  const scenarios = [
    { label: 'Initier un paiement MTN', value: 'create' },
    { label: 'Vérifier un statut',      value: 'status' },
    { label: 'Lister les webhooks',     value: 'webhooks' },
    { label: 'Générer une clé API',     value: 'keygen' },
    { label: 'Escrow — créer',          value: 'escrow-create' },
    { label: 'Escrow — expédier',       value: 'escrow-ship' },
    { label: 'Escrow — libérer',        value: 'escrow-release' },
  ]

  const snippets: Record<string, Record<Lang, string>> = {
    create: {
      curl: `curl -X POST https://api.stpay.africa/api/Payment \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_votre_cle" \\
  -d '{
    "amount": 5000, "currency": "XAF", "provider": "MTN",
    "customer": { "phoneNumber": "237677123456", "name": "Jean Dupont", "email": "jean@example.com" },
    "merchant": { "reference": "ORDER_001", "callbackUrl": "https://votre-site.com/callback", "name": "Ma Boutique" },
    "description": "Commande #001"
  }'`,
      php: `<?php
// Requires: composer require stpay/php-sdk
require_once 'vendor/autoload.php';

use StPay\\StPay;

$client = new StPay(['api_key' => $_ENV['STPAY_API_KEY']]);

$payment = $client->payments->create([
    'amount'      => 5000,
    'currency'    => 'XAF',
    'provider'    => 'MTN',
    'customer'    => ['phoneNumber' => '237677123456', 'name' => 'Jean Dupont'],
    'merchant'    => ['reference' => 'ORDER_001', 'callbackUrl' => 'https://votre-site.com/callback'],
    'description' => 'Commande #001',
]);

echo $payment['transactionId']; // ST-PAY-2024-XXXXXXXX`,
      js: `// Requires: npm install stpay-js
import { StPay } from 'stpay-js';

const client = new StPay({ apiKey: process.env.STPAY_API_KEY });

const payment = await client.payments.create({
  amount: 5000,
  currency: 'XAF',
  provider: 'MTN',
  customer: { phoneNumber: '237677123456', name: 'Jean Dupont', email: 'jean@example.com' },
  merchant: { reference: 'ORDER_001', callbackUrl: 'https://votre-site.com/callback' },
  description: 'Commande #001',
});

console.log(payment.transactionId); // ST-PAY-2024-XXXXXXXX`,
      python: `import requests, os

response = requests.post(
    'https://api.stpay.africa/api/Payment',
    headers={ 'Content-Type': 'application/json', 'X-Api-Key': os.environ['STPAY_API_KEY'] },
    json={
        'amount': 5000, 'currency': 'XAF', 'provider': 'MTN',
        'customer': { 'phoneNumber': '237677123456', 'name': 'Jean Dupont', 'email': 'jean@example.com' },
        'merchant': { 'reference': 'ORDER_001', 'callbackUrl': 'https://votre-site.com/callback', 'name': 'Ma Boutique' },
        'description': 'Commande #001'
    }
)
print(response.json()['transactionId'])  # ST-PAY-2024-XXXXXXXX`,
      dotnet: `using System.Text;
using System.Text.Json;

var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

var payload = new
{
  amount = 5000,
  currency = "XAF",
  provider = "MTN",
  customer = new { phoneNumber = "237677123456", name = "Jean Dupont", email = "jean@example.com" },
  merchant = new { reference = "ORDER_001", callbackUrl = "https://votre-site.com/callback", name = "Ma Boutique" },
  description = "Commande #001"
};

var body = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var res = await http.PostAsync("https://api.stpay.africa/api/Payment", body);
var json = await res.Content.ReadAsStringAsync();
Console.WriteLine(json);`,
      java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpClient client = HttpClient.newHttpClient();
String apiKey = System.getenv("STPAY_API_KEY");

String body = """
{
  \"amount\": 5000,
  \"currency\": \"XAF\",
  \"provider\": \"MTN\",
  \"customer\": { \"phoneNumber\": \"237677123456\", \"name\": \"Jean Dupont\", \"email\": \"jean@example.com\" },
  \"merchant\": { \"reference\": \"ORDER_001\", \"callbackUrl\": \"https://votre-site.com/callback\", \"name\": \"Ma Boutique\" },
  \"description\": \"Commande #001\"
}
""";

HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/Payment"))
  .header("Content-Type", "application/json")
  .header("X-Api-Key", apiKey)
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();

HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body());`,
    },
    status: {
      curl: `curl https://api.stpay.africa/api/Payment/ST-PAY-2024-XXXXXXXX \\
  -H "X-Api-Key: sk_test_votre_cle"`,
      php: `<?php
// Requires: composer require stpay/php-sdk
require_once 'vendor/autoload.php';

use StPay\\StPay;

$client  = new StPay(['api_key' => $_ENV['STPAY_API_KEY']]);
$payment = $client->payments->get('ST-PAY-2024-XXXXXXXX');

echo $payment['status']; // PENDING | COMPLETED | FAILED`,
      js: `const res = await fetch(\`https://api.stpay.africa/api/Payment/\${transactionId}\`,
  { headers: { 'X-Api-Key': process.env.STPAY_API_KEY } }
);
const status = await res.json();
// status.status → 'pending' | 'processing' | 'completed' | 'failed'`,
      python: `res = requests.get(
    f'https://api.stpay.africa/api/Payment/{transaction_id}',
    headers={'X-Api-Key': os.environ['STPAY_API_KEY']}
)
# res.json()['status'] → 'pending' | 'processing' | 'completed' | 'failed'`,
  dotnet: `var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

var transactionId = "ST-PAY-2024-XXXXXXXX";
var res = await http.GetAsync($"https://api.stpay.africa/api/Payment/{transactionId}");
var json = await res.Content.ReadAsStringAsync();
Console.WriteLine(json);`,
  java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String transactionId = "ST-PAY-2024-XXXXXXXX";
String apiKey = System.getenv("STPAY_API_KEY");

HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/Payment/" + transactionId))
  .header("X-Api-Key", apiKey)
  .GET()
  .build();

HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body());`,
    },
    webhooks: {
      curl: `curl "https://api.stpay.africa/api/webhooks?page=1&pageSize=20" \\
  -H "X-Api-Key: sk_test_votre_cle"`,
      php: `<?php
// Requires: composer require stpay/php-sdk
require_once 'vendor/autoload.php';

use StPay\StPay;

$client   = new StPay(['api_key' => $_ENV['STPAY_API_KEY']]);
$webhooks = $client->webhooks->list();

foreach ($webhooks as $w) {
    echo $w['eventType'] . ' — ' . $w['status'] . PHP_EOL;
}`,
      js: `const res = await fetch('https://api.stpay.africa/api/webhooks?page=1&pageSize=20',
  { headers: { 'X-Api-Key': process.env.STPAY_API_KEY } }
);
const { items } = await res.json();
items.forEach(w => console.log(w.eventType, w.status));`,
      python: `res = requests.get('https://api.stpay.africa/api/webhooks',
    params={'page': 1, 'pageSize': 20},
    headers={'X-Api-Key': os.environ['STPAY_API_KEY']}
)
for webhook in res.json()['items']:
    print(webhook['eventType'], webhook['status'])`,
  dotnet: `var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

var res = await http.GetAsync("https://api.stpay.africa/api/webhooks?page=1&pageSize=20");
var json = await res.Content.ReadAsStringAsync();
Console.WriteLine(json);`,
  java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String apiKey = System.getenv("STPAY_API_KEY");
HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/webhooks?page=1&pageSize=20"))
  .header("X-Api-Key", apiKey)
  .GET()
  .build();

HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body());`,
    },
    keygen: {
      curl: `curl -X POST "https://api.stpay.africa/api/keys/generate?isTestMode=true" \\
  -H "X-Api-Key: sk_test_votre_cle_existante"`,
      php: `<?php
// Requires: composer require stpay/php-sdk
require_once 'vendor/autoload.php';

use StPay\StPay;

$client = new StPay(['api_key' => $_ENV['STPAY_API_KEY']]);
$result = $client->keys->generate(['isTestMode' => true]);

// Sauvegardez $result['apiKey'] de façon sécurisée !
echo $result['apiKey'];`,
      js: `const res = await fetch('https://api.stpay.africa/api/keys/generate?isTestMode=true',
  { method: 'POST', headers: { 'X-Api-Key': process.env.STPAY_API_KEY } }
);
const { apiKey, mode } = await res.json();
// Sauvegardez apiKey de façon sécurisée !`,
      python: `res = requests.post('https://api.stpay.africa/api/keys/generate',
    params={'isTestMode': True},
    headers={'X-Api-Key': os.environ['STPAY_API_KEY']}
)
# Sauvegardez res.json()['apiKey'] de façon sécurisée !`,
  dotnet: `var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

var res = await http.PostAsync("https://api.stpay.africa/api/keys/generate?isTestMode=true", content: null);
var json = await res.Content.ReadAsStringAsync();
Console.WriteLine(json); // contient apiKey
// Sauvegardez apiKey de facon securisee`,
  java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String apiKey = System.getenv("STPAY_API_KEY");
HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/keys/generate?isTestMode=true"))
  .header("X-Api-Key", apiKey)
  .POST(HttpRequest.BodyPublishers.noBody())
  .build();

HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body()); // contient apiKey`,
    },

    'escrow-create': {
      curl: `# 1. Créer un paiement en mode escrow (les fonds sont retenus jusqu'à confirmation)
curl -X POST https://api.stpay.africa/api/Payment \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_votre_cle" \\
  -d '{
    "amount": 25000, "currency": "XAF", "provider": "MTN",
    "customer": { "phoneNumber": "237677123456", "name": "Acheteur" },
    "merchant": { "reference": "ORDER_ESCROW_001", "callbackUrl": "https://votre-site.com/callback" },
    "description": "Achat avec garantie escrow",
    "useEscrow": true
  }'

# 2. Lister les transactions escrow
curl https://api.stpay.africa/api/escrow \\
  -H "X-Api-Key: sk_test_votre_cle"

# 3. Récupérer une transaction escrow
curl https://api.stpay.africa/api/escrow/ESC-XXXXXXXX \\
  -H "X-Api-Key: sk_test_votre_cle"`,
      js: `// Requires: npm install stpay-js
import { StPay } from 'stpay-js';

const client = new StPay({ apiKey: process.env.STPAY_API_KEY });

// 1. Créer un paiement en mode escrow
const payment = await client.payments.create({
  amount: 25000,
  currency: 'XAF',
  provider: 'MTN',
  customer: { phoneNumber: '237677123456', name: 'Acheteur' },
  merchant: { reference: 'ORDER_ESCROW_001', callbackUrl: 'https://votre-site.com/callback' },
  description: 'Achat avec garantie escrow',
  useEscrow: true,
});
console.log(payment.transactionId); // ST-PAY-2024-XXXXXXXX
console.log(payment.escrowId);      // ESC-XXXXXXXX

// 2. Lister les transactions escrow
const escrows = await client.escrow.list();
console.log(escrows);

// 3. Récupérer une transaction escrow
const escrow = await client.escrow.get('ESC-XXXXXXXX');
console.log(escrow.status); // PENDING | SHIPPED | COMPLETED | DISPUTED | RELEASED`,
      php: `<?php
require_once 'vendor/autoload.php';
use StPay\\StPay;

$client = new StPay(['api_key' => getenv('STPAY_API_KEY')]);

// 1. Créer un paiement en mode escrow
$payment = $client->payments->create([
    'amount'      => 25000,
    'currency'    => 'XAF',
    'provider'    => 'MTN',
    'customer'    => ['phone_number' => '237677123456', 'name' => 'Acheteur'],
    'merchant'    => ['reference' => 'ORDER_ESCROW_001', 'callback_url' => 'https://votre-site.com/callback'],
    'description' => 'Achat avec garantie escrow',
    'use_escrow'  => true,
]);
echo $payment['transaction_id'];  // ST-PAY-2024-XXXXXXXX
echo $payment['escrow_id'];       // ESC-XXXXXXXX

// 2. Lister les transactions escrow
$escrows = $client->escrow->list();

// 3. Récupérer une transaction escrow
$escrow = $client->escrow->get('ESC-XXXXXXXX');
echo $escrow['status']; // PENDING | SHIPPED | COMPLETED | DISPUTED | RELEASED`,
      python: `from stpay import StPayClient
import os

client = StPayClient(api_key=os.environ['STPAY_API_KEY'])

# 1. Créer un paiement en mode escrow
payment = client.payments.create(
    amount=25000,
    currency='XAF',
    provider='MTN',
    customer={'phone_number': '237677123456', 'name': 'Acheteur'},
    merchant={'reference': 'ORDER_ESCROW_001', 'callback_url': 'https://votre-site.com/callback'},
    description='Achat avec garantie escrow',
    escrow=True,
)
print(payment['transaction_id'])  # ST-PAY-2024-XXXXXXXX
print(payment.get('escrow_id'))   # ESC-XXXXXXXX

# 2. Lister les transactions escrow
escrows = client.escrow.list()

# 3. Récupérer une transaction escrow
escrow = client.escrow.get('ESC-XXXXXXXX')
print(escrow['status'])  # PENDING | SHIPPED | COMPLETED | DISPUTED | RELEASED`,
      dotnet: `var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

// 1. Créer un paiement en mode escrow
var payload = new { amount = 25000, currency = "XAF", provider = "MTN",
    customer = new { phoneNumber = "237677123456", name = "Acheteur" },
    merchant = new { reference = "ORDER_ESCROW_001", callbackUrl = "https://votre-site.com/callback" },
    description = "Achat avec garantie escrow", useEscrow = true };
var body = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var res = await http.PostAsync("https://api.stpay.africa/api/Payment", body);
Console.WriteLine(await res.Content.ReadAsStringAsync());

// 2. Lister les transactions escrow
var list = await http.GetAsync("https://api.stpay.africa/api/escrow");
Console.WriteLine(await list.Content.ReadAsStringAsync());

// 3. Récupérer une transaction escrow
var escrow = await http.GetAsync("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX");
Console.WriteLine(await escrow.Content.ReadAsStringAsync());`,
      java: `import java.net.URI;
import java.net.http.*;

String apiKey = System.getenv("STPAY_API_KEY");
HttpClient http = HttpClient.newHttpClient();

// 1. Créer un paiement en mode escrow
String body = """
{ "amount": 25000, "currency": "XAF", "provider": "MTN",
  "customer": { "phoneNumber": "237677123456", "name": "Acheteur" },
  "merchant": { "reference": "ORDER_ESCROW_001", "callbackUrl": "https://votre-site.com/callback" },
  "description": "Achat avec garantie escrow", "useEscrow": true }
""";
HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/Payment"))
  .header("Content-Type", "application/json").header("X-Api-Key", apiKey)
  .POST(HttpRequest.BodyPublishers.ofString(body)).build();
System.out.println(http.send(req, HttpResponse.BodyHandlers.ofString()).body());

// 2. Lister les transactions escrow
HttpRequest list = HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/escrow"))
  .header("X-Api-Key", apiKey).GET().build();
System.out.println(http.send(list, HttpResponse.BodyHandlers.ofString()).body());`,
    },

    'escrow-ship': {
      curl: `# 1. Vendeur expédie les marchandises (envoi du numéro de suivi)
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/ship \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_votre_cle" \\
  -d '{ "trackingNumber": "DHL-123456789", "carrier": "DHL" }'

# 2. Acheteur confirme la réception (code de retrait)
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/confirm-pickup \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_votre_cle" \\
  -d '{ "pickupCode": "1234" }'

# 3. Acheteur valide la réception → libère les fonds au vendeur
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/buyer-confirm \\
  -H "X-Api-Key: sk_test_votre_cle"`,
      js: `import { StPay } from 'stpay-js';

const client = new StPay({ apiKey: process.env.STPAY_API_KEY });
const escrowId = 'ESC-XXXXXXXX';

// 1. Vendeur expédie
await client.escrow.ship(escrowId, { trackingNumber: 'DHL-123456789', carrier: 'DHL' });
console.log('Marchandises expédiées');

// 2. Acheteur confirme la réception physique
await client.escrow.confirmPickup(escrowId, { pickupCode: '1234' });
console.log('Réception confirmée');

// 3. Acheteur valide → fonds libérés au vendeur
const result = await client.escrow.buyerConfirm(escrowId);
console.log(result.status); // RELEASED`,
      php: `<?php
require_once 'vendor/autoload.php';
use StPay\\StPay;

$client   = new StPay(['api_key' => getenv('STPAY_API_KEY')]);
$escrowId = 'ESC-XXXXXXXX';

// 1. Vendeur expédie
$client->escrow->ship($escrowId, ['tracking_number' => 'DHL-123456789', 'carrier' => 'DHL']);

// 2. Acheteur confirme la réception physique
$client->escrow->confirmPickup($escrowId, ['pickup_code' => '1234']);

// 3. Acheteur valide → fonds libérés
$result = $client->escrow->buyerConfirm($escrowId);
echo $result['status']; // RELEASED`,
      python: `from stpay import StPayClient
import os

client   = StPayClient(api_key=os.environ['STPAY_API_KEY'])
escrow_id = 'ESC-XXXXXXXX'

# 1. Vendeur expédie
client.escrow.ship(escrow_id, tracking_number='DHL-123456789')

# 2. Acheteur confirme la réception physique
client.escrow.confirm_pickup(escrow_id, pickup_code='1234')

# 3. Acheteur valide → fonds libérés au vendeur
result = client.escrow.buyer_confirm(escrow_id)
print(result['status'])  # RELEASED`,
      dotnet: `var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

// 1. Vendeur expédie
var ship = new StringContent(JsonSerializer.Serialize(new { trackingNumber = "DHL-123456789", carrier = "DHL" }), Encoding.UTF8, "application/json");
await http.PostAsync("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/ship", ship);

// 2. Acheteur confirme réception physique
var pickup = new StringContent(JsonSerializer.Serialize(new { pickupCode = "1234" }), Encoding.UTF8, "application/json");
await http.PostAsync("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/confirm-pickup", pickup);

// 3. Acheteur valide → libération des fonds
var confirm = await http.PostAsync("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/buyer-confirm", null);
Console.WriteLine(await confirm.Content.ReadAsStringAsync());`,
      java: `import java.net.URI;
import java.net.http.*;

String apiKey = System.getenv("STPAY_API_KEY");
HttpClient http = HttpClient.newHttpClient();

// 1. Vendeur expédie
http.send(HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/ship"))
  .header("Content-Type", "application/json").header("X-Api-Key", apiKey)
  .POST(HttpRequest.BodyPublishers.ofString("{\\"trackingNumber\\":\\"DHL-123456789\\"}")).build(),
  HttpResponse.BodyHandlers.ofString());

// 2. Acheteur confirme réception
http.send(HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/confirm-pickup"))
  .header("Content-Type", "application/json").header("X-Api-Key", apiKey)
  .POST(HttpRequest.BodyPublishers.ofString("{\\"pickupCode\\":\\"1234\\"}")).build(),
  HttpResponse.BodyHandlers.ofString());

// 3. Acheteur valide → fonds libérés
System.out.println(http.send(HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/buyer-confirm"))
  .header("X-Api-Key", apiKey).POST(HttpRequest.BodyPublishers.noBody()).build(),
  HttpResponse.BodyHandlers.ofString()).body());`,
    },

    'escrow-release': {
      curl: `# Option A — libération directe par le marchand (accord amiable)
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/release \\
  -H "X-Api-Key: sk_test_votre_cle"

# Option B — ouvrir un litige (acheteur non satisfait)
curl -X POST https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/dispute \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_votre_cle" \\
  -d '{ "reason": "Article non conforme à la description" }'`,
      js: `import { StPay } from 'stpay-js';

const client   = new StPay({ apiKey: process.env.STPAY_API_KEY });
const escrowId = 'ESC-XXXXXXXX';

// Option A — libération directe (accord amiable)
const released = await client.escrow.release(escrowId);
console.log(released.status); // RELEASED

// Option B — ouvrir un litige
const disputed = await client.escrow.dispute(escrowId, {
  reason: 'Article non conforme à la description',
});
console.log(disputed.status); // DISPUTED`,
      php: `<?php
require_once 'vendor/autoload.php';
use StPay\\StPay;

$client   = new StPay(['api_key' => getenv('STPAY_API_KEY')]);
$escrowId = 'ESC-XXXXXXXX';

// Option A — libération directe
$released = $client->escrow->release($escrowId);
echo $released['status']; // RELEASED

// Option B — ouvrir un litige
$disputed = $client->escrow->dispute($escrowId, [
    'reason' => 'Article non conforme à la description',
]);
echo $disputed['status']; // DISPUTED`,
      python: `from stpay import StPayClient
import os

client    = StPayClient(api_key=os.environ['STPAY_API_KEY'])
escrow_id = 'ESC-XXXXXXXX'

# Option A — libération directe
released = client.escrow.release(escrow_id)
print(released['status'])  # RELEASED

# Option B — ouvrir un litige
disputed = client.escrow.dispute(
    escrow_id,
    reason='Article non conforme à la description',
)
print(disputed['status'])  # DISPUTED`,
      dotnet: `var http = new HttpClient();
http.DefaultRequestHeaders.Add("X-Api-Key", Environment.GetEnvironmentVariable("STPAY_API_KEY")!);

// Option A — libération directe
var release = await http.PostAsync("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/release", null);
Console.WriteLine(await release.Content.ReadAsStringAsync()); // { status: "RELEASED" }

// Option B — ouvrir un litige
var body = new StringContent(
    JsonSerializer.Serialize(new { reason = "Article non conforme à la description" }),
    Encoding.UTF8, "application/json");
var dispute = await http.PostAsync("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/dispute", body);
Console.WriteLine(await dispute.Content.ReadAsStringAsync()); // { status: "DISPUTED" }`,
      java: `import java.net.URI;
import java.net.http.*;

String apiKey = System.getenv("STPAY_API_KEY");
HttpClient http = HttpClient.newHttpClient();

// Option A — libération directe
System.out.println(http.send(HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/release"))
  .header("X-Api-Key", apiKey).POST(HttpRequest.BodyPublishers.noBody()).build(),
  HttpResponse.BodyHandlers.ofString()).body());

// Option B — ouvrir un litige
System.out.println(http.send(HttpRequest.newBuilder()
  .uri(URI.create("https://api.stpay.africa/api/escrow/ESC-XXXXXXXX/dispute"))
  .header("Content-Type", "application/json").header("X-Api-Key", apiKey)
  .POST(HttpRequest.BodyPublishers.ofString("{\\"reason\\":\\"Article non conforme\\"}")).build(),
  HttpResponse.BodyHandlers.ofString()).body());`,
    },
  }

  const code = snippets[scenarios[scenario].value]?.[lang] ?? ''
  const copy = () => { navigator.clipboard.writeText(code); toast.success('Code copié !') }
  const LANG_LABELS: Record<Lang, string> = {
    curl: 'cURL',
    js: 'JavaScript',
    php: 'PHP',
    python: 'Python',
    dotnet: '.NET',
    java: 'Java',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── mode toggle ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-[var(--border)] p-[3px] rounded-[var(--r-sm)] w-fit">
        <button onClick={() => setMode('raw')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-[12px] transition-colors font-medium ${mode === 'raw' ? 'bg-white text-[var(--text-1)] shadow-sm font-semibold' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 4.5L2 7l2.5 2.5M9.5 4.5L12 7l-2.5 2.5M7.5 3l-1 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          API brute
        </button>
        <button onClick={() => setMode('sdk')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-[12px] transition-colors font-medium ${mode === 'sdk' ? 'bg-white text-[var(--text-1)] shadow-sm font-semibold' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6.5l1.5 1L4 8.5M7 8.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Guide SDK
        </button>
      </div>

      {mode === 'raw' && (
      <div className="space-y-4">
      <SectionHeader title="Exemples de code" sub="Copiez ces snippets pour intégrer ST Pay dans votre application" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px]">
          {scenarios.map(({ label }, i) => (
            <button key={i} onClick={() => setScenario(i)}
                    className={`px-3 py-1.5 rounded-[5px] text-[12px] transition-colors ${scenario === i ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px] ml-auto">
          {(['curl', 'js', 'php', 'python', 'dotnet', 'java'] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)}
                    className={`px-3 py-1.5 rounded-[5px] text-[11px] font-mono transition-colors ${lang === l ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{scenarios[scenario].label}</span>
          <button className="btn-secondary text-[11px]" onClick={copy}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 8V1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Copier
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-[12px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre">{code}</pre>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Vérification des webhooks</span></div>
        <div className="p-4 space-y-3">
          <p className="text-[12px] text-[var(--text-2)]">Chaque webhook ST Pay inclut un header de signature HMAC-SHA256 pour vérifier son authenticité.</p>
          <pre className="text-[11px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-soft)] rounded-[6px] p-3 text-[var(--text-1)] overflow-x-auto">{`// Node.js — vérifier la signature d'un webhook
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [timestamp, hash] = signature.split(',');
  const t = timestamp.replace('t=', '');
  const expected = 't=' + t + ',v1=' +
    crypto.createHmac('sha256', secret).update(t + '.' + payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-stpay-signature'];
  if (!verifyWebhook(req.body, sig, process.env.STPAY_WEBHOOK_SECRET))
    return res.status(401).send('Signature invalide');
  res.json({ received: true });
  processWebhookEvent(JSON.parse(req.body)); // traiter en async
});`}</pre>
        </div>
      </div>

      {/* ── SDKs officiels ───────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">SDKs officiels</span>
          <span className="text-[10px] text-[var(--text-3)] bg-[var(--bg-subtle)] border border-[var(--border-soft)] rounded px-1.5 py-0.5">Zéro dépendance requise</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* JS/TS SDK */}
          <div className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">🟨</span>
              <span className="font-semibold text-[12px] text-[var(--text-1)]">JavaScript / TypeScript</span>
              <span className="ml-auto text-[10px] text-[var(--text-3)]">Node ≥ 18 · ESM + CJS</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg)] rounded-[6px] px-3 py-1.5 border border-[var(--border-soft)]">
              <code className="text-[11px] font-mono text-[var(--text-1)] flex-1">npm install stpay-js</code>
              <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors" onClick={() => { navigator.clipboard.writeText('npm install stpay-js'); toast.success('Copié !') }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 8V1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-3)] leading-relaxed">SDK TypeScript complet · vérification webhook HMAC-SHA256 · zéro dépendance runtime · types inclus.</p>
            <p className="text-[10px] text-[var(--text-3)] font-mono">📁 sdk/stpay-js/</p>
          </div>
          {/* PHP SDK */}
          <div className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">🐘</span>
              <span className="font-semibold text-[12px] text-[var(--text-1)]">PHP</span>
              <span className="ml-auto text-[10px] text-[var(--text-3)]">PHP 7.4+ · cURL natif</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg)] rounded-[6px] px-3 py-1.5 border border-[var(--border-soft)]">
              <code className="text-[11px] font-mono text-[var(--text-1)] flex-1">composer require stpay/php-sdk</code>
              <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors" onClick={() => { navigator.clipboard.writeText('composer require stpay/php-sdk'); toast.success('Copié !') }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 8V1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-3)] leading-relaxed">PSR-4 · zéro dépendance · Laravel + WooCommerce inclus · vérification webhook hash_equals.</p>
            <p className="text-[10px] text-[var(--text-3)] font-mono">📁 sdk/stpay-php/</p>
          </div>
          {/* Python SDK */}
          <div className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">🐍</span>
              <span className="font-semibold text-[12px] text-[var(--text-1)]">Python</span>
              <span className="ml-auto text-[10px] text-[var(--text-3)]">Python ≥ 3.8 · sync + async</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg)] rounded-[6px] px-3 py-1.5 border border-[var(--border-soft)]">
              <code className="text-[11px] font-mono text-[var(--text-1)] flex-1">pip install stpay-python</code>
              <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors" onClick={() => { navigator.clipboard.writeText('pip install stpay-python'); toast.success('Copié !') }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 8V1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-3)] leading-relaxed">TypedDict · requests (sync) · httpx (async) · Django + FastAPI inclus · vérification webhook HMAC-SHA256.</p>
            <p className="text-[10px] text-[var(--text-3)] font-mono">📁 sdk/stpay-python/</p>
          </div>
        </div>
      </div>
      </div>
      )}

      {mode === 'sdk' && (
        <SdkGuide sdk={sdk} setSdk={setSdk} section={section} setSection={setSection} />
      )}
    </div>
  )
}

// ─── SDK Guide component ──────────────────────────────────────────────────────

type SdkLang    = 'js' | 'php' | 'python'
type SdkSection = 'install' | 'payment' | 'webhook' | 'errors' | 'async' | 'frameworks'

function SdkGuide({ sdk, setSdk, section, setSection }: {
  sdk:        SdkLang
  setSdk:     (s: SdkLang) => void
  section:    SdkSection
  setSection: (s: SdkSection) => void
}) {
  const sdkMeta: Record<SdkLang, { label: string; icon: string; badge: string; install: string; pkg: string }> = {
    js:     { label: 'JavaScript / TypeScript', icon: '🟨', badge: 'Node ≥ 18 · ESM + CJS',  install: 'npm install stpay-js',           pkg: 'sdk/stpay-js/'     },
    php:    { label: 'PHP',                     icon: '🐘', badge: 'PHP 7.4+ · cURL natif',   install: 'composer require stpay/php-sdk', pkg: 'sdk/stpay-php/'    },
    python: { label: 'Python',                  icon: '🐍', badge: 'Python ≥ 3.8',            install: 'pip install stpay-python',       pkg: 'sdk/stpay-python/' },
  }

  const sections = [
    { id: 'install',    label: 'Installation'      },
    { id: 'payment',    label: 'Créer un paiement' },
    { id: 'webhook',    label: 'Webhooks'          },
    { id: 'errors',     label: 'Erreurs'           },
    { id: 'async',      label: 'Async'             },
    { id: 'frameworks', label: 'Frameworks'        },
  ] as const

  // ── code snippets per section / sdk ──────────────────────────────────────
  const code: Record<typeof section, Record<SdkLang, string>> = {
    install: {
      js: `# Avec npm
npm install stpay-js

# Avec yarn
yarn add stpay-js

# Avec pnpm
pnpm add stpay-js`,
      php: `# Via Composer
composer require stpay/php-sdk

# Vérifier l'installation
php -r "require 'vendor/autoload.php'; echo \\StPay\\StPay::VERSION;"`,
      python: `# Sync seulement (requests)
pip install stpay-python

# Sync + Async (requests + httpx)
pip install "stpay-python[async]"`,
    },

    payment: {
      js: `import { StPay } from 'stpay-js';

const client = new StPay({ apiKey: process.env.STPAY_API_KEY });

// 1. Créer un paiement
const payment = await client.payments.create({
  amount: 5000,
  currency: 'XAF',
  provider: 'MTN',      // MTN | ORANGE | WAVE | MOOV
  customer: {
    phoneNumber: '237677123456',
    name: 'Jean Mbarga',
    email: 'jean@example.cm',
  },
  merchant: {
    reference: 'ORDER-001',
    callbackUrl: 'https://mon-site.cm/webhook/stpay',
  },
  description: 'Commande boutique',
  idempotencyKey: 'idem-ORDER-001', // évite les doublons
});

console.log(payment.transactionId); // ST-PAY-2024-XXXXXXXX
console.log(payment.status);        // pending | completed | failed

// 2. Attendre le statut final (polling)
const final = await client.payments.waitForFinalStatus(
  payment.transactionId,
  { intervalMs: 5000, maxAttempts: 12 },
);
console.log(final.status); // completed`,

      php: `<?php
require_once 'vendor/autoload.php';
use StPay\\StPay;

$client = new StPay(['api_key' => getenv('STPAY_API_KEY')]);

// 1. Créer un paiement
$payment = $client->payments->create([
    'amount'      => 5000,
    'currency'    => 'XAF',
    'provider'    => 'MTN',
    'customer'    => ['phone_number' => '237677123456', 'name' => 'Jean Mbarga'],
    'merchant'    => [
        'reference'    => 'ORDER-001',
        'callback_url' => 'https://mon-site.cm/webhook/stpay',
    ],
    'description' => 'Commande boutique',
]);

echo $payment['transaction_id']; // ST-PAY-2024-XXXXXXXX
echo $payment['status'];         // pending | completed | failed

// 2. Vérifier l'état
$status = $client->payments->get($payment['transaction_id']);
echo $status['status'];`,

      python: `from stpay import StPayClient
import os

client = StPayClient(api_key=os.environ['STPAY_API_KEY'])

# 1. Créer un paiement
payment = client.payments.create(
    amount=5000,
    currency='XAF',
    provider='MTN',          # MTN | ORANGE | WAVE | MOOV
    customer={'phone_number': '237677123456', 'name': 'Jean Mbarga'},
    merchant={
        'reference': 'ORDER-001',
        'callback_url': 'https://mon-site.cm/webhook/stpay',
    },
    description='Commande boutique',
    idempotency_key='idem-ORDER-001',
)

print(payment['transaction_id'])  # ST-PAY-2024-XXXXXXXX
print(payment['status'])          # pending | completed | failed

# 2. Attendre le statut final (polling automatique)
final = client.payments.wait_for_final_status(
    payment['transaction_id'],
    interval_seconds=5,
    max_attempts=12,   # 60 s max
)
print(final['status'])  # completed`,
    },

    webhook: {
      js: `import { StPay, constructEvent } from 'stpay-js';

// Express / Next.js API route
app.post('/webhook/stpay', express.raw({ type: 'application/json' }), (req, res) => {
  const sig    = req.headers['stpay-signature'] as string;
  const secret = process.env.STPAY_WEBHOOK_SECRET!;

  try {
    // Vérifie la signature HMAC-SHA256 et la tolérance de 5 min
    const event = constructEvent(req.body, sig, secret);

    switch (event.type) {
      case 'payment.completed':
        console.log('Payé :', event.transactionId, event.merchantReference);
        // mettre à jour la commande en base...
        break;
      case 'payment.failed':
        console.warn('Échec :', event.failureReason);
        break;
      case 'escrow.released':
        console.log('Fonds libérés — escrow:', event.escrowId);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send('Signature invalide');
  }
});`,

      php: `<?php
// webhook.php — point d'entrée ST Pay
require_once 'vendor/autoload.php';
use StPay\\Webhook\\Signature;

$rawBody = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STPAY_SIGNATURE'] ?? '';
$secret    = getenv('STPAY_WEBHOOK_SECRET');

try {
    $event = Signature::constructEvent($rawBody, $sigHeader, $secret);
} catch (\\Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Signature invalide']);
    exit;
}

switch ($event['type']) {
    case 'payment.completed':
        // Mettre à jour la commande
        OrderRepository::markPaid($event['merchantReference'], $event['transactionId']);
        break;
    case 'payment.failed':
        // Notifier le client, libérer le stock...
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);`,

      python: `from stpay import construct_event, StPayError
import os

WEBHOOK_SECRET = os.environ['STPAY_WEBHOOK_SECRET']

def handle_stpay_webhook(raw_body: bytes, sig_header: str) -> dict:
    """
    Appeler depuis votre route /webhook/stpay.
    raw_body  = corps brut de la requête (ne pas JSON-décoder avant)
    sig_header = valeur du header Stpay-Signature
    """
    try:
        event = construct_event(raw_body, sig_header, WEBHOOK_SECRET)
    except StPayError:
        return {'error': 'signature invalide'}, 400

    event_type = event.get('type', '')

    if event_type == 'payment.completed':
        tx_id = event['transaction_id']
        ref   = event['merchant_reference']
        # Mettre à jour la commande en base...
        print(f'Payé : {tx_id} — {ref}')

    elif event_type == 'payment.failed':
        print(f"Échec : {event.get('failure_reason')}")

    elif event_type == 'escrow.released':
        print(f"Fonds libérés — escrow: {event.get('escrow_id')}")

    return {'received': True}, 200`,
    },

    errors: {
      js: `import { StPay, StPayApiError, StPayNetworkError } from 'stpay-js';

const client = new StPay({ apiKey: process.env.STPAY_API_KEY });

try {
  const payment = await client.payments.create({ ... });
} catch (err) {
  if (err instanceof StPayApiError) {
    // Erreur renvoyée par l'API (4xx / 5xx)
    console.error(err.status);      // 422
    console.error(err.code);        // "insufficient_balance"
    console.error(err.message);     // message lisible
    console.error(err.body);        // réponse complète
  } else if (err instanceof StPayNetworkError) {
    // Timeout, DNS failure — relancer en toute sécurité
    console.error('Réseau :', err.message);
  } else {
    throw err; // inattendu, remonter
  }
}

// Codes courants
// 401  invalid_api_key   — clé manquante ou invalide
// 422  validation_error  — paramètre manquant ou invalide
// 429  rate_limit        — trop de requêtes, attendre avant de réessayer
// 500  server_error      — erreur ST Pay, réessayer plus tard`,

      php: `<?php
require_once 'vendor/autoload.php';
use StPay\\StPay;
use StPay\\Exception\\StPayApiException;
use StPay\\Exception\\StPayNetworkException;

$client = new StPay(['api_key' => getenv('STPAY_API_KEY')]);

try {
    $payment = $client->payments->create([...]);
} catch (StPayApiException $e) {
    // Erreur API (4xx / 5xx)
    echo $e->getStatus();   // 422
    echo $e->getCode();     // "insufficient_balance"
    echo $e->getMessage();  // message lisible
    var_dump($e->getBody()); // réponse complète
} catch (StPayNetworkException $e) {
    // Timeout, cURL — relancer en toute sécurité
    echo 'Réseau : ' . $e->getMessage();
}

// Codes courants
// 401  invalid_api_key   — clé manquante ou invalide
// 422  validation_error  — champ manquant ou invalide
// 429  rate_limit        — trop de requêtes
// 500  server_error      — erreur ST Pay côté serveur`,

      python: `from stpay import StPayClient, StPayApiError, StPayNetworkError
import os

client = StPayClient(api_key=os.environ['STPAY_API_KEY'])

try:
    payment = client.payments.create(...)
except StPayApiError as e:
    # Erreur renvoyée par l'API (4xx / 5xx)
    print(e.status)   # 422
    print(e.code)     # "insufficient_balance"
    print(e.message)  # message lisible
    print(e.body)     # réponse complète
except StPayNetworkError as e:
    # Timeout, DNS failure — relancer en toute sécurité
    print('Réseau :', e)

# Codes courants
# 401  invalid_api_key   — clé manquante ou invalide
# 422  validation_error  — paramètre manquant ou invalide
# 429  rate_limit        — trop de requêtes
# 500  server_error      — erreur ST Pay côté serveur`,
    },

    async: {
      js: `// Node.js ou navigateur — toutes les méthodes retournent des Promises
import { StPay } from 'stpay-js';

const client = new StPay({ apiKey: process.env.STPAY_API_KEY });

// Paiements en parallèle avec Promise.all
const [p1, p2, p3] = await Promise.all([
  client.payments.create({ amount: 1000, currency: 'XAF', provider: 'MTN',    customer: { phoneNumber: '237677111111' }, merchant: { reference: 'A' } }),
  client.payments.create({ amount: 2000, currency: 'XAF', provider: 'ORANGE', customer: { phoneNumber: '237655222222' }, merchant: { reference: 'B' } }),
  client.payments.create({ amount: 3000, currency: 'XAF', provider: 'WAVE',   customer: { phoneNumber: '237699333333' }, merchant: { reference: 'C' } }),
]);
console.log(p1.transactionId, p2.transactionId, p3.transactionId);`,

      php: `<?php
// PHP ne supporte pas l'async natif.
// Pour des appels en parallèle, utilisez Guzzle avec des promesses.
require_once 'vendor/autoload.php';
use GuzzleHttp\\Client;
use GuzzleHttp\\Promise\\Utils;

$http = new Client(['base_uri' => 'https://api.stpay.africa']);
$headers = ['X-Api-Key' => getenv('STPAY_API_KEY'), 'Content-Type' => 'application/json'];

$promises = [
    'a' => $http->postAsync('/api/Payment', ['headers' => $headers, 'json' => ['amount' => 1000, 'provider' => 'MTN', ...]]),
    'b' => $http->postAsync('/api/Payment', ['headers' => $headers, 'json' => ['amount' => 2000, 'provider' => 'ORANGE', ...]]),
];

$results = Utils::settle($promises)->wait();
foreach ($results as $key => $result) {
    if ($result['state'] === 'fulfilled') {
        $data = json_decode($result['value']->getBody(), true);
        echo "$key : " . $data['transactionId'] . PHP_EOL;
    }
}`,

      python: `# Nécessite : pip install "stpay-python[async]"
import asyncio, os
from stpay import AsyncStPayClient

async def main():
    async with AsyncStPayClient(api_key=os.environ['STPAY_API_KEY']) as client:

        # Un seul paiement async
        payment = await client.payments.create(
            amount=5000, currency='XAF', provider='MTN',
            customer={'phone_number': '237677123456'},
            merchant={'reference': 'ORDER-001'},
        )
        print(payment['transaction_id'])

        # Plusieurs paiements en parallèle
        results = await asyncio.gather(
            client.payments.create(amount=1000, currency='XAF', provider='MTN',    customer={'phone_number': '237677111111'}, merchant={'reference': 'A'}),
            client.payments.create(amount=2000, currency='XAF', provider='ORANGE', customer={'phone_number': '237655222222'}, merchant={'reference': 'B'}),
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, Exception):
                print('Erreur :', r)
            else:
                print(r['transaction_id'], r['status'])

asyncio.run(main())`,
    },

    frameworks: {
      js: `// ── Next.js App Router (app/api/checkout/route.ts) ──────────────────
import { StPay } from 'stpay-js';
import { NextRequest, NextResponse } from 'next/server';

const stpay = new StPay({ apiKey: process.env.STPAY_API_KEY! });

export async function POST(req: NextRequest) {
  const { amount, phone, ref } = await req.json();
  const payment = await stpay.payments.create({
    amount,
    currency: 'XAF',
    provider: 'MTN',
    customer: { phoneNumber: phone },
    merchant: { reference: ref, callbackUrl: \`\${process.env.NEXT_PUBLIC_URL}/api/webhook\` },
  });
  return NextResponse.json(payment, { status: 201 });
}

// ── Next.js webhook route (app/api/webhook/route.ts) ──────────────
import { constructEvent } from 'stpay-js';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('stpay-signature') ?? '';
  try {
    const event = constructEvent(Buffer.from(raw), sig, process.env.STPAY_WEBHOOK_SECRET!);
    if (event.type === 'payment.completed') {
      // await db.orders.update(...)
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
}`,

      php: `<?php
// ── Laravel — routes/api.php ─────────────────────────────────────────
use App\\Http\\Controllers\\StPayController;
Route::post('/checkout', [StPayController::class, 'checkout']);
Route::post('/webhook/stpay', [StPayController::class, 'webhook']);

// ── app/Http/Controllers/StPayController.php ─────────────────────────
<?php
namespace App\\Http\\Controllers;
use Illuminate\\Http\\Request;
use StPay\\StPay;
use StPay\\Webhook\\Signature;

class StPayController extends Controller
{
    private StPay $stpay;
    public function __construct() {
        $this->stpay = new StPay(['api_key' => config('services.stpay.key')]);
    }

    public function checkout(Request $request)
    {
        $data    = $request->validate(['amount' => 'required|integer|min:1', 'phone' => 'required|string', 'ref' => 'required|string']);
        $payment = $this->stpay->payments->create([
            'amount'   => $data['amount'], 'currency' => 'XAF', 'provider' => 'MTN',
            'customer' => ['phone_number' => $data['phone']],
            'merchant' => ['reference'    => $data['ref'], 'callback_url' => config('app.url') . '/api/webhook/stpay'],
        ]);
        return response()->json($payment, 201);
    }

    public function webhook(Request $request)
    {
        $event = Signature::constructEvent($request->getContent(), $request->header('Stpay-Signature'), config('services.stpay.webhook_secret'));
        // dispatch(new ProcessStPayEvent($event));
        return response()->json(['received' => true]);
    }
}`,

      python: `# ── FastAPI (main.py) ────────────────────────────────────────────────
from fastapi import FastAPI, BackgroundTasks, Header, Request, HTTPException
from stpay import AsyncStPayClient, construct_event, StPayError
import os, asyncio

app    = FastAPI()
client = AsyncStPayClient(api_key=os.environ['STPAY_API_KEY'])

@app.post('/checkout', status_code=201)
async def checkout(body: dict):
    return await client.payments.create(
        amount=body['amount'], currency='XAF', provider=body['provider'],
        customer={'phone_number': body['phone']},
        merchant={'reference': body['ref'], 'callback_url': 'https://mon-api.cm/webhook'},
    )

@app.post('/webhook')
async def webhook(request: Request, background_tasks: BackgroundTasks,
                  stpay_signature: str = Header(..., alias='Stpay-Signature')):
    raw = await request.body()
    try:
        event = construct_event(raw, stpay_signature, os.environ['STPAY_WEBHOOK_SECRET'])
    except StPayError:
        raise HTTPException(status_code=400, detail='signature invalide')
    background_tasks.add_task(process_event, event)
    return {'received': True}

async def process_event(event: dict):
    if event.get('type') == 'payment.completed':
        print('Payé :', event['transaction_id'])
    # autres types...

# ── Django (views.py) ────────────────────────────────────────────────
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from stpay import construct_event, StPayError

@csrf_exempt
def stpay_webhook(request):
    try:
        event = construct_event(request.body, request.headers.get('Stpay-Signature',''), WEBHOOK_SECRET)
    except StPayError:
        return JsonResponse({'error': 'signature invalide'}, status=400)
    # traitement...
    return JsonResponse({'received': True})`,
    },
  }

  const meta = sdkMeta[sdk]

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* ── SDK selector ────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(sdkMeta) as SdkLang[]).map((l) => (
          <button key={l} onClick={() => setSdk(l)}
            className={`flex items-center gap-2 px-3 py-2 rounded-[8px] border text-[11px] transition-all ${sdk === l ? 'border-[var(--accent)] bg-[var(--accent-bg,#f0f7ff)] text-[var(--accent)] font-semibold' : 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
            <span>{sdkMeta[l].icon}</span>
            <span>{sdkMeta[l].label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${sdk === l ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border-soft)] text-[var(--text-3)]'}`}>{sdkMeta[l].badge}</span>
          </button>
        ))}
      </div>

      {/* ── Section nav ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap bg-[var(--border)] p-[3px] rounded-[var(--r-sm)] w-fit">
        {sections.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-[5px] text-[11px] font-mono transition-colors ${section === s.id ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Installation ────────────────────────────────────────────────── */}
      {section === 'install' && (
        <div className="flex flex-col gap-3">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">{meta.icon} Installer {meta.label}</span>
              <span className="text-[10px] font-mono text-[var(--text-3)]">📁 {meta.pkg}</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
                  <span className="text-[10px] font-mono text-[var(--text-3)]">Terminal</span>
                  <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]" onClick={() => { navigator.clipboard.writeText(meta.install) }}>Copier</button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap">{code.install[sdk]}</pre>
              </div>
              <div className="text-[11px] text-[var(--text-2)] leading-relaxed">
                {sdk === 'js'     && '✅ Zéro dépendance runtime — fonctionne en Node.js ≥ 18, Deno, Bun et dans les bundlers ESM (Vite, webpack).'}
                {sdk === 'php'    && '✅ Zéro dépendance — utilise l\'extension cURL native de PHP. Requiert PHP 7.4+ et Composer.'}
                {sdk === 'python' && <>✅ <code className="font-mono">requests</code> est toujours installé. L'extra <code className="font-mono">[async]</code> ajoute <code className="font-mono">httpx</code> pour <code className="font-mono">AsyncStPayClient</code>.</>}
              </div>
              <div className="rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-soft)] p-3 text-[11px] text-[var(--text-2)] flex flex-col gap-1">
                <span className="font-semibold text-[var(--text-1)]">Configuration de la clé API</span>
                {sdk === 'js'     && <span>Stocker dans une variable d'environnement : <code className="font-mono">STPAY_API_KEY=sk_test_xxx</code>. Les clés <code className="font-mono">sk_test_</code> utilisent automatiquement le sandbox.</span>}
                {sdk === 'php'    && <span>Définir dans <code className="font-mono">.env</code> ou passer directement : <code className="font-mono">new StPay(['api_key' =&gt; 'sk_test_xxx'])</code>. Les clés <code className="font-mono">sk_test_</code> activent le sandbox.</span>}
                {sdk === 'python' && <span>Stocker dans <code className="font-mono">STPAY_API_KEY=sk_test_xxx</code>. <code className="font-mono">StPayClient(api_key=os.environ['STPAY_API_KEY'])</code> détecte automatiquement le mode sandbox.</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Créer un paiement ───────────────────────────────────────────── */}
      {section === 'payment' && (
        <div className="flex flex-col gap-3">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Créer et suivre un paiement</span>
              <span className="text-[10px] text-[var(--text-3)]">create → poll → status final</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
                  <span className="text-[10px] font-mono text-[var(--text-3)]">{meta.label}</span>
                  <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]" onClick={() => { navigator.clipboard.writeText(code.payment[sdk]) }}>Copier</button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap overflow-x-auto">{code.payment[sdk]}</pre>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[['MTN','Mobile Money','237677…'],['ORANGE','Orange Money','237655…'],['WAVE','Wave','237699…'],['MOOV','Moov Money','237670…']].map(([p, name, prefix]) => (
                  <div key={p} className="rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2 text-[10px] flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--text-1)]">{p}</span>
                    <span className="text-[var(--text-3)]">{name}</span>
                    <span className="font-mono text-[var(--text-3)]">{prefix}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[var(--text-3)] flex flex-col gap-0.5">
                <span className="font-semibold text-[var(--text-2)]">Statuts possibles</span>
                {[['pending','En attente de confirmation mobile money'],['completed','Paiement confirmé — fonds reçus'],['failed','Échec (solde insuffisant, refus…)'],['cancelled','Annulé par la boutique ou l\'acheteur']].map(([s, d]) => (
                  <div key={s} className="flex gap-2"><code className="font-mono w-20 flex-shrink-0">{s}</code><span>{d}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Webhooks ────────────────────────────────────────────────────── */}
      {section === 'webhook' && (
        <div className="flex flex-col gap-3">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Vérification des webhooks</span>
              <span className="text-[10px] text-[var(--text-3)]">HMAC-SHA256 · tolérance 5 min</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-[6px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-[11px] text-amber-900 dark:text-amber-100 leading-relaxed">
                ⚠️ Toujours lire le corps brut de la requête <strong>avant</strong> tout JSON.parse / json_decode. La signature porte sur le corps brut en bytes.
              </div>
              <div className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
                  <span className="text-[10px] font-mono text-[var(--text-3)]">{meta.label} — récepteur webhook</span>
                  <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]" onClick={() => { navigator.clipboard.writeText(code.webhook[sdk]) }}>Copier</button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap overflow-x-auto">{code.webhook[sdk]}</pre>
              </div>
              <div className="text-[10px] text-[var(--text-3)] flex flex-col gap-0.5">
                <span className="font-semibold text-[var(--text-2)]">Événements disponibles</span>
                {[
                  ['payment.completed','Paiement confirmé par le réseau mobile money'],
                  ['payment.failed',   'Paiement échoué (solde, timeout, refus opérateur)'],
                  ['payment.pending',  'Paiement initié, en attente de confirmation'],
                  ['escrow.shipped',   'Vendeur a expédié les marchandises'],
                  ['escrow.released',  'Fonds libérés au vendeur après confirmation acheteur'],
                  ['escrow.disputed',  'Litige ouvert par l\'acheteur'],
                ].map(([e, d]) => (
                  <div key={e} className="flex gap-2"><code className="font-mono w-40 flex-shrink-0">{e}</code><span>{d}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Erreurs ─────────────────────────────────────────────────────── */}
      {section === 'errors' && (
        <div className="flex flex-col gap-3">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Gestion des erreurs</span>
              <span className="text-[10px] text-[var(--text-3)]">ApiError · NetworkError · codes</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
                  <span className="text-[10px] font-mono text-[var(--text-3)]">{meta.label}</span>
                  <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]" onClick={() => { navigator.clipboard.writeText(code.errors[sdk]) }}>Copier</button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap overflow-x-auto">{code.errors[sdk]}</pre>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ['401','invalid_api_key','Clé API manquante ou invalide'],
                  ['422','validation_error','Paramètre manquant ou invalide'],
                  ['429','rate_limit','Trop de requêtes — attendre avant de réessayer'],
                  ['500','server_error','Erreur ST Pay côté serveur — réessayer plus tard'],
                ].map(([status, code_, desc]) => (
                  <div key={status} className="rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2.5 text-[10px] flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${status === '401' || status === '422' ? 'text-amber-600' : 'text-red-500'}`}>{status}</span>
                      <code className="font-mono text-[var(--text-2)]">{code_}</code>
                    </div>
                    <span className="text-[var(--text-3)]">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Async ───────────────────────────────────────────────────────── */}
      {section === 'async' && (
        <div className="flex flex-col gap-3">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Utilisation asynchrone</span>
              <span className="text-[10px] text-[var(--text-3)]">{sdk === 'js' ? 'Promise / async-await' : sdk === 'python' ? 'asyncio + httpx' : 'Guzzle Promises'}</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {sdk === 'python' && (
                <div className="rounded-[6px] bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-[11px] text-blue-900 dark:text-blue-100 leading-relaxed">
                  💡 <code className="font-mono">AsyncStPayClient</code> nécessite <code className="font-mono">pip install "stpay-python[async]"</code>.
                </div>
              )}
              <div className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
                  <span className="text-[10px] font-mono text-[var(--text-3)]">{meta.label}</span>
                  <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]" onClick={() => { navigator.clipboard.writeText(code.async[sdk]) }}>Copier</button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap overflow-x-auto">{code.async[sdk]}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Frameworks ──────────────────────────────────────────────────── */}
      {section === 'frameworks' && (
        <div className="flex flex-col gap-3">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Intégration framework</span>
              <span className="text-[10px] text-[var(--text-3)] font-mono">
                {sdk === 'js' ? 'Next.js App Router' : sdk === 'php' ? 'Laravel' : 'FastAPI · Django'}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-[6px] bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-soft)]">
                  <span className="text-[10px] font-mono text-[var(--text-3)]">{meta.label} — {sdk === 'js' ? 'Next.js route handlers' : sdk === 'php' ? 'Controller Laravel' : 'FastAPI + Django'}</span>
                  <button className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]" onClick={() => { navigator.clipboard.writeText(code.frameworks[sdk]) }}>Copier</button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre-wrap overflow-x-auto">{code.frameworks[sdk]}</pre>
              </div>
              <div className="text-[10px] text-[var(--text-3)]">
                Des exemples complets sont disponibles dans <code className="font-mono">{meta.pkg}examples/</code>.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── TAB 5 : Quickstart plateformes ──────────────────────────────────────────

function QuickstartTab({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const { user } = useAuth()
  const dxActor = { userId: user.id, userName: user.name, role: user.role, merchantId: user.merchantId }
  const [platform, setPlatform] = useState<'web' | 'react-native' | 'flutter' | 'kotlin' | 'swift' | 'wearos' | 'watchos'>('web')

  const quickSnippets: Record<'web' | 'react-native' | 'flutter' | 'kotlin' | 'swift' | 'wearos' | 'watchos', string> = {
    web: `// Web (JavaScript/TypeScript)
const res = await fetch('https://api.stpay.africa/api/Payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': import.meta.env.VITE_STPAY_API_KEY,
  },
  body: JSON.stringify({
    amount: 5000,
    currency: 'XAF',
    provider: 'MTN',
    customer: { phoneNumber: '237677123456', name: 'Jean Dupont', email: 'jean@example.com' },
    merchant: { reference: 'ORDER_001', callbackUrl: 'https://example.com/callback', name: 'Ma Boutique' },
    description: 'Commande mobile/web',
  }),
})

const payment = await res.json()
console.log(payment.transactionId)`,
    'react-native': `// React Native
const response = await fetch('https://api.stpay.africa/api/Payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': STPAY_API_KEY,
  },
  body: JSON.stringify({
    amount: 5000,
    currency: 'XAF',
    provider: 'MTN',
    customer: { phoneNumber: '237677123456', name: 'Jean Dupont', email: 'jean@example.com' },
    merchant: { reference: 'ORDER_001', callbackUrl: 'https://example.com/callback', name: 'Mobile App' },
    description: 'Paiement React Native',
  }),
})

const data = await response.json()
console.log(data.status, data.transactionId)`,
    flutter: `// Flutter (http package)
final uri = Uri.parse('https://api.stpay.africa/api/Payment');
final response = await http.post(
  uri,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': stpayApiKey,
  },
  body: jsonEncode({
    'amount': 5000,
    'currency': 'XAF',
    'provider': 'MTN',
    'customer': {
      'phoneNumber': '237677123456',
      'name': 'Jean Dupont',
      'email': 'jean@example.com',
    },
    'merchant': {
      'reference': 'ORDER_001',
      'callbackUrl': 'https://example.com/callback',
      'name': 'Flutter App',
    },
    'description': 'Paiement Flutter',
  }),
);

final body = jsonDecode(response.body);
print(body['transactionId']);`,
    kotlin: `// Kotlin (OkHttp)
val client = OkHttpClient()
val json = """
{
  "amount": 5000,
  "currency": "XAF",
  "provider": "MTN",
  "customer": { "phoneNumber": "237677123456", "name": "Jean Dupont", "email": "jean@example.com" },
  "merchant": { "reference": "ORDER_001", "callbackUrl": "https://example.com/callback", "name": "Android App" },
  "description": "Paiement Kotlin"
}
""".trimIndent()

val req = Request.Builder()
  .url("https://api.stpay.africa/api/Payment")
  .addHeader("Content-Type", "application/json")
  .addHeader("X-Api-Key", STPAY_API_KEY)
  .post(json.toRequestBody("application/json".toMediaType()))
  .build()

client.newCall(req).execute().use { println(it.body?.string()) }`,
    swift: `// Swift (URLSession)
let url = URL(string: "https://api.stpay.africa/api/Payment")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue(STPAY_API_KEY, forHTTPHeaderField: "X-Api-Key")

let payload: [String: Any] = [
  "amount": 5000,
  "currency": "XAF",
  "provider": "MTN",
  "customer": ["phoneNumber": "237677123456", "name": "Jean Dupont", "email": "jean@example.com"],
  "merchant": ["reference": "ORDER_001", "callbackUrl": "https://example.com/callback", "name": "iOS App"],
  "description": "Paiement Swift"
]
request.httpBody = try JSONSerialization.data(withJSONObject: payload)

URLSession.shared.dataTask(with: request) { data, _, error in
  guard error == nil, let data = data else { return }
  print(String(decoding: data, as: UTF8.self))
}.resume()`,
    wearos: `// Wear OS (companion flow)
// 1) La montre envoie une action a l'app mobile
// 2) L'app mobile appelle ST Pay avec la cle API
// 3) Le statut revient vers la montre via Data Layer
fun startPaymentFromWatch(amount: Int) {
  val payload = mapOf("amount" to amount, "provider" to "MTN")
  // Envoyer payload a l'app mobile companion (Data Layer)
}

// Cote mobile companion: appeler POST /api/Payment puis renvoyer status`,
    watchos: `// watchOS (companion flow)
// 1) La Watch transmet la demande a l'iPhone
// 2) L'iPhone appelle ST Pay
// 3) L'iPhone renvoie le statut vers la Watch
import WatchConnectivity

func requestPaymentFromWatch(amount: Int) {
  guard WCSession.default.isReachable else { return }
  WCSession.default.sendMessage(["amount": amount, "provider": "MTN"], replyHandler: { reply in
    print("Status:", reply["status"] ?? "unknown")
  }, errorHandler: { error in
    print(error)
  })
}`
  }

  const platformLabels: Record<'web' | 'react-native' | 'flutter' | 'kotlin' | 'swift' | 'wearos' | 'watchos', string> = {
    web: 'Web JS/TS',
    'react-native': 'React Native',
    flutter: 'Flutter',
    kotlin: 'Kotlin',
    swift: 'Swift',
    wearos: 'Wear OS',
    watchos: 'watchOS',
  }

  const endpointChecks = [
    'GET /api/Payment/health',
    'POST /api/merchant/login',
    'POST /api/Payment',
    'GET /api/Payment/{paymentId}',
    'GET /api/webhooks?page=1&pageSize=20',
  ]

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copie`) 
    } catch {
      toast.error('Copie impossible')
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Quickstart plateformes" sub="Integrez ST Pay en moins de 15 minutes sur web, mobile et wearables" />

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Parcours 15 minutes chrono</span></div>
        <div className="p-4 grid sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
            <p className="text-[11px] font-bold text-[var(--text-1)]">1. Credentials</p>
            <p className="text-[11px] text-[var(--text-3)] mt-1">Generez une cle de test et gardez-la en variable d environnement.</p>
            <button className="btn-secondary text-[11px] mt-2" onClick={() => goToTab('keys')}>Ouvrir Cles API</button>
          </div>
          <div className="p-3 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
            <p className="text-[11px] font-bold text-[var(--text-1)]">2. Premier paiement</p>
            <p className="text-[11px] text-[var(--text-3)] mt-1">Lancez POST /api/Payment puis suivez le statut avec transactionId.</p>
            <button className="btn-secondary text-[11px] mt-2" onClick={() => goToTab('playground')}>Tester dans Playground</button>
          </div>
          <div className="p-3 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
            <p className="text-[11px] font-bold text-[var(--text-1)]">3. Validation rapide</p>
            <p className="text-[11px] text-[var(--text-3)] mt-1">Importez la collection minimale Postman et executez les routes critiques.</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button className="btn-primary text-[11px]" onClick={() => { try { markDxStep('postman_minimal_downloaded', dxActor); downloadPostmanCollectionFile('minimal'); toast.success('Collection minimale telechargee') } catch { toast.error('Telechargement impossible') } }}>
                Telecharger minimal
              </button>
              <button className="btn-secondary text-[11px]" onClick={() => { try { downloadPostmanCollectionFile('complete'); toast.success('Collection complete telechargee') } catch { toast.error('Telechargement impossible') } }}>
                Telecharger complete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Snippet par plateforme</span></div>
        <div className="p-4">
          <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px] w-fit flex-wrap mb-3">
            {(['web','react-native','flutter','kotlin','swift','wearos','watchos'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-[5px] text-[11px] transition-colors ${platform === p ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
              >
                {platformLabels[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] text-[var(--text-3)]">Exemple minimal pour initier un paiement.</p>
            <button className="btn-secondary text-[11px]" onClick={() => copy(quickSnippets[platform], `Snippet ${platformLabels[platform]}`)}>Copier</button>
          </div>
          <div className="overflow-x-auto border border-[var(--border-soft)] rounded-[var(--r-sm)] bg-[var(--bg-subtle)] p-3">
            <pre className="text-[12px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre">{quickSnippets[platform]}</pre>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Endpoints critiques a valider</span></div>
        <div className="p-4 space-y-2">
          {endpointChecks.map((item) => (
            <div key={item} className="flex items-center justify-between gap-2 p-2 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
              <span className="text-[11px] font-mono text-[var(--text-1)]">{item}</span>
              <button className="btn-ghost text-[11px]" onClick={() => copy(item, 'Endpoint')}>Copier</button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Wearables & Companion Apps</span></div>
        <div className="p-4 space-y-3">
          <p className="text-[12px] text-[var(--text-2)]">ST Pay s’intègre sur smartwatch via une app compagnon mobile. La montre ne détient jamais la clé API : elle délègue la création de paiement à l’app mobile, puis affiche le statut en temps réel.</p>
          <ul className="text-[11px] text-[var(--text-3)] list-disc ml-5 space-y-1">
            <li>Utilisez <b>DataLayer</b> (Wear OS) ou <b>WatchConnectivity</b> (watchOS) pour la communication.</li>
            <li>Le paiement est toujours initié côté mobile (Android/iOS).</li>
            <li>La montre affiche le statut, le QR ou le code de confirmation.</li>
            <li>Jamais de clé API stockée sur la montre.</li>
            <li>Voir snippets dédiés ci-dessus pour le flux companion.</li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="flex-1 bg-white border border-[var(--border-soft)] rounded-[var(--r-sm)] p-3">
              <p className="font-bold text-[11px] mb-3">Schéma d’intégration</p>
              <svg viewBox="0 0 340 95" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
                {/* Watch */}
                <rect x="8" y="18" width="52" height="44" rx="10" fill="#1A1A1A" stroke="#444" strokeWidth="1.5"/>
                <rect x="14" y="24" width="40" height="32" rx="5" fill="#000"/>
                <rect x="22" y="62" width="8" height="6" rx="2" fill="#333"/>
                <rect x="38" y="62" width="8" height="6" rx="2" fill="#333"/>
                <rect x="22" y="12" width="8" height="6" rx="2" fill="#333"/>
                <rect x="38" y="12" width="8" height="6" rx="2" fill="#333"/>
                <text x="34" y="34" textAnchor="middle" fontSize="5" fill="#FFD700" fontWeight="700">MTN</text>
                <text x="34" y="43" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">PAY</text>
                <text x="34" y="52" textAnchor="middle" fontSize="4.5" fill="#888">5 000 XAF</text>
                <text x="34" y="78" textAnchor="middle" fontSize="7" fill="#555">Montre</text>
                {/* Arrow watch to phone */}
                <line x1="62" y1="38" x2="98" y2="38" stroke="#FF6600" strokeWidth="1.5" strokeDasharray="3 2"/>
                <polygon points="98,35 104,38 98,41" fill="#FF6600"/>
                <text x="83" y="33" textAnchor="middle" fontSize="6" fill="#FF6600">&#x2460; action</text>
                {/* Phone */}
                <rect x="104" y="12" width="56" height="72" rx="10" fill="#fff" stroke="#ddd" strokeWidth="1.5"/>
                <rect x="110" y="20" width="44" height="56" rx="5" fill="#f3f4f6"/>
                <rect x="122" y="10" width="20" height="4" rx="2" fill="#ccc"/>
                <text x="132" y="46" textAnchor="middle" fontSize="7.5" fill="#FF6600" fontWeight="800">App</text>
                <text x="132" y="56" textAnchor="middle" fontSize="6.5" fill="#374151">Mobile</text>
                <text x="132" y="91" textAnchor="middle" fontSize="7" fill="#555">iOS / Android</text>
                {/* Arrow phone to api */}
                <line x1="160" y1="38" x2="196" y2="38" stroke="#3B82F6" strokeWidth="1.5"/>
                <polygon points="196,35 202,38 196,41" fill="#3B82F6"/>
                <text x="181" y="33" textAnchor="middle" fontSize="6" fill="#3B82F6">&#x2461; POST</text>
                <text x="181" y="48" textAnchor="middle" fontSize="5.5" fill="#3B82F6">/api/Payment</text>
                {/* ST Pay API box */}
                <rect x="202" y="18" width="68" height="44" rx="8" fill="#fff7ed" stroke="#fdba74" strokeWidth="1.5"/>
                <text x="236" y="38" textAnchor="middle" fontSize="8" fill="#9a3412" fontWeight="800">ST Pay</text>
                <text x="236" y="51" textAnchor="middle" fontSize="7" fill="#c2410c">API</text>
                <text x="236" y="78" textAnchor="middle" fontSize="7" fill="#555">Backend</text>
                {/* Arrow api back to phone */}
                <line x1="202" y1="50" x2="160" y2="50" stroke="#22C55E" strokeWidth="1.5"/>
                <polygon points="160,47 154,50 160,53" fill="#22C55E"/>
                <text x="181" y="64" textAnchor="middle" fontSize="6" fill="#16a34a">&#x2462; statut</text>
                {/* Arrow phone back to watch */}
                <line x1="104" y1="50" x2="64" y2="50" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="3 2"/>
                <polygon points="64,47 58,50 64,53" fill="#22C55E"/>
                <text x="83" y="64" textAnchor="middle" fontSize="6" fill="#16a34a">&#x2463; affiche</text>
              </svg>
              <p className="text-[10px] text-[var(--text-3)] mt-2">La montre transmet la demande à l’app mobile, qui appelle l’API ST Pay, puis renvoie le statut à la montre.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Check-list Go Live</span></div>
        <div className="p-4 space-y-2">
          <ul className="text-[12px] text-[var(--text-2)] list-disc ml-5 space-y-1">
            <li><b>Clé API live</b> : Utilisez <span className="font-mono">sk_live_…</span> uniquement en production, jamais dans le code public.</li>
            <li><b>Webhooks</b> : Vérifiez la réception et la signature HMAC de chaque événement.</li>
            <li><b>Retry webhooks</b> : Gérez les retries automatiques (jusqu’à 5 tentatives, backoff exponentiel).</li>
            <li><b>Monitoring</b> : Surveillez les statuts, latences et erreurs via l’API <span className="font-mono">/health</span> et <span className="font-mono">/metrics</span>.</li>
            <li><b>Gestion d’erreur</b> : Affichez les messages d’erreur utilisateur-friendly, logguez les détails côté serveur.</li>
            <li><b>Rollback</b> : Prévoyez un plan de rollback (désactivation clé, annulation paiement, alertes).</li>
            <li><b>Test de charge</b> : Effectuez un test de charge sur les endpoints critiques avant lancement.</li>
            <li><b>Support</b> : Documentez le contact support et le process d’escalade.</li>
            <li><b>Sécurité & confidentialité</b> : Ne stockez jamais de clé API ou de données sensibles sur la montre ou dans le frontend public. Chiffrez les données sensibles côté serveur.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 6 : Provider Status ──────────────────────────────────────────────────

function StatusTab() {
  const { data: providers = [], isFetching: provFetching, refetch: refetchProv } = useQuery({ queryKey: ['dev-providers-health'], queryFn: providersHealthApi.allProviders, refetchInterval: 30_000 })
  const { data: obs, isFetching: obsFetching, refetch: refetchObs } = useQuery({ queryKey: ['dev-observability'], queryFn: providersHealthApi.observability, refetchInterval: 30_000 })
  const refetch = () => { refetchProv(); refetchObs() }
  const isLoading = provFetching || obsFetching

  const PROVIDER_INFO: Record<string, { name: string; desc: string; color: string }> = {
    MTN:    { name: 'MTN Mobile Money',  desc: "Cameroun, Côte d'Ivoire, Ghana", color: '#FFC700' },
    ORANGE: { name: 'Orange Money',      desc: 'Orange Money multi-pays',         color: '#FF6600' },
    WAVE:   { name: 'Wave',              desc: 'Wave wallet',                     color: '#3B82F6' },
    MOOV:   { name: 'Moov Money',        desc: 'Moov Money',                      color: '#22C55E' },
  }

  const OBS_ENDPOINTS = [
    { key: 'health',  label: '/health',       desc: 'Santé générale' },
    { key: 'ready',   label: '/health/ready', desc: 'Prêt à servir' },
    { key: 'live',    label: '/health/live',  desc: 'Liveness probe' },
    { key: 'metrics', label: '/metrics',      desc: 'Prometheus' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-[16px] text-[var(--text-1)] tracking-tight">Statut des providers</h2>
          <p className="text-[12px] text-[var(--text-3)] mt-0.5">Actualisation toutes les 30 secondes</p>
        </div>
        <button className="btn-secondary" onClick={refetch} disabled={isLoading}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isLoading ? 'animate-spin' : ''}>
            <path d="M10 6A4 4 0 112 6M10 6V3M10 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isLoading ? 'Vérification…' : 'Actualiser'}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {providers.map((provider) => {
          const name = provider.name.toUpperCase()
          const status = provider.status ?? 'unknown'
          const info = PROVIDER_INFO[name] ?? {
            name,
            desc: 'Provider configuré côté backend',
            color: '#64748B',
          }
          return (
            <div key={name} className={`panel transition-all ${status === 'up' ? 'border-[var(--green-border)]' : ''} ${status === 'down' ? 'border-[var(--red-border)]' : ''}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[9px] font-extrabold font-mono text-white flex-shrink-0" style={{ background: info.color }}>{name.slice(0, 3)}</div>
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse-slow ${status === 'up' ? 'bg-[var(--green)]' : status === 'down' ? 'bg-[var(--red)]' : 'bg-[var(--text-4)]'}`} />
                </div>
                <p className="font-bold text-[13px] text-[var(--text-1)]">{info.name}</p>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">{info.desc}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge color={status === 'up' ? 'emerald' : status === 'down' ? 'red' : 'slate'} dot>
                    {status === 'up' ? 'Opérationnel' : status === 'down' ? 'Dégradé' : 'Inconnu'}
                  </Badge>
                  {Array.isArray(provider.supportedFeatures) && provider.supportedFeatures.length > 0 && (
                    <span className="text-[10px] text-[var(--text-3)]">{provider.supportedFeatures.join(', ')}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Observabilité backend</span>
          {obs?.lastChecked && <span className="text-[11px] text-[var(--text-3)]">Vérifié à {obs.lastChecked}</span>}
        </div>
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OBS_ENDPOINTS.map(({ key, label, desc }) => {
            const status = obs?.[key as keyof typeof obs] as 'up' | 'down' | undefined
            return (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-[var(--r-sm)] border ${status === 'up' ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : status === 'down' ? 'bg-[var(--red-bg)] border-[var(--red-border)]' : 'bg-[var(--bg-subtle)] border-[var(--border-soft)]'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'up' ? 'bg-[var(--green)]' : status === 'down' ? 'bg-[var(--red)]' : 'bg-[var(--text-4)]'}`} />
                <div>
                  <p className={`text-[11px] font-mono font-semibold ${status === 'up' ? 'text-[var(--green)]' : status === 'down' ? 'text-[var(--red)]' : 'text-[var(--text-2)]'}`}>{label}</p>
                  <p className="text-[10px] text-[var(--text-3)]">{desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">SLA & disponibilité</span></div>
        <div className="p-4 grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Disponibilité cible', value: '99.9%', sub: 'sur 30 jours glissants' },
            { label: 'Délai moyen',          value: '< 3s',  sub: 'confirmation de paiement' },
            { label: 'Retry webhooks',       value: '5×',    sub: 'avec backoff exponentiel' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="text-center p-3 bg-[var(--bg-subtle)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
              <p className="font-extrabold text-[22px] text-[var(--orange)] tracking-tight">{value}</p>
              <p className="text-[12px] font-semibold text-[var(--text-1)] mt-0.5">{label}</p>
              <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 6 : Simulateur USSD MTN ─────────────────────────────────────────────

function SimStepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [{ n: 1, label: 'Configurer' }, { n: 2, label: 'Téléphone' }, { n: 3, label: 'Résultat' }]
  return (
    <div className="flex bg-[var(--bg-page)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden mb-4">
      {steps.map(({ n, label }, i) => {
        const done = n < current, active = n === current
        return (
          <div key={n} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 text-[12px] transition-colors ${i > 0 ? 'border-l border-[var(--border)]' : ''} ${done ? 'bg-[var(--green-bg)] text-[var(--green)]' : ''} ${active ? 'bg-[var(--orange-bg)] text-[var(--orange-dark)] font-bold' : ''} ${!done && !active ? 'text-[var(--text-3)]' : ''}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${done ? 'bg-[var(--green)] text-white' : !active ? 'bg-[var(--border)] text-[var(--text-3)]' : 'text-white'}`}
                 style={active ? { background: 'var(--orange)' } : {}}>
              {done ? '✓' : n}
            </div>
            {label}
          </div>
        )
      })}
    </div>
  )
}

function SimEventLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [entries])
  const COLOR: Record<string, string> = { ok: 'text-[var(--green)]', err: 'text-[var(--red)]', warn: 'text-[var(--amber)]', info: 'text-[var(--blue)]' }
  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Journal d'événements</span></div>
      <div ref={ref} className="p-3 font-mono text-[11px] leading-relaxed bg-[var(--bg-subtle)] overflow-y-auto space-y-0.5" style={{ minHeight: 80, maxHeight: 160 }}>
        {entries.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-[var(--text-4)] flex-shrink-0">{e.time}</span>
            <span className={COLOR[e.type] ?? 'text-[var(--text-2)]'}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimPhone({ screen, txId, amount, ref_, desc, onConfirm, onCancel, onReset, polling, pollCount }:
  { screen: PhoneScreen; txId?: string; amount?: number; ref_?: string; desc?: string; onConfirm: (pin: string) => void; onCancel: () => void; onReset: () => void; polling: boolean; pollCount: number }) {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  useEffect(() => { setPin(''); setPinError(false) }, [screen])

  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  useEffect(() => {
    const id = setInterval(() => setClockTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })), 10_000)
    return () => clearInterval(id)
  }, [])

  const dialKey = (k: string) => { if (screen === 'ussd' && pin.length < 5) setPin(p => p + k) }
  const handleDel = () => { if (screen === 'ussd') setPin(p => p.slice(0, -1)) }
  const handleConfirm = () => {
    if (screen !== 'ussd') return
    if (pin.length < 4) { setPinError(true); setTimeout(() => setPinError(false), 1200); return }
    onConfirm(pin)
  }

  const ks = (extra?: React.CSSProperties): React.CSSProperties => ({ background: '#2A2A2A', border: 'none', borderRadius: 6, color: 'white', fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer', ...extra })

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: 240, background: '#1A1A1A', borderRadius: 36, padding: '14px 10px', border: '3px solid #333' }}>
        <div style={{ width: 70, height: 8, background: '#333', borderRadius: 4, margin: '0 auto 10px' }} />
        <div style={{ background: '#000', borderRadius: 20, overflow: 'hidden', minHeight: 300 }}>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 4px', background: '#000', color: 'white', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>{[4,6,8,10].map(h => <div key={h} style={{ width: 3, height: h, background: 'white', borderRadius: 1 }}/>)}</div>
            <span style={{ letterSpacing: 1 }}>MTN CM</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
              <span>4G</span>
              <div style={{ width: 18, height: 9, border: '1.5px solid white', borderRadius: 2, display: 'flex', alignItems: 'center', padding: '1px 1.5px' }}><div style={{ width: '70%', height: '100%', background: 'white', borderRadius: 1 }} /></div>
            </div>
          </div>

          {/* IDLE */}
          {screen === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '28px 16px', minHeight: 220 }}>
              <div style={{ fontSize: 30, fontWeight: 300, color: 'white', fontFamily: 'DM Mono, monospace', letterSpacing: 3 }}>{clockTime}</div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: 'DM Mono, monospace', marginTop: 4, textAlign: 'center' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div style={{ marginTop: 20, background: '#FFD700', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>MTN MoMo</div>
              <div style={{ marginTop: 8, fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>En attente d'une requête USSD...</div>
            </div>
          )}

          {/* USSD */}
          {screen === 'ussd' && (
            <div style={{ display: 'flex', flexDirection: 'column', background: '#000', padding: '8px 8px 10px' }}>
              <div style={{ background: '#FFD700', padding: '6px 10px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: 700, color: '#000', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>MTN Mobile Money — *126#</div>
              <div style={{ background: '#FFFDE7', padding: 10, borderRadius: '0 0 4px 4px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#000', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>PAIEMENT MOBILE MONEY</div>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>Transaction ID:</div>
                <div style={{ fontSize: 9, wordBreak: 'break-all', marginBottom: 6, color: '#333' }}>{txId?.slice(0, 28)}...</div>
                <div style={{ fontSize: 10, color: '#555' }}>Marchand:</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{ref_}</div>
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, borderTop: '1px solid #E0D800', borderBottom: '1px solid #E0D800', padding: '5px 0', margin: '6px 0' }}>{amount ? fmtXAF(amount) : '—'}</div>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Motif:</div>
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>{desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>PIN:</span>
                  <div style={{ flex: 1, background: 'white', border: `1px solid ${pinError ? '#C02020' : '#333'}`, borderRadius: 3, padding: '3px 6px', fontFamily: 'DM Mono, monospace', fontSize: 14, letterSpacing: 5, color: '#000', textAlign: 'center', minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border .2s' }}>
                    {pin ? '•'.repeat(pin.length) : <span style={{ color: '#BBB', fontSize: 11 }}>_ _ _ _ _</span>}
                  </div>
                </div>
                {pinError && <p style={{ fontSize: 9, color: '#C02020', textAlign: 'center', margin: '4px 0 0', fontFamily: 'DM Mono, monospace' }}>PIN incomplet (min. 4 chiffres)</p>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center', color: '#0A5A0A', fontWeight: 700 }}>OK → Confirmer</div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#7A1010', fontWeight: 700 }}>✕ → Refuser</div>
                </div>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {screen === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, border: '3px solid #FFD700', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ color: '#FFD700', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700 }}>TRAITEMENT...</div>
              <div style={{ color: '#888', fontFamily: 'DM Mono, monospace', fontSize: 10, marginTop: 6 }}>{polling ? `Poll #${pollCount} en cours...` : 'Validation MTN MoMo'}</div>
            </div>
          )}

          {/* SUCCESS */}
          {screen === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#0A3A0A', border: '2px solid #1A7A40', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11.5l4.5 4.5 8-8" stroke="#1A7A40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ color: '#22C55E', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>PAIEMENT RÉUSSI</div>
              <div style={{ color: '#22C55E', fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 700 }}>{amount ? fmtXAF(amount) : ''}</div>
              <div style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 9, marginTop: 8 }}>débités sur votre compte MTN MoMo</div>
              <div style={{ marginTop: 12, background: '#FFD700', color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 2, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>MTN MoMo</div>
            </div>
          )}

          {/* FAILED / CANCELLED */}
          {(screen === 'failed' || screen === 'cancelled') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#3A0A0A', border: '2px solid #C02020', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6l10 10M16 6L6 16" stroke="#C02020" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ color: '#EF4444', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{screen === 'cancelled' ? 'TRANSACTION ANNULÉE' : 'PAIEMENT ÉCHOUÉ'}</div>
              <div style={{ color: '#666', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{screen === 'cancelled' ? "Vous avez refusé le paiement" : 'Une erreur est survenue'}</div>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div style={{ background: '#111', padding: 8, borderRadius: '0 0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
          {['1','2','3','4','5','6','7','8','9'].map(k => <button key={k} onClick={() => dialKey(k)} style={ks()}>{k}</button>)}
          <button onClick={handleDel} style={ks({ background: '#3A2A1A', color: '#F59E0B', fontSize: 11 })}>⌫</button>
          <button onClick={() => dialKey('0')} style={ks()}>0</button>
          <button onClick={screen === 'ussd' ? handleConfirm : onReset} style={ks({ background: screen === 'ussd' ? '#0A3A0A' : '#1A1A1A', color: screen === 'ussd' ? '#22C55E' : '#555', fontSize: 11 })}>OK</button>
          <button onClick={screen === 'ussd' ? onCancel : onReset} style={ks({ background: '#3A0A0A', color: '#EF4444', gridColumn: '1 / span 2' })}>✕</button>
          <button style={ks({ background: '#0A1A3A', color: '#3B82F6', fontSize: 11 })}>#</button>
        </div>
        <div style={{ width: 36, height: 6, background: '#333', borderRadius: 3, margin: '8px auto 2px' }} />
      </div>

      <p className="text-center text-[11px] text-[var(--text-3)] max-w-[220px] leading-relaxed">
        {screen === 'idle'       && "Initiez un paiement pour recevoir le prompt USSD"}
        {screen === 'ussd'       && "Entrez le PIN (ex: 1234) puis OK pour confirmer, ✕ pour refuser"}
        {screen === 'processing' && (polling ? `Poll #${pollCount}/12 — vérification toutes les 5s` : 'Validation MTN MoMo' )}
        {screen === 'success'    && "Paiement confirmé. Webhook payment.completed déclenché."}
        {(screen === 'failed' || screen === 'cancelled') && "Transaction terminée. OK ou ✕ pour réinitialiser."}
      </p>
    </div>
  )
}

function SimResultCard({ result }: { result: TxResult | null }) {
  if (!result) return null
  const ok = isSuccessfulPaymentStatus(result.status)
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Résultat de la transaction</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--red-bg)] text-[var(--red)]'}`}>{ok ? 'Succès' : 'Échec'}</span>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
        {([
          ['Transaction ID', <span className="font-mono text-[11px] break-all">{result.txId}</span>],
          ['Statut final',   <span className={`font-bold ${ok ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{result.status}</span>],
          ['Provider ref.',  <span className="font-mono text-[11px]">{result.providerRef || '—'}</span>],
          ['Montant',        fmtXAF(result.amount)],
          ['Durée totale',   `${result.duration}ms`],
        ] as [string, React.ReactNode][]).map(([k, v]) => (
          <div key={k as string} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">{k}</span>
            <span className="text-[12px] text-[var(--text-1)] text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SIM_SCENARIOS = [
  { value: 'success', label: 'Succès attendu',  sub: 'MockAdapter → SUCCESSFUL' },
  { value: 'failure', label: 'Échec attendu',   sub: 'MockAdapter → FAILED' },
  { value: 'timeout', label: 'Timeout (60s)',   sub: "Absence de réponse" },
] as const

function SimulatorTab() {
  const { user } = useAuth()
  const dxActor = { userId: user.id, userName: user.name, role: user.role, merchantId: user.merchantId }
  const [state,     setState]     = useState<SimState>('idle')
  const [form,      setForm]      = useState<PaymentForm>({ amount: 5000, phone: '237677123456', name: 'Jean Dupont', ref: 'TEST_SIM_001', description: 'Paiement test ST Pay', scenario: 'success' })
  const [txId,      setTxId]      = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [logs,      setLogs]      = useState<LogEntry[]>([{ time: '--:--:--', message: 'Simulateur prêt — configurez et initiez un paiement.', type: 'info' }])
  const [result,    setResult]    = useState<TxResult | null>(null)
  const [apiError,  setApiError]  = useState<ApiErrorDetails | null>(null)
  const [polling,   setPolling]   = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
    document.head.appendChild(s)
    return () => document.head.removeChild(s)
  }, [])

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { time: nowTime(), message, type }])
  }, [])

  const step: 1 | 2 | 3 = state === 'idle' || state === 'initiating' ? 1 : state === 'waiting_phone' ? 2 : 3

  const phoneScreen: PhoneScreen =
    state === 'idle' || state === 'initiating' ? 'idle'
    : state === 'waiting_phone' ? 'ussd'
    : state === 'confirming'    ? 'processing'
    : state === 'success'       ? 'success'
    : state === 'failed'        ? 'failed'
    : state === 'cancelled'     ? 'cancelled'
    : 'idle'

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }; setPolling(false) }

  const startPolling = (tid: string) => {
    let count = 0; setPolling(true); setPollCount(0)
    pollRef.current = setInterval(async () => {
      count++; setPollCount(count)
      addLog(`Poll #${count} — GET /api/Payment/${tid.slice(-8)}...`, 'info')
      try {
        const res = await client.get(`/api/Payment/${tid}`)
        const st = normalizePaymentStatus(res.data.status || res.data.Status)
        addLog(`Statut reçu: ${st}`, isSuccessfulPaymentStatus(st) ? 'ok' : 'info')
        if (isSuccessfulPaymentStatus(st)) {
          stopPolling(); setState('success')
          recordDxFirstSuccessPayment(dxActor)
          setResult({ txId: tid, providerRef: res.data.providerReference, status: st, amount: form.amount, duration: Date.now() - startedAt })
          addLog('Webhook payment.completed déclenché', 'ok'); addLog('Transaction terminée avec succès !', 'ok')
          toast.success('Paiement confirmé !')
        } else if (isFailedPaymentStatus(st)) {
          stopPolling(); setState('failed')
          setResult({ txId: tid, status: st, amount: form.amount, duration: Date.now() - startedAt })
          addLog('Webhook payment.failed déclenché', 'err'); toast.error('Transaction échouée')
        } else if (count >= PAYMENT_POLL_MAX_ATTEMPTS) {
          stopPolling(); setState('timeout')
          addLog('Timeout — 60s sans réponse définitive', 'warn')
          toast('Timeout de la simulation', { icon: '⏱' })
        }
      } catch (e: unknown) {
        const err = e as ApiClientError
        addLog(`Erreur polling: ${err?.message || String(e)}`, 'err')

        if (err?.status === 403) {
          stopPolling()
          setState('failed')

          const detailedError = buildApiError({
            message: err.message,
            status: err.status,
            body: err.data,
            url: err.url,
          })

          setApiError(detailedError)
          addLog('Acces refuse sur le statut de paiement (403).', 'err')
          addLog('La transaction n appartient probablement pas au marchand authentifie.', 'warn')
          toast.error('403: acces refuse au statut de cette transaction')
        }
      }
    }, PAYMENT_POLL_INTERVAL_MS)
  }

  const initMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPaymentInitiationPayload({
        amount: form.amount,
        currency: 'XAF',
        provider: 'MTN',
        customer: { phoneNumber: form.phone, name: form.name, email: 'test@stpay.local' },
        merchant: { reference: form.ref, callbackUrl: `${window.location.origin}/callback`, name: 'ST Pay Simulator' },
        description: form.description,
        metadata: { simulatorMode: true, scenario: form.scenario },
      })
      const res = await client.post('/api/Payment', payload)
      return res.data as { transactionId?: string; id?: string; providerReference?: string }
    },
    onMutate: () => {
      setApiError(null)
      setState('initiating'); setStartedAt(Date.now())
      addLog(`Initiation paiement — ${fmtXAF(form.amount)} → ${form.phone}`, 'info')
      addLog('POST /api/Payment — provider: MTN (mock si active cote backend)', 'info')
    },
    onSuccess: (data) => {
      const id = data.transactionId || data.id || `SIM-${Date.now()}`
      setTxId(id); addLog(`Transaction créée: ${id}`, 'ok')
      addLog('Statut initial: PENDING', 'warn')
      addLog(`Prompt USSD envoyé au ${form.phone} — Vérifiez le téléphone →`, 'ok')
      setState('waiting_phone')
    },
    onError: (e: Error) => {
      const detailedError = buildApiError({
        message: e.message,
        status: (e as ApiClientError).status,
        body: (e as ApiClientError).data,
        url: (e as ApiClientError).url,
      })
      setApiError(detailedError)
      addLog(`Erreur API: ${detailedError.message}`, 'err')
      if (detailedError.hint) {
        addLog(detailedError.hint, 'warn')
      }
      setState('idle'); toast.error(detailedError.message)
    },
  })

  const handleConfirm = (pin: string) => {
    if (!txId) return
    addLog(`PIN saisi (${pin.length} chiffres) — Confirmation envoyée`, 'ok')
    addLog('Démarrage polling statut (toutes les 5s, max 60s)', 'info')
    setState('confirming'); startPolling(txId)
  }

  const handleCancel = () => {
    addLog("Paiement refusé par l'utilisateur", 'err')
    stopPolling(); setState('cancelled')
    if (txId) setResult({ txId, status: 'CANCELLED', amount: form.amount, duration: Date.now() - startedAt })
    toast.error('Paiement annulé')
  }

  const handleReset = () => {
    stopPolling(); setState('idle'); setTxId(null); setResult(null); setPollCount(0)
    setLogs([{ time: nowTime(), message: 'Simulateur réinitialisé.', type: 'info' }])
  }

  const canInitiate = state === 'idle'

  return (
    <div className="space-y-4">
      <SimStepBar current={step} />

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Configurer le paiement test</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber-border)]">MTN MoMo TEST</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Montant (XAF)', key: 'amount', type: 'number', ph: '5000' },
                  { label: 'Numéro simulé', key: 'phone',  type: 'text',   ph: '237677123456' },
                  { label: 'Nom client',    key: 'name',   type: 'text',   ph: 'Jean Dupont' },
                  { label: 'Référence',     key: 'ref',    type: 'text',   ph: 'TEST_001' },
                ].map(({ label, key, type, ph }) => (
                  <div key={key}>
                    <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">{label}</label>
                    <input type={type} placeholder={ph} disabled={!canInitiate}
                           value={form[key as keyof PaymentForm] as string}
                           onChange={e => canInitiate && setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                           className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[13px] bg-white text-[var(--text-1)] outline-none transition focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">Description</label>
                <input type="text" disabled={!canInitiate} value={form.description}
                       onChange={e => canInitiate && setForm(f => ({ ...f, description: e.target.value }))}
                       className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[13px] bg-white text-[var(--text-1)] outline-none transition focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]" />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold text-[var(--text-2)]">Scénario MockAdapter</p>
                <div className="grid grid-cols-3 gap-2">
                  {SIM_SCENARIOS.map(({ value, label, sub }) => (
                    <label key={value}
                           className={`flex flex-col gap-0.5 p-2.5 rounded-[6px] border cursor-pointer transition-all text-left ${!canInitiate ? 'opacity-50 cursor-not-allowed' : ''} ${form.scenario === value ? value === 'success' ? 'border-[var(--green-border)] bg-[var(--green-bg)]' : value === 'failure' ? 'border-[var(--red-border)] bg-[var(--red-bg)]' : 'border-[var(--amber-border)] bg-[var(--amber-bg)]' : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'}`}>
                      <input type="radio" className="sr-only" value={value} disabled={!canInitiate}
                             checked={form.scenario === value}
                             onChange={() => canInitiate && setForm(f => ({ ...f, scenario: value }))} />
                      <span className={`text-[11px] font-bold ${form.scenario === value ? value === 'success' ? 'text-[var(--green)]' : value === 'failure' ? 'text-[var(--red)]' : 'text-[var(--amber)]' : 'text-[var(--text-1)]'}`}>{label}</span>
                      <span className="text-[10px] text-[var(--text-3)]">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[var(--orange-bg)] rounded-[6px] border border-[var(--orange-border)]">
                <p className="text-[11px] font-bold text-[var(--orange-dark)] mb-1">Mode simulateur actif</p>
                <p className="text-[10px] text-[var(--text-2)]">
                  Appel reel vers <code className="font-mono">POST /api/Payment</code> avec provider MTN.
                  Si le mode mock backend est actif pour MTN, la reponse reste simulee tout en respectant la validation API.
                </p>
              </div>

              {apiError && (
                <div className="p-3 bg-[var(--red-bg)] rounded-[6px] border border-[var(--red-border)] space-y-2">
                  <p className="text-[11px] font-bold text-[var(--red)]">Erreur API détaillée</p>
                  <p className="text-[11px] text-[var(--text-2)]">{apiError.message}</p>
                  {apiError.hint && <p className="text-[10px] text-[var(--text-3)]">{apiError.hint}</p>}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[var(--text-3)]">
                    {typeof apiError.status === 'number' && <span>HTTP {apiError.status}</span>}
                    {apiError.url && <span>{apiError.url}</span>}
                  </div>
                  {typeof apiError.body !== 'undefined' && apiError.body !== null && (
                    <pre className="overflow-auto rounded-[6px] border border-[var(--red-border)] bg-white p-3 text-[10px] font-mono text-[var(--text-1)] max-h-44">{JSON.stringify(apiError.body, null, 2)}</pre>
                  )}
                </div>
              )}

              {canInitiate ? (
                <button className="btn-primary w-full justify-center" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                  {initMutation.isPending
                    ? <span className="flex items-center gap-2"><svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin .8s linear infinite' }}><path d="M12 6.5A5.5 5.5 0 112 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>Envoi en cours…</span>
                    : '▶ Initier le paiement'}
                </button>
              ) : (
                <button className="btn-secondary w-full justify-center" onClick={handleReset}>↺ Réinitialiser le simulateur</button>
              )}
            </div>
          </div>

          <SimEventLog entries={logs} />
          <SimResultCard result={result} />
        </div>

        <div className="lg:sticky lg:top-4">
          <SimPhone
            screen={phoneScreen} txId={txId ?? undefined} amount={form.amount}
            ref_={form.ref} desc={form.description}
            onConfirm={handleConfirm} onCancel={handleCancel} onReset={handleReset}
            polling={polling} pollCount={pollCount}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Integration Checklist Sidebar ───────────────────────────────────────────

function IntegrationChecklistSidebar({
  items,
  onToggle,
  onReset,
}: {
  items: boolean[]
  onToggle: (i: number) => void
  onReset: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const done = items.filter(Boolean).length

  if (collapsed) {
    return (
      <div
        className="hidden lg:flex flex-col items-center justify-center py-4 cursor-pointer bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--r-md)] flex-shrink-0"
        style={{ width: 32 }}
        onClick={() => setCollapsed(false)}
        title="Développer la progression"
      >
        <span className="text-[9px] font-bold text-[var(--text-3)] tracking-widest select-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>PROGRESSION</span>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex flex-col gap-3 flex-shrink-0" style={{ width: 220 }}>
      <div className="panel h-fit">
        <div className="panel-header">
          <span className="panel-title text-[12px]">Progression</span>
          <button className="btn-ghost text-[10px] p-1" onClick={() => setCollapsed(true)} title="Réduire">◀</button>
        </div>
        <div className="p-3 space-y-3">
          <div className="relative pl-1">
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-[var(--orange)] opacity-20 rounded-full" />
            {CHECKLIST_LABELS.map((label, i) => (
              <div key={i} className="relative flex items-center gap-3 pl-6 py-1">
                <button
                  onClick={() => onToggle(i)}
                  className={`absolute left-0 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    items[i] ? 'bg-[var(--orange)] border-[var(--orange)]' : 'bg-white border-[var(--border-med)]'
                  }`}
                >
                  {items[i] && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <span className={`text-[11px] leading-tight ${items[i] ? 'text-[var(--text-3)] line-through' : 'text-[var(--text-2)]'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[var(--border-soft)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-3)]">{done}/{CHECKLIST_LABELS.length} complété{done !== 1 ? 's' : ''}</span>
            <button className="text-[11px] text-[var(--orange)] hover:underline" onClick={onReset}>Réinitialiser</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeveloperPortal() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('keys')
  const [checklistItems, setChecklistItems] = useState<boolean[]>(() => {
    try {
      const stored = localStorage.getItem('stpay_checklist')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length === 4) return parsed
      }
    } catch { /* ignore */ }
    return [false, false, false, false]
  })
  const [checklistOpen, setChecklistOpen] = useState(false)

  const toggleChecklist = (i: number) => {
    setChecklistItems((prev) => {
      const next = [...prev]
      next[i] = !next[i]
      localStorage.setItem('stpay_checklist', JSON.stringify(next))
      return next
    })
  }

  const resetChecklist = () => {
    const reset = [false, false, false, false]
    setChecklistItems(reset)
    localStorage.setItem('stpay_checklist', JSON.stringify(reset))
  }

  useEffect(() => {
    startDxSession({ userId: user.id, userName: user.name, role: user.role, merchantId: user.merchantId })
  }, [user.id, user.merchantId, user.name, user.role])

  const checklistDone = checklistItems.filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center gap-1 bg-[var(--border)] p-[3px] rounded-[var(--r-sm)] w-fit flex-wrap">
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-[12px] transition-colors font-medium ${activeTab === id ? 'bg-white text-[var(--text-1)] shadow-sm font-semibold' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
            <span className="opacity-70">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Mobile checklist pill */}
      <div className="lg:hidden flex items-center gap-2">
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--orange-border)] bg-[var(--orange-bg)] text-[11px] font-semibold text-[var(--orange-dark)]"
          onClick={() => setChecklistOpen(true)}
        >
          <span className="w-4 h-4 rounded-full bg-[var(--orange)] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{checklistDone}</span>
          {checklistDone}/4 étapes complétées
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'wizard'     && <WizardTab goToTab={setActiveTab} />}
          {activeTab === 'quickstart' && <QuickstartTab goToTab={setActiveTab} />}
          {activeTab === 'keys'       && <KeysTab />}
          {activeTab === 'playground' && <PlaygroundTab goToTab={setActiveTab} />}
          {activeTab === 'docs'       && <DocsTab />}
          {activeTab === 'escrow'     && <EscrowTab />}
          {activeTab === 'snippets'   && <SnippetsTab />}
          {activeTab === 'status'     && <StatusTab />}
          {activeTab === 'simulator'  && <SimulatorTab />}
        </div>
        <IntegrationChecklistSidebar items={checklistItems} onToggle={toggleChecklist} onReset={resetChecklist} />
      </div>

      {/* Mobile bottom sheet */}
      {checklistOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" onClick={() => setChecklistOpen(false)}>
          <div
            className="w-full bg-white rounded-t-[20px] border-t border-[var(--border)] p-5 space-y-4 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-[14px] text-[var(--text-1)]">Progression d'intégration</p>
              <button className="btn-ghost text-[12px]" onClick={() => setChecklistOpen(false)}>✕</button>
            </div>
            <div className="space-y-3">
              {CHECKLIST_LABELS.map((label, i) => (
                <button key={i} onClick={() => toggleChecklist(i)}
                        className="w-full flex items-center gap-3 p-3 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-left">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checklistItems[i] ? 'bg-[var(--orange)] border-[var(--orange)]' : 'bg-white border-[var(--border-med)]'}`}>
                    {checklistItems[i] && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-[12px] ${checklistItems[i] ? 'text-[var(--text-3)] line-through' : 'text-[var(--text-1)]'}`}>{label}</span>
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-[var(--border-soft)] flex justify-end">
              <button className="text-[12px] text-[var(--orange)] hover:underline" onClick={resetChecklist}>Réinitialiser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
