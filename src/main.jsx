import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const pathname = window.location.pathname || '/'
const hasHashRoute = window.location.hash && window.location.hash.startsWith('#/')

if (pathname !== '/' && !hasHashRoute) {
  const redirected = `/#${pathname}${window.location.search || ''}`
  window.history.replaceState(null, '', redirected)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
