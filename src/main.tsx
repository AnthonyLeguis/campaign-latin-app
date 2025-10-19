import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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
    // Preload CSS (ya se importa arriba)
  }, []);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PreloadAssets />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
