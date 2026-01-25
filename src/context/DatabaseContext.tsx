import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { initializeDatabase } from '../database/schema';
import { hasExercises } from '../database/operations';
import { seedExercises } from '../data/seedExercises';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      const database = await SQLite.openDatabaseAsync('pump.db');
      await initializeDatabase(database);

      // Seed exercises if empty
      const hasData = await hasExercises(database);
      if (!hasData) {
        await seedExercises(database);
      }

      setDb(database);
      setIsReady(true);
    }
    setup();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context.db) {
    throw new Error('Database not initialized');
  }
  return context.db;
}

export function useDatabaseReady() {
  return useContext(DatabaseContext).isReady;
}
