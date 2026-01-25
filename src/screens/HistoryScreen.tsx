import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { getWorkoutHistory, getSessionLogs } from '../database/operations';
import { WorkoutSession, ExerciseLog } from '../types';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const db = useDatabase();
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [sessionLogs, setSessionLogs] = useState<(ExerciseLog & { exerciseName: string })[]>([]);

  const loadHistory = useCallback(async () => {
    const data = await getWorkoutHistory(db);
    setSessions(data);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const openSession = async (session: WorkoutSession) => {
    const logs = await getSessionLogs(db, session.id);
    setSessionLogs(logs);
    setSelectedSession(session);
  };

  const closeModal = () => {
    setSelectedSession(null);
    setSessionLogs([]);
  };

  const renderSession = ({ item }: { item: WorkoutSession }) => (
    <TouchableOpacity style={styles.sessionCard} onPress={() => openSession(item)}>
      <View style={styles.sessionHeader}>
        <Text style={styles.programName}>{item.programName}</Text>
        <Text style={styles.duration}>
          {item.durationMinutes ? `${item.durationMinutes} min` : '-'}
        </Text>
      </View>
      <Text style={styles.date}>{formatDate(item.startTime)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <View style={styles.backButton} />
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No workouts yet</Text>
          <Text style={styles.emptySubtext}>Complete a workout to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={!!selectedSession} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedSession?.programName}
              </Text>
              <View style={{ width: 50 }} />
            </View>

            {selectedSession && (
              <View style={styles.modalMeta}>
                <Text style={styles.modalDate}>
                  {formatDate(selectedSession.startTime)} at {formatTime(selectedSession.startTime)}
                </Text>
                <Text style={styles.modalDuration}>
                  Duration: {selectedSession.durationMinutes} minutes
                </Text>
              </View>
            )}

            <ScrollView style={styles.logsList}>
              {sessionLogs
                .filter((log) => log.weight !== null)
                .map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <Text style={styles.logExercise}>{log.exerciseName}</Text>
                    <Text style={styles.logData}>
                      {log.weight} lbs × {log.reps}
                    </Text>
                    {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: 20,
  },
  sessionCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalMeta: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  modalDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalDuration: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logsList: {
    padding: 20,
  },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logExercise: {
    fontSize: 16,
    fontWeight: '500',
  },
  logData: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logNotes: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
