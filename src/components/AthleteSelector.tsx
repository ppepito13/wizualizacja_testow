import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, Check, Users, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { ExerciseConfig, AthleteRecord } from '../types';
import { formatSecondsToTime } from '../data';

interface AthleteSelectorProps {
  athletes: string[];
  selectedAthletes: string[];
  onToggleAthlete: (athlete: string) => void;
  onSelectAllAthletes: () => void;
  onSelectNoneAthletes: () => void;
  selectedExercise: ExerciseConfig;
  records: AthleteRecord[];
  variant?: 'sidebar' | 'drawer';
}

type SortMode = 'alphabetical' | 'desc' | 'asc';

export default function AthleteSelector({
  athletes,
  selectedAthletes,
  onToggleAthlete,
  onSelectAllAthletes,
  onSelectNoneAthletes,
  selectedExercise,
  records,
  variant = 'sidebar',
}: AthleteSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('alphabetical');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Count records per athlete for helper info
  const athleteStats = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      counts[r.athlete] = (counts[r.athlete] || 0) + 1;
    });
    return counts;
  }, [records]);

  // Compute the best PR result for each athlete for currently active exercise
  const athleteBests = useMemo(() => {
    const bests: Record<string, number> = {};
    const valKey = selectedExercise.valueKey;

    records.forEach(r => {
      const val = r[valKey] as number | null;
      if (val !== null && val !== undefined && !isNaN(val)) {
        const currentBest = bests[r.athlete];
        if (currentBest === undefined || val > currentBest) {
          bests[r.athlete] = val;
        }
      }
    });
    return bests;
  }, [records, selectedExercise]);

  // Filter athletes list by search term
  const filteredAthletes = useMemo(() => {
    return athletes.filter(athlete =>
      athlete.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [athletes, searchTerm]);

  // Sort filtered athletes list based on selected sort mode
  const sortedAthletes = useMemo(() => {
    const sorted = [...filteredAthletes];
    
    if (sortBy === 'alphabetical') {
      return sorted.sort((a, b) => a.localeCompare(b, 'pl'));
    }

    return sorted.sort((a, b) => {
      const valA = athleteBests[a];
      const valB = athleteBests[b];

      if (valA === undefined && valB === undefined) {
        return a.localeCompare(b, 'pl');
      }
      if (valA === undefined) return 1; // Unmeasured athletes at the end
      if (valB === undefined) return -1; // Unmeasured athletes at the end

      if (sortBy === 'desc') {
        return valB - valA; // Best score on top
      } else {
        return valA - valB; // Lowest score on top
      }
    });
  }, [filteredAthletes, sortBy, athleteBests]);

  // Limit list to 5 items by default for mobile unless expanded or searching.
  // For desktop (sidebar), always show all available sorted/filtered athletes.
  const visibleAthletes = useMemo(() => {
    if (variant === 'sidebar') {
      return sortedAthletes;
    }

    if (isExpanded || searchTerm) {
      return sortedAthletes;
    }
    
    // For mobile (drawer) limit strictly to top 5
    return sortedAthletes.slice(0, 5);
  }, [sortedAthletes, isExpanded, searchTerm, variant]);

  // Number of hidden athletes
  const totalDifference = Math.max(0, sortedAthletes.length - 5);
  // Find out if the expansion button is relevant (only relevant on mobile)
  const canExpand = variant !== 'sidebar' && sortedAthletes.length > 5 && !searchTerm;

  return (
    <div className="w-full flex flex-col h-full text-slate-100">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Zawodnicy</h2>
        </div>
        <span className="bg-[#161920] text-blue-300 border border-slate-800/80 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold">
          {selectedAthletes.length}/{athletes.length}
        </span>
      </div>

      {/* Quick selectors */}
      <div className="flex gap-2 mb-2.5">
        <button
          id={`${variant}-select-all-btn`}
          onClick={onSelectAllAthletes}
          className="flex-1 py-2 sm:py-1 px-2 rounded-lg bg-[#161920] border border-slate-800 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
          Wszyscy
        </button>
        <button
          id={`${variant}-select-none-btn`}
          onClick={onSelectNoneAthletes}
          className="flex-1 py-2 sm:py-1 px-2 rounded-lg bg-[#161920] border border-slate-800 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 text-slate-500" />
          Resetuj
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-2.5">
        <Search className="absolute left-3 top-3 sm:top-2.5 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          id={`${variant}-athlete-search-input`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Wyszukaj zawodnika..."
          className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg pl-9 pr-3 py-2 sm:py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
        />
      </div>

      {/* Sort Control */}
      <div className="flex items-center gap-2 mb-3 bg-[#0a0c10] border border-slate-800/50 rounded-lg px-2.5 py-2 sm:py-1.5">
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select
          id={`${variant}-athlete-sort-select`}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortMode)}
          className="w-full bg-transparent border-none text-[11px] font-bold text-slate-200 focus:outline-none cursor-pointer placeholder-slate-500"
        >
          <option value="alphabetical" className="bg-[#11131a] text-slate-200">Sortuj: Alfabetycznie A-Z</option>
          <option value="desc" className="bg-[#11131a] text-slate-200">Sortuj: Najlepszy Wynik (Malejąco)</option>
          <option value="asc" className="bg-[#11131a] text-slate-200">Sortuj: Najlepszy Wynik (Rosnąco)</option>
        </select>
      </div>

      {/* Checked/Unchecked List Scroll Area */}
      <div className={`overflow-y-auto pr-1 space-y-1 ${variant === 'drawer' ? 'max-h-[40vh] flex-1' : 'max-h-[440px] flex-1 min-h-0'}`}>
        {visibleAthletes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 font-medium">
            Brak wyników wyszukiwania
          </div>
        ) : (
          visibleAthletes.map(athlete => {
            const isSelected = selectedAthletes.includes(athlete);
            const count = athleteStats[athlete] || 0;
            const bestVal = athleteBests[athlete];
            
            // Format actual PR
            const scoreString = bestVal !== undefined 
              ? (selectedExercise.type === 'duration' ? formatSecondsToTime(bestVal) : `${bestVal} ${selectedExercise.unit}`)
              : null;

            return (
              <button
                key={athlete}
                id={`${variant}-athlete-toggle-${athlete.replace(/\s+/g, '-').replace(/[.]/g, '')}`}
                onClick={() => onToggleAthlete(athlete)}
                className={`w-full text-left p-2 px-2.5 rounded-xl flex items-center justify-between transition-all group border cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-650/10 text-blue-200 border-blue-500/20 hover:bg-blue-650/15' 
                    : 'bg-transparent border-transparent hover:bg-slate-800/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-4.5 h-4.5 sm:w-4 sm:h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-[#0a0c10] border border-slate-800 text-transparent group-hover:border-slate-650'
                  }`}>
                    <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs truncate block text-slate-100 group-hover:text-white">
                      {athlete}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                      {count} {count === 1 ? 'wpis' : count < 5 ? 'wpisy' : 'wpisów'}
                    </span>
                  </div>
                </div>

                {/* PR badge for visual evidence of sorting */}
                {scoreString ? (
                  <span 
                    className="font-mono text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-extrabold shrink-0"
                    title={`Rekord życiowy (PR) w wybranym ćwiczeniu`}
                  >
                    {scoreString}
                  </span>
                ) : (
                  <span className="font-mono text-[9px] text-slate-600 px-1 shrink-0 font-bold">
                    brak
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Expand / Collapse trigger */}
      {canExpand && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-full text-center py-2 bg-[#161920]/65 hover:bg-[#1a1e27] text-xs font-bold text-blue-400 hover:text-blue-300 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Zwiń pozostałych zawodników
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Pokaż kolejnych zawodników (+{totalDifference})
            </>
          )}
        </button>
      )}
    </div>
  );
}
