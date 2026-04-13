import React, { useState } from 'react'
import { SafeAreaView, View, Text, TextInput, Button, ScrollView } from 'react-native'

const STPAY_BASE_URL = 'http://localhost:5169'
const STPAY_API_KEY = 'sk_test_replace_me'

export default function App() {
  const [amount, setAmount] = useState('5000')
  const [provider, setProvider] = useState('MTN')
  const [result, setResult] = useState('Ready.')

  async function createPayment() {
    setResult('Creating payment...')
    const res = await fetch(`${STPAY_BASE_URL}/api/Payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': STPAY_API_KEY,
      },
      body: JSON.stringify({
        amount: Number(amount),
        currency: 'XAF',
        provider,
        customer: { phoneNumber: '237677123456', name: 'RN User', email: 'rn@example.com' },
        merchant: { reference: `RN_${Date.now()}`, callbackUrl: 'https://example.com/callback', name: 'RN Starter' },
        description: 'ST Pay React Native starter payment',
      }),
    })

    const text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
    setResult(text)
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>ST Pay React Native Starter</Text>
        <Text>Amount</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
        <Text>Provider (MTN/ORANGE/MOOV/WAVE)</Text>
        <TextInput value={provider} onChangeText={setProvider} style={{ borderWidth: 1, padding: 8, borderRadius: 8 }} />
        <Button title="Create Payment" onPress={() => createPayment().catch((e) => setResult(String(e.message || e)))} />
        <View style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}>
          <Text selectable>{result}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
