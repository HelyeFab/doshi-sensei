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
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Create and inject the prewarming loader immediately
        const loader = document.createElement('div');
        loader.id = 'prewarming-loader';
        loader.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #ffc371 100%);background-size:400% 400%;animation:gradientShift 8s ease infinite;';
        
        loader.innerHTML = \`
          <div style="text-align:center;color:white;">
            <img src="/doshi.png" alt="Dōshi Sensei" style="width:120px;height:120px;margin-bottom:2rem;filter:drop-shadow(0 10px 20px rgba(0,0,0,0.3));" />
            <h1 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">Dōshi Sensei</h1>
            <p style="font-size:1.125rem;opacity:0.9;">\${randomMessage}</p>
          </div>
          <style>
            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          </style>
        \`;
        
        document.body.appendChild(loader);
        
        // Remove after 3 seconds
        setTimeout(() => {
          const el = document.getElementById('prewarming-loader');
          if (el) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s';
            setTimeout(() => el.remove(), 500);
          }
        }, 3000);
        
        // Mark as prewarmed
        sessionStorage.setItem('doshi_prewarmed', 'true');
        
        // Create hidden iframe for prewarming
        const iframe = document.createElement('iframe');
        iframe.src = '/settings';
        iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;pointer-events:none;';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);
        
        // Remove iframe after loading
        setTimeout(() => iframe.remove(), 4000);
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