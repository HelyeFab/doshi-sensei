'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface FeatureAnalytics {
  games: {
    started: Record<string, number>;
    completed: Record<string, number>;
    totalScore: Record<string, number>;
  };
  drills: {
    started: Record<string, number>;
    completed: Record<string, number>;
    totalCorrect: number;
    totalQuestions: number;
  };
  flashcards: {
    sessions: number;
    reviewed: number;
  };
  lists: {
    created: number;
    used: number;
  };
}

export default function FeatureAnalyticsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [featureData, setFeatureData] = useState<FeatureAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchFeatureAnalytics();
    }
  }, [selectedDate, adminLoading, isAdmin]);

  const fetchFeatureAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const analyticsRef = doc(db, 'site-analytics', selectedDate, 'daily', 'aggregated');
      const snapshot = await getDoc(analyticsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Process feature data
        const featureAnalytics: FeatureAnalytics = {
          games: {
            started: {},
            completed: {},
            totalScore: {}
          },
          drills: {
            started: {},
            completed: {},
            totalCorrect: data.features?.['drills.totalCorrect'] || 0,
            totalQuestions: data.features?.['drills.totalQuestions'] || 0
          },
          flashcards: {
            sessions: data.features?.['flashcards.sessions'] || 0,
            reviewed: data.features?.['flashcards.reviewed'] || 0
          },
          lists: {
            created: data.features?.['lists.created'] || 0,
            used: data.features?.['lists.used'] || 0
          }
        };

        // Extract feature data
        Object.entries(data.features || {}).forEach(([key, value]) => {
          if (key.startsWith('games.started.')) {
            const game = key.replace('games.started.', '');
            featureAnalytics.games.started[game] = value as number;
          } else if (key.startsWith('games.completed.')) {
            const game = key.replace('games.completed.', '');
            featureAnalytics.games.completed[game] = value as number;
          } else if (key.startsWith('games.totalScore.')) {
            const game = key.replace('games.totalScore.', '');
            featureAnalytics.games.totalScore[game] = value as number;
          } else if (key.startsWith('drills.started.')) {
            const drill = key.replace('drills.started.', '');
            featureAnalytics.drills.started[drill] = value as number;
          } else if (key.startsWith('drills.completed.')) {
            const drill = key.replace('drills.completed.', '');
            featureAnalytics.drills.completed[drill] = value as number;
          }
        });

        setFeatureData(featureAnalytics);
      } else {
        setFeatureData(null);
      }
    } catch (err) {
      console.error('Error fetching feature analytics:', err);
      setError('Failed to load feature analytics');
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) return <div>Loading admin status...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  // Calculate metrics
  const totalGameStarts = featureData ? 
    Object.values(featureData.games.started).reduce((sum, val) => sum + val, 0) : 0;
  const totalGameCompletions = featureData ? 
    Object.values(featureData.games.completed).reduce((sum, val) => sum + val, 0) : 0;
  const gameCompletionRate = totalGameStarts > 0 ? 
    Math.round((totalGameCompletions / totalGameStarts) * 100) : 0;

  const totalDrillStarts = featureData ? 
    Object.values(featureData.drills.started).reduce((sum, val) => sum + val, 0) : 0;
  const totalDrillCompletions = featureData ? 
    Object.values(featureData.drills.completed).reduce((sum, val) => sum + val, 0) : 0;
  const drillCompletionRate = totalDrillStarts > 0 ? 
    Math.round((totalDrillCompletions / totalDrillStarts) * 100) : 0;
  const drillAccuracy = featureData && featureData.drills.totalQuestions > 0 ?
    Math.round((featureData.drills.totalCorrect / featureData.drills.totalQuestions) * 100) : 0;

  return (
    <AdminLayout title="Feature Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Feature Analytics</h1>
            <p className="text-muted-foreground">Track usage of games, drills, and learning tools</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border rounded-md bg-background"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Loading/Error states */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-4xl mb-2">🎮</div>
            <p>Loading feature analytics...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !featureData && (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-muted-foreground">No feature data available for {selectedDate}</p>
          </div>
        )}

        {/* Feature data */}
        {!loading && !error && featureData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Games Played</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalGameStarts}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={gameCompletionRate} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{gameCompletionRate}% completed</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Drills Practiced</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDrillStarts}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {drillAccuracy}% accuracy
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Flashcard Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{featureData.flashcards.sessions}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {featureData.flashcards.reviewed} cards reviewed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Study Lists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Created:</span>
                      <span className="font-medium">{featureData.lists.created}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Used:</span>
                      <span className="font-medium">{featureData.lists.used}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Feature Tabs */}
            <Tabs defaultValue="games" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="games">Games</TabsTrigger>
                <TabsTrigger value="drills">Drills</TabsTrigger>
                <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                <TabsTrigger value="lists">Study Lists</TabsTrigger>
              </TabsList>

              <TabsContent value="games" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Game Sessions</CardTitle>
                      <CardDescription>Starts and completions by game</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(featureData.games.started).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(featureData.games.started)
                            .sort(([,a], [,b]) => b - a)
                            .map(([game, starts]) => {
                              const completed = featureData.games.completed[game] || 0;
                              const rate = starts > 0 ? Math.round((completed / starts) * 100) : 0;
                              return (
                                <div key={game} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm capitalize">{game.replace(/_/g, ' ')}</span>
                                    <div className="text-sm text-right">
                                      <span className="font-medium">{starts}</span>
                                      <span className="text-muted-foreground"> starts, </span>
                                      <span className="font-medium">{completed}</span>
                                      <span className="text-muted-foreground"> completed</span>
                                    </div>
                                  </div>
                                  <Progress value={rate} className="h-2" />
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No games played today</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Game Scores</CardTitle>
                      <CardDescription>Average scores by game</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(featureData.games.totalScore).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(featureData.games.totalScore)
                            .map(([game, totalScore]) => {
                              const completed = featureData.games.completed[game] || 1;
                              const avgScore = Math.round(totalScore / completed);
                              return { game, avgScore };
                            })
                            .sort((a, b) => b.avgScore - a.avgScore)
                            .map(({ game, avgScore }) => (
                              <div key={game} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{game.replace(/_/g, ' ')}</span>
                                <span className="font-medium">{avgScore.toLocaleString()}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No score data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="drills" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Drill Practice</CardTitle>
                      <CardDescription>Sessions by drill type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(featureData.drills.started).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(featureData.drills.started)
                            .sort(([,a], [,b]) => b - a)
                            .map(([drill, starts]) => {
                              const completed = featureData.drills.completed[drill] || 0;
                              const rate = starts > 0 ? Math.round((completed / starts) * 100) : 0;
                              return (
                                <div key={drill} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm capitalize">{drill.replace(/_/g, ' ')}</span>
                                    <div className="text-sm text-right">
                                      <span className="font-medium">{starts}</span>
                                      <span className="text-muted-foreground"> started</span>
                                    </div>
                                  </div>
                                  <Progress value={rate} className="h-2" />
                                  <p className="text-xs text-muted-foreground">{rate}% completion rate</p>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No drills practiced today</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Drill Performance</CardTitle>
                      <CardDescription>Overall accuracy and stats</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-3xl font-bold">{drillAccuracy}%</div>
                          <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-xl font-medium">{featureData.drills.totalCorrect}</div>
                            <p className="text-xs text-muted-foreground">Correct Answers</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-xl font-medium">{featureData.drills.totalQuestions}</div>
                            <p className="text-xs text-muted-foreground">Total Questions</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="flashcards" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Flashcard Activity</CardTitle>
                    <CardDescription>Study session statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{featureData.flashcards.sessions}</div>
                        <p className="text-sm text-muted-foreground">Study Sessions</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{featureData.flashcards.reviewed}</div>
                        <p className="text-sm text-muted-foreground">Cards Reviewed</p>
                      </div>
                    </div>
                    
                    {featureData.flashcards.sessions > 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <strong>Average per session:</strong>{' '}
                          <span className="font-medium">
                            {Math.round(featureData.flashcards.reviewed / featureData.flashcards.sessions)} cards
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lists" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Study List Usage</CardTitle>
                    <CardDescription>List creation and usage patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{featureData.lists.created}</div>
                        <p className="text-sm text-muted-foreground">Lists Created</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-3xl font-bold">{featureData.lists.used}</div>
                        <p className="text-sm text-muted-foreground">Lists Used</p>
                      </div>
                    </div>
                    
                    {featureData.lists.created > 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <strong>Usage rate:</strong>{' '}
                          <span className="font-medium">
                            {Math.round((featureData.lists.used / featureData.lists.created) * 100)}%
                          </span>{' '}
                          of created lists were used
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
}