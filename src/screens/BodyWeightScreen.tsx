import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { getWeightEntries, addWeightEntry } from '../database/operations';
import { WeightEntry } from '../types';

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function BodyWeightScreen() {
  const db = useDatabase();
  const navigation = useNavigation();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');

  const loadEntries = useCallback(async () => {
    const data = await getWeightEntries(db);
    setEntries(data);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    await addWeightEntry(db, weight);
    setNewWeight('');
    await loadEntries();
  };

  const minWeight = entries.length > 0 ? Math.min(...entries.map((e) => e.weight)) : 0;
  const maxWeight = entries.length > 0 ? Math.max(...entries.map((e) => e.weight)) : 0;
  const latestWeight = entries.length > 0 ? entries[0].weight : null;

  // Get last 30 entries in chronological order for chart
  const chartData = [...entries].reverse().slice(-30);

  const renderSimpleChart = () => {
    if (chartData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          <Text style={styles.chartEmpty}>Log your weight to see the trend chart</Text>
        </View>
      );
    }

    if (chartData.length === 1) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          <Text style={styles.chartEmpty}>Log more entries to see the trend</Text>
          <View style={styles.singleEntry}>
            <Text style={styles.singleEntryValue}>{chartData[0].weight} lbs</Text>
          </View>
        </View>
      );
    }

    const range = maxWeight - minWeight;
    const padding = range > 0 ? range * 0.1 : 5;
    const adjustedMin = minWeight - padding;
    const adjustedMax = maxWeight + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Trend (last {chartData.length} entries)</Text>
        <View style={styles.simpleChart}>
          {chartData.map((entry, index) => {
            const height = Math.max(
              4,
              ((entry.weight - adjustedMin) / adjustedRange) * 100
            );
            return (
              <View
                key={index}
                style={[
                  styles.chartBar,
                  { height: `${height}%` },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          <Text style={styles.axisLabel}>{minWeight.toFixed(1)} lbs</Text>
          <Text style={styles.axisLabel}>{maxWeight.toFixed(1)} lbs</Text>
        </View>
      </View>
    );
  };

  const renderEntry = ({ item }: { item: WeightEntry }) => (
    <View style={styles.entryItem}>
      <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
      <Text style={styles.entryWeight}>{item.weight} lbs</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Body Weight</Text>
        <View style={styles.backButton} />
      </View>

      {latestWeight && (
        <View style={styles.currentWeight}>
          <Text style={styles.currentLabel}>Current</Text>
          <Text style={styles.currentValue}>{latestWeight} lbs</Text>
        </View>
      )}

      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="Enter weight"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddWeight}>
          <Text style={styles.addButtonText}>Log</Text>
        </TouchableOpacity>
      </View>

      {renderSimpleChart()}

      <Text style={styles.sectionTitle}>History</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No weight entries yet</Text>
        }
      />
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
  currentWeight: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
  },
  currentValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 4,
  },
  inputSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chartContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  chartEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  singleEntry: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  singleEntryValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  simpleChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 2,
  },
  chartBar: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    minHeight: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    fontSize: 12,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  entryDate: {
    fontSize: 16,
    color: '#666',
  },
  entryWeight: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
