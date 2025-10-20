import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { NavigationProvider } from './context/NavigationContext'
import './index.css'
import App from './App.tsx'

function PreloadAssets() {
  useEffect(() => {
    const images = [
      '/images/map.svg',
      '/images/congress.jpg',
      '/images/portrait.png',
      '/images/hand.gif',
    ];
    images.forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider>
      <PreloadAssets />
      <App />
    </NavigationProvider>
  </StrictMode>,
)
