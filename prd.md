# Pump - Personal Workout Tracker PRD

## Overview

A mobile app for personal workout tracking that allows planning workout programs, logging exercise data, viewing historical performance, and tracking progress over time.

**Core Problem to Solve:** Easily see previous workout data when logging current workout. Existing apps make this difficult.

## Target Platform

- **Primary:** iOS (iPhone)
- **Secondary:** Android (via cross-platform build)
- **Single user, personal use**

## Technical Stack

- **Framework:** Expo (React Native) with TypeScript
- **Storage:** SQLite (local-first, offline-capable)
- **Future:** Cloud backup capability (not MVP)

## User Profile & Workout Style

- Workouts twice weekly (Program A Wednesdays, Program B Sundays - schedule may vary)
- 11-15 exercises per program
- **One set to failure** per exercise (not multiple sets)
- Occasional drop sets recorded as free-text notes
- Exercises done out of order when equipment is occupied
- Target workout duration: under 30 minutes
- Weight tracked in **pounds (lbs)**, integer values only

---

## Core Features

### 1. Exercise Library

**Description:** Global list of exercises that can be used across programs.

**Requirements:**
- Pre-populated with basic exercises (comprehensive: upper push/pull, compound lifts, machines)
- User can add, edit, and delete exercises
- Can create new exercises directly from Program Editor (auto-added to program)
- Exercise names can be renamed; history stays linked (ID-based)
- Each exercise has: name, optional notes

**Data Model:**
```
Exercise {
  id: UUID
  name: string
  notes: string (optional)
}
```

### 2. Workout Programs

**Description:** Named collections of exercises in a defined order.

**Requirements:**
- Support multiple programs (e.g., Program A, Program B)
- Each program has a name and optional description
- Description displayed on home screen under program name
- Each program references exercises from the library
- Exercises can appear in multiple programs (shared)
- Ability to create, edit, and delete programs
- Ability to add, remove, and reorder exercises within a program
- Long-press program on home screen to edit

**Data Model:**
```
Program {
  id: UUID
  name: string
  description: string (optional)
  exerciseIds: UUID[] (ordered)
}
```

### 3. Workout Logging

**Description:** Record workout data during a session.

**Requirements:**
- Select a program to start a workout session
- **Timer auto-starts** when workout begins
- **Progress indicator** shows "X of Y done" in header
- For each exercise, enter:
  - Weight (integer lbs)
  - Reps completed
  - Optional free-text notes (for drop sets, etc.)
- **One set per exercise** (not multiple sets)
- Exercises can be completed in any order (vertical scroll)
- **Auto-save** progress continuously (crash recovery)
- Ability to edit any entry in current session (typo fixes)
- "Finish Workout" shows confirmation with completion count, then saves
- **Cancel Workout** option to delete session entirely (with confirmation)
- "Pause & Leave" option to exit but keep progress for later

**Data Model:**
```
WorkoutSession {
  id: UUID
  programId: UUID
  startTime: timestamp
  endTime: timestamp
  duration: minutes
  exercises: ExerciseLog[]
}

ExerciseLog {
  exerciseId: UUID
  weight: integer (lbs)
  reps: integer
  notes: string (optional)
  completedAt: timestamp
}
```

### 4. Previous Workout Display

**Description:** Show last workout data inline while logging.

**Requirements:**
- When logging a workout, each exercise shows its most recent data
- Display: weight, reps, notes, and date of last session for that exercise
- Pull from same exercise regardless of which program it was in
- New exercises show "First time" indicator
- Tap exercise to expand/collapse input fields

**UI Concept:**
```
┌─────────────────────────────────────┐
│ Lat Pulldown                    ✓   │
│ Last: 120 lbs × 12 (Jan 15)         │
│ Note: dropped to 100 for 5 more     │
│                                     │
│ Weight: [120] lbs  Reps: [10]       │
│ Notes: [____________________]       │
└─────────────────────────────────────┘
```

### 5. Workout Timer & Progress

**Description:** Elapsed time and completion progress during workout.

**Requirements:**
- Timer starts automatically when workout begins
- Timer visible in header during workout
- Progress indicator shows "X of Y done" under program name
- Timer stops when workout is finished
- Duration logged with completed session

**Header Layout:**
```
← Back    Program A     3:45
          6 of 12 done
```

### 6. Exercise Progress Charts

**Description:** Visualize weight progression for individual exercises.

**Requirements:**
- Select an exercise to view its history
- Line chart showing weight over time
- Data combined from all programs (exercise-centric, not program-centric)
- Default views: Last 30 days, Last 3 months
- Display data points from all logged sessions

**Status:** Not yet implemented

### 7. Body Weight Tracking

**Description:** Log and visualize body weight over time.

**Requirements:**
- Enter body weight (lbs) with date
- Can log multiple times per week (whenever remembered)
- One entry per day (update if re-entered same day)
- Bar chart showing weight trend (last 30 entries)
- Shows min/max range labels

**Data Model:**
```
WeightEntry {
  id: UUID
  date: date
  weight: decimal (lbs)
}
```

---

## Screens

1. **Home** - List of programs with name, description, and "Start" button. Long-press to edit.
2. **Program Editor** - Create/edit program name, description, and exercises. Can create new exercises inline.
3. **Exercise Library** - View/add/edit/delete exercises with search
4. **Active Workout** - Vertical scroll of exercises, previous data visible, timer + progress in header
5. **History** - List of past workout sessions with duration, tap to view details
6. **Body Weight** - Log weight and view trend chart
7. ~~Exercise Detail~~ - Not yet implemented
8. ~~Settings~~ - Not yet implemented

---

## Design Guidelines

- **Style:** Minimal and clean, lots of white space, focus on data
- **No gamification:** No badges, streaks, or celebrations
- **Fast data entry:** Optimized for quick input during workout
- **Offline-first:** Full functionality without internet connection
- **Navigation:** Back buttons on all screens except Home

---

## Data Integrity

- **Auto-save:** Current workout saved after each entry (crash recovery)
- **Immutable history:** Past workout sessions cannot be edited or deleted
- **Current session editable:** Can fix typos during active workout
- **ID-based references:** Renaming exercises preserves history linkage

---

## Implementation Status

### Completed (MVP)
- [x] Exercise library with 40+ pre-populated exercises
- [x] Create/edit/delete exercises
- [x] Create new exercises from Program Editor
- [x] Create/edit/delete programs with name and description
- [x] Log workout sessions (weight + reps + notes)
- [x] View previous workout data inline (weight, reps, notes, date)
- [x] Auto-save progress during workout
- [x] Workout timer in header
- [x] Progress indicator (X of Y done)
- [x] Finish workout with confirmation
- [x] Cancel workout option
- [x] Pause & leave option
- [x] Workout history list with details view
- [x] Body weight tracking with bar chart

### Phase 2 (Planned)
- [ ] Exercise progress charts (30 days, 3 months)
- [ ] Exercise detail screen with history

### Phase 3 (Future)
- [ ] Data export (JSON)
- [ ] Cloud backup/sync
- [ ] Data import
- [ ] Settings screen

---

## Non-Goals (Out of Scope)

- Multiple sets per exercise (user does one set to failure)
- Rest timers between exercises
- Social features / sharing
- Workout suggestions / AI recommendations
- Weight increase suggestions
- Multiple users
- Web version

---

## Success Criteria

- [x] Previous workout data visible without extra navigation
- [x] Can complete full workout logging with minimal friction
- [x] App works fully offline
- [x] No data loss on app crash mid-workout
- [ ] Charts load quickly with 6+ months of data (charts not yet implemented)

---

## Technical Notes

- Database: SQLite via expo-sqlite
- Navigation: React Navigation (native stack)
- State: React Context for workout session and database
- All data stored locally on device
- Runs via Expo Go for development, needs EAS Build for standalone app
