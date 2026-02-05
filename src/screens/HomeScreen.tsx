import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../context/DatabaseContext';
import { useWorkout } from '../context/WorkoutContext';
import { getAllPrograms, getWorkoutStats } from '../database/operations';
import { Program } from '../types';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return diffMins <= 1 ? 'just now' : `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const db = useDatabase();
  const navigation = useNavigation<NavigationProp>();
  const { activeSession, startWorkout } = useWorkout();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [stats, setStats] = useState<{
    totalWorkouts: number;
    avgDurationMinutes: number;
    lastWorkout: { programName: string; date: string } | null;
  }>({ totalWorkouts: 0, avgDurationMinutes: 0, lastWorkout: null });

  const loadData = useCallback(async () => {
    const [programsData, statsData] = await Promise.all([
      getAllPrograms(db),
      getWorkoutStats(db),
    ]);
    setPrograms(programsData);
    setStats(statsData);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleStartWorkout = async (program: Program) => {
    if (activeSession) {
      navigation.navigate('ActiveWorkout');
      return;
    }
    await startWorkout(program.id);
    navigation.navigate('ActiveWorkout');
  };

  const handleResumeWorkout = () => {
    navigation.navigate('ActiveWorkout');
  };

  const renderProgram = ({ item }: { item: Program }) => (
    <TouchableOpacity
      style={styles.programCard}
      onPress={() => handleStartWorkout(item)}
      onLongPress={() => navigation.navigate('ProgramEditor', { programId: item.id, programName: item.name })}
    >
      <View style={styles.programInfo}>
        <Text style={styles.programName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.programDescription}>{item.description}</Text>
        )}
      </View>
      <Text style={styles.startText}>Start</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Pump</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.headerButtonText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('BodyWeight')}
          >
            <Text style={styles.headerButtonText}>Weight</Text>
          </TouchableOpacity>
        </View>
      </View>

      {stats.totalWorkouts > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.avgDurationMinutes}</Text>
            <Text style={styles.statLabel}>Avg Minutes</Text>
          </View>
        </View>
      )}

      {stats.lastWorkout && (
        <View style={styles.lastWorkoutContainer}>
          <Text style={styles.lastWorkoutLabel}>Last completed</Text>
          <Text style={styles.lastWorkoutProgram}>{stats.lastWorkout.programName}</Text>
          <Text style={styles.lastWorkoutTime}>{formatTimeAgo(stats.lastWorkout.date)}</Text>
        </View>
      )}

      {activeSession && (
        <TouchableOpacity style={styles.activeWorkoutBanner} onPress={handleResumeWorkout}>
          <Text style={styles.activeWorkoutText}>
            Workout in progress: {activeSession.programName}
          </Text>
          <Text style={styles.resumeText}>Tap to resume</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Programs</Text>

      {programs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No programs yet</Text>
          <Text style={styles.emptySubtext}>Create your first program to get started</Text>
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          renderItem={renderProgram}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ProgramEditor', {})}
        >
          <Text style={styles.addButtonText}>+ New Program</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ExerciseLibrary')}
        >
          <Text style={styles.secondaryButtonText}>Exercise Library</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 20,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
  },
  lastWorkoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#e8f4e8',
    borderRadius: 8,
  },
  lastWorkoutLabel: {
    fontSize: 13,
    color: '#666',
  },
  lastWorkoutProgram: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d6a2d',
    marginLeft: 6,
  },
  lastWorkoutTime: {
    fontSize: 13,
    color: '#666',
    marginLeft: 'auto',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  activeWorkoutBanner: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 16,
    borderRadius: 12,
  },
  activeWorkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resumeText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  list: {
    paddingHorizontal: 20,
  },
  programCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  programInfo: {
    flex: 1,
    marginRight: 12,
  },
  programName: {
    fontSize: 18,
    fontWeight: '500',
  },
  programDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  startText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    textAlign: 'center',
  },
  bottomButtons: {
    padding: 20,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
