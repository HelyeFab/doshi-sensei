import { useEffect, useRef } from 'react'
import { useToast } from '@/hooks/useToast'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWANotifications() {
  const { toast } = useToast()
  const wasOffline = useRef(false)
  const hasShownInstallPrompt = useRef(false)

  useEffect(() => {
    // Connection status notifications
    const handleOnline = () => {
      if (wasOffline.current) {
        toast.success(
          'Connection Restored',
          "You're back online"
        )
      }
      wasOffline.current = false
    }

    const handleOffline = () => {
      wasOffline.current = true
      toast.warning(
        'Connection Lost',
        'You are now offline. Some features may be limited.'
      )
    }

    // PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      if (!hasShownInstallPrompt.current) {
        hasShownInstallPrompt.current = true
        toast.info(
          'Install App',
          'Add Doshi Sensei to your home screen for a better experience'
        )
      }
    }

    // PWA installation success
    const handleAppInstalled = () => {
      toast.success(
        'App Installed',
        'Doshi Sensei has been added to your device'
      )
    }

    // Service Worker updates
    const handleServiceWorkerUpdate = () => {
      toast.info(
        'Update Available',
        'A new version is available. Refresh to update.'
      )
    }

    // Network connection changes
    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        const effectiveType = connection?.effectiveType
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          toast.warning(
            'Slow Connection',
            'Your connection is slow. Some features may load slowly.'
          )
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
  }, [toast])

  // Manual notification functions
  const notifyInstallAvailable = () => {
    toast.info(
      'Install Available',
      'Click the install button to add this app to your device'
    )
  }

  const notifyUpdateInstalled = () => {
    toast.success(
      'Update Installed',
      'The app has been updated to the latest version'
    )
  }

  const notifyCacheCleared = () => {
    toast.success(
      'Cache Cleared',
      'All cached data has been removed'
    )
  }

  const notifyNotificationEnabled = () => {
    toast.success(
      'Notifications Enabled',
      'You will now receive push notifications'
    )
  }

  return {
    notifyInstallAvailable,
    notifyUpdateInstalled,
    notifyCacheCleared,
    notifyNotificationEnabled
  }
}