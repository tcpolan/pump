import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DatabaseProvider, useDatabaseReady } from './src/context/DatabaseContext';
import { WorkoutProvider } from './src/context/WorkoutContext';
import HomeScreen from './src/screens/HomeScreen';
import ActiveWorkoutScreen from './src/screens/ActiveWorkoutScreen';
import ProgramEditorScreen from './src/screens/ProgramEditorScreen';
import ExerciseLibraryScreen from './src/screens/ExerciseLibraryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import BodyWeightScreen from './src/screens/BodyWeightScreen';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fff' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="ActiveWorkout"
          component={ActiveWorkoutScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="ProgramEditor"
          component={ProgramEditorScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="ExerciseLibrary"
          component={ExerciseLibraryScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="BodyWeight" component={BodyWeightScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const isReady = useDatabaseReady();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <WorkoutProvider>
      <AppNavigator />
    </WorkoutProvider>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <AppContent />
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
