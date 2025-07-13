'use client';

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

export default function GenerateStoryPage() {
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

    try {
      // Step 1: Generate character sheet ONLY
      const characterResponse = await fetch('/api/admin/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
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
      
      // Step 2: Generate outline separately
      setGenerationProgress({ step: 'outline', message: strings.admin.aiStoryGeneration.generationSteps.outline });
      
      const outlineResponse = await fetch('/api/admin/generate-story-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          theme,
          jlptLevel,
          pages: pageCount,
          characterSheet
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
        id: `ai-draft-${Date.now()}`,
        title: '', // Will be set after generation
        titleJa: '',
        description: '',
        theme,
        jlptLevel,
        characterSheet,
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

      // Step 3: Generate pages one by one with separate text and image calls
      const generatedPages = [];
      for (let i = 0; i < outline.length; i++) {
        // Generate text first
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
            'Authorization': `Bearer ${await user.getIdToken()}`
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
          continue;
        }

        const { pageText } = await textResponse.json();

        let imageUrl = '';
        let imageAlt = outline[i].imagePrompt;

        // Only generate image if enabled
        if (generateImages) {
          setGenerationProgress({
            step: 'images',
            currentPage: i + 1,
            totalPages: outline.length,
            message: `Generating image for page ${i + 1} of ${outline.length}...`
          });

          const imageResponse = await fetch('/api/admin/generate-page-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({
              pageNumber: i + 1,
              imagePrompt: outline[i].imagePrompt,
              characterDescription: characterSheet.mainCharacter.visualDescription,
              visualStyle: characterSheet.visualStyle,
              setting: characterSheet.setting.location,
              // Add story context for better image generation
              storyContext: {
                characterName: characterSheet.mainCharacter.name,
                characterAge: characterSheet.mainCharacter.age,
                characterRole: characterSheet.mainCharacter.description,
                pageText: pageText.text,
                pageTranslation: pageText.translation
              }
            })
          });
          
          if (imageResponse.ok) {
            const { pageImage } = await imageResponse.json();
            imageUrl = pageImage.imageUrl || '';
            imageAlt = pageImage.imageAlt || imageAlt;
          } else {
            console.error(`Failed to generate image for page ${i + 1}, continuing without image`);
          }
        }

        // Combine text and image results
        generatedPages.push({
          pageNumber: i + 1,
          text: pageText.text,
          translation: pageText.translation,
          imageUrl: imageUrl,
          imageAlt: imageAlt
        });

        // Update draft with new page
        draft.pages = generatedPages;
        setStoryDraft({ ...draft });
      }

      // Step 3: Generate quiz
      setGenerationProgress({ step: 'quiz', message: strings.admin.aiStoryGeneration.generationSteps.quiz });
      
      const quizResponse = await fetch('/api/admin/generate-story-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
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
        const { quiz: generatedQuiz } = await quizResponse.json();
        quiz = generatedQuiz;
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
    <>
      {/* Top Gradient Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => router.push('/admin/stories')}
              className="mr-2 p-2 rounded-full hover:bg-muted transition-colors"
              title={strings.admin.backToDashboard}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{strings.admin.aiStoryGeneration.title}</h1>
              <p className="text-muted-foreground">{strings.admin.aiStoryGeneration.subtitle}</p>
            </div>
          </div>

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
                            'Authorization': `Bearer ${await user.getIdToken()}`
                          }
                        });
                        const data = await response.json();
                        console.log('OpenAI test result:', data);
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
                        <img src={page.imageUrl} alt={page.imageAlt} className="w-full max-w-md mx-auto rounded-lg mb-4" />
                      ) : (
                        <div className="w-full max-w-md mx-auto mb-4 p-8 bg-muted rounded-lg text-center">
                          <p className="text-muted-foreground mb-4">No image generated</p>
                          <button
                            onClick={async () => {
                              console.log('Try Generate Image clicked for page', index + 1);
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
                                    'Authorization': `Bearer ${await user.getIdToken()}`
                                  },
                                  body: JSON.stringify({
                                    pageNumber: index + 1,
                                    imagePrompt: storyDraft.outline[index].imagePrompt,
                                    characterDescription: storyDraft.characterSheet.mainCharacter.visualDescription,
                                    visualStyle: storyDraft.characterSheet.visualStyle,
                                    setting: storyDraft.characterSheet.setting.location,
                                    // Add story context for better image generation
                                    storyContext: {
                                      characterName: storyDraft.characterSheet.mainCharacter.name,
                                      characterAge: storyDraft.characterSheet.mainCharacter.age,
                                      characterRole: storyDraft.characterSheet.mainCharacter.description,
                                      pageText: page.text,
                                      pageTranslation: page.translation
                                    }
                                  })
                                });
                                
                                console.log('Image response status:', imageResponse.status);
                                const responseData = await imageResponse.json();
                                console.log('Image response data:', responseData);
                                
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
        </div>
      </div>
    </>
  );
}