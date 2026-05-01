// src/components/DeveloperGuideReference.tsx
// Guide de référence complet ST Pay — extrait de DeveloperPortal pour réduire la taille du fichier.

import React from 'react'
import CodeSnippet from './ui/CodeSnippet'
import InlineCode from './ui/InlineCode'

// ─── Snippets ─────────────────────────────────────────────────────────────────

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

// ─── Data ─────────────────────────────────────────────────────────────────────

const DEVELOPER_GUIDE_OVERVIEW = [
  {
    title: '1. Choisir le bon portail',
    content: (
      <>
        Un <strong>marchand</strong> utilise sa clé API pour les paiements. Un <strong>super admin</strong> utilise un token Bearer pour les endpoints admin.
      </>
    ),
  },
  {
    title: '2. Authentification',
    content: (
      <>
        Routes marchand: header <InlineCode>X-Api-Key</InlineCode>. Routes admin: header <InlineCode>Authorization: Bearer ...</InlineCode>.
      </>
    ),
  },
  {
    title: '3. Tester progressivement',
    content: (
      <>
        Validez d'abord <InlineCode>GET /api/Payment/health</InlineCode>, puis un profil marchand, puis un vrai paiement.
      </>
    ),
  },
]

const DEVELOPER_GUIDE_RECOMMENDED_FLOW = [
  "Connectez-vous comme marchand et récupérez une clé API dans l'onglet Clés API.",
  'Appelez POST /api/Payment avec un montant, un provider et les informations client.',
  'Récupérez le transactionId retourné par l\'API.',
  'Interrogez GET /api/Payment/{paymentId} jusqu\'à obtenir un statut final.',
  'Si besoin, remboursez via POST /api/Payment/{paymentId}/refund.',
]

const DEVELOPER_GUIDE_EXAMPLES = [
  { key: 'curl-payment', title: 'Exemple cURL minimal' },
  { key: 'js-payment', title: 'Exemple JavaScript simple' },
  { key: 'dotnet-payment', title: 'Exemple .NET (HttpClient)' },
  { key: 'java-payment', title: 'Exemple Java (HttpClient)' },
  { key: 'polling-status', title: 'Exemple de polling du statut', fullWidth: true },
] as const

const DEVELOPER_GUIDE_ERROR_ROWS = [
  ['400', 'Payload invalide, provider incorrect, champ manquant', 'Vérifier le JSON envoyé et les noms de champs'],
  ['401', "Header d'auth manquant ou invalide", 'Vérifier X-Api-Key ou Bearer token'],
  ['403', 'Bon login, mauvais rôle ou mauvais portail', 'Utiliser le portail correspondant au compte'],
  ['500', 'Erreur serveur', 'Consulter les logs backend et re-tester avec un payload minimal'],
] as const

const DEVELOPER_GUIDE_BEST_PRACTICES = [
  'Commencez toujours avec un payload minimal qui marche, puis ajoutez les options une par une.',
  'Logguez la requête envoyée et la réponse reçue pendant vos tests.',
  'Ne mettez jamais une clé sk_live_ dans votre code frontend public.',
  'Conservez le transactionId dès sa création: il sert à suivre tout le cycle du paiement.',
  "Quand vous voyez un 403, demandez-vous d'abord: suis-je sur le bon portail avec le bon type d'auth ?",
]

const DEVELOPER_GUIDE_GLOSSARY = [
  { term: 'Payload', def: "le contenu JSON que vous envoyez dans le body d'une requête." },
  { term: 'Bearer token', def: 'jeton de connexion envoyé dans le header Authorization pour les routes admin.' },
  { term: 'API key', def: "clé marchande envoyée dans le header X-Api-Key pour prouver l'identité du marchand." },
  { term: 'Polling', def: 'technique qui consiste à réinterroger régulièrement une route pour suivre un statut.' },
  { term: 'Webhook', def: 'appel HTTP envoyé automatiquement par le backend vers votre système quand un événement se produit.' },
  { term: 'Provider', def: 'opérateur ou canal de paiement utilisé, par exemple MTN ou ORANGE.' },
  { term: 'transactionId', def: "identifiant unique d'un paiement. Gardez-le toujours pour suivre le paiement ou le rembourser." },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeveloperGuideReference() {
  return (
    <section className="grid gap-4 leading-[1.65] text-[var(--text-1)]">
      <div className="rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] p-4">
        <h3 className="mb-2 text-[18px] font-extrabold text-[#9a3412]">Guide complet ST Pay</h3>
        <p className="text-[13px] text-[#7c2d12]">
          Cette documentation explique <strong>quoi envoyer</strong>, <strong>dans quel ordre</strong>, <strong>quel header utiliser</strong> et <strong>comment lire la réponse</strong>. Si vous débutez, commencez par le parcours "Premier paiement" ci-dessous.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {DEVELOPER_GUIDE_OVERVIEW.map((item) => (
          <div key={item.title} className="rounded-[12px] border border-[var(--border)] bg-white p-3.5">
            <h4 className="mb-1.5 text-[14px] font-extrabold text-[var(--text-1)]">{item.title}</h4>
            <p className="text-[13px] text-[var(--text-2)]">{item.content}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[12px] border border-[#dbeafe] bg-[#eff6ff] p-4">
        <h4 className="mb-2.5 text-[16px] font-extrabold text-[#1d4ed8]">Premier paiement: parcours recommandé</h4>
        <ol className="grid gap-2 pl-5 text-[13px] text-[#1e3a8a]">
          {DEVELOPER_GUIDE_RECOMMENDED_FLOW.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {DEVELOPER_GUIDE_EXAMPLES.filter((item) => !item.fullWidth).map((item) => (
          <div key={item.key} className="rounded-[12px] border border-[var(--border)] bg-white p-4">
            <h4 className="mb-2.5 text-[15px] font-extrabold text-[var(--text-1)]">{item.title}</h4>
            <CodeSnippet title={item.title} code={DEVELOPER_GUIDE_COPY_SNIPPETS[item.key]} preClassName="text-[12px] whitespace-pre" />
          </div>
        ))}
      </div>

      {DEVELOPER_GUIDE_EXAMPLES.filter((item) => item.fullWidth).map((item) => (
        <div key={item.key} className="rounded-[12px] border border-[var(--border)] bg-white p-4">
          <h4 className="mb-2.5 text-[15px] font-extrabold text-[var(--text-1)]">{item.title}</h4>
          <CodeSnippet title={item.title} code={DEVELOPER_GUIDE_COPY_SNIPPETS[item.key]} preClassName="text-[12px] whitespace-pre" />
        </div>
      ))}

      <div className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] p-4">
        <h4 className="mb-2.5 text-[15px] font-extrabold text-[#b91c1c]">Erreurs fréquentes et interprétation</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[#fca5a5] px-2 py-2 text-left">Code</th>
                <th className="border-b border-[#fca5a5] px-2 py-2 text-left">Cause probable</th>
                <th className="border-b border-[#fca5a5] px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {DEVELOPER_GUIDE_ERROR_ROWS.map(([code, cause, action], index) => (
                <tr key={code}>
                  <td className={`px-2 py-2 ${index < DEVELOPER_GUIDE_ERROR_ROWS.length - 1 ? 'border-b border-[#fee2e2]' : ''}`}><strong>{code}</strong></td>
                  <td className={`px-2 py-2 ${index < DEVELOPER_GUIDE_ERROR_ROWS.length - 1 ? 'border-b border-[#fee2e2]' : ''}`}>{cause}</td>
                  <td className={`px-2 py-2 ${index < DEVELOPER_GUIDE_ERROR_ROWS.length - 1 ? 'border-b border-[#fee2e2]' : ''}`}>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--border)] bg-white p-4">
        <h4 className="mb-2.5 text-[15px] font-extrabold text-[var(--text-1)]">Bonnes pratiques</h4>
        <ul className="grid gap-2 pl-5 text-[13px] text-[var(--text-2)]">
          {DEVELOPER_GUIDE_BEST_PRACTICES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-[12px] border border-[#ddd6fe] bg-[#f5f3ff] p-4">
        <h4 className="mb-2.5 text-[15px] font-extrabold text-[#5b21b6]">Glossaire express</h4>
        <div className="grid gap-2.5 text-[13px] text-[#4c1d95]">
          {DEVELOPER_GUIDE_GLOSSARY.map((item) => (
            <div key={item.term}><strong>{item.term}</strong>: {item.def}</div>
          ))}
        </div>
      </div>
    </section>
  )
}
