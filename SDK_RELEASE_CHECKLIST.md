# ST Pay SDK - Checklist de publication (Web + React Native)

Cette checklist sert a publier un SDK JavaScript stable pour Web et React Native.

## 1. Contrat API

- [ ] Spec OpenAPI a jour (`stpay-api.json` / swagger)
- [ ] Endpoints critiques verifies: auth, payment create, payment status, webhooks list
- [ ] Erreurs API normalisees (message, code, details)

## 2. Generation SDK

- [ ] Regeneration SDK sans erreur (`npm run generate-api`)
- [ ] Verification des fichiers dans `src/api/`
- [ ] Pas de breaking change non documente

## 3. Compatibilite Web + RN

- [ ] Build web OK (`npm run build`)
- [ ] Exemple React Native teste (fetch + headers)
- [ ] Aucun usage Node-only non polyfillable dans le coeur SDK
- [ ] Timeout/retry documentes

## 4. API de surface stable

- [ ] Exports publics confirms dans `src/api/index.ts`
- [ ] Noms de fonctions coherents
- [ ] Types principaux documentes
- [ ] Versionning semantique prepare (major/minor/patch)

## 5. Qualite et tests

- [ ] Lint/Typecheck passes
- [ ] Scenarios happy-path testes
- [ ] Scenarios d'erreur testes (400/401/403/500)
- [ ] Validation payload minimale couverte

## 6. Documentation release

- [ ] Guide principal SDK a jour: [SDK_README.md](SDK_README.md)
- [ ] Guide erreurs mobile a jour: [MOBILE_INTEGRATION_ERRORS.md](MOBILE_INTEGRATION_ERRORS.md)
- [ ] Snippets web + RN verifies
- [ ] Changelog de release prepare

## 7. Securite

- [ ] Aucun secret hardcode dans exemples/docs
- [ ] Recommandation storage securise des cles API
- [ ] Distinction claire entre `sk_test_` et `sk_live_`

## 8. Go/No-Go

- [ ] Time-to-first-payment < 15 min valide en test interne
- [ ] Integration Postman minimale reussie
- [ ] Aucune regression bloqueante frontend
- [ ] Validation finale par responsable technique
