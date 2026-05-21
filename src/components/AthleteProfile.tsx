import React, { useMemo, useState } from 'react';
import { User, Award, Calendar, ChevronRight, Zap, Target, MessageSquare } from 'lucide-react';
import { AthleteRecord, ExerciseConfig } from '../types';
import { formatSecondsToTime } from '../data';

interface AthleteProfileProps {
  athleteName: string;
  records: AthleteRecord[];
  exercises: ExerciseConfig[];
}

export default function AthleteProfile({ athleteName, records, exercises }: AthleteProfileProps) {
  // Filter records belonging only to this athlete
  const athleteRecords = useMemo(() => {
    return records
      .filter(r => r.athlete === athleteName)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, athleteName]);

  // Compute best values (personal bests / PR)
  const personalRecords = useMemo(() => {
    const prs: Record<string, { value: number; date: string; comment: string | null }> = {};
    
    exercises.forEach(ex => {
      let bestVal: number | null = null;
      let bestDate = '-';
      let bestComment: string | null = null;

      athleteRecords.forEach(r => {
        const val = r[ex.valueKey] as number | null;
        if (val !== null && val !== undefined && !isNaN(val)) {
          if (bestVal === null || val > bestVal) {
            bestVal = val;
            bestDate = r.date;
            bestComment = ex.commentKey ? (r[ex.commentKey as any] as string | null) : null;
          }
        }
      });

      if (bestVal !== null) {
        prs[ex.id] = {
          value: bestVal,
          date: bestDate,
          comment: bestComment
        };
      }
    });

    return prs;
  }, [athleteRecords, exercises]);

  // Total test sessions participated in
  const totalSessions = athleteRecords.length;
  
  // Last active date
  const lastActiveDate = useMemo(() => {
    if (athleteRecords.length === 0) return '-';
    return athleteRecords[athleteRecords.length - 1].date;
  }, [athleteRecords]);

  return (
    <div className="bg-[#161920] rounded-2xl border border-slate-800/80 p-5 mt-4" id="athlete-profile-section">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-300 flex items-center justify-center font-bold text-lg border border-blue-500/20">
            {athleteName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Karta Zawodnika: <span className="text-blue-400 font-extrabold">{athleteName}</span>
            </h3>
            <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Ostatnio aktywny: <span className="font-semibold text-slate-200">{lastActiveDate}</span> ({totalSessions} {totalSessions === 1 ? 'test' : totalSessions < 5 ? 'testy' : 'testów'})
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Personal Records (Życiówki) */}
        <div id="athlete-prs-panel">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Rekordy Życiowe (PR)
          </h4>
          
          <div className="space-y-2">
            {exercises.map(ex => {
              const pr = personalRecords[ex.id];
              const isDuration = ex.type === 'duration';

              return (
                <div 
                  key={ex.id}
                  id={`profile-pr-${ex.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800/50 bg-[#11131a] hover:bg-[#1a1d26] transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ex.color }} />
                    <span className="text-xs font-bold text-slate-100 truncate">{ex.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    {pr ? (
                      <>
                        <div>
                          <p className="font-mono text-xs font-extrabold text-blue-300">
                            {isDuration ? formatSecondsToTime(pr.value) : `${pr.value} ${ex.unit}`}
                          </p>
                          <p className="text-[10px] text-slate-300 font-mono font-bold">{pr.date}</p>
                        </div>
                        {pr.comment && (
                          <span 
                            className="bg-[#0a0c10] border border-slate-800 text-[9px] text-slate-400 px-1.5 py-0.5 rounded cursor-help whitespace-nowrap"
                            title={pr.comment}
                          >
                            *
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-600 font-medium font-mono">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Historical timeline */}
        <div id="athlete-timeline-panel">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-blue-400" />
            Historia Wyników i Uwagi
          </h4>

          {athleteRecords.length === 0 ? (
            <div className="text-slate-500 text-xs py-4 font-medium">Brak wpisów dla tego zawodnika.</div>
          ) : (
            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {athleteRecords.slice().reverse().map((record, rIdx) => {
                // Collect comments or items
                const commentsList: { label: string; comment: string }[] = [];
                exercises.forEach(ex => {
                  const val = record[ex.valueKey] as number | null;
                  const comm = ex.commentKey ? (record[ex.commentKey as any] as string | null) : null;
                  if (comm) {
                    commentsList.push({ label: ex.name, comment: comm });
                  }
                });

                return (
                  <div 
                    key={record.date} 
                    id={`profile-timeline-row-${record.date}`}
                    className="relative pl-4 border-l border-slate-800/85 py-0.5"
                  >
                    {/* Timestamp bullet */}
                    <div className="absolute -left-[3.5px] top-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    
                    <div className="bg-[#11131a] border border-slate-800/60 rounded-xl p-3">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-dashed border-slate-800">
                        <span className="text-xs font-bold text-slate-300 font-mono">{record.date}</span>
                        <span className="text-[10px] bg-[#0a0c10] border border-slate-800 rounded px-1.5 py-0.5 font-mono font-bold text-slate-300">
                          ID: {rIdx + 1}
                        </span>
                      </div>

                      {/* Spark list of results */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                        {exercises.map(ex => {
                          const val = record[ex.valueKey] as number | null;
                          if (val === null || val === undefined) return null;
                          return (
                            <div key={ex.id} className="flex justify-between items-center gap-1 border-b border-slate-800/20 pb-0.5">
                              <span className="text-slate-400 text-[10px] font-semibold truncate">{ex.name}:</span>
                              <span className="font-mono font-bold text-slate-100">
                                {ex.type === 'duration' ? formatSecondsToTime(val) : val}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Annotations/Comments for that date */}
                      {commentsList.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                          {commentsList.map((c, cIdx) => (
                            <div key={cIdx} className="text-[10px] text-slate-300 flex items-start gap-1">
                              <MessageSquare className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                              <p>
                                <strong className="text-slate-200 font-bold">{c.label}:</strong> <span className="text-blue-100 font-medium">{c.comment}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
