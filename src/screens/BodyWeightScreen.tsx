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
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDatabase } from '../context/DatabaseContext';
import { getWeightEntries, addWeightEntry } from '../database/operations';
import { WeightEntry } from '../types';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

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

  const latestWeight = entries.length > 0 ? entries[0].weight : null;

  // Filter to last 3 months and sort chronologically
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

  const chartData = [...entries]
    .filter((e) => e.date >= threeMonthsAgoStr)
    .reverse();

  const chartMinWeight = chartData.length > 0 ? Math.min(...chartData.map((e) => e.weight)) : 0;
  const chartMaxWeight = chartData.length > 0 ? Math.max(...chartData.map((e) => e.weight)) : 0;

  const renderLineChart = () => {
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 80; // Account for padding and labels
    const chartHeight = 150;
    const paddingTop = 20;
    const paddingBottom = 30;
    const paddingLeft = 45;
    const paddingRight = 15;
    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;

    if (chartData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weight Trend (3 months)</Text>
          <Text style={styles.chartEmpty}>Log your weight to see the trend chart</Text>
        </View>
      );
    }

    if (chartData.length === 1) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weight Trend (3 months)</Text>
          <Text style={styles.chartEmpty}>Log more entries to see the trend</Text>
          <View style={styles.singleEntry}>
            <Text style={styles.singleEntryValue}>{chartData[0].weight} lbs</Text>
          </View>
        </View>
      );
    }

    const range = chartMaxWeight - chartMinWeight;
    const padding = range > 0 ? range * 0.1 : 5;
    const yMin = chartMinWeight - padding;
    const yMax = chartMaxWeight + padding;
    const yRange = yMax - yMin;

    // Calculate x positions based on date
    const startDate = new Date(chartData[0].date + 'T00:00:00').getTime();
    const endDate = new Date(chartData[chartData.length - 1].date + 'T00:00:00').getTime();
    const dateRange = endDate - startDate || 1;

    const getX = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00').getTime();
      return paddingLeft + ((date - startDate) / dateRange) * graphWidth;
    };

    const getY = (weight: number) => {
      return paddingTop + graphHeight - ((weight - yMin) / yRange) * graphHeight;
    };

    // Build the path for the line
    const pathData = chartData
      .map((entry, i) => {
        const x = getX(entry.date);
        const y = getY(entry.weight);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    // Generate month labels
    const monthLabels: { label: string; x: number }[] = [];
    const seenMonths = new Set<string>();
    chartData.forEach((entry) => {
      const date = new Date(entry.date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        monthLabels.push({
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          x: getX(entry.date),
        });
      }
    });

    // Y-axis labels
    const yLabels = [yMin, (yMin + yMax) / 2, yMax].map((val) => ({
      value: Math.round(val),
      y: getY(val),
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weight Trend (3 months)</Text>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y-axis grid lines */}
          {yLabels.map((label, i) => (
            <Line
              key={`grid-${i}`}
              x1={paddingLeft}
              y1={label.y}
              x2={chartWidth - paddingRight}
              y2={label.y}
              stroke="#eee"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {yLabels.map((label, i) => (
            <SvgText
              key={`y-label-${i}`}
              x={paddingLeft - 5}
              y={label.y + 4}
              fontSize={11}
              fill="#999"
              textAnchor="end"
            >
              {label.value}
            </SvgText>
          ))}

          {/* The line */}
          <Path
            d={pathData}
            stroke="#007AFF"
            strokeWidth={2}
            fill="none"
          />

          {/* Data points */}
          {chartData.map((entry, i) => (
            <Circle
              key={`point-${i}`}
              cx={getX(entry.date)}
              cy={getY(entry.weight)}
              r={4}
              fill="#007AFF"
            />
          ))}

          {/* X-axis month labels */}
          {monthLabels.map((label, i) => (
            <SvgText
              key={`x-label-${i}`}
              x={label.x}
              y={chartHeight - 5}
              fontSize={11}
              fill="#999"
              textAnchor="start"
            >
              {label.label}
            </SvgText>
          ))}
        </Svg>
        <Text style={styles.chartSubtitle}>
          {chartData.length} entries · {chartMinWeight.toFixed(1)} - {chartMaxWeight.toFixed(1)} lbs
        </Text>
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

      {renderLineChart()}

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
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
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
