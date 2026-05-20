import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LogtoProvider } from '@logto/react'
import App from './App'
import { logtoConfig } from './lib/logto'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogtoProvider config={logtoConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LogtoProvider>
  </StrictMode>,
)
