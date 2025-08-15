export async function searchWanikaniVocabulary(query: string, limit: number = 50): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set (only needed when not using proxy)
    if (!PROXY_BASE && !wanikaniAxios.defaults.headers.common['Authorization']) {
      console.error('[WaniKani] API token not set in Authorization header');
      // Try to reinitialize with fallback token
      const token = process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || 'db0708c2-d1d4-4865-948c-b31c9ebdc04e';
      setWanikaniApiToken(token);
      
      // Check again after reinitialization
      if (!wanikaniAxios.defaults.headers.common['Authorization']) {
        console.error('[WaniKani] Failed to set token even after reinitialization');
        return [];
      }
    }

    // Search for vocabulary matching the query
    const endpoint = PROXY_BASE ? '' : '/subjects';

    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(endpoint, {
      params: {
        ...(PROXY_BASE && { endpoint: '/subjects' }),
        types: 'vocabulary',
        hidden: false,
        limit: 1000,
        _t: Date.now()
      }
    });
    
    if (!response.data?.data) {

      return [];
    }
    
    // Filter results that match the query
    const queryLower = query.toLowerCase();
    const filteredData = response.data.data.filter(item => {
      if (!item.data) return false;
      
      // Check if any meaning matches
      const meaningMatch = item.data.meanings?.some(meaning => 
        meaning.meaning.toLowerCase().includes(queryLower)
      );
      
      // Check if reading matches
      const readingMatch = item.data.readings?.some(reading =>
        reading.reading.includes(query)
      );
      
      // Check if characters match
      const charactersMatch = item.data.characters?.includes(query);
      
      return meaningMatch || readingMatch || charactersMatch;
    });

    // Convert to our format
    const words = filteredData.slice(0, limit).map(item => convertWanikaniSubject(item))
      .filter((word): word is JapaneseWord => word !== null);
    
    return words;
  } catch (error) {
    console.error('Error searching vocabulary in WaniKani:', error);
    return [];
  }
}