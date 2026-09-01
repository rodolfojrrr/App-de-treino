import TreinoPremium from './premium-shared/index.jsx';
import { mobileRepository } from './services/repository';
import { initNativeLifecycle, nativeBridge } from './services/nativeBridge';

initNativeLifecycle();

export default function App() {
  return <TreinoPremium repository={mobileRepository} nativeBridge={nativeBridge} platform='mobile' />;
}
