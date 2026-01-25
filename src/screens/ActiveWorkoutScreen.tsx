import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { useWorkout } from '../context/WorkoutContext';
import { getSessionExercisesWithLastLog, updateExerciseLog } from '../database/operations';
import { ExerciseWithLastLog } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ExerciseCardProps {
  exercise: ExerciseWithLastLog;
  onUpdate: (logId: string, weight: number | null, reps: number | null, notes: string | null) => void;
  localData: { weight: string; reps: string; notes: string } | undefined;
  onLocalChange: (exerciseId: string, data: { weight: string; reps: string; notes: string }) => void;
}

function ExerciseCard({ exercise, onUpdate, localData, onLocalChange }: ExerciseCardProps) {
  const weight = localData?.weight ?? exercise.currentLog?.weight?.toString() ?? '';
  const reps = localData?.reps ?? exercise.currentLog?.reps?.toString() ?? '';
  const notes = localData?.notes ?? exercise.currentLog?.notes ?? '';
  const [expanded, setExpanded] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (field: 'weight' | 'reps' | 'notes', value: string) => {
    const newData = { weight, reps, notes, [field]: value };
    onLocalChange(exercise.id, newData);

    // Debounce the DB update
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!exercise.currentLog) return;
      const w = newData.weight ? parseInt(newData.weight, 10) : null;
      const r = newData.reps ? parseInt(newData.reps, 10) : null;
      const n = newData.notes || null;
      onUpdate(exercise.currentLog.id, w, r, n);
    }, 500);
  };

  const isComplete = weight && reps;

  return (
    <View style={[styles.exerciseCard, isComplete && styles.exerciseCardComplete]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.exerciseHeader}>
        <View style={styles.exerciseTitleRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {isComplete && <Text style={styles.checkmark}>✓</Text>}
        </View>
        {exercise.lastWeight !== null && (
          <View>
            <Text style={styles.lastData}>
              Last: {exercise.lastWeight} lbs × {exercise.lastReps} ({formatDate(exercise.lastDate)})
            </Text>
            {exercise.lastNotes && (
              <Text style={styles.lastNotes}>Note: {exercise.lastNotes}</Text>
            )}
          </View>
        )}
        {exercise.lastWeight === null && (
          <Text style={styles.firstTime}>First time</Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.exerciseInputs}>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={(v) => handleChange('weight', v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#ccc"
                />
                <Text style={styles.inputUnit}>lbs</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={(v) => handleChange('reps', v)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#ccc"
              />
            </View>
          </View>
          <View style={styles.notesGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={(v) => handleChange('notes', v)}
              placeholder="Drop set, form notes, etc."
              placeholderTextColor="#ccc"
              multiline
            />
          </View>
        </View>
      )}
    </View>
  );
}

export default function ActiveWorkoutScreen() {
  const db = useDatabase();
  const navigation = useNavigation<NavigationProp>();
  const { activeSession, elapsedSeconds, finishWorkout, cancelWorkout } = useWorkout();
  const [exercises, setExercises] = useState<ExerciseWithLastLog[]>([]);
  const [localData, setLocalData] = useState<Record<string, { weight: string; reps: string; notes: string }>>({});

  const loadExercises = useCallback(async () => {
    if (!activeSession) return;
    const data = await getSessionExercisesWithLastLog(db, activeSession.id);
    setExercises(data);

    // Initialize local data from DB
    const initial: Record<string, { weight: string; reps: string; notes: string }> = {};
    data.forEach((e) => {
      initial[e.id] = {
        weight: e.currentLog?.weight?.toString() || '',
        reps: e.currentLog?.reps?.toString() || '',
        notes: e.currentLog?.notes || '',
      };
    });
    setLocalData(initial);
  }, [db, activeSession]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleLocalChange = (exerciseId: string, data: { weight: string; reps: string; notes: string }) => {
    setLocalData((prev) => ({ ...prev, [exerciseId]: data }));
  };

  const handleUpdateLog = async (
    logId: string,
    weight: number | null,
    reps: number | null,
    notes: string | null
  ) => {
    await updateExerciseLog(db, logId, weight, reps, notes);
  };

  const handleCancel = () => {
    Alert.alert(
      'Leave Workout?',
      'Choose an option:',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Pause & Leave',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Cancel Workout?',
              'This will delete all data from this session. This cannot be undone.',
              [
                { text: 'Keep Workout', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await cancelWorkout();
                    navigation.goBack();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleFinish = async () => {
    // Count completed based on local state (most accurate)
    const completedCount = Object.values(localData).filter(
      (d) => d.weight && d.reps
    ).length;

    Alert.alert(
      'Finish Workout?',
      `${completedCount} of ${exercises.length} exercises completed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            await finishWorkout();
            Alert.alert('Saved', 'Workout saved successfully.');
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noSession}>No active workout</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.timerHeader}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.programTitle}>{activeSession.programName}</Text>
            <Text style={styles.progressText}>
              {Object.values(localData).filter((d) => d.weight && d.reps).length} of {exercises.length} done
            </Text>
          </View>
          <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onUpdate={handleUpdateLog}
              localData={localData[exercise.id]}
              onLocalChange={handleLocalChange}
            />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  cancelButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  timer: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#007AFF',
    minWidth: 60,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  exerciseCardComplete: {
    backgroundColor: '#e8f5e9',
  },
  exerciseHeader: {
    padding: 16,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
  },
  lastData: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastNotes: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  firstTime: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  exerciseInputs: {
    padding: 16,
    paddingTop: 0,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputUnit: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  notesGroup: {
    marginTop: 12,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 44,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noSession: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  backLinkText: {
    fontSize: 16,
    color: '#007AFF',
  },
});
