import * as SQLite from 'expo-sqlite';
import { createExercise } from '../database/operations';

const DEFAULT_EXERCISES = [
  // Chest
  { name: 'Bench Press', notes: 'Barbell, flat bench' },
  { name: 'Incline Bench Press', notes: 'Barbell, incline bench' },
  { name: 'Dumbbell Bench Press', notes: 'Flat bench' },
  { name: 'Chest Fly Machine', notes: null },
  { name: 'Cable Crossover', notes: null },
  { name: 'Push-Ups', notes: null },

  // Back
  { name: 'Lat Pulldown', notes: 'Wide grip' },
  { name: 'Seated Cable Row', notes: null },
  { name: 'Bent Over Row', notes: 'Barbell' },
  { name: 'Dumbbell Row', notes: 'Single arm' },
  { name: 'Pull-Ups', notes: null },
  { name: 'T-Bar Row', notes: null },
  { name: 'Face Pulls', notes: 'Cable, rope attachment' },

  // Shoulders
  { name: 'Overhead Press', notes: 'Barbell or dumbbell' },
  { name: 'Lateral Raise', notes: 'Dumbbells' },
  { name: 'Front Raise', notes: 'Dumbbells' },
  { name: 'Rear Delt Fly', notes: 'Machine or dumbbells' },
  { name: 'Shoulder Press Machine', notes: null },

  // Arms
  { name: 'Bicep Curl', notes: 'Barbell or dumbbells' },
  { name: 'Hammer Curl', notes: 'Dumbbells' },
  { name: 'Preacher Curl', notes: null },
  { name: 'Cable Curl', notes: null },
  { name: 'Tricep Pushdown', notes: 'Cable, rope or bar' },
  { name: 'Tricep Dip', notes: null },
  { name: 'Overhead Tricep Extension', notes: 'Cable or dumbbell' },
  { name: 'Skull Crushers', notes: 'EZ bar or dumbbells' },

  // Legs
  { name: 'Squat', notes: 'Barbell, back squat' },
  { name: 'Leg Press', notes: null },
  { name: 'Leg Extension', notes: 'Machine' },
  { name: 'Leg Curl', notes: 'Lying or seated' },
  { name: 'Romanian Deadlift', notes: 'Barbell or dumbbells' },
  { name: 'Lunges', notes: 'Walking or stationary' },
  { name: 'Calf Raise', notes: 'Standing or seated' },
  { name: 'Hip Abductor', notes: 'Machine' },
  { name: 'Hip Adductor', notes: 'Machine' },

  // Compound
  { name: 'Deadlift', notes: 'Conventional or sumo' },
  { name: 'Barbell Row', notes: null },

  // Core
  { name: 'Plank', notes: null },
  { name: 'Cable Crunch', notes: null },
  { name: 'Hanging Leg Raise', notes: null },
  { name: 'Ab Machine', notes: null },
];

export async function seedExercises(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const exercise of DEFAULT_EXERCISES) {
    await createExercise(db, exercise.name, exercise.notes);
  }
}
