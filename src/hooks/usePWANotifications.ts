import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/toast'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWANotifications() {
  const { showToast } = useToast()
  const wasOffline = useRef(false)
  const hasShownInstallPrompt = useRef(false)

  useEffect(() => {
    // Connection status notifications
    const handleOnline = () => {
      if (wasOffline.current) {
        showToast({
          type: 'connection',
          title: 'Connection Restored',
          description: "You're back online",
          duration: 4000
        })
      }
      wasOffline.current = false
    }

    const handleOffline = () => {
      wasOffline.current = true
      showToast({
        type: 'warning',
        title: 'Connection Lost',
        description: 'You are now offline. Some features may be limited.',
        duration: 6000
      })
    }

    // PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      if (!hasShownInstallPrompt.current) {
        hasShownInstallPrompt.current = true
        showToast({
          type: 'info',
          title: 'Install App',
          description: 'Add Doshi Sensei to your home screen for a better experience',
          duration: 8000
        })
      }
    }

    // PWA installation success
    const handleAppInstalled = () => {
      showToast({
        type: 'success',
        title: 'App Installed',
        description: 'Doshi Sensei has been added to your device',
        duration: 5000
      })
    }

    // Service Worker updates
    const handleServiceWorkerUpdate = () => {
      showToast({
        type: 'info',
        title: 'Update Available',
        description: 'A new version is available. Refresh to update.',
        duration: 10000
      })
    }

    // Network connection changes
    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        const effectiveType = connection?.effectiveType
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          showToast({
            type: 'warning',
            title: 'Slow Connection',
            description: 'Your connection is slow. Some features may load slowly.',
            duration: 5000
          })
        }
      }
    }

    // Set initial offline state
    wasOffline.current = !navigator.onLine

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange)
    }

    // Service Worker registration and updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          handleServiceWorkerUpdate()
        }
      })

      // Check for existing service worker updates
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  handleServiceWorkerUpdate()
                }
              })
            }
          })
        }
      })
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [showToast])

  // Manual notification functions
  const notifyInstallAvailable = () => {
    showToast({
      type: 'info',
      title: 'Install Available',
      description: 'Click the install button to add this app to your device',
      duration: 6000
    })
  }

  const notifyUpdateInstalled = () => {
    showToast({
      type: 'success',
      title: 'Update Installed',
      description: 'The app has been updated to the latest version',
      duration: 4000
    })
  }

  const notifyCacheCleared = () => {
    showToast({
      type: 'success',
      title: 'Cache Cleared',
      description: 'All cached data has been removed',
      duration: 3000
    })
  }

  const notifyNotificationEnabled = () => {
    showToast({
      type: 'success',
      title: 'Notifications Enabled',
      description: 'You will now receive push notifications',
      duration: 4000
    })
  }

  return {
    notifyInstallAvailable,
    notifyUpdateInstalled,
    notifyCacheCleared,
    notifyNotificationEnabled
  }
}