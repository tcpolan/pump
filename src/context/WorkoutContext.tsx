import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WorkoutSession } from '../types';
import { getActiveSession, startWorkoutSession, finishWorkoutSession, cancelWorkoutSession } from '../database/operations';
import { useDatabase } from './DatabaseContext';

interface WorkoutContextType {
  activeSession: WorkoutSession | null;
  elapsedSeconds: number;
  startWorkout: (programId: string) => Promise<WorkoutSession>;
  finishWorkout: () => Promise<void>;
  cancelWorkout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const db = useDatabase();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const calculateElapsed = useCallback((startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await getActiveSession(db);
    setActiveSession(session);
    if (session) {
      setElapsedSeconds(calculateElapsed(session.startTime));
    }
  }, [db, calculateElapsed]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsed(activeSession.startTime));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeSession, calculateElapsed]);

  const startWorkout = async (programId: string): Promise<WorkoutSession> => {
    const session = await startWorkoutSession(db, programId);
    setActiveSession(session);
    setElapsedSeconds(0);
    return session;
  };

  const finishWorkout = async () => {
    if (activeSession) {
      await finishWorkoutSession(db, activeSession.id);
      setActiveSession(null);
      setElapsedSeconds(0);
    }
  };

  const cancelWorkout = async () => {
    if (activeSession) {
      await cancelWorkoutSession(db, activeSession.id);
      setActiveSession(null);
      setElapsedSeconds(0);
    }
  };

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        elapsedSeconds,
        startWorkout,
        finishWorkout,
        cancelWorkout,
        refreshSession,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider');
  }
  return context;
}
