import { useEffect } from 'react';
import { sendMetaCapiEvent } from '../lib/metaCapi';

export const PreloadAssets = () => {
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
};

export const MetaCapiSync = () => {
  useEffect(() => {
    sendMetaCapiEvent({ eventName: 'PageView' });
  }, []);
  return null;
};
