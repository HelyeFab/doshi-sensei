// Types for Kanji Mastery System
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export interface Card {
  id: string;
  kanji: string;
  meaning: string;
  reading: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview?: Date;
}

export interface ReviewLog {
  rating: Rating;
  state: State;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  review: Date;
}

export interface FSRSParameters {
  requestRetention: number;
  maximumInterval: number;
  w: number[];
}

export interface ReviewResult {
  card: Card;
  log: ReviewLog;
}