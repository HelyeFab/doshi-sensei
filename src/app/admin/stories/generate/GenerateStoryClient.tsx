'use client';

import RegenerateImageModal from '@/components/admin/RegenerateImageModal';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useStrings } from '@/contexts/LanguageContext';
import { JLPTLevel, JLPT_LEVELS } from '@/types/kanji';
import { STORY_THEMES } from '@/types/story';
import { AIStoryDraft, AIGenerationProgress, AICharacterSheet } from '@/types/ai-story';
import { storyManager } from '@/utils/storyManager';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function GenerateStoryClient() {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showNotification } = useNotification();

  // Form state
  const [theme, setTheme] = useState<string>('');
  const [jlptLevel, setJlptLevel] = useState<JLPTLevel>('N5');
  const [pageCount, setPageCount] = useState<number>(3);
  const [generateImages, setGenerateImages] = useState<boolean>(true);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<AIGenerationProgress | null>(null);
  const [storyDraft, setStoryDraft] = useState<AIStoryDraft | null>(null);
  const [currentStep, setCurrentStep] = useState<'setup' | 'generating' | 'review'>('setup');
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{
    isOpen: boolean;
    pageNumber: number;
    currentImageUrl?: string;
    currentPrompt: string;
  } | null>(null);
  
  // Character consistency state
  const [characterProfile, setCharacterProfile] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  const handleGenerate = async () => {
    if (!theme) {
      showNotification({
        title: 'Error',
        message: strings.admin.aiStoryGeneration.errors.invalidTheme,
        type: 'error'
      });
      return;
    }

    if (!user) return;

    setIsGenerating(true);
    setCurrentStep('generating');
    setGenerationProgress({ step: 'character_sheet', message: strings.admin.aiStoryGeneration.generationSteps.characterSheet });

    // Generate draft ID early so we can use it for storage paths
    const draftId = `ai-draft-${Date.now()}`;

    try {
      // Step 1: Generate character sheet ONLY
      const characterResponse = await fetch('/api/admin/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          theme,
          jlptLevel,
          pages: pageCount
        })
      });

      if (!characterResponse.ok) {
        const errorData = await characterResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Character generation failed:', errorData);
        throw new Error(errorData.error || 'Failed to generate characters');
      }

      const { characterSheet, metadata } = await characterResponse.json();
      
      // Step 1.5: Generate character model sheet for consistency
      let updatedCharacterSheet = characterSheet;
      let characterProfile = null;
      let modelSheetUrl = null;
      let sessionId = null;
      
      if (generateImages) {
        setGenerationProgress({ 
          step: 'character_sheet', 
          message: 'Generating character model sheet for visual consistency...' 
        });
        
        try {
          // First, generate the character model sheet
          const modelSheetResponse = await fetch('/api/admin/generate-character-model-sheet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user?.getIdToken()}`
            },
            body: JSON.stringify({
              character: characterSheet.mainCharacter,
              visualStyle: characterSheet.visualStyle
            })
          });
          
          if (modelSheetResponse.ok) {
            const modelSheetData = await modelSheetResponse.json();
            characterProfile = modelSheetData.characterProfile;
            modelSheetUrl = modelSheetData.modelSheet?.imageUrl;
            sessionId = modelSheetData.sessionId;
            
            // Store model sheet permanently
            if (modelSheetUrl) {
              try {
                const storeResponse = await fetch('/api/admin/store-image', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user?.getIdToken()}`
                  },
                  body: JSON.stringify({
                    imageUrl: modelSheetUrl,
                    storagePath: `stories/${draftId}/characters/model-sheet-${Date.now()}.jpg`
                  })
                });
                
                if (storeResponse.ok) {
                  const { url: permanentModelSheetUrl } = await storeResponse.json();

                  modelSheetUrl = permanentModelSheetUrl;
                }
              } catch (error) {
                console.error('Error storing model sheet:', error);
              }
            }
            
            // Store in state for later use
            setCharacterProfile(modelSheetData.characterProfile);
            setSessionId(modelSheetData.sessionId);
            
            // Update character sheet with model sheet reference
            updatedCharacterSheet = {
              ...characterSheet,
              mainCharacter: {
                ...characterSheet.mainCharacter,
                modelSheetUrl: modelSheetUrl,
                characterProfile: characterProfile,
                referenceImage: modelSheetUrl // Use model sheet as reference
              }
            };

            setGenerationProgress({ 
              step: 'character_sheet', 
              message: 'Model sheet generated! Now generating individual character images...' 
            });
          }
          
          // Then generate individual reference images
          const characterImagesResponse = await fetch('/api/admin/generate-character-images', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user?.getIdToken()}`
            },
            body: JSON.stringify({
              characterSheet: updatedCharacterSheet
            })
          });
          
          if (characterImagesResponse.ok) {
            const { characterSheet: sheetWithImages } = await characterImagesResponse.json();
            updatedCharacterSheet = sheetWithImages;

          } else {
            console.error('Failed to generate character reference images, continuing with model sheet only');
          }
        } catch (error) {
          console.error('Error generating character visuals:', error);
          // Continue without reference images
        }
      }
      
      // Step 2: Generate outline separately
      setGenerationProgress({ step: 'outline', message: strings.admin.aiStoryGeneration.generationSteps.outline });
      
      const outlineResponse = await fetch('/api/admin/generate-story-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          theme,
          jlptLevel,
          pages: pageCount,
          characterSheet: updatedCharacterSheet
        })
      });

      if (!outlineResponse.ok) {
        const errorData = await outlineResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Outline generation failed:', errorData);
        throw new Error(errorData.error || 'Failed to generate outline');
      }

      const { outline } = await outlineResponse.json();

      // Create draft
      const draft: AIStoryDraft = {
        id: draftId,
        title: '', // Will be set after generation
        titleJa: '',
        description: '',
        theme,
        jlptLevel,
        characterSheet: updatedCharacterSheet,
        outline,
        pages: [],
        generationPrompts: {},
        metadata: {
          ...metadata,
          generatedBy: user.uid,
          openAiModel: 'gpt-4-0125-preview',
          isAIGenerated: true
        },
        status: 'generating'
      };

      setStoryDraft(draft);
      setGenerationProgress({ step: 'outline', message: strings.admin.aiStoryGeneration.generationSteps.outline });

      // Step 3: Generate all page texts first
      const generatedPages = [];
      const pageTexts = [];
      
      for (let i = 0; i < outline.length; i++) {
        setGenerationProgress({
          step: 'pages',
          currentPage: i + 1,
          totalPages: outline.length,
          message: `Generating text for page ${i + 1} of ${outline.length}...`
        });

        const textResponse = await fetch('/api/admin/generate-page-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getIdToken()}`
          },
          body: JSON.stringify({
            pageNumber: i + 1,
            pageSummary: outline[i].summary,
            theme,
            jlptLevel,
            characterName: characterSheet.mainCharacter.name,
            previousPageSummary: i > 0 ? outline[i - 1].summary : undefined
          })
        });

        if (!textResponse.ok) {
          console.error(`Failed to generate text for page ${i + 1}`);
          pageTexts.push(null);
          continue;
        }

        const { pageText } = await textResponse.json();
        pageTexts.push(pageText);
      }
      
      // Step 4: Generate images based on actual story content
      const pageImages = new Array(outline.length).fill(null);
      
      if (generateImages) {
        // Generate images one by one with consistent character
        for (let i = 0; i < outline.length; i++) {
          setGenerationProgress({
            step: 'images',
            currentPage: i + 1,
            totalPages: outline.length,
            message: `Generating image for page ${i + 1} of ${outline.length}...`
          });
          
          try {
            // First, generate an image prompt based on the actual story text
            setGenerationProgress({
              step: 'images',
              currentPage: i + 1,
              totalPages: outline.length,
              message: `Creating image prompt for page ${i + 1}...`
            });
            
            const promptResponse = await fetch('/api/admin/generate-image-prompt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await user?.getIdToken()}`
              },
              body: JSON.stringify({
                pageText: pageTexts[i].text,
                pageTranslation: pageTexts[i].translation,
                pageNumber: i + 1,
                characterName: updatedCharacterSheet.mainCharacter.name,
                characterDescription: updatedCharacterSheet.mainCharacter.visualDescription,
                theme: theme,
                setting: updatedCharacterSheet.setting.location
              })
            });
            
            let imagePrompt = outline[i].imagePrompt; // fallback
            if (promptResponse.ok) {
              const { imagePrompt: generatedPrompt } = await promptResponse.json();
              imagePrompt = generatedPrompt;

            }
            
            // Then generate the image with character consistency
            setGenerationProgress({
              step: 'images',
              currentPage: i + 1,
              totalPages: outline.length,
              message: `Generating image for page ${i + 1}...`
            });
            
            const imageResponse = await fetch('/api/admin/generate-page-image-consistent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await user?.getIdToken()}`
              },
              body: JSON.stringify({
                pageNumber: i + 1,
                imagePrompt: imagePrompt,
                characterName: updatedCharacterSheet.mainCharacter.name,
                characterDescription: updatedCharacterSheet.mainCharacter.visualDescription,
                visualStyle: updatedCharacterSheet.visualStyle || 'anime illustration style',
                modelSheetUrl: modelSheetUrl,
                characterId: characterProfile?.characterId,
                sessionId: sessionId,
                useGemini: false
              })
            });
            
            if (imageResponse.ok) {
              const { pageImage } = await imageResponse.json();
              
              // Store the image permanently if we got one
              if (pageImage.imageUrl) {
                try {
                  setGenerationProgress({
                    step: 'images',
                    currentPage: i + 1,
                    totalPages: outline.length,
                    message: `Storing image for page ${i + 1} permanently...`
                  });
                  
                  const storeResponse = await fetch('/api/admin/store-image', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${await user?.getIdToken()}`
                    },
                    body: JSON.stringify({
                      imageUrl: pageImage.imageUrl,
                      storagePath: `stories/${draft.id}/pages/page-${i + 1}-${Date.now()}.jpg`
                    })
                  });
                  
                  if (storeResponse.ok) {
                    const { url: permanentUrl } = await storeResponse.json();

                    pageImages[i] = {
                      imageUrl: permanentUrl,
                      imageAlt: imagePrompt,
                      provider: pageImage.provider
                    };
                  } else {
                    console.error(`Failed to store image for page ${i + 1}`);
                    // Fall back to temporary URL
                    pageImages[i] = {
                      imageUrl: pageImage.imageUrl,
                      imageAlt: imagePrompt,
                      provider: pageImage.provider
                    };
                  }
                } catch (storeError) {
                  console.error(`Error storing image for page ${i + 1}:`, storeError);
                  // Fall back to temporary URL
                  pageImages[i] = {
                    imageUrl: pageImage.imageUrl,
                    imageAlt: imagePrompt,
                    provider: pageImage.provider
                  };
                }
              } else {
                pageImages[i] = {
                  imageUrl: '',
                  imageAlt: imagePrompt,
                  provider: pageImage.provider
                };
              }
            } else {
              console.error(`Failed to generate image for page ${i + 1}`);
              pageImages[i] = {
                imageUrl: '',
                imageAlt: imagePrompt
              };
            }
          } catch (error) {
            console.error(`Error generating image for page ${i + 1}:`, error);
            pageImages[i] = {
              imageUrl: '',
              imageAlt: outline[i].imagePrompt
            };
          }
          
          // Small delay between images to avoid rate limits
          if (i < outline.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Step 5: Combine text and image results
      for (let i = 0; i < outline.length; i++) {
        if (!pageTexts[i]) continue;
        
        const pageImage = pageImages[i] || { imageUrl: '', imageAlt: outline[i].imagePrompt };

        generatedPages.push({
          pageNumber: i + 1,
          text: pageTexts[i].text,
          translation: pageTexts[i].translation,
          imageUrl: pageImage.imageUrl || '',
          imageAlt: pageImage.imageAlt || ''
        });
      }
      
      // Update draft with all pages
      draft.pages = generatedPages;
      setStoryDraft({ ...draft });

      // Step 3: Generate quiz
      setGenerationProgress({ step: 'quiz', message: strings.admin.aiStoryGeneration.generationSteps.quiz });
      
      const quizResponse = await fetch('/api/admin/generate-story-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          storyTitle: draft.title || theme,
          storyPages: generatedPages,
          jlptLevel,
          questionCount: 5
        })
      });

      let quiz = [];
      if (quizResponse.ok) {
        const quizData = await quizResponse.json();

        quiz = quizData.quiz || [];

      } else {
        console.error('Quiz generation failed:', await quizResponse.text());
      }

      // Extract title from first page
      const firstPageText = generatedPages[0]?.text || '';
      const titleMatch = firstPageText.match(/<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/);
      const titleJa = titleMatch ? titleMatch[0] : theme;
      const title = generatedPages[0]?.translation?.split('.')[0] || theme;

      // Update draft with final data
      draft.title = title;
      draft.titleJa = titleJa;
      draft.description = `An AI-generated ${theme} story for ${jlptLevel} learners`;
      draft.status = 'review';
      setStoryDraft(draft);

      // Store quiz separately for now (we'll add it when publishing)
      (draft as any).quiz = quiz;
      console.log('Quiz stored in draft:', (draft as any).quiz);

      setGenerationProgress({ step: 'complete', message: strings.admin.aiStoryGeneration.generationSteps.complete });
      setCurrentStep('review');
      
      showNotification({
        title: 'Success',
        message: strings.admin.aiStoryGeneration.success.storyGenerated,
        type: 'success'
      });

    } catch (error: any) {
      console.error('Error generating story:', error);
      
      let errorMessage = strings.admin.aiStoryGeneration.errors.generationFailed;
      
      if (error.message?.includes('fetch failed')) {
        errorMessage = 'Connection failed. Please make sure the development server is running.';
      } else if (error.message?.includes('apiKey') || error.message?.includes('API key')) {
        errorMessage = 'OpenAI API key issue. Please check your API key configuration.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = strings.admin.aiStoryGeneration.errors.rateLimitExceeded;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Try generating fewer pages or retry.';
      }
      
      showNotification({
        title: 'Error',
        message: errorMessage,
        type: 'error'
      });
      
      // Keep the partial draft if available
      if (storyDraft && storyDraft.pages.length > 0) {
        setCurrentStep('review');
        showNotification({
          title: 'Partial Story Generated',
          message: `Generated ${storyDraft.pages.length} pages before error. You can publish what was generated.`,
          type: 'warning'
        });
      } else {
        setCurrentStep('setup');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!storyDraft || !user) return;

    try {
      const storyData = {
        title: storyDraft.title,
        titleJa: storyDraft.titleJa,
        description: storyDraft.description,
        jlptLevel: storyDraft.jlptLevel,
        theme: storyDraft.theme,
        tags: ['ai-generated'],
        coverImageUrl: storyDraft.pages[0]?.imageUrl || '',
        pages: storyDraft.pages,
        quiz: (storyDraft as any).quiz || [],
        status: 'published' as const,
        slug: storyManager.generateSlug(storyDraft.title),
        seoTitle: storyDraft.title,
        seoDescription: storyDraft.description,
        publishedAt: new Date(),
        authorId: user.uid,
        viewCount: 0,
        completionCount: 0
      };

      await storyManager.saveStory(storyData);

      showNotification({
        title: 'Success',
        message: strings.admin.aiStoryGeneration.success.storyPublished,
        type: 'success'
      });

      router.push('/admin/stories');
    } catch (error) {
      console.error('Error publishing story:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to publish story',
        type: 'error'
      });
    }
  };

  if (adminLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">{strings.loading.general}</div>;
  }

  return (
    <AdminLayout title={strings.admin.aiStoryGeneration.title}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Subtitle */}
        <p className="text-muted-foreground -mt-4">{strings.admin.aiStoryGeneration.subtitle}</p>

          <AnimatePresence mode="wait">
            {/* Setup Form */}
            {currentStep === 'setup' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card rounded-lg p-6 border border-border space-y-6"
              >
                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {strings.admin.aiStoryGeneration.form.selectTheme}
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">{strings.admin.aiStoryGeneration.form.selectTheme}</option>
                    {STORY_THEMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* JLPT Level */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {strings.admin.aiStoryGeneration.form.selectJlptLevel}
                  </label>
                  <div className="flex gap-2">
                    {JLPT_LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => setJlptLevel(level)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          jlptLevel === level
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Count */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {strings.admin.aiStoryGeneration.form.numberOfPages}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={pageCount}
                      onChange={(e) => setPageCount(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-medium">{pageCount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {strings.admin.aiStoryGeneration.form.pagesRange}
                  </p>
                </div>

                {/* Image Generation Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={generateImages}
                      onChange={(e) => setGenerateImages(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium">
                      Generate images (disable if having issues)
                    </span>
                  </label>
                  <p className="text-sm text-muted-foreground ml-6">
                    Images can sometimes fail due to content policies. Uncheck to skip image generation.
                  </p>
                  
                  {generateImages && (
                    <p className="text-sm text-muted-foreground ml-6">
                      Using gpt-image-1 - the latest OpenAI image generation model
                    </p>
                  )}
                </div>

                {/* Generate Button */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/test-openai', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await user?.getIdToken()}`
                          }
                        });
                        const data = await response.json();

                        alert(data.success ? `OpenAI works! Response: ${data.response}` : `Error: ${data.error}`);
                      } catch (error) {
                        console.error('Test failed:', error);
                        alert('Test failed - check console');
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Test API
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!theme || isGenerating}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {strings.admin.aiStoryGeneration.form.generateStory}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Generation Progress */}
            {currentStep === 'generating' && generationProgress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card rounded-lg p-6 border border-border"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <div className="flex-1">
                      <p className="font-medium">{generationProgress.message}</p>
                      {generationProgress.currentPage && generationProgress.totalPages && (
                        <div className="mt-2">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Page {generationProgress.currentPage} of {generationProgress.totalPages}</span>
                            <span>{Math.round((generationProgress.currentPage / generationProgress.totalPages) * 100)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(generationProgress.currentPage / generationProgress.totalPages) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="space-y-2">
                    {(['character_sheet', 'outline', 'pages', 'images', 'quiz'] as const).map((step) => {
                      const isCurrentStep = generationProgress.step === step;
                      const isCompleted = (() => {
                        if (!storyDraft) return false;
                        switch (step) {
                          case 'character_sheet': return !!storyDraft.characterSheet;
                          case 'outline': return storyDraft.outline.length > 0;
                          case 'pages': return storyDraft.pages.length === storyDraft.outline.length;
                          case 'images': return storyDraft.pages.every(p => p.imageUrl || generationProgress.step === 'quiz' || generationProgress.step === 'complete');
                          case 'quiz': return generationProgress.step === 'complete';
                          default: return false;
                        }
                      })();
                      
                      return (
                        <div key={step} className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${
                            isCurrentStep
                              ? 'bg-primary animate-pulse'
                              : isCompleted
                              ? 'bg-green-500'
                              : 'bg-muted'
                          }`} />
                          <span className="text-sm">
                            {strings.admin.aiStoryGeneration.generationSteps[step]}
                            {(step === 'pages' || step === 'images') && generationProgress.currentPage && (
                              <span className="text-muted-foreground ml-2">
                                ({generationProgress.currentPage}/{generationProgress.totalPages})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Review Story */}
            {currentStep === 'review' && storyDraft && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Story Preview */}
                <div className="bg-card rounded-lg p-6 border border-border">
                  <h2 className="text-xl font-semibold mb-4">{strings.admin.aiStoryGeneration.preview.title}</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">{strings.admin.title}:</p>
                      <p>{storyDraft.title}</p>
                    </div>
                    <div>
                      <p className="font-medium">Japanese Title:</p>
                      <p className="japanese-text" dangerouslySetInnerHTML={{ __html: storyDraft.titleJa }} />
                    </div>
                    <div>
                      <p className="font-medium">{strings.admin.theme}:</p>
                      <p>{storyDraft.theme}</p>
                    </div>
                    <div>
                      <p className="font-medium">{strings.admin.jlptLevel}:</p>
                      <p>{storyDraft.jlptLevel}</p>
                    </div>
                  </div>
                </div>

                {/* Character Sheet */}
                <div className="bg-card rounded-lg p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-4">{strings.admin.aiStoryGeneration.preview.characterSheet}</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{strings.admin.aiStoryGeneration.preview.mainCharacter}:</p>
                      <p>{storyDraft.characterSheet.mainCharacter.name} - {storyDraft.characterSheet.mainCharacter.description}</p>
                    </div>
                    <div>
                      <p className="font-medium">{strings.admin.aiStoryGeneration.preview.visualStyle}:</p>
                      <p>{storyDraft.characterSheet.visualStyle}</p>
                    </div>
                  </div>
                </div>

                {/* Pages Preview */}
                <div className="space-y-4">
                  {storyDraft.pages.map((page, index) => (
                    <div key={index} className="bg-card rounded-lg p-6 border border-border">
                      <h4 className="font-semibold mb-4">Page {index + 1}</h4>
                      {page.imageUrl ? (
                        <div className="relative group w-full max-w-md mx-auto">
                          <img src={page.imageUrl} alt={page.imageAlt} className="w-full rounded-lg mb-4" />
                          <button
                            onClick={() => {
                              // Get the image prompt used for this page
                              const imagePrompt = page.imageAlt || storyDraft.outline[index]?.imagePrompt || '';
                              setRegenerateModal({
                                isOpen: true,
                                pageNumber: index + 1,
                                currentImageUrl: page.imageUrl,
                                currentPrompt: imagePrompt
                              });
                            }}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate
                          </button>
                          <button
                            onClick={() => {
                              const imagePrompt = page.imageAlt || storyDraft.outline[index]?.imagePrompt || '';
                              navigator.clipboard.writeText(imagePrompt);
                              showNotification({
                                title: 'Prompt Copied',
                                message: 'Image prompt copied to clipboard',
                                type: 'info'
                              });
                            }}
                            className="absolute top-2 left-2 bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Prompt
                          </button>
                        </div>
                      ) : (
                        <div className="w-full max-w-md mx-auto mb-4 p-8 bg-muted rounded-lg text-center">
                          <p className="text-muted-foreground mb-4">No image generated</p>
                          <button
                            onClick={async () => {

                              setGeneratingImageIndex(index);
                              try {
                                showNotification({
                                  title: 'Generating',
                                  message: `Generating image for page ${index + 1}...`,
                                  type: 'info'
                                });
                                
                                const imageResponse = await fetch('/api/admin/generate-page-image', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${await user?.getIdToken()}`
                                  },
                                  body: JSON.stringify({
                                    pageNumber: index + 1,
                                    imagePrompt: storyDraft.outline[index].imagePrompt,
                                    characterDescription: storyDraft.characterSheet.mainCharacter.visualDescription,
                                    visualStyle: storyDraft.characterSheet.visualStyle,
                                    setting: storyDraft.characterSheet.setting.location,
                                    characterReferenceImage: storyDraft.characterSheet.mainCharacter.referenceImage,
                                    // Add story context for better image generation
                                    storyContext: {
                                      characterName: storyDraft.characterSheet.mainCharacter.name,
                                      characterRole: storyDraft.characterSheet.mainCharacter.description,
                                      pageText: page.text,
                                      pageTranslation: page.translation
                                    }
                                  })
                                });

                                const responseData = await imageResponse.json();

                                if (imageResponse.ok && responseData.success) {
                                  const { pageImage } = responseData;
                                  if (pageImage?.imageUrl) {
                                    // Update the page with the new image
                                    const updatedPages = [...storyDraft.pages];
                                    updatedPages[index] = {
                                      ...updatedPages[index],
                                      imageUrl: pageImage.imageUrl,
                                      imageAlt: pageImage.imageAlt
                                    };
                                    setStoryDraft({
                                      ...storyDraft,
                                      pages: updatedPages
                                    });
                                    showNotification({
                                      title: 'Success',
                                      message: `Image generated successfully using ${responseData.metadata?.modelUsed || 'unknown model'}`,
                                      type: 'success'
                                    });
                                  } else {
                                    showNotification({
                                      title: 'Warning',
                                      message: pageImage?.error || 'Image generation returned no URL',
                                      type: 'warning'
                                    });
                                  }
                                } else {
                                  throw new Error(responseData.error || 'Failed to generate image');
                                }
                              } catch (error: any) {
                                console.error('Failed to generate image:', error);
                                showNotification({
                                  title: 'Error',
                                  message: error.message || 'Failed to generate image',
                                  type: 'error'
                                });
                              } finally {
                                setGeneratingImageIndex(null);
                              }
                            }}
                            disabled={generatingImageIndex === index}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {generatingImageIndex === index ? 'Generating...' : 'Try Generate Image'}
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium mb-2">Japanese:</p>
                          <div className="japanese-text text-sm" dangerouslySetInnerHTML={{ __html: page.text }} />
                        </div>
                        <div>
                          <p className="font-medium mb-2">English:</p>
                          <p className="text-sm">{page.translation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quiz Questions */}
                {(storyDraft as any).quiz && (storyDraft as any).quiz.length > 0 && (
                  <div className="bg-card rounded-lg p-6 border border-border">
                    <h3 className="text-lg font-semibold mb-4">Quiz Questions</h3>
                    <div className="space-y-4">
                      {(storyDraft as any).quiz.map((question: any, index: number) => (
                        <div key={question.id || index} className="p-4 bg-muted rounded-lg">
                          <p className="font-medium mb-2">Q{index + 1}: {question.question}</p>
                          <div className="space-y-1 ml-4">
                            {question.options.map((option: string, optIndex: number) => (
                              <div 
                                key={optIndex} 
                                className={`text-sm ${optIndex === question.correctIndex ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}
                              >
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {optIndex === question.correctIndex && ' ✓'}
                              </div>
                            ))}
                          </div>
                          {question.explanation && (
                            <p className="text-sm text-muted-foreground mt-2 ml-4">
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('setup')}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                  >
                    {strings.admin.aiStoryGeneration.preview.discardStory}
                  </button>
                  <button
                    onClick={handlePublish}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    {strings.admin.aiStoryGeneration.preview.publishStory}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      
      {/* Regenerate Image Modal */}
      {regenerateModal && storyDraft && (
        <RegenerateImageModal
          isOpen={regenerateModal.isOpen}
          onClose={() => setRegenerateModal(null)}
          pageNumber={regenerateModal.pageNumber}
          currentImageUrl={regenerateModal.currentImageUrl}
          currentPrompt={regenerateModal.currentPrompt}
          characterName={storyDraft.characterSheet.mainCharacter.name}
          characterDescription={storyDraft.characterSheet.mainCharacter.visualDescription}
          visualStyle={storyDraft.characterSheet.visualStyle || 'anime illustration style'}
          modelSheetUrl={storyDraft.characterSheet.mainCharacter.referenceImage}
          characterId={characterProfile?.characterId}
          sessionId={sessionId || undefined}
          user={user}
          onRegenerate={async (newImageUrl, newPrompt) => {
            // Store the regenerated image permanently
            let permanentUrl = newImageUrl;
            
            try {
              const storeResponse = await fetch('/api/admin/store-image', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify({
                  imageUrl: newImageUrl,
                  storagePath: `stories/${storyDraft.id}/pages/page-${regenerateModal.pageNumber}-regenerated-${Date.now()}.jpg`
                })
              });
              
              if (storeResponse.ok) {
                const { url } = await storeResponse.json();
                permanentUrl = url;

              }
            } catch (error) {
              console.error('Error storing regenerated image:', error);
            }
            
            // Update the story draft with the permanent URL
            const updatedPages = [...storyDraft.pages];
            updatedPages[regenerateModal.pageNumber - 1] = {
              ...updatedPages[regenerateModal.pageNumber - 1],
              imageUrl: permanentUrl,
              imageAlt: newPrompt
            };
            setStoryDraft({
              ...storyDraft,
              pages: updatedPages
            });
            showNotification({
              title: 'Image Updated',
              message: `Page ${regenerateModal.pageNumber} image regenerated successfully`,
              type: 'success'
            });
            setRegenerateModal(null);
          }}
        />
      )}
      </div>
    </AdminLayout>
  );
}