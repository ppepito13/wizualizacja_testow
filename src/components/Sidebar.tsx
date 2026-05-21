import React from 'react';
import { ExerciseConfig, AthleteRecord } from '../types';
import ExerciseSelector from './ExerciseSelector';
import AthleteSelector from './AthleteSelector';

interface SidebarProps {
  athletes: string[];
  selectedAthletes: string[];
  onToggleAthlete: (athlete: string) => void;
  onSelectAllAthletes: () => void;
  onSelectNoneAthletes: () => void;
  
  exercises: ExerciseConfig[];
  selectedExerciseId: string;
  onSelectExercise: (id: string) => void;
  
  records: AthleteRecord[];
}

export default function Sidebar({
  athletes,
  selectedAthletes,
  onToggleAthlete,
  onSelectAllAthletes,
  onSelectNoneAthletes,
  exercises,
  selectedExerciseId,
  onSelectExercise,
  records,
}: SidebarProps) {
  // Find currently selected exercise config
  const selectedExConfig = exercises.find(ex => ex.id === selectedExerciseId) || exercises[0];

  return (
    <aside className="hidden lg:flex w-80 bg-[#11131a] border-r border-slate-800/80 flex-col h-full text-slate-100 shrink-0" id="sidebar-container">
      {/* Exercise Selection */}
      <div className="p-4 border-b border-slate-800/80">
        <ExerciseSelector
          exercises={exercises}
          selectedExerciseId={selectedExerciseId}
          onSelectExercise={onSelectExercise}
          variant="sidebar"
        />
      </div>

      {/* Athletes Selection */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <AthleteSelector
          athletes={athletes}
          selectedAthletes={selectedAthletes}
          onToggleAthlete={onToggleAthlete}
          onSelectAllAthletes={onSelectAllAthletes}
          onSelectNoneAthletes={onSelectNoneAthletes}
          selectedExercise={selectedExConfig}
          records={records}
          variant="sidebar"
        />
      </div>
    </aside>
  );
}
