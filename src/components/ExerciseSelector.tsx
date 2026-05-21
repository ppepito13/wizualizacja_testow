import React from 'react';
import { Dumbbell } from 'lucide-react';
import { ExerciseConfig } from '../types';

interface ExerciseSelectorProps {
  exercises: ExerciseConfig[];
  selectedExerciseId: string;
  onSelectExercise: (id: string) => void;
  variant?: 'sidebar' | 'drawer';
}

export default function ExerciseSelector({
  exercises,
  selectedExerciseId,
  onSelectExercise,
  variant = 'sidebar',
}: ExerciseSelectorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell className="w-4 h-4 text-blue-400" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Wybrane Ćwiczenie</h2>
      </div>
      <div className={`space-y-1.5 pr-1 ${variant === 'drawer' ? 'max-h-[50vh] overflow-y-auto' : 'max-h-56 overflow-y-auto'}`}>
        {exercises.map((ex) => {
          const isActive = selectedExerciseId === ex.id;
          return (
            <button
              key={ex.id}
              id={`${variant}-exercise-tab-${ex.id}`}
              onClick={() => onSelectExercise(ex.id)}
              className={`w-full text-left px-3.5 py-3 sm:py-2.5 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-200 border border-blue-500/30' 
                  : 'bg-[#161920]/45 border border-slate-800/40 hover:bg-[#1c202a] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: ex.color }}
                />
                <span className="font-semibold text-xs truncate">{ex.name}</span>
              </div>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md shrink-0 font-mono tracking-wider font-bold ${
                isActive 
                  ? 'bg-blue-500/25 text-blue-200 border border-blue-500/30' 
                  : 'bg-slate-850 text-slate-250 border border-slate-700/60'
              }`}>
                {ex.unit}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
