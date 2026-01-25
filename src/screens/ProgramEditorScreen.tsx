import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../context/DatabaseContext';
import {
  createProgram,
  updateProgram,
  deleteProgram,
  getAllExercises,
  getProgramExercises,
  setProgramExercises,
  createExercise,
  getAllPrograms,
} from '../database/operations';
import { Exercise } from '../types';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ProgramEditor'>;

export default function ProgramEditorScreen() {
  const db = useDatabase();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { programId, programName: existingName } = route.params || {};

  const [name, setName] = useState(existingName || '');
  const [description, setDescription] = useState('');
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [showSelected, setShowSelected] = useState(true);

  // New exercise modal state
  const [newExerciseModalVisible, setNewExerciseModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseNotes, setNewExerciseNotes] = useState('');

  const loadData = useCallback(async () => {
    const exercises = await getAllExercises(db);
    setAllExercises(exercises);

    if (programId) {
      // Load existing program data including description
      const programs = await getAllPrograms(db);
      const program = programs.find((p) => p.id === programId);
      if (program) {
        setName(program.name);
        setDescription(program.description || '');
      }

      const programExercises = await getProgramExercises(db, programId);
      const ids = programExercises.map((e) => e.id);
      setSelectedIds(new Set(ids));
      setOrderedIds(ids);
    }
  }, [db, programId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleExercise = (exerciseId: string) => {
    const newSelected = new Set(selectedIds);
    const newOrdered = [...orderedIds];

    if (newSelected.has(exerciseId)) {
      newSelected.delete(exerciseId);
      const index = newOrdered.indexOf(exerciseId);
      if (index > -1) newOrdered.splice(index, 1);
    } else {
      newSelected.add(exerciseId);
      newOrdered.push(exerciseId);
    }

    setSelectedIds(newSelected);
    setOrderedIds(newOrdered);
  };

  const moveUp = (exerciseId: string) => {
    const index = orderedIds.indexOf(exerciseId);
    if (index > 0) {
      const newOrdered = [...orderedIds];
      [newOrdered[index - 1], newOrdered[index]] = [newOrdered[index], newOrdered[index - 1]];
      setOrderedIds(newOrdered);
    }
  };

  const moveDown = (exerciseId: string) => {
    const index = orderedIds.indexOf(exerciseId);
    if (index < orderedIds.length - 1) {
      const newOrdered = [...orderedIds];
      [newOrdered[index], newOrdered[index + 1]] = [newOrdered[index + 1], newOrdered[index]];
      setOrderedIds(newOrdered);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a program name');
      return;
    }

    if (orderedIds.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise');
      return;
    }

    try {
      if (programId) {
        await updateProgram(db, programId, name.trim(), description.trim() || null);
        await setProgramExercises(db, programId, orderedIds);
      } else {
        const program = await createProgram(db, name.trim(), description.trim() || null);
        await setProgramExercises(db, program.id, orderedIds);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save program');
    }
  };

  const handleDelete = () => {
    if (!programId) return;

    Alert.alert('Delete Program?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProgram(db, programId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    try {
      const exercise = await createExercise(db, newExerciseName.trim(), newExerciseNotes.trim() || null);
      // Add to all exercises and auto-select it
      setAllExercises((prev) => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedIds((prev) => new Set([...prev, exercise.id]));
      setOrderedIds((prev) => [...prev, exercise.id]);

      // Reset and close modal
      setNewExerciseName('');
      setNewExerciseNotes('');
      setNewExerciseModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create exercise');
    }
  };

  const selectedExercises = orderedIds
    .map((id) => allExercises.find((e) => e.id === id))
    .filter(Boolean) as Exercise[];

  const unselectedExercises = allExercises.filter((e) => !selectedIds.has(e.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{programId ? 'Edit Program' : 'New Program'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nameSection}>
        <Text style={styles.label}>Program Name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Program A"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Description (optional)</Text>
        <TextInput
          style={styles.nameInput}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Upper body push day"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.exercisesSection}>
        {selectedExercises.length > 0 && (
          <View style={styles.selectedSection}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowSelected(!showSelected)}
            >
              <Text style={styles.sectionTitle}>
                Selected ({selectedExercises.length}) {showSelected ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            {showSelected && (
              <ScrollView style={styles.selectedScroll} nestedScrollEnabled>
                {selectedExercises.map((exercise, index) => (
                  <View key={exercise.id} style={styles.selectedItem}>
                    <View style={styles.orderButtons}>
                      <TouchableOpacity
                        onPress={() => moveUp(exercise.id)}
                        style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}
                        disabled={index === 0}
                      >
                        <Text style={styles.orderButtonText}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveDown(exercise.id)}
                        style={[
                          styles.orderButton,
                          index === selectedExercises.length - 1 && styles.orderButtonDisabled,
                        ]}
                        disabled={index === selectedExercises.length - 1}
                      >
                        <Text style={styles.orderButtonText}>↓</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.selectedName}>{exercise.name}</Text>
                    <TouchableOpacity
                      onPress={() => toggleExercise(exercise.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.allExercisesHeader}>
          <Text style={styles.sectionTitle}>All Exercises</Text>
          <TouchableOpacity
            style={styles.newExerciseButton}
            onPress={() => setNewExerciseModalVisible(true)}
          >
            <Text style={styles.newExerciseButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={unselectedExercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.exerciseItem}
              onPress={() => toggleExercise(item.id)}
            >
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          )}
          style={styles.exerciseList}
        />
      </View>

      {programId && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Program</Text>
        </TouchableOpacity>
      )}

      {/* New Exercise Modal */}
      <Modal visible={newExerciseModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setNewExerciseModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Exercise</Text>
              <TouchableOpacity onPress={handleCreateExercise}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="e.g., Bench Press"
                placeholderTextColor="#999"
                autoFocus
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.notesInput]}
                value={newExerciseNotes}
                onChangeText={setNewExerciseNotes}
                placeholder="e.g., Barbell, flat bench"
                placeholderTextColor="#999"
                multiline
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  nameSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 18,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  exercisesSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  selectedSection: {
    maxHeight: 200,
    marginBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  selectedScroll: {
    maxHeight: 160,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderButtons: {
    flexDirection: 'row',
    marginRight: 12,
  },
  orderButton: {
    padding: 4,
    marginRight: 4,
  },
  orderButtonDisabled: {
    opacity: 0.3,
  },
  orderButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  selectedName: {
    flex: 1,
    fontSize: 16,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 24,
  },
  allExercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newExerciseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  newExerciseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
  },
  addText: {
    fontSize: 14,
    color: '#007AFF',
  },
  deleteButton: {
    margin: 20,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 16,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
