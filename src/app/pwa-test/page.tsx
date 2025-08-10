"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWATestPage() {
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<string>("");

  // Connection Status
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>("unknown");
  const [effectiveType, setEffectiveType] = useState<string>("unknown");

  // Service Worker Status
  const [swStatus, setSwStatus] = useState<string>("checking");
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // PWA Features Detection
  const [pwaFeatures, setPwaFeatures] = useState({
    serviceWorker: false,
    manifest: false,
    standalone: false,
    fullscreen: false,
    notifications: "default" as NotificationPermission,
    geolocation: false,
    camera: false,
    microphone: false,
  });

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Check connection info
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.type || "unknown");
      setEffectiveType(connection?.effectiveType || "unknown");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check PWA features
    checkPWAFeatures();

    // Set up event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      setInstallationStatus("Ready to install");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setInstallationStatus("App installed successfully");
    };

    const handleConnectionChange = () => {
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.type || "unknown");
        setEffectiveType(connection?.effectiveType || "unknown");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("connection" in navigator) {
      (navigator as any).connection?.addEventListener(
        "change",
        handleConnectionChange
      );
    }

    // Check service worker
    checkServiceWorker();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);

      if ("connection" in navigator) {
        (navigator as any).connection?.removeEventListener(
          "change",
          handleConnectionChange
        );
      }
    };
  }, []);

  const checkPWAFeatures = async () => {
    const features = {
      serviceWorker: "serviceWorker" in navigator,
      manifest: "manifest" in document.documentElement,
      standalone: window.matchMedia("(display-mode: standalone)").matches,
      fullscreen: "requestFullscreen" in document.documentElement,
      notifications: Notification.permission,
      geolocation: "geolocation" in navigator,
      camera:
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices,
      microphone:
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices,
    };

    setPwaFeatures(features);
  };

  const checkServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setSwRegistration(registration);
          setSwStatus("registered");

          // Check for updates
          registration.addEventListener("updatefound", () => {
            setUpdateAvailable(true);
          });

          // Check if there's a waiting service worker
          if (registration.waiting) {
            setUpdateAvailable(true);
          }
        } else {
          setSwStatus("not registered");
        }
      } catch (error) {
        setSwStatus("error");
        console.error("Service worker check failed:", error);
      }
    } else {
      setSwStatus("not supported");
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstallationStatus("Installing...");

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setInstallationStatus("Installation accepted");
      } else {
        setInstallationStatus("Installation dismissed");
      }
    } catch (error) {
      setInstallationStatus("Installation failed");
      console.error("Installation failed:", error);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleUpdateClick = async () => {
    if (!swRegistration?.waiting) return;

    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setPwaFeatures((prev) => ({ ...prev, notifications: permission }));
    }
  };

  const testNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("PWA Test", {
        body: "This is a test notification from your PWA!",
        icon: "/favicon-96x96.png",
        badge: "/favicon-96x96.png",
        tag: "pwa-test",
        requireInteraction: false,
        timestamp: Date.now(),
      });
    }
  };

  const clearCache = async () => {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      setInstallationStatus("Cache cleared successfully");
      setTimeout(() => setInstallationStatus(""), 3000);
    }
  };

  const testOfflineMode = () => {
    // Simulate offline mode by navigating to a non-cached resource
    window.open("/pwa-test?offline-test=true", "_blank");
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Doshi Sensei - Japanese Learning",
          text: "Check out this awesome Japanese learning PWA!",
          url: window.location.origin,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setInstallationStatus("App URL copied to clipboard");
        setTimeout(() => setInstallationStatus(""), 3000);
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === "boolean") {
      return status ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      );
    }

    switch (status) {
      case "granted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "denied":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "registered":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "not registered":
      case "not supported":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">PWA Test Dashboard</h1>
        <p className="text-gray-600">
          Test PWA installation, updates, and connection status
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Connection Type:</span>
              <Badge variant="outline">{connectionType}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Effective Type:</span>
              <Badge variant="outline">{effectiveType}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA Installation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            PWA Installation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span>Installable:</span>
              <Badge variant={isInstallable ? "default" : "secondary"}>
                {isInstallable ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Installed:</span>
              <Badge variant={isInstalled ? "default" : "secondary"}>
                {isInstalled ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {installationStatus && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">{installationStatus}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleInstallClick}
              disabled={!isInstallable}
              className="flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Install PWA
            </Button>

            {isInstalled && (
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Open in Browser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Worker & Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Service Worker & Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span>Service Worker:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(swStatus)}
                <Badge variant="outline">{swStatus}</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Update Available:</span>
              <Badge variant={updateAvailable ? "default" : "secondary"}>
                {updateAvailable ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={checkServiceWorker}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check for Updates
            </Button>

            {updateAvailable && (
              <Button
                onClick={handleUpdateClick}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install Update
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PWA Features */}
      <Card>
        <CardHeader>
          <CardTitle>PWA Features Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span>Service Worker:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(pwaFeatures.serviceWorker)}
                <Badge
                  variant={pwaFeatures.serviceWorker ? "default" : "secondary"}
                >
                  {pwaFeatures.serviceWorker ? "Supported" : "Not Supported"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Web App Manifest:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(pwaFeatures.manifest)}
                <Badge variant={pwaFeatures.manifest ? "default" : "secondary"}>
                  {pwaFeatures.manifest ? "Supported" : "Not Supported"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Standalone Mode:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(pwaFeatures.standalone)}
                <Badge
                  variant={pwaFeatures.standalone ? "default" : "secondary"}
                >
                  {pwaFeatures.standalone ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Fullscreen API:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(pwaFeatures.fullscreen)}
                <Badge
                  variant={pwaFeatures.fullscreen ? "default" : "secondary"}
                >
                  {pwaFeatures.fullscreen ? "Supported" : "Not Supported"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Notifications:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(pwaFeatures.notifications)}
                <Badge
                  variant={
                    pwaFeatures.notifications === "granted"
                      ? "default"
                      : "secondary"
                  }
                >
                  {pwaFeatures.notifications}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Geolocation:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(pwaFeatures.geolocation)}
                <Badge
                  variant={pwaFeatures.geolocation ? "default" : "secondary"}
                >
                  {pwaFeatures.geolocation ? "Supported" : "Not Supported"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {pwaFeatures.notifications === "default" && (
              <Button onClick={requestNotificationPermission} variant="outline">
                Enable Notifications
              </Button>
            )}

            {pwaFeatures.notifications === "granted" && (
              <Button onClick={testNotification} variant="outline">
                Test Notification
              </Button>
            )}

            <Button onClick={clearCache} variant="outline">
              Clear Cache
            </Button>

            <Button onClick={testOfflineMode} variant="outline">
              Test Offline Mode
            </Button>

            <Button onClick={shareApp} variant="outline">
              Share App
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Banner Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Banner Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Test the existing notification banners and popups in your app
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                // Simulate going offline then online to trigger OfflineNotification
                Object.defineProperty(navigator, "onLine", {
                  writable: true,
                  value: false,
                });
                window.dispatchEvent(new Event("offline"));
                setTimeout(() => {
                  Object.defineProperty(navigator, "onLine", {
                    writable: true,
                    value: true,
                  });
                  window.dispatchEvent(new Event("online"));
                }, 2000);
              }}
              variant="outline"
            >
              Test Connection Banner
            </Button>

            <Button
              onClick={() => {
                // Trigger PWA install prompt if available
                if (deferredPrompt) {
                  handleInstallClick();
                } else {
                  setInstallationStatus(
                    "Install prompt not available - try refreshing the page"
                  );
                  setTimeout(() => setInstallationStatus(""), 3000);
                }
              }}
              variant="outline"
            >
              Test PWA Install Banner
            </Button>

            <Button
              onClick={() => {
                // Test browser notification
                if (Notification.permission === "granted") {
                  testNotification();
                } else if (Notification.permission === "default") {
                  requestNotificationPermission().then(() => {
                    if (Notification.permission === "granted") {
                      testNotification();
                    }
                  });
                } else {
                  setInstallationStatus(
                    "Notifications are blocked. Please enable them in browser settings."
                  );
                  setTimeout(() => setInstallationStatus(""), 3000);
                }
              }}
              variant="outline"
            >
              Test Browser Notification
            </Button>

            <Button
              onClick={() => {
                // Simulate achievement unlock
                const achievementEvent = new CustomEvent(
                  "achievementUnlocked",
                  {
                    detail: {
                      achievement: {
                        id: "test-achievement",
                        title: "Test Achievement",
                        description: "This is a test achievement notification",
                        icon: "🏆",
                        color: "#FFD700",
                        rarity: "rare",
                        rewardType: "xp",
                        rewardValue: 100,
                      },
                      unlockedAchievement: {
                        id: "test-unlock",
                        achievementId: "test-achievement",
                        userId: "test-user",
                        unlockedAt: new Date(),
                      },
                    },
                  }
                );
                window.dispatchEvent(achievementEvent);
              }}
              variant="outline"
            >
              Test Achievement Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded-lg">
            <div>
              <strong>User Agent:</strong> {navigator.userAgent}
            </div>
            <div>
              <strong>Platform:</strong> {navigator.platform}
            </div>
            <div>
              <strong>Language:</strong> {navigator.language}
            </div>
            <div>
              <strong>Cookies Enabled:</strong>{" "}
              {navigator.cookieEnabled ? "Yes" : "No"}
            </div>
            <div>
              <strong>Screen Resolution:</strong> {screen.width}x{screen.height}
            </div>
            <div>
              <strong>Viewport:</strong> {window.innerWidth}x
              {window.innerHeight}
            </div>
            <div>
              <strong>Device Pixel Ratio:</strong> {window.devicePixelRatio}
            </div>
            <div>
              <strong>Touch Support:</strong>{" "}
              {"ontouchstart" in window ? "Yes" : "No"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
