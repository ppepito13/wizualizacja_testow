import React, { useState, useMemo } from 'react';
import { Award, Calendar, TrendingUp, Trophy, Star } from 'lucide-react';
import { AthleteRecord, ExerciseConfig } from '../types';
import { formatSecondsToTime } from '../data';

interface LeaderboardProps {
  records: AthleteRecord[];
  exercise: ExerciseConfig;
  allDates: string[];
}

export default function Leaderboard({ records, exercise, allDates }: LeaderboardProps) {
  // We can show leaderboard for a specific date, or Personal Bests (Rekordy Życiowe)!
  const [selectedDate, setSelectedDate] = useState<string>('all_time');

  // Compute ranking list
  const leaderboardData = useMemo(() => {
    const isDuration = exercise.type === 'duration';
    const valKey = exercise.valueKey;

    if (selectedDate === 'all_time') {
      // Find the best record (maximum value) for each athlete
      const athleteBests: Record<string, { record: AthleteRecord; value: number }> = {};
      
      records.forEach(r => {
        const val = r[valKey] as number | null;
        if (val !== null && val !== undefined && !isNaN(val)) {
          const currentBest = athleteBests[r.athlete];
          if (!currentBest || val > currentBest.value) {
            athleteBests[r.athlete] = { record: r, value: val };
          }
        }
      });

      return Object.values(athleteBests)
        .sort((a, b) => b.value - a.value)
        .map((item, idx) => ({
          rank: idx + 1,
          athlete: item.record.athlete,
          value: item.value,
          date: item.record.date,
          comment: item.record[exercise.commentKey as any] as string | null,
          formatted: isDuration ? formatSecondsToTime(item.value) : `${item.value} ${exercise.unit}`,
        }));
    } else {
      // Filter records for the specific date
      return records
        .filter(r => r.date === selectedDate)
        .map(r => {
          const val = r[valKey] as number | null;
          return {
            athlete: r.athlete,
            value: val !== null && val !== undefined ? val : -1,
            date: r.date,
            comment: exercise.commentKey ? (r[exercise.commentKey as any] as string | null) : null,
          };
        })
        .filter(item => item.value !== -1)
        .sort((a, b) => b.value - a.value)
        .map((item, idx) => ({
          rank: idx + 1,
          athlete: item.athlete,
          value: item.value,
          date: item.date,
          comment: item.comment,
          formatted: isDuration ? formatSecondsToTime(item.value) : `${item.value} ${exercise.unit}`,
        }));
    }
  }, [records, exercise, selectedDate]);

  // Find max value in dataset to scale progress bars relative to the winner
  const maxValue = useMemo(() => {
    if (leaderboardData.length === 0) return 1;
    return Math.max(...leaderboardData.map(d => d.value));
  }, [leaderboardData]);

  return (
    <div className="bg-[#161920] rounded-2xl border border-slate-800/80 p-5 mt-4" id="leaderboard-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">
              Ranking {selectedDate === 'all_time' ? 'Wszech Czasów (PR)' : `z dnia ${selectedDate}`}
            </h3>
          </div>
          <p className="text-slate-305 text-xs mt-1 text-slate-200 font-semibold">
            Zestawienie najlepszych wyników w ćwiczeniu: <span className="font-bold text-blue-300" style={{ color: exercise.color }}>{exercise.name}</span>
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            id="leaderboard-date-filter"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#0a0c10] border border-slate-850 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="all_time" id="leaderboard-date-alltime-opt">🏆 Rekordy Życiowe (PR)</option>
            {allDates.map(d => (
              <option key={d} value={d} id={`leaderboard-date-opt-${d}`}>📅 Testy: {d}</option>
            ))}
          </select>
        </div>
      </div>

      {leaderboardData.length === 0 ? (
        <div className="text-center py-8 text-slate-300 text-xs font-semibold">
          Brak danych pomiarowych dla tego ćwiczenia w wybranym okresie.
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboardData.map((player) => {
            const percentage = maxValue > 0 ? (player.value / maxValue) * 100 : 0;
            
            // Render specific podium style
            let badgeStyle = "bg-slate-800/40 text-slate-400 border border-slate-800";
            if (player.rank === 1) badgeStyle = "bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20";
            if (player.rank === 2) badgeStyle = "bg-slate-400/10 text-slate-300 font-bold border border-slate-400/20";
            if (player.rank === 3) badgeStyle = "bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20";

            return (
              <div
                key={player.athlete}
                id={`leaderboard-row-${player.rank}-${player.athlete.replace(/\s+/g, '-').replace(/[.]/g, '')}`}
                className="flex items-center gap-4 p-3 bg-[#11131a] hover:bg-[#1a1d26] border border-slate-800/50 hover:border-slate-705/30 rounded-xl transition-all group"
              >
                {/* Position Rank */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${badgeStyle}`}>
                  {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : player.rank}
                </div>

                {/* Athlete Details and Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-200 truncate text-sm">
                        {player.athlete}
                      </span>
                      {selectedDate === 'all_time' && (
                        <span className="text-[10px] text-slate-300 shrink-0 font-semibold font-mono">
                          ({player.date})
                        </span>
                      )}
                    </div>
                    
                    {/* Value */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 whitespace-nowrap">
                        {player.formatted}
                      </span>
                      {player.rank === 1 && (
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400/60 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Comments and Progress line */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#0a0c10] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: player.rank === 1 ? '#F59E0B' : exercise.color
                        }}
                      />
                    </div>
                    
                    {/* Comment bubble if any */}
                    {player.comment && (
                      <span className="text-[9px] bg-[#0a0c10] border border-slate-800/80 text-slate-400 px-2 py-0.5 rounded-md font-medium truncate max-w-[150px] sm:max-w-[250px]" title={player.comment}>
                        💬 {player.comment}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
