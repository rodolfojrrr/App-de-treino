import TreinoPremium from './premium-shared/index.jsx';
import { desktopRepository } from './services/repository';

const nativeBridge = {
  saveBackup(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return true;
  }
};

export default function App() {
  return <TreinoPremium repository={desktopRepository} nativeBridge={nativeBridge} platform='desktop' />;
}
