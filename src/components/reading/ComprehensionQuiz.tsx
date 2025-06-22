'use client';

import { useState, useEffect } from 'react';
import { NewsArticle } from '@/types/news';
import {
  ComprehensionQuestion,
  ReadingAnalyticsManager,
  formatReadingTime,
  getComprehensionLevel
} from '@/utils/readingAnalytics';

interface ComprehensionQuizProps {
  article: NewsArticle;
  sessionId: string;
  onComplete: (score: number) => void;
  onClose: () => void;
}

interface QuizState {
  currentQuestionIndex: number;
  answers: (string | number)[];
  showResults: boolean;
  score: number;
  timeStarted: Date;
  timeCompleted?: Date;
}

export function ComprehensionQuiz({ article, sessionId, onComplete, onClose }: ComprehensionQuizProps) {
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: [],
    showResults: false,
    score: 0,
    timeStarted: new Date()
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Generate questions when component mounts
  useEffect(() => {
    const generatedQuestions = ReadingAnalyticsManager.generateComprehensionQuestions(article);
    setQuestions(generatedQuestions);
    setQuizState(prev => ({
      ...prev,
      answers: new Array(generatedQuestions.length).fill(null)
    }));
  }, [article]);

  const currentQuestion = questions[quizState.currentQuestionIndex];
  const isLastQuestion = quizState.currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = quizState.currentQuestionIndex === 0;

  // Handle answer selection
  const handleAnswerSelect = (answer: string | number) => {
    setSelectedAnswer(answer);

    // Update answers array
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestionIndex] = answer;
    setQuizState(prev => ({ ...prev, answers: newAnswers }));
  };

  // Go to next question
  const handleNext = () => {
    if (selectedAnswer === null) return;

    setShowExplanation(true);

    // Auto-advance after showing explanation
    setTimeout(() => {
      if (isLastQuestion) {
        completeQuiz();
      } else {
        setQuizState(prev => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        }));
        setSelectedAnswer(null);
        setShowExplanation(false);
      }
    }, 3000); // Show explanation for 3 seconds
  };

  // Go to previous question
  const handlePrevious = () => {
    if (isFirstQuestion) return;

    setQuizState(prev => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex - 1
    }));

    // Restore previous answer
    const previousAnswer = quizState.answers[quizState.currentQuestionIndex - 1];
    setSelectedAnswer(previousAnswer);
    setShowExplanation(false);
  };

  // Complete the quiz and calculate score
  const completeQuiz = () => {
    const correctAnswers = questions.reduce((count, question, index) => {
      return quizState.answers[index] === question.correctAnswer ? count + 1 : count;
    }, 0);

    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeCompleted = new Date();

    setQuizState(prev => ({
      ...prev,
      showResults: true,
      score,
      timeCompleted
    }));

    // Update reading session with comprehension score
    ReadingAnalyticsManager.completeReadingSession(sessionId, score);

    // Notify parent component
    onComplete(score);
  };

  // Skip quiz
  const handleSkip = () => {
    // Update reading session to indicate quiz was skipped
    ReadingAnalyticsManager.completeReadingSession(sessionId, undefined);
    onClose();
  };

  // Restart quiz
  const handleRestart = () => {
    setQuizState({
      currentQuestionIndex: 0,
      answers: new Array(questions.length).fill(null),
      showResults: false,
      score: 0,
      timeStarted: new Date()
    });
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg p-6 w-full max-w-2xl">
          <div className="text-center">
            <div className="animate-spin text-2xl mb-4">📚</div>
            <p className="text-foreground">理解度テストを準備中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (quizState.showResults) {
    const timeTaken = quizState.timeCompleted
      ? (quizState.timeCompleted.getTime() - quizState.timeStarted.getTime()) / 1000
      : 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg p-6 w-full max-w-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">
              {quizState.score >= 80 ? '🎉' : quizState.score >= 60 ? '👍' : '📚'}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              理解度テスト完了！
            </h2>
            <div className="text-3xl font-bold text-primary mb-2">
              {quizState.score}点
            </div>
            <div className="text-muted-foreground">
              {getComprehensionLevel(quizState.score)}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {questions.filter((_, i) => quizState.answers[i] === questions[i].correctAnswer).length}
                  </div>
                  <div className="text-sm text-muted-foreground">正答数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatReadingTime(Math.floor(timeTaken))}
                  </div>
                  <div className="text-sm text-muted-foreground">所要時間</div>
                </div>
              </div>
            </div>

            {/* Results breakdown */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">回答結果</h3>
              {questions.map((question, index) => {
                const userAnswer = quizState.answers[index];
                const isCorrect = userAnswer === question.correctAnswer;

                return (
                  <div key={question.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-foreground">
                        {question.question.length > 50
                          ? question.question.substring(0, 50) + '...'
                          : question.question
                        }
                      </div>
                      {!isCorrect && (
                        <div className="text-xs text-muted-foreground mt-1">
                          正解: {question.options?.[question.correctAnswer as number] || question.correctAnswer}
                        </div>
                      )}
                    </div>
                    <div className="text-lg">
                      {isCorrect ? '✅' : '❌'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendations based on score */}
            {quizState.score < 70 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  📈 改善のヒント
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• 記事をもう一度ゆっくり読み返してみましょう</li>
                  <li>• 分からない単語を辞書で調べてみましょう</li>
                  <li>• 同じレベルの記事をもっと読んで慣れましょう</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              もう一度挑戦
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              完了
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-6 w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">理解度テスト</h2>
            <p className="text-sm text-muted-foreground">
              {quizState.currentQuestionIndex + 1} / {questions.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((quizState.currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {currentQuestion.question}
            </h3>
            {currentQuestion.difficulty && (
              <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                {currentQuestion.difficulty}レベル
              </span>
            )}
          </div>

          {/* Answer options */}
          <div className="space-y-3">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showExplanation}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  selectedAnswer === index
                    ? showExplanation
                      ? index === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-primary bg-primary/10'
                    : showExplanation && index === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border bg-background hover:bg-muted'
                } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                    selectedAnswer === index
                      ? showExplanation
                        ? index === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-red-500 bg-red-500 text-white'
                        : 'border-primary bg-primary text-primary-foreground'
                      : showExplanation && index === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-foreground">{option}</span>
                </div>
              </button>
            ))}

            {currentQuestion.type === 'true-false' && currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showExplanation}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  selectedAnswer === index
                    ? showExplanation
                      ? index === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-primary bg-primary/10'
                    : showExplanation && index === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border bg-background hover:bg-muted'
                } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm ${
                    selectedAnswer === index
                      ? showExplanation
                        ? index === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-red-500 bg-red-500 text-white'
                        : 'border-primary bg-primary text-primary-foreground'
                      : showExplanation && index === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300'
                  }`}>
                    {index === 0 ? '○' : '×'}
                  </div>
                  <span className="text-foreground">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Explanation */}
          {showExplanation && currentQuestion.explanation && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">💡</span>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">解説</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isFirstQuestion
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            ← 前の問題
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              スキップ
            </button>
            <button
              onClick={handleNext}
              disabled={selectedAnswer === null || showExplanation}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedAnswer === null || showExplanation
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isLastQuestion ? '結果を見る' : '次の問題 →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComprehensionQuiz;
