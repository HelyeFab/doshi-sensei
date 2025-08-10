export function PrewarmingScript() {
  const scriptContent = `
    (function() {
      // Check if this is a cold start
      if (!sessionStorage.getItem('doshi_prewarmed')) {
        // Loading messages
        const messages = [
          "Teaching Dōshi-kun new verb forms...",
          "Convincing kanji to stay in order...",
          "Feeding the digital tanuki...",
          "Calibrating the furigana generator...",
          "Organizing the particle party...",
          "Waking up the sleepy senpai...",
          "Polishing the virtual genkan...",
          "Charging the kawaii meters...",
          "Summoning the grammar gods...",
          "Bribing the JLPT dragons...",
          "Untangling the keigo knots...",
          "Warming up the wa particles...",
          "Debugging the dakuten...",
          "Alphabetizing the あいうえお...",
          "Caffeinating the code monkeys...",
          "Negotiating with nihongo...",
          "Downloading more RAM-en...",
          "Reticulating splines in Japanese...",
          "Pressing X to pay respects (敬語)...",
          "404: Humor not found. Just kidding!",
        ];
        
        // Start with a random message
        let currentMessageIndex = Math.floor(Math.random() * messages.length);
        
        // Create and inject the prewarming loader immediately
        const loader = document.createElement('div');
        loader.id = 'prewarming-loader';
        loader.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #ffc371 100%);background-size:400% 400%;animation:gradientShift 8s ease infinite;';
        
        loader.innerHTML = \`
          <div class="kanji-background" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
            <span class="floating-kanji" style="position:absolute;top:10%;left:10%;font-size:2rem;opacity:0.1;color:white;animation:float1 15s infinite;">愛</span>
            <span class="floating-kanji" style="position:absolute;top:20%;left:80%;font-size:2.5rem;opacity:0.1;color:white;animation:float2 18s infinite;">学</span>
            <span class="floating-kanji" style="position:absolute;top:60%;left:15%;font-size:1.8rem;opacity:0.1;color:white;animation:float3 20s infinite;">道</span>
            <span class="floating-kanji" style="position:absolute;top:70%;left:70%;font-size:2.2rem;opacity:0.1;color:white;animation:float4 16s infinite;">師</span>
            <span class="floating-kanji" style="position:absolute;top:40%;left:5%;font-size:2rem;opacity:0.1;color:white;animation:float5 22s infinite;">和</span>
            <span class="floating-kanji" style="position:absolute;top:80%;left:40%;font-size:1.5rem;opacity:0.1;color:white;animation:float1 19s infinite;">心</span>
            <span class="floating-kanji" style="position:absolute;top:30%;left:50%;font-size:2.3rem;opacity:0.1;color:white;animation:float2 17s infinite;">夢</span>
            <span class="floating-kanji" style="position:absolute;top:50%;left:90%;font-size:1.7rem;opacity:0.1;color:white;animation:float3 21s infinite;">光</span>
            <span class="floating-kanji" style="position:absolute;top:15%;left:35%;font-size:2.1rem;opacity:0.1;color:white;animation:float4 14s infinite;">桜</span>
            <span class="floating-kanji" style="position:absolute;top:85%;left:60%;font-size:1.9rem;opacity:0.1;color:white;animation:float5 23s infinite;">風</span>
          </div>
          
          <div style="text-align:center;color:white;width:100%;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1;padding:2rem 1rem 0;">
            <!-- Yokoso Welcome Text -->
            <div style="position:relative;margin-bottom:clamp(1.5rem, 5vw, 3rem);width:100%;max-width:600px;">
              <!-- Responsive Yokoso Text -->
              <div class="yokoso-container" style="display:flex;align-items:baseline;justify-content:center;gap:clamp(4px, 2vw, 12px);margin:20px 0;position:relative;">
                <!-- Contained sparkles that won't overflow -->
                <span class="sparkle mobile-sparkle" style="position:absolute;top:-15px;left:10%;font-size:clamp(0.8rem, 3vw, 1.2rem);animation:sparkle1 2s infinite;">✨</span>
                <span class="sparkle mobile-sparkle" style="position:absolute;top:-10px;right:10%;font-size:clamp(0.7rem, 2.5vw, 1rem);animation:sparkle2 2.5s infinite;">⭐</span>
                <span class="sparkle mobile-sparkle" style="position:absolute;bottom:-10px;left:15%;font-size:clamp(0.8rem, 3vw, 1.1rem);animation:sparkle3 3s infinite;">💫</span>
                <span class="sparkle mobile-sparkle" style="position:absolute;bottom:-15px;right:15%;font-size:clamp(0.9rem, 3.5vw, 1.3rem);animation:sparkle1 2.2s infinite;">🌟</span>
                
                <span class="yokoso-char" style="font-size:clamp(2.5rem, 8vw, 5rem);font-weight:900;color:white;text-shadow:0 0 30px rgba(255,255,255,0.9), 0 8px 30px rgba(0,0,0,0.8);animation:bounce1 2s infinite ease-in-out, shimmer 3s infinite linear;transform-origin:center bottom;">よ</span>
                <span class="yokoso-char" style="font-size:clamp(3rem, 10vw, 6.5rem);font-weight:900;color:white;text-shadow:0 0 30px rgba(255,255,255,0.9), 0 8px 30px rgba(0,0,0,0.8);animation:bounce2 2s infinite ease-in-out 0.2s, shimmer 3s infinite linear 0.5s;transform-origin:center bottom;">う</span>
                <span class="yokoso-char" style="font-size:clamp(2rem, 7vw, 4.5rem);font-weight:900;color:white;text-shadow:0 0 30px rgba(255,255,255,0.9), 0 8px 30px rgba(0,0,0,0.8);animation:bounce3 2s infinite ease-in-out 0.4s, shimmer 3s infinite linear 1s;transform-origin:center bottom;">こ</span>
                <span class="yokoso-char" style="font-size:clamp(3.5rem, 11vw, 7rem);font-weight:900;color:white;text-shadow:0 0 30px rgba(255,255,255,0.9), 0 8px 30px rgba(0,0,0,0.8);animation:bounce1 2s infinite ease-in-out 0.6s, shimmer 3s infinite linear 1.5s;transform-origin:center bottom;">そ</span>
              </div>
              <div style="font-size:clamp(0.9rem, 3vw, 1.2rem);color:rgba(255,255,255,0.9);margin-top:-10px;text-shadow:0 3px 15px rgba(0,0,0,0.7);font-weight:600;letter-spacing:1px;">✨ Welcome ✨</div>
            </div>
            
            <img src="/doshi.png" alt="Dōshi Sensei" style="width:clamp(80px, 20vw, 120px);height:clamp(80px, 20vw, 120px);margin-bottom:2rem;filter:drop-shadow(0 10px 20px rgba(0,0,0,0.3));display:block;" />
            <h1 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">Dōshi Sensei</h1>
            <p id="loading-message" style="font-size:1.125rem;opacity:0.9;transition:opacity 0.3s ease-in-out;margin-bottom:1.5rem;">\${messages[currentMessageIndex]}</p>
            
            <!-- Progress Indicator -->
            <div style="width:250px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;margin-bottom:1rem;">
              <div id="progress-bar" style="height:100%;background:linear-gradient(90deg, #fff 0%, #ffd700 100%);width:0%;transition:width 0.3s ease-out;border-radius:2px;box-shadow:0 0 10px rgba(255,255,255,0.5);"></div>
            </div>
            
            <!-- Progress Steps -->
            <div id="progress-steps" style="display:flex;gap:0.5rem;font-size:0.75rem;color:rgba(255,255,255,0.7);">
              <span id="step-settings" style="transition:color 0.3s;">⚙️ Settings</span>
              <span style="opacity:0.5;">•</span>
              <span id="step-resources" style="transition:color 0.3s;">📦 Resources</span>
              <span style="opacity:0.5;">•</span>
              <span id="step-app" style="transition:color 0.3s;">🚀 App Ready</span>
            </div>
          </div>
          <style>
            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes float1 {
              0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
              33% { transform: translateY(-20px) translateX(10px) rotate(5deg); }
              66% { transform: translateY(20px) translateX(-10px) rotate(-5deg); }
            }
            @keyframes float2 {
              0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
              25% { transform: translateY(-15px) translateX(-15px) rotate(-10deg); }
              50% { transform: translateY(15px) translateX(15px) rotate(10deg); }
              75% { transform: translateY(-10px) translateX(5px) rotate(5deg); }
            }
            @keyframes float3 {
              0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
              20% { transform: translateY(10px) translateX(-20px) rotate(15deg); }
              40% { transform: translateY(-25px) translateX(5px) rotate(-8deg); }
              60% { transform: translateY(5px) translateX(15px) rotate(12deg); }
              80% { transform: translateY(-15px) translateX(-10px) rotate(-10deg); }
            }
            @keyframes float4 {
              0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
              30% { transform: translateY(25px) translateX(10px) rotate(-15deg); }
              60% { transform: translateY(-10px) translateX(-20px) rotate(20deg); }
              90% { transform: translateY(15px) translateX(15px) rotate(-5deg); }
            }
            @keyframes float5 {
              0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
              15% { transform: translateY(-30px) translateX(-10px) rotate(10deg); }
              35% { transform: translateY(10px) translateX(20px) rotate(-20deg); }
              55% { transform: translateY(-20px) translateX(-15px) rotate(15deg); }
              75% { transform: translateY(20px) translateX(10px) rotate(-10deg); }
              95% { transform: translateY(-5px) translateX(-5px) rotate(5deg); }
            }
            @keyframes sparkle1 {
              0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
              25% { transform: scale(1.3) rotate(90deg); opacity: 1; }
              50% { transform: scale(0.8) rotate(180deg); opacity: 0.6; }
              75% { transform: scale(1.2) rotate(270deg); opacity: 1; }
            }
            @keyframes sparkle2 {
              0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
              20% { transform: scale(1.4) rotate(72deg); opacity: 1; }
              40% { transform: scale(0.6) rotate(144deg); opacity: 0.5; }
              60% { transform: scale(1.3) rotate(216deg); opacity: 1; }
              80% { transform: scale(0.9) rotate(288deg); opacity: 0.8; }
            }
            @keyframes sparkle3 {
              0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
              33% { transform: scale(0.7) rotate(120deg); opacity: 0.4; }
              66% { transform: scale(1.5) rotate(240deg); opacity: 1; }
            }
            @keyframes bounce1 {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1); }
              40% { transform: translateY(-15px) scale(1.05); }
              60% { transform: translateY(-8px) scale(1.02); }
            }
            @keyframes bounce2 {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1); }
              40% { transform: translateY(-20px) scale(1.08); }
              60% { transform: translateY(-10px) scale(1.04); }
            }
            @keyframes bounce3 {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1); }
              40% { transform: translateY(-12px) scale(1.03); }
              60% { transform: translateY(-6px) scale(1.01); }
            }
            @keyframes shimmer {
              0% { filter: brightness(1) saturate(1); }
              25% { filter: brightness(1.3) saturate(1.2); }
              50% { filter: brightness(1.6) saturate(1.4); }
              75% { filter: brightness(1.3) saturate(1.2); }
              100% { filter: brightness(1) saturate(1); }
            }
          </style>
        \`;
        
        // Wait for DOM to be ready
        if (document.body) {
          document.body.appendChild(loader);
        } else {
          document.addEventListener('DOMContentLoaded', function() {
            document.body.appendChild(loader);
          });
        }
        
        // Set up message rotation
        let messageRotationInterval = setInterval(() => {
          const messageElement = document.getElementById('loading-message');
          if (messageElement) {
            // Fade out current message
            messageElement.style.opacity = '0';
            
            setTimeout(() => {
              // Move to next message (cycle through array)
              currentMessageIndex = (currentMessageIndex + 1) % messages.length;
              messageElement.textContent = messages[currentMessageIndex];
              
              // Fade in new message
              messageElement.style.opacity = '0.9';
            }, 300); // Wait for fade out to complete
          }
        }, 2500); // Change message every 2.5 seconds
        
        // Track when to remove the loader
        let settingsPrewarmed = false;
        let minimumTimeElapsed = false;
        let appResourcesLoaded = false;
        let reactHydrated = false;
        let fontsLoaded = false;
        let progressValue = 0;
        
        const updateProgress = () => {
          const progressBar = document.getElementById('progress-bar');
          const stepSettings = document.getElementById('step-settings');
          const stepResources = document.getElementById('step-resources');
          const stepApp = document.getElementById('step-app');
          
          if (!progressBar) return;
          
          // Calculate progress based on completed steps
          let newProgress = 0;
          let stepsCompleted = 0;
          
          if (settingsPrewarmed) {
            stepsCompleted++;
            if (stepSettings) stepSettings.style.color = '#4ade80';
          }
          
          if (appResourcesLoaded || fontsLoaded) {
            stepsCompleted++;
            if (stepResources) stepResources.style.color = '#4ade80';
          }
          
          if (reactHydrated && minimumTimeElapsed) {
            stepsCompleted++;
            if (stepApp) stepApp.style.color = '#4ade80';
          }
          
          newProgress = (stepsCompleted / 3) * 100;
          progressValue = Math.max(progressValue, newProgress); // Never go backwards
          progressBar.style.width = progressValue + '%';
        };
        
        const checkAndRemoveLoader = () => {
          updateProgress();
          
          if (settingsPrewarmed && minimumTimeElapsed && appResourcesLoaded && reactHydrated && fontsLoaded) {
            const el = document.getElementById('prewarming-loader');
            if (el && !el.dataset.removing) {
              el.dataset.removing = 'true';
              
              // Set progress to 100% before removing
              const progressBar = document.getElementById('progress-bar');
              if (progressBar) {
                progressBar.style.width = '100%';
              }
              
              // Clear the message rotation interval
              if (messageRotationInterval) {
                clearInterval(messageRotationInterval);
                messageRotationInterval = null;
              }
              
              // Wait for progress animation to complete
              setTimeout(() => {
                // Wait for two animation frames to ensure paint is complete
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    // Additional small delay for final rendering
                    setTimeout(() => {
                      el.style.opacity = '0';
                      el.style.transition = 'opacity 0.5s ease-out';
                      setTimeout(() => {
                        el.remove();
                      }, 500);
                    }, 150);
                  });
                });
              }, 300);
            }
          }
        };
        
        // Minimum display time (5 seconds to ensure smooth experience)
        setTimeout(() => {
          minimumTimeElapsed = true;
          checkAndRemoveLoader();
        }, 5000);
        
        // Monitor DOM stability - detect when mutations stop
        let mutationTimeout;
        let domStable = false;
        const observer = new MutationObserver(() => {
          clearTimeout(mutationTimeout);
          mutationTimeout = setTimeout(() => {
            // No mutations for 300ms means DOM is stable
            domStable = true;
            reactHydrated = true; // DOM stability implies React is done
            observer.disconnect();
            checkAndRemoveLoader();
          }, 300);
        });
        
        // Start observing after a short delay
        setTimeout(() => {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
          });
        }, 1500);
        
        // Wait for critical app resources
        const waitForAppResources = () => {
          // Check if the main app bundle is loaded
          if (window.performance && window.performance.getEntriesByType) {
            const resources = window.performance.getEntriesByType('resource');
            const criticalResources = resources.filter(r => 
              r.name.includes('_app') || 
              r.name.includes('main') || 
              r.name.includes('webpack')
            );
            
            // If we have loaded critical resources
            if (criticalResources.length > 0) {
              appResourcesLoaded = true;
              checkAndRemoveLoader();
              return;
            }
          }
          
          // Also check for Next.js readiness
          if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props) {
            appResourcesLoaded = true;
            checkAndRemoveLoader();
            return;
          }
          
          // Retry after a short delay
          setTimeout(waitForAppResources, 100);
        };
        
        // Start checking for app resources after 1 second
        setTimeout(waitForAppResources, 1000);
        
        // Check for React hydration with improved detection
        const checkReactHydration = () => {
          // Multiple checks for React hydration to fix hydration issues
          const reactRoot = document.getElementById('__next');
          
          // Check 1: React Fiber internal properties
          if (reactRoot && (reactRoot._reactRootContainer || reactRoot._reactRootContainerInfo)) {
            reactHydrated = true;
            checkAndRemoveLoader();
            return;
          }
          
          // Check 2: Next.js specific checks
          if (window.next && window.next.router) {
            if (window.next.router.isReady || window.next.router.components) {
              reactHydrated = true;
              checkAndRemoveLoader();
              return;
            }
          }
          
          // Check 3: Look for React 18 root markers
          if (reactRoot && reactRoot.dataset && reactRoot.dataset.reactroot !== undefined) {
            reactHydrated = true;
            checkAndRemoveLoader();
            return;
          }
          
          // Check 4: Look for hydrated interactive elements
          const interactiveElements = document.querySelectorAll('button, a[href], input, select, textarea');
          let hasEventListeners = false;
          
          for (let el of interactiveElements) {
            // Check if element has React event handlers (they start with __react)
            const props = Object.keys(el);
            if (props.some(prop => prop.startsWith('__react') || prop.startsWith('_react'))) {
              hasEventListeners = true;
              break;
            }
          }
          
          if (hasEventListeners) {
            reactHydrated = true;
            checkAndRemoveLoader();
            return;
          }
          
          // Check 5: Detect if React DevTools are connected (indicates React is running)
          if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size > 0) {
            reactHydrated = true;
            checkAndRemoveLoader();
            return;
          }
          
          // Retry with exponential backoff to reduce CPU usage
          const nextDelay = Math.min(checkReactHydration.delay || 50, 500);
          checkReactHydration.delay = nextDelay * 1.5;
          setTimeout(checkReactHydration, nextDelay);
        };
        
        // Start checking for React hydration after 500ms
        setTimeout(checkReactHydration, 500);
        
        // Check for fonts loaded
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            fontsLoaded = true;
            checkAndRemoveLoader();
          });
        } else {
          // Fallback for browsers without font loading API
          fontsLoaded = true;
        }
        
        // Enhanced fallback: Wait for first interaction or maximum time
        const handleFirstInteraction = () => {
          reactHydrated = true;
          fontsLoaded = true;
          appResourcesLoaded = true;
          checkAndRemoveLoader();
          document.removeEventListener('click', handleFirstInteraction);
          document.removeEventListener('touchstart', handleFirstInteraction);
        };
        
        document.addEventListener('click', handleFirstInteraction, { once: true });
        document.addEventListener('touchstart', handleFirstInteraction, { once: true });
        
        // Fallback: Remove after maximum 10 seconds regardless
        setTimeout(() => {
          appResourcesLoaded = true;
          minimumTimeElapsed = true;
          reactHydrated = true;
          fontsLoaded = true;
          if (messageRotationInterval) {
            clearInterval(messageRotationInterval);
            messageRotationInterval = null;
          }
          checkAndRemoveLoader();
        }, 10000);
        
        // Mark as prewarmed
        sessionStorage.setItem('doshi_prewarmed', 'true');
        
        // Create hidden iframe for prewarming after DOM is ready
        const createIframe = () => {
          // Use fetch to prewarm instead of iframe to avoid COOP errors
          // This will trigger the server-side rendering without iframe issues
          // Track both fetch completions
          Promise.allSettled([
            fetch('/settings', {
              method: 'GET',
              credentials: 'same-origin',
              // Signal that this is a prewarming request
              headers: {
                'X-Prewarming': 'true'
              }
            }),
            fetch('/settings?_rsc=1', {
              method: 'GET',
              credentials: 'same-origin',
              headers: {
                'X-Prewarming': 'true'
              }
            })
          ]).then(() => {
            // Both requests completed (success or failure)
            settingsPrewarmed = true;
            checkAndRemoveLoader();
          });
        };
        
        if (document.body) {
          createIframe();
        } else {
          document.addEventListener('DOMContentLoaded', createIframe);
        }
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      suppressHydrationWarning
    />
  );
}
