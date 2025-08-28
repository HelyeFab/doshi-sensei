export default function WordLearningSessionStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "name": "Word Learning Session - Multimodal Japanese Vocabulary Learning",
    "description": "Interactive multimodal sessions for learning Japanese vocabulary with audio-visual matching, context sentences, and active recall drills.",
    "educationalLevel": "Beginner to Intermediate",
    "learningResourceType": "Interactive Resource",
    "educationalUse": "Vocabulary Learning",
    "inLanguage": "ja",
    "teaches": {
      "@type": "DefinedTerm",
      "name": "Japanese Vocabulary",
      "inDefinedTermSet": "Language Learning"
    },
    "interactivityType": "mixed",
    "isAccessibleForFree": true,
    "provider": {
      "@type": "Organization",
      "name": "Doshi Sensei",
      "url": "https://doshisensei.com"
    },
    "hasPart": [
      {
        "@type": "Course",
        "name": "Genki I Vocabulary",
        "description": "Vocabulary from Genki I textbook lessons"
      },
      {
        "@type": "Course", 
        "name": "Genki II Vocabulary",
        "description": "Vocabulary from Genki II textbook lessons"
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}