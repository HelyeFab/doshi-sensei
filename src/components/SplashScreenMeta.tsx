export default function SplashScreenMeta() {
  return (
    <>
      {/* Apple Splash Screens */}
      {/* iPhone 14 Pro Max */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        href="/splash/iphone14promax.png"
      />
      {/* iPhone 14 Pro */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        href="/splash/iphone14pro.png"
      />
      {/* iPhone 14, 13, 13 Pro, 12, 12 Pro */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        href="/splash/iphone14.png"
      />
      {/* iPhone 13 mini, 12 mini */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        href="/splash/iphone13mini.png"
      />
      {/* iPhone SE */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        href="/splash/iphonese.png"
      />
      {/* iPad Pro 12.9" */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        href="/splash/ipadpro129.png"
      />
      {/* iPad Pro 11" */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)"
        href="/splash/ipadpro11.png"
      />
      {/* iPad Air, iPad Mini */}
      <link
        rel="apple-touch-startup-image"
        media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)"
        href="/splash/ipadair.png"
      />
      
      {/* PWA Meta Tags */}
      <meta name="application-name" content="Dōshi Sensei" />
      <meta name="apple-mobile-web-app-title" content="Dōshi Sensei" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#8a5cf6" />
      <meta name="msapplication-tap-highlight" content="no" />
    </>
  );
}