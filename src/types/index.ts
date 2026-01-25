export interface Exercise {
  id: string;
  name: string;
  notes: string | null;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
}

export interface ProgramExercise {
  programId: string;
  exerciseId: string;
  orderIndex: number;
}

export interface WorkoutSession {
  id: string;
  programId: string;
  programName: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  isActive: boolean;
}

export interface ExerciseLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  weight: number | null;
  reps: number | null;
  notes: string | null;
  completedAt: string | null;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export interface ExerciseWithLastLog extends Exercise {
  lastWeight: number | null;
  lastReps: number | null;
  lastNotes: string | null;
  lastDate: string | null;
  currentLog: ExerciseLog | null;
}
