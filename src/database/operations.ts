import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  Exercise,
  Program,
  ProgramExercise,
  WorkoutSession,
  ExerciseLog,
  WeightEntry,
  ExerciseWithLastLog,
} from '../types';

function generateId(): string {
  return Crypto.randomUUID();
}

// Exercise operations
export async function getAllExercises(db: SQLite.SQLiteDatabase): Promise<Exercise[]> {
  return await db.getAllAsync<Exercise>('SELECT id, name, notes FROM exercises ORDER BY name');
}

export async function createExercise(
  db: SQLite.SQLiteDatabase,
  name: string,
  notes: string | null = null
): Promise<Exercise> {
  const id = generateId();
  await db.runAsync('INSERT INTO exercises (id, name, notes) VALUES (?, ?, ?)', [id, name, notes]);
  return { id, name, notes };
}

export async function updateExercise(
  db: SQLite.SQLiteDatabase,
  id: string,
  name: string,
  notes: string | null
): Promise<void> {
  await db.runAsync('UPDATE exercises SET name = ?, notes = ? WHERE id = ?', [name, notes, id]);
}

export async function deleteExercise(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

// Program operations
export async function getAllPrograms(db: SQLite.SQLiteDatabase): Promise<Program[]> {
  return await db.getAllAsync<Program>('SELECT id, name, description FROM programs ORDER BY name');
}

export async function createProgram(db: SQLite.SQLiteDatabase, name: string, description: string | null = null): Promise<Program> {
  const id = generateId();
  await db.runAsync('INSERT INTO programs (id, name, description) VALUES (?, ?, ?)', [id, name, description]);
  return { id, name, description };
}

export async function updateProgram(
  db: SQLite.SQLiteDatabase,
  id: string,
  name: string,
  description: string | null
): Promise<void> {
  await db.runAsync('UPDATE programs SET name = ?, description = ? WHERE id = ?', [name, description, id]);
}

export async function deleteProgram(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  // Delete exercise logs for all sessions of this program
  await db.runAsync(
    'DELETE FROM exercise_logs WHERE session_id IN (SELECT id FROM workout_sessions WHERE program_id = ?)',
    [id]
  );
  // Delete workout sessions for this program
  await db.runAsync('DELETE FROM workout_sessions WHERE program_id = ?', [id]);
  // Delete program exercises
  await db.runAsync('DELETE FROM program_exercises WHERE program_id = ?', [id]);
  // Finally delete the program itself
  await db.runAsync('DELETE FROM programs WHERE id = ?', [id]);
}

export async function getProgramExercises(
  db: SQLite.SQLiteDatabase,
  programId: string
): Promise<Exercise[]> {
  return await db.getAllAsync<Exercise>(
    `SELECT e.id, e.name, e.notes
     FROM exercises e
     JOIN program_exercises pe ON e.id = pe.exercise_id
     WHERE pe.program_id = ?
     ORDER BY pe.order_index`,
    [programId]
  );
}

export async function setProgramExercises(
  db: SQLite.SQLiteDatabase,
  programId: string,
  exerciseIds: string[]
): Promise<void> {
  await db.runAsync('DELETE FROM program_exercises WHERE program_id = ?', [programId]);
  for (let i = 0; i < exerciseIds.length; i++) {
    await db.runAsync(
      'INSERT INTO program_exercises (program_id, exercise_id, order_index) VALUES (?, ?, ?)',
      [programId, exerciseIds[i], i]
    );
  }
}

// Workout Session operations
export async function getActiveSession(
  db: SQLite.SQLiteDatabase
): Promise<WorkoutSession | null> {
  const result = await db.getFirstAsync<{
    id: string;
    program_id: string;
    program_name: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    is_active: number;
  }>(
    `SELECT ws.id, ws.program_id, p.name as program_name, ws.start_time, ws.end_time, ws.duration_minutes, ws.is_active
     FROM workout_sessions ws
     JOIN programs p ON ws.program_id = p.id
     WHERE ws.is_active = 1`
  );
  if (!result) return null;
  return {
    id: result.id,
    programId: result.program_id,
    programName: result.program_name,
    startTime: result.start_time,
    endTime: result.end_time,
    durationMinutes: result.duration_minutes,
    isActive: result.is_active === 1,
  };
}

export async function startWorkoutSession(
  db: SQLite.SQLiteDatabase,
  programId: string
): Promise<WorkoutSession> {
  const id = generateId();
  const startTime = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO workout_sessions (id, program_id, start_time, is_active) VALUES (?, ?, ?, 1)',
    [id, programId, startTime]
  );
  const program = await db.getFirstAsync<Program>('SELECT * FROM programs WHERE id = ?', [
    programId,
  ]);

  // Create empty exercise logs for all exercises in the program
  const exercises = await getProgramExercises(db, programId);
  for (const exercise of exercises) {
    const logId = generateId();
    await db.runAsync(
      'INSERT INTO exercise_logs (id, session_id, exercise_id) VALUES (?, ?, ?)',
      [logId, id, exercise.id]
    );
  }

  return {
    id,
    programId,
    programName: program?.name || '',
    startTime,
    endTime: null,
    durationMinutes: null,
    isActive: true,
  };
}

export async function finishWorkoutSession(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<void> {
  const session = await db.getFirstAsync<{ start_time: string }>(
    'SELECT start_time FROM workout_sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) return;

  const endTime = new Date();
  const startTime = new Date(session.start_time);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  await db.runAsync(
    'UPDATE workout_sessions SET end_time = ?, duration_minutes = ?, is_active = 0 WHERE id = ?',
    [endTime.toISOString(), durationMinutes, sessionId]
  );
}

export async function cancelWorkoutSession(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<void> {
  await db.runAsync('DELETE FROM exercise_logs WHERE session_id = ?', [sessionId]);
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}

export async function getSessionExercisesWithLastLog(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<ExerciseWithLastLog[]> {
  const session = await db.getFirstAsync<{ program_id: string }>(
    'SELECT program_id FROM workout_sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) return [];

  const exercises = await getProgramExercises(db, session.program_id);
  const result: ExerciseWithLastLog[] = [];

  for (const exercise of exercises) {
    // Get current session log
    const currentLog = await db.getFirstAsync<{
      id: string;
      session_id: string;
      exercise_id: string;
      weight: number | null;
      reps: number | null;
      notes: string | null;
      completed_at: string | null;
    }>(
      'SELECT * FROM exercise_logs WHERE session_id = ? AND exercise_id = ?',
      [sessionId, exercise.id]
    );

    // Get last completed log for this exercise (from any session, not current)
    const lastLog = await db.getFirstAsync<{
      weight: number;
      reps: number;
      notes: string | null;
      completed_at: string;
    }>(
      `SELECT el.weight, el.reps, el.notes, el.completed_at
       FROM exercise_logs el
       JOIN workout_sessions ws ON el.session_id = ws.id
       WHERE el.exercise_id = ?
         AND ws.id != ?
         AND ws.is_active = 0
         AND el.weight IS NOT NULL
       ORDER BY el.completed_at DESC
       LIMIT 1`,
      [exercise.id, sessionId]
    );

    result.push({
      ...exercise,
      lastWeight: lastLog?.weight || null,
      lastReps: lastLog?.reps || null,
      lastNotes: lastLog?.notes || null,
      lastDate: lastLog?.completed_at || null,
      currentLog: currentLog
        ? {
            id: currentLog.id,
            sessionId: currentLog.session_id,
            exerciseId: currentLog.exercise_id,
            weight: currentLog.weight,
            reps: currentLog.reps,
            notes: currentLog.notes,
            completedAt: currentLog.completed_at,
          }
        : null,
    });
  }

  return result;
}

export async function updateExerciseLog(
  db: SQLite.SQLiteDatabase,
  logId: string,
  weight: number | null,
  reps: number | null,
  notes: string | null
): Promise<void> {
  const completedAt = weight !== null && reps !== null ? new Date().toISOString() : null;
  await db.runAsync(
    'UPDATE exercise_logs SET weight = ?, reps = ?, notes = ?, completed_at = ? WHERE id = ?',
    [weight, reps, notes, completedAt, logId]
  );
}

// History operations
export async function getWorkoutHistory(
  db: SQLite.SQLiteDatabase,
  limit: number = 50
): Promise<WorkoutSession[]> {
  const rows = await db.getAllAsync<{
    id: string;
    program_id: string;
    program_name: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    is_active: number;
  }>(
    `SELECT ws.id, ws.program_id, p.name as program_name, ws.start_time, ws.end_time, ws.duration_minutes, ws.is_active
     FROM workout_sessions ws
     JOIN programs p ON ws.program_id = p.id
     WHERE ws.is_active = 0
     ORDER BY ws.start_time DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    isActive: row.is_active === 1,
  }));
}

export async function getSessionLogs(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<(ExerciseLog & { exerciseName: string })[]> {
  const rows = await db.getAllAsync<{
    id: string;
    session_id: string;
    exercise_id: string;
    exercise_name: string;
    weight: number | null;
    reps: number | null;
    notes: string | null;
    completed_at: string | null;
  }>(
    `SELECT el.id, el.session_id, el.exercise_id, e.name as exercise_name, el.weight, el.reps, el.notes, el.completed_at
     FROM exercise_logs el
     JOIN exercises e ON el.exercise_id = e.id
     WHERE el.session_id = ?
     ORDER BY el.completed_at`,
    [sessionId]
  );
  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    notes: row.notes,
    completedAt: row.completed_at,
  }));
}

// Weight tracking operations
export async function getWeightEntries(
  db: SQLite.SQLiteDatabase,
  limit: number = 100
): Promise<WeightEntry[]> {
  return await db.getAllAsync<WeightEntry>(
    'SELECT id, date, weight FROM weight_entries ORDER BY date DESC LIMIT ?',
    [limit]
  );
}

export async function addWeightEntry(
  db: SQLite.SQLiteDatabase,
  weight: number
): Promise<WeightEntry> {
  const id = generateId();
  const date = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `INSERT INTO weight_entries (id, date, weight) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight = ?`,
    [id, date, weight, weight]
  );
  return { id, date, weight };
}

// Seed data check
export async function hasExercises(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );
  return (result?.count || 0) > 0;
}

// Clear all weight entries
export async function clearAllWeightEntries(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM weight_entries');
}

// Get workout stats
export async function getWorkoutStats(db: SQLite.SQLiteDatabase): Promise<{
  totalWorkouts: number;
  avgDurationMinutes: number;
  lastWorkout: { programName: string; date: string } | null;
}> {
  // Total completed workouts
  const totalResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_sessions WHERE is_active = 0'
  );
  const totalWorkouts = totalResult?.count || 0;

  // Average workout duration
  const avgResult = await db.getFirstAsync<{ avg_duration: number | null }>(
    'SELECT AVG(duration_minutes) as avg_duration FROM workout_sessions WHERE is_active = 0 AND duration_minutes IS NOT NULL'
  );
  const avgDurationMinutes = Math.round(avgResult?.avg_duration || 0);

  // Last completed workout
  const lastResult = await db.getFirstAsync<{ program_name: string; end_time: string }>(
    `SELECT p.name as program_name, ws.end_time
     FROM workout_sessions ws
     JOIN programs p ON ws.program_id = p.id
     WHERE ws.is_active = 0
     ORDER BY ws.end_time DESC
     LIMIT 1`
  );
  const lastWorkout = lastResult
    ? { programName: lastResult.program_name, date: lastResult.end_time }
    : null;

  return { totalWorkouts, avgDurationMinutes, lastWorkout };
}

// Debug: Generate sample weight entries
export async function generateSampleWeightEntries(db: SQLite.SQLiteDatabase): Promise<void> {
  const baseWeight = 175;
  const today = new Date();

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 6)); // Spread over ~3 months
    const dateStr = date.toISOString().split('T')[0];
    // Random fluctuation between -3 and +3 lbs, with slight downward trend
    const weight = baseWeight - (14 - i) * 0.2 + (Math.random() * 6 - 3);
    const id = generateId();
    await db.runAsync(
      `INSERT INTO weight_entries (id, date, weight) VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET weight = ?`,
      [id, dateStr, Math.round(weight * 10) / 10, Math.round(weight * 10) / 10]
    );
  }
}
