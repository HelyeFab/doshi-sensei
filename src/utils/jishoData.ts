// Local fallback data for Jisho API
// This file contains a sample response from the Jisho API for the search term "house"
// It's used as a fallback when the API calls fail due to CORS issues

export const jishoHouseData = {
  "meta": {
    "status": 200
  },
  "data": [
    {
      "slug": "家",
      "is_common": true,
      "tags": [],
      "jlpt": [
        "jlpt-n5"
      ],
      "japanese": [
        {
          "word": "家",
          "reading": "いえ"
        }
      ],
      "senses": [
        {
          "english_definitions": [
            "house",
            "residence",
            "dwelling",
            "home"
          ],
          "parts_of_speech": [
            "Noun"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        },
        {
          "english_definitions": [
            "family",
            "household"
          ],
          "parts_of_speech": [
            "Noun"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        },
        {
          "english_definitions": [
            "lineage",
            "family name"
          ],
          "parts_of_speech": [
            "Noun"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        }
      ],
      "attribution": {
        "jmdict": true,
        "jmnedict": false,
        "dbpedia": false
      }
    },
    {
      "slug": "家屋",
      "is_common": true,
      "tags": [],
      "jlpt": [
        "jlpt-n2"
      ],
      "japanese": [
        {
          "word": "家屋",
          "reading": "かおく"
        }
      ],
      "senses": [
        {
          "english_definitions": [
            "house",
            "building"
          ],
          "parts_of_speech": [
            "Noun"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        }
      ],
      "attribution": {
        "jmdict": true,
        "jmnedict": false,
        "dbpedia": "http://dbpedia.org/resource/House"
      }
    },
    {
      "slug": "宅",
      "is_common": true,
      "tags": [
        "wanikani23"
      ],
      "jlpt": [
        "jlpt-n3"
      ],
      "japanese": [
        {
          "word": "宅",
          "reading": "たく"
        }
      ],
      "senses": [
        {
          "english_definitions": [
            "house",
            "home"
          ],
          "parts_of_speech": [
            "Noun",
            "Noun, used as a suffix"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        }
      ],
      "attribution": {
        "jmdict": true,
        "jmnedict": false,
        "dbpedia": false
      }
    }
  ]
};

// Common verbs data
export const commonVerbsData = {
  "meta": {
    "status": 200
  },
  "data": [
    {
      "slug": "する",
      "is_common": true,
      "tags": [],
      "jlpt": [
        "jlpt-n5"
      ],
      "japanese": [
        {
          "word": "する",
          "reading": "する"
        }
      ],
      "senses": [
        {
          "english_definitions": [
            "to do",
            "to carry out",
            "to perform"
          ],
          "parts_of_speech": [
            "Suru verb - irregular"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        }
      ],
      "attribution": {
        "jmdict": true,
        "jmnedict": false,
        "dbpedia": false
      }
    },
    {
      "slug": "食べる",
      "is_common": true,
      "tags": [],
      "jlpt": [
        "jlpt-n5"
      ],
      "japanese": [
        {
          "word": "食べる",
          "reading": "たべる"
        }
      ],
      "senses": [
        {
          "english_definitions": [
            "to eat"
          ],
          "parts_of_speech": [
            "Ichidan verb"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        }
      ],
      "attribution": {
        "jmdict": true,
        "jmnedict": false,
        "dbpedia": false
      }
    },
    {
      "slug": "飲む",
      "is_common": true,
      "tags": [],
      "jlpt": [
        "jlpt-n5"
      ],
      "japanese": [
        {
          "word": "飲む",
          "reading": "のむ"
        }
      ],
      "senses": [
        {
          "english_definitions": [
            "to drink",
            "to gulp",
            "to swallow"
          ],
          "parts_of_speech": [
            "Godan verb with mu ending"
          ],
          "links": [],
          "tags": [],
          "restrictions": [],
          "see_also": [],
          "antonyms": [],
          "source": [],
          "info": []
        }
      ],
      "attribution": {
        "jmdict": true,
        "jmnedict": false,
        "dbpedia": false
      }
    }
  ]
};

// Function to get fallback data based on query
export function getFallbackData(query: string) {
  // Convert query to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();

  // Check if query contains "house" or related terms
  if (lowerQuery.includes('house') || lowerQuery.includes('home') ||
      lowerQuery.includes('いえ') || lowerQuery.includes('家') ||
      lowerQuery.includes('うち')) {
    return jishoHouseData;
  }

  // For common verbs or general queries
  if (lowerQuery.includes('verb') || lowerQuery.includes('common') ||
      lowerQuery === 'する' || lowerQuery === 'たべる' || lowerQuery === 'のむ' ||
      lowerQuery === '食べる' || lowerQuery === '飲む') {
    return commonVerbsData;
  }

  // Default to empty results if no match
  return {
    meta: { status: 200 },
    data: []
  };
}
