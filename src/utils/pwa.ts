// PWA utility functions
import { Workbox } from 'workbox-window';
import { useState, useEffect } from 'react';

// PWA installation prompt
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA installation state
export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
}

// Global variables for PWA state
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installState: PWAInstallState = {
  isInstallable: false,
  isInstalled: false,
  isStandalone: false,
  canInstall: false
};

// Check if app is running in standalone mode
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Check if app is installed
export const isInstalled = (): boolean => {
  return isStandalone() || 
         window.matchMedia('(display-mode: minimal-ui)').matches;
};

// Initialize PWA
export const initializePWA = async (): Promise<void> => {
  try {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
      // Initialize Workbox
      const wb = new Workbox('/sw.js');
      
      // Register service worker
      await wb.register();
      
      // Listen for updates
      wb.addEventListener('controlling', () => {
      });
      
      // Listen for waiting
      wb.addEventListener('waiting', () => {
        // Show update notification to user
        showUpdateNotification();
      });
      
      // Listen for activated
      wb.addEventListener('activated', () => {
      });
    }
    
    // Listen for beforeinstallprompt event
    // 只在生产环境且应用未安装时才阻止默认提示，以便使用自定义安装提示
    // 在开发环境中，允许浏览器显示默认提示，避免警告
    window.addEventListener('beforeinstallprompt', (e) => {
      // 在开发环境中，不阻止默认提示，允许浏览器显示默认的安装提示
      if (import.meta.env.DEV) {
        // 开发环境：只保存状态，不阻止默认提示
        deferredPrompt = e as BeforeInstallPromptEvent;
        installState.isInstallable = true;
        installState.canInstall = true;
        // 不调用 preventDefault()，允许浏览器显示默认提示
        return;
      }
      
      // 生产环境：检查应用是否已在 standalone 模式下运行
      const alreadyInstalled = isStandalone() || isInstalled();
      
      if (!alreadyInstalled) {
        // 应用未安装，阻止默认提示以便使用自定义提示
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        installState.isInstallable = true;
        installState.canInstall = true;
      } else {
        // 应用已安装，不需要阻止默认提示
        installState.isInstalled = true;
        installState.canInstall = false;
      }
    });
    
    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      installState.isInstalled = true;
      installState.canInstall = false;
      deferredPrompt = null;
    });
    
    // Update install state
    installState.isInstalled = isInstalled();
    installState.isStandalone = isStandalone();
  } catch (error) {
    // 静默处理错误
  }
};

// Show install prompt
export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    return false;
  }
  
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installState.isInstalled = true;
      installState.canInstall = false;
      deferredPrompt = null;
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

// Get install state
export const getInstallState = (): PWAInstallState => {
  return { ...installState };
};

// Show update notification
export const showUpdateNotification = (): void => {
  // This would typically show a toast notification or modal
  // You can integrate this with your UI notification system
  if (confirm('新版本可用！是否立即更新？')) {
    window.location.reload();
  }
};

// Check for updates
export const checkForUpdates = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      // 静默处理错误
    }
  }
};

// Unregister service worker (for development)
export const unregisterServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
  } catch (error) {
    // 静默处理错误
  }
  }
};

// Get device info for PWA
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isStandalone: isStandalone(),
    isInstalled: isInstalled()
  };
};

// PWA installation hook for React

export const usePWA = () => {
  const [installState, setInstallState] = useState(getInstallState());
  
  useEffect(() => {
    const updateState = () => {
      setInstallState(getInstallState());
    };
    
    // Listen for state changes
    window.addEventListener('beforeinstallprompt', updateState);
    window.addEventListener('appinstalled', updateState);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', updateState);
      window.removeEventListener('appinstalled', updateState);
    };
  }, []);
  
  return {
    ...installState,
    showInstallPrompt,
    checkForUpdates,
    getDeviceInfo
  };
};
