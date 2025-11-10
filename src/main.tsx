import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NavigationProvider } from './context/NavigationContext'
import './index.css'
import App from './App.tsx'
import { MetaCapiSync, PreloadAssets } from './components/AppBootHelpers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider>
      <PreloadAssets />
      <MetaCapiSync />
      <App />
    </NavigationProvider>
  </StrictMode>,
)
