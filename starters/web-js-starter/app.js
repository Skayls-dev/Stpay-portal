const CONFIG = {
  baseUrl: 'http://localhost:5169',
  apiKey: 'sk_test_replace_me',
}

const output = document.getElementById('output')
const payBtn = document.getElementById('payBtn')

function log(value) {
  output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

async function createPayment() {
  const amount = Number(document.getElementById('amount').value)
  const provider = document.getElementById('provider').value

  const response = await fetch(`${CONFIG.baseUrl}/api/Payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': CONFIG.apiKey,
    },
    body: JSON.stringify({
      amount,
      currency: 'XAF',
      provider,
      customer: { phoneNumber: '237677123456', name: 'Web User', email: 'web@example.com' },
      merchant: { reference: `WEB_${Date.now()}`, callbackUrl: 'https://example.com/callback', name: 'Web Starter' },
      description: 'ST Pay Web starter payment',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  return response.json()
}

payBtn.addEventListener('click', async () => {
  try {
    log('Creating payment...')
    const payment = await createPayment()
    log(payment)
  } catch (error) {
    log(String(error?.message || error))
  }
})
