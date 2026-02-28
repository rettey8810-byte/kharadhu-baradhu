import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  return {
    canInstall: !!deferredPrompt && !isInstalled && !isDismissed,
    isInstalled,
    isDismissed,
    isIOS,
    isStandalone,
    install,
    dismiss
  };
}

export function PWAInstallButton() {
  const { canInstall, isInstalled, isDismissed, isIOS, isStandalone, install, dismiss } = usePWAInstall();

  if (isInstalled || isStandalone || isDismissed) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      await install();
      return;
    }

    if (isIOS) {
      window.alert('To install: tap the Share button in Safari, then choose "Add to Home Screen".');
      return;
    }

    window.alert('To install: open your browser menu and choose "Install app" or "Add to Home screen".');
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Download size={24} className="text-white" />
          </div>
          <div>
            <p className="font-semibold">Install Kharadhu Baradhu</p>
            <p className="text-emerald-100 text-sm">Add to home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-colors"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
