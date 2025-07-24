export interface ContextExplanationRequest {
  text: string;
  contextType: 'word' | 'phrase' | 'sentence' | 'paragraph';
  surroundingContext?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ContextExplanationResponse {
  explanation: {
    meaning: string;
    grammar?: string | null;
    usage?: string | null;
    examples?: string[];
    culturalNotes?: string | null;
  };
  error?: string;
}

export async function getContextExplanation(
  request: ContextExplanationRequest
): Promise<ContextExplanationResponse> {
  try {
    const response = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        explanation: {
          meaning: ''
        },
        error: data.error || 'Failed to get explanation'
      };
    }

    return data;
  } catch (error) {
    console.error('AI Explanation Error:', error);
    return {
      explanation: {
        meaning: ''
      },
      error: 'Failed to connect to AI service'
    };
  }
}

// Cache explanations to avoid duplicate API calls
const explanationCache = new Map<string, ContextExplanationResponse>();

export async function getCachedContextExplanation(
  request: ContextExplanationRequest
): Promise<ContextExplanationResponse> {
  const cacheKey = `${request.text}-${request.contextType}-${request.userLevel}`;
  
  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }
  
  const response = await getContextExplanation(request);
  if (!response.error) {
    explanationCache.set(cacheKey, response);
  }
  
  return response;
}