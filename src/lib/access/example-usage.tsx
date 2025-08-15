/**
 * Example Usage of the New Access Control System
 * This file shows how to use the new system in components
 */

import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';

// Example 1: Simple feature access check
function KanjiQuestButton() {
  const { checkAndTrack, showAccessPrompt } = useAccess();
  
  const handlePlay = async () => {
    // Check access and track usage in one call
    const canPlay = await checkAndTrack('kanji_quest');
    
    if (canPlay) {
      // Start the game

    } else {
      // Show appropriate error message
      showAccessPrompt('kanji_quest', 'Kanji Quest');
    }
  };
  
  return (
    <button onClick={handlePlay}>
      Play Kanji Quest
    </button>
  );
}

// Example 2: Display remaining usage
function DrillsWidget() {
  const { feature, access, remaining } = useFeature('drill_practice');
  
  if (!feature) return null;
  
  return (
    <div>
      <h3>{feature.name}</h3>
      {access?.allowed ? (
        <p>
          {remaining === -1 
            ? 'Unlimited drills available!' 
            : `${remaining} drills remaining today`}
        </p>
      ) : (
        <p>Upgrade to access drills</p>
      )}
    </div>
  );
}

// Example 3: Subscription management
function AccountSection() {
  const { 
    userType, 
    isPremium, 
    daysRemaining,
    createCheckoutSession,
    cancelSubscription 
  } = useSubscription2();
  
  return (
    <div>
      <h2>Your Account</h2>
      <p>Plan: {userType}</p>
      
      {isPremium && daysRemaining && (
        <p>Renews in {daysRemaining} days</p>
      )}
      
      {!isPremium && (
        <div>
          <button onClick={() => createCheckoutSession('price_monthly')}>
            Upgrade to Monthly ($3.99/mo)
          </button>
          <button onClick={() => createCheckoutSession('price_yearly')}>
            Upgrade to Yearly ($39.99/yr)
          </button>
        </div>
      )}
      
      {isPremium && (
        <button onClick={cancelSubscription}>
          Cancel Subscription
        </button>
      )}
    </div>
  );
}

// Example 4: Conditional rendering based on access
function ArticleReader({ articleId }: { articleId: string }) {
  const { canAccess } = useAccess();
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    canAccess('article_reading').then(result => {
      setHasAccess(result.allowed);
    });
  }, []);
  
  if (!hasAccess) {
    return <div>Please log in or upgrade to read articles</div>;
  }
  
  return <div>Article content here...</div>;
}

// Example 5: Game with shared limits
function GamesSection() {
  const kanjiQuest = useFeature('kanji_quest');
  const kanaDrop = useFeature('kana_drop');
  
  // Both games share the same limit counter
  const gamesRemaining = kanjiQuest.remaining;
  
  return (
    <div>
      <h2>Games ({gamesRemaining === -1 ? 'Unlimited' : `${gamesRemaining} plays left`})</h2>
      
      <GameCard 
        name="Kanji Quest" 
        feature={kanjiQuest}
      />
      
      <GameCard 
        name="Kana Drop" 
        feature={kanaDrop}
      />
    </div>
  );
}