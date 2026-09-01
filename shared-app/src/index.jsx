import React from 'react';
import PremiumApp from './premium/PremiumApp';
import { EngineProvider } from './lib/engine';
import './styles.css';

export default function TreinoPremium({ repository, nativeBridge = {}, platform = 'mobile' }) {
  return (
    <EngineProvider repository={repository} nativeBridge={nativeBridge} platform={platform}>
      <PremiumApp />
    </EngineProvider>
  );
}
