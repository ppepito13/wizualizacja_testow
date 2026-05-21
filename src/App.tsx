import React, { useState, useMemo, useEffect } from 'react';
import { 
  Dumbbell, 
  TrendingUp, 
  Trophy, 
  User, 
  Users,
  Database,
  Briefcase,
  Share2,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  Globe,
  RefreshCw,
  Clock,
  Link2,
  Settings,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Line 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

import { AthleteRecord, ExerciseConfig } from './types';
import { 
  EXERCISE_CONFIGS, 
  INITIAL_RECORDS, 
  formatSecondsToTime, 
  parseCSVToAthleteRecords 
} from './data';

import Sidebar from './components/Sidebar';
import Leaderboard from './components/Leaderboard';
import AthleteProfile from './components/AthleteProfile';
import ExerciseSelector from './components/ExerciseSelector';
import AthleteSelector from './components/AthleteSelector';
import { GOOGLE_SHEET_URL } from './config';

const ATHLETE_COLORS = [
  '#3B82F6', // Blue 500
  '#10B981', // Emerald 500
  '#F59E0B', // Amber 500
  '#EC4899', // Pink 500
  '#8B5CF6', // Purple 500
  '#14B8A6', // Teal 500
  '#EF4444', // Red 500
  '#F97316', // Orange 500
  '#6366F1', // Indigo 500
  '#06B6D4', // Cyan 500
  '#84CC16', // Lime 500
  '#EAB308', // Yellow 500
];

function getAthleteColor(athleteName: string, selectedList: string[]) {
  const idx = selectedList.indexOf(athleteName);
  if (idx !== -1) {
    return ATHLETE_COLORS[idx % ATHLETE_COLORS.length];
  }
  let sum = 0;
  for (let i = 0; i < athleteName.length; i++) {
    sum += athleteName.charCodeAt(i);
  }
  return ATHLETE_COLORS[sum % ATHLETE_COLORS.length];
}

export default function App() {
  // --- STATE ---
  const [records, setRecords] = useState<AthleteRecord[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('pullups');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(() => {
    const saved = localStorage.getItem('gym_selected_athletes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [activeTab, setActiveTab] = useState<'charts' | 'leaderboard' | 'profiles'>('charts');
  const [selectedProfileAthlete, setSelectedProfileAthlete] = useState<string>('');
  const [isExerciseDrawerOpen, setIsExerciseDrawerOpen] = useState(false);
  const [isAthleteDrawerOpen, setIsAthleteDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(() => {
    return localStorage.getItem('gym_alert_dismissed') === 'true';
  });

  // --- GOOGLE SHEETS LIVE SYNC CONFIG ---
  const googleSheetUrl = GOOGLE_SHEET_URL;
  const isUrlConfigured = googleSheetUrl && !googleSheetUrl.startsWith("PLACEHOLDER_");

  const [isAutoSync, setIsAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('gym_auto_sync_enabled') !== 'false'; // default to true
  });
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(() => {
    const saved = localStorage.getItem('gym_auto_sync_interval');
    return saved ? parseInt(saved, 10) : 60; // default 60 seconds
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem('gym_last_synced_time') || null;
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  // Utility to convert user-input Google Sheet URL to direct CSV export URL
  const convertGoogleSheetUrl = (url: string): string => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return '';
    
    // Check if it's already a public published CSV url
    if (cleanUrl.includes('pub?output=csv') || cleanUrl.includes('export?format=csv')) {
      return cleanUrl;
    }

    // Convert standard google sheet editor links to export link
    const match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const spreadsheetId = match[1];
      const gidMatch = cleanUrl.match(/[#&]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;
    }

    return cleanUrl;
  };

  const fetchGoogleSheetData = async (targetUrl?: string) => {
    const urlToFetch = targetUrl !== undefined ? targetUrl : googleSheetUrl;
    if (!urlToFetch || urlToFetch.startsWith("PLACEHOLDER_")) {
      setSyncStatus('error');
      setSyncError('Adres URL bazy danych online nie został jeszcze skonfigurowany w pliku src/config.ts.');
      return;
    }

    setSyncStatus('loading');
    setSyncError(null);

    try {
      const directCsvUrl = convertGoogleSheetUrl(urlToFetch);
      // Append timestamp to prevent cache issues
      const finalUrl = `${directCsvUrl}${directCsvUrl.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
      
      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`Odpowiedź serwera: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      const parsedRecords = parseCSVToAthleteRecords(csvText);

      if (parsedRecords.length === 0) {
        throw new Error('Pobrany plik nie zawiera poprawnych nagłówków lub rekordów.');
      }

      setRecords(parsedRecords);
      localStorage.setItem('gym_test_records', JSON.stringify(parsedRecords));

      const timeString = new Date().toLocaleTimeString('pl-PL');
      setLastSyncedTime(timeString);
      localStorage.setItem('gym_last_synced_time', timeString);
      setSyncStatus('success');
    } catch (err: any) {
      console.error('Error syncing with Google Sheets:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Błąd połączenia sieciowego. Upewnij się, że plik jest udostępniony publicznie.');
    }
  };

  // --- INITIAL LOAD & SYNCHRONIZATION ---
  useEffect(() => {
    // Attempt to load from cache first for immediate rendering
    const saved = localStorage.getItem('gym_test_records');
    let hasLoadedCached = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords(parsed);
          hasLoadedCached = true;
        }
      } catch (e) {
        console.error('Failed to parse saved records from localStorage.', e);
      }
    }

    // Always attempt live fetch if configured
    if (isUrlConfigured) {
      fetchGoogleSheetData();
    } else if (!hasLoadedCached) {
      // Force configuration error screen
      setSyncStatus('error');
      setSyncError('Wymagana jest konfiguracja bazy danych online w pliku konfiguracyjnym src/config.ts.');
    }
  }, []);

  // Auto-sync interval
  useEffect(() => {
    if (!isAutoSync || !isUrlConfigured || syncStatus === 'loading') return;

    const intervalId = setInterval(() => {
      fetchGoogleSheetData();
    }, autoSyncInterval * 1000);

    return () => clearInterval(intervalId);
  }, [isAutoSync, isUrlConfigured, autoSyncInterval]);

  // --- METADATA EXTRACTIONS ---
  // List of all unique athletes in database sorted alphabetically
  const allAthletes = useMemo(() => {
    const names = Array.from(new Set(records.map(r => r.athlete))).filter(Boolean) as string[];
    return names.sort((a, b) => a.localeCompare(b, 'pl'));
  }, [records]);

  // List of all unique dates in database sorted chronologically
  const allDates = useMemo(() => {
    const dates = Array.from(new Set(records.map(r => r.date))).filter(Boolean) as string[];
    return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [records]);

  // Setup default selected athletes on first run
  useEffect(() => {
    if (allAthletes.length > 0) {
      const isInitialized = localStorage.getItem('gym_selected_athletes_initialized') === 'true';
      if (!isInitialized) {
        // Choose 5 default popular athletes from the seed data to avoid visual clutter
        const defaults = ['Bartosz Jaszczak', 'Michał Wal.', 'Krzysztof Ostro.', 'Przemysław Grze.', 'Adam Lewa.']
          .filter(name => allAthletes.includes(name));
        
        let initialSelection: string[] = [];
        // If none of those found, pick first 5
        if (defaults.length === 0) {
          initialSelection = allAthletes.slice(0, 5);
        } else {
          initialSelection = defaults;
        }
        setSelectedAthletes(initialSelection);
        localStorage.setItem('gym_selected_athletes', JSON.stringify(initialSelection));
        localStorage.setItem('gym_selected_athletes_initialized', 'true');
      }
    }

    if (allAthletes.length > 0 && !selectedProfileAthlete) {
      // Pick first athlete for profile tab
      if (allAthletes.includes('Bartosz Jaszczak')) {
        setSelectedProfileAthlete('Bartosz Jaszczak');
      } else {
        setSelectedProfileAthlete(allAthletes[0]);
      }
    }
  }, [allAthletes, selectedProfileAthlete]);

  // Filter out exercises that don't have any records in the current database
  const activeExercises = useMemo(() => {
    // If records hasn't loaded yet, or is empty, fall back to EXERCISE_CONFIGS
    if (records.length === 0) {
      return EXERCISE_CONFIGS;
    }
    const filtered = EXERCISE_CONFIGS.filter(config => {
      return records.some(record => {
        const val = record[config.valueKey];
        return val !== null && val !== undefined;
      });
    });
    // Fallback to EXERCISE_CONFIGS if no exercises found (should not happen with default data)
    return filtered.length > 0 ? filtered : EXERCISE_CONFIGS;
  }, [records]);

  // Auto-correct selectedExerciseId if it is not in active list
  useEffect(() => {
    if (activeExercises.length > 0) {
      const isStillAvailable = activeExercises.some(ex => ex.id === selectedExerciseId);
      if (!isStillAvailable) {
        setSelectedExerciseId(activeExercises[0].id);
      }
    }
  }, [activeExercises, selectedExerciseId]);

  // Find currently active exercise config
  const selectedExercise = useMemo(() => {
    return activeExercises.find(ex => ex.id === selectedExerciseId) || activeExercises[0];
  }, [selectedExerciseId, activeExercises]);

  // --- HANDLERS ---
  const handleToggleAthlete = (athlete: string) => {
    setSelectedAthletes(prev => {
      const next = prev.includes(athlete)
        ? prev.filter(x => x !== athlete)
        : [...prev, athlete];
      localStorage.setItem('gym_selected_athletes', JSON.stringify(next));
      localStorage.setItem('gym_selected_athletes_initialized', 'true');
      return next;
    });
  };

  const handleSelectAllAthletes = () => {
    setSelectedAthletes([...allAthletes]);
    localStorage.setItem('gym_selected_athletes', JSON.stringify([...allAthletes]));
    localStorage.setItem('gym_selected_athletes_initialized', 'true');
  };

  const handleSelectNoneAthletes = () => {
    setSelectedAthletes([]);
    localStorage.setItem('gym_selected_athletes', JSON.stringify([]));
    localStorage.setItem('gym_selected_athletes_initialized', 'true');
  };

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    const isDuration = selectedExercise.type === 'duration';
    
    const prepared = allDates.map(dateStr => {
      const dataPoint: any = { date: dateStr };
      let hasRecord = false;
      
      selectedAthletes.forEach(athlete => {
        // Find record for athlete on this date
        const match = records.find(r => r.athlete === athlete && r.date === dateStr);
        if (match) {
          const rawVal = match[selectedExercise.valueKey] as number | null;
          if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal)) {
            dataPoint[athlete] = rawVal;
            hasRecord = true;
            
            // Comment
            if (selectedExercise.commentKey) {
              const comment = match[selectedExercise.commentKey as any];
              if (comment) {
                dataPoint[`${athlete}_comment`] = comment;
              }
            }
          }
        }
      });
      return { dataPoint, hasRecord };
    });

    // Only include dates where at least one selected athlete has a valid score for this exercise
    return prepared
      .filter(item => item.hasRecord)
      .map(item => item.dataPoint);
  }, [records, allDates, selectedAthletes, selectedExercise]);

  // Highlight progression stats
  const performanceInsights = useMemo(() => {
    if (selectedAthletes.length === 0) return null;
    
    let highestProgressionAthlete = '-';
    let highestProgressionDiff = 0;
    let isProgressionDuration = selectedExercise.type === 'duration';

    selectedAthletes.forEach(athlete => {
      const athletePoints = records
        .filter(r => r.athlete === athlete && r[selectedExercise.valueKey] !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (athletePoints.length >= 2) {
        const firstScore = athletePoints[0][selectedExercise.valueKey] as number;
        const lastScore = athletePoints[athletePoints.length - 1][selectedExercise.valueKey] as number;
        const diff = lastScore - firstScore;
        
        if (Math.abs(diff) > Math.abs(highestProgressionDiff)) {
          highestProgressionDiff = diff;
          highestProgressionAthlete = athlete;
        }
      }
    });

    return {
      athlete: highestProgressionAthlete,
      diff: highestProgressionDiff,
      formattedDiff: isProgressionDuration 
        ? `${highestProgressionDiff > 0 ? '+' : ''}${formatSecondsToTime(highestProgressionDiff)} s`
        : `${highestProgressionDiff > 0 ? '+' : ''}${highestProgressionDiff} ${selectedExercise.unit}`
    };
  }, [records, selectedAthletes, selectedExercise]);

  // Custom tooltips inside Recharts line progression
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3.5 shadow-xl max-w-sm" id="recharts-custom-tooltip">
          <p className="text-xs font-bold text-slate-400 mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            📅 Test: <span className="text-white font-mono">{label}</span>
          </p>
          <div className="space-y-2">
            {payload.map((entry: any) => {
              const athleteName = entry.name;
              const value = entry.value;
              const isDuration = selectedExercise.type === 'duration';
              const formattedValue = isDuration ? formatSecondsToTime(value) : `${value} ${selectedExercise.unit}`;
              const commentKey = `${athleteName}_comment`;
              const comment = entry.payload[commentKey];

              return (
                <div key={athleteName} className="flex flex-col text-xs" id={`tooltip-entry-${athleteName.replace(/\s+/g, '-')}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.stroke || entry.color }} />
                      <span className="text-slate-200">{athleteName}:</span>
                    </div>
                    <span className="font-mono font-bold text-white text-right shrink-0">{formattedValue}</span>
                  </div>
                  {comment && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 mt-0.5 ml-4 w-fit font-medium">
                      💡 {comment}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Full-screen error state if fetch failed or if there's any sync error
  if (syncStatus === 'error') {
    return (
      <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center font-sans text-slate-100 antialiased p-6">
        <div className="bg-[#12141c] border border-red-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden" id="full-screen-error-container">
          {/* Top warning bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4 shadow-inner">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Błąd Odczytu Bazy Danych
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Nie udało się pobrać aktualnych wyników sprawnościowych z serwera.
            </p>

            <div className="bg-[#0a0c10] border border-slate-800/80 rounded-xl p-4 w-full my-4 text-left font-sans">
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider mb-1">Status błędu:</span>
              <p className="text-xs text-rose-300 font-mono leading-relaxed bg-[#161a24]/40 px-2.5 py-1.5 rounded-lg border border-red-500/10 animate-pulse">
                {syncError || 'Brak skonfigurowanego połączenia sieciowego lub plik konfiguracyjny zawiera nieprawidłowy format adresu URL.'}
              </p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3.5 w-full text-xs text-blue-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-left leading-relaxed">
                Skontaktuj się z <strong className="text-slate-100 font-bold">Adamem</strong> w celu weryfikacji poprawności konfiguracji zmiennej środowiskowej <code className="bg-[#0a0c10] px-1 py-0.5 rounded text-[11px]">VITE_GOOGLE_SHEET_URL</code> (w pliku <code className="bg-[#0a0c10] px-1 py-0.5 rounded text-[11px]">.env</code> lub panelu Secrets) oraz uprawnień udostępniania Arkusza Google Sheets.
              </p>
            </div>
            
            <button
              id="critical-retry-btn"
              onClick={() => fetchGoogleSheetData()}
              className="mt-5 w-full bg-slate-800 hover:bg-[#1a1d26] text-slate-100 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
            >
              <RefreshCw className="w-4.5 h-4.5" />
              Spróbuj ponownie połączyć
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full-screen loading state if first boot is active or no records are populated yet
  if (records.length === 0 && (syncStatus === 'loading' || syncStatus === 'idle')) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center font-sans text-slate-100 antialiased p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h2 className="text-base font-bold text-slate-200">Wczytywanie bazy danych online...</h2>
          <p className="text-xs text-slate-500 mt-1">Pobieranie najnowszych pomiarów sprawnościowych z arkusza w chmurze.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] flex flex-col font-sans text-slate-100 antialiased">
      
      {/* Compact Dynamic Header */}
      <header className="bg-[#12141c] text-white py-2.5 px-4 lg:py-4 lg:px-6 border-b border-slate-800/80 shadow-lg" id="main-header">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shadow-md shrink-0">
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm lg:text-base font-extrabold tracking-tight">Wizualizacja Wyników Sprawnościowych</h1>
              <p className="text-[10px] lg:text-[11px] text-slate-400 font-medium hidden sm:block">
                Analiza porównawcza i śledzenie postępów sportowych w czasie (2024 - 2026)
              </p>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full lg:w-auto mt-1 lg:mt-0">
            {/* Mobile Settings Gear & Compact Tab Navigation - shown ONLY on <lg screens */}
            <div className="flex lg:hidden items-center justify-between w-full gap-3 mt-1">
              {/* Settings Cog Icon Button */}
              <button
                type="button"
                onClick={() => setIsSettingsDrawerOpen(true)}
                className="flex items-center gap-1.5 bg-[#161a24]/90 hover:bg-[#1a1f2b] border border-slate-800/85 rounded-xl px-2.5 py-1.5 text-slate-300 hover:text-blue-400 transition-all cursor-pointer select-none shadow-sm relative shrink-0 text-xs font-bold"
                title="Status bazy i ustawienia synchronizacji"
              >
                <Settings className="w-3.5 h-3.5 text-blue-400 rotate-0 hover:rotate-45 transition-transform duration-300" />
                <span>Opcje Bazy</span>
                {syncStatus === 'loading' && (
                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                )}
              </button>

              {/* 3 Compact Icons Navigation (Strzałka, Puchar, Ludzik) */}
              <div className="flex items-center gap-1 bg-[#0a0c10]/80 border border-slate-800/80 p-0.5 rounded-xl shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('charts')}
                  className={`p-1.5 px-3 rounded-lg transition-all border ${
                    activeTab === 'charts'
                      ? 'bg-blue-600 border-blue-500/50 text-white shadow-md'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                  title="Wykres Progresu"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaderboard')}
                  className={`p-1.5 px-3 rounded-lg transition-all border ${
                    activeTab === 'leaderboard'
                      ? 'bg-blue-600 border-blue-500/50 text-white shadow-md'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                  title="Tabela i Rankingi"
                >
                  <Trophy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profiles')}
                  className={`p-1.5 px-3 rounded-lg transition-all border ${
                    activeTab === 'profiles'
                      ? 'bg-blue-600 border-blue-500/50 text-white shadow-md'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                  title="Profil Zawodnika"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop Overview and Sync Status - hidden on mobile, shown on lg screens */}
            <div className="hidden lg:flex flex-row items-center gap-3 w-auto">
              {/* Google Sheets Sync & Settings Component */}
              {isUrlConfigured && (
                <div className="relative">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161a24]/85 border border-slate-800/80 rounded-xl text-xs shadow-inner">
                    <div className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        syncStatus === 'loading' ? 'bg-blue-400' : syncStatus === 'error' ? 'bg-rose-450' : 'bg-emerald-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        syncStatus === 'loading' ? 'bg-blue-500' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`} />
                    </div>
                    
                    <div className="text-left font-sans text-[11px] leading-tight mr-1.5">
                      <span className="text-slate-400 block font-medium">Baza Danych Online</span>
                      <span className="text-[10px] text-slate-350 font-bold font-mono">
                        {syncStatus === 'loading' ? 'Synchronizacja...' : syncStatus === 'error' ? 'Błąd pobierania' : lastSyncedTime ? `Aktualna: ${lastSyncedTime}` : 'oczekiwanie...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-800/60 pl-2">
                      <button
                        id="header-manual-sync-btn"
                        onClick={() => fetchGoogleSheetData()}
                        disabled={syncStatus === 'loading'}
                        className="p-1 px-1.5 rounded-lg bg-[#0a0c10]/40 hover:bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-40"
                        title="Odśwież teraz dane z Arkusza"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncStatus === 'loading' ? 'animate-spin text-blue-400' : ''}`} />
                      </button>

                      <button
                        id="header-settings-toggle-btn"
                        onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                        className={`p-1 px-1.5 rounded-lg transition-all ${showSettingsPopover ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-[#0a0c10]/40 hover:bg-slate-800 border border-transparent text-slate-400 hover:text-white'}`}
                        title="Ustawienia synchronizacji automatycznej"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Settings Popover Dropdown */}
                  {showSettingsPopover && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#12141c] border border-slate-800 rounded-xl p-4 shadow-2xl z-50 text-xs text-slate-200" id="settings-popover-menu">
                      <h4 className="font-bold text-slate-100 pb-1.5 mb-2.5 border-b border-slate-800/60 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-blue-400" />
                          Ustawienia Online
                        </span>
                        <button 
                          onClick={() => setShowSettingsPopover(false)}
                          className="text-slate-500 hover:text-slate-300 text-[10px]"
                          type="button"
                        >
                          Zamknij
                        </button>
                      </h4>
                      
                      <div className="space-y-3.5">
                        {/* Auto Sync Switch */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-slate-300 font-bold block">Autoodświeżanie</span>
                            <span className="text-[10px] text-slate-500 block">Pobieraj dane w tle</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAutoSync}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setIsAutoSync(val);
                                localStorage.setItem('gym_auto_sync_enabled', val ? 'true' : 'false');
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-[#0a0c10] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-500 peer-checked:after:bg-emerald-400 after:border-transparent after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500/10 peer-checked:border-emerald-500/30"></div>
                          </label>
                        </div>

                        {/* Auto Sync Interval Dropdown */}
                        <div className="space-y-1">
                          <span className="text-slate-400 block text-[10px] font-semibold">Częstotliwość aktualizacji:</span>
                          <select
                            id="header-interval-select"
                            value={autoSyncInterval}
                            disabled={!isAutoSync}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setAutoSyncInterval(val);
                              localStorage.setItem('gym_auto_sync_interval', val.toString());
                            }}
                            className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500/40 disabled:opacity-35 cursor-pointer"
                          >
                            <option value="15" className="bg-[#12141c]">Co 15 sekund</option>
                            <option value="30" className="bg-[#12141c]">Co 30 sekund</option>
                            <option value="60" className="bg-[#12141c]">Co 1 minutę</option>
                            <option value="120" className="bg-[#12141c]">Co 2 minuty</option>
                            <option value="300" className="bg-[#12141c]">Co 5 minut</option>
                          </select>
                        </div>

                        <div className="p-2 bg-[#0a0c10]/40 rounded-lg border border-slate-800 text-[10px] text-slate-500 text-center font-mono leading-tight">
                          Źródło: Google Sheets (config)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Overview stats */}
              <div className="bg-[#1a1d25]/60 border border-slate-800/60 rounded-xl px-3.5 py-1.5 text-xs flex items-center gap-6">
                <div className="text-center sm:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Zawodnicy</span>
                  <span className="font-extrabold text-slate-100 font-mono text-sm">{allAthletes.length}</span>
                </div>
                <div className="w-px h-6 bg-slate-800 shrink-0" />
                <div className="text-center sm:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Pomiary</span>
                  <span className="font-extrabold text-slate-100 font-mono text-sm">{records.length}</span>
                </div>
                <div className="w-px h-6 bg-slate-800 shrink-0" />
                <div className="text-center sm:text-left">
                  <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Edycje</span>
                  <span className="font-extrabold text-slate-100 font-mono text-sm">{allDates.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </header>

      {/* Mobile Sticky Control Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#12141c]/95 border-b border-slate-800/60 px-4 py-3 shadow-md flex items-center justify-between gap-2.5 backdrop-blur-md" id="mobile-sticky-controls">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Exercise Pill trigger */}
          <button
            type="button"
            onClick={() => setIsExerciseDrawerOpen(true)}
            className="flex-1 bg-[#161a24] hover:bg-[#1a1f2b] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 flex items-center justify-between min-w-0 transition-all cursor-pointer shadow-inner"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: selectedExercise.color }} />
              <span className="truncate">{selectedExercise.name}</span>
            </div>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-extrabold shrink-0 ml-1.5">{selectedExercise.unit}</span>
          </button>

          {/* Athlete Pill trigger */}
          <button
            type="button"
            onClick={() => setIsAthleteDrawerOpen(true)}
            className="flex-1 bg-[#161a24] hover:bg-[#1a1f2b] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 flex items-center justify-between min-w-0 transition-all cursor-pointer shadow-inner"
          >
            <div className="flex items-center gap-2 truncate">
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">
                {selectedAthletes.length === 0 
                  ? 'Brak osób' 
                  : selectedAthletes.length === allAthletes.length 
                    ? 'Wszyscy' 
                    : `Osoby: ${selectedAthletes.length}`}
              </span>
            </div>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5" />
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row min-h-0">
        
        {/* Sidebar */}
        <Sidebar
          athletes={allAthletes}
          selectedAthletes={selectedAthletes}
          onToggleAthlete={handleToggleAthlete}
          onSelectAllAthletes={handleSelectAllAthletes}
          onSelectNoneAthletes={handleSelectNoneAthletes}
          exercises={activeExercises}
          selectedExerciseId={selectedExerciseId}
          onSelectExercise={setSelectedExerciseId}
          records={records}
        />

        {/* Dashboard Workstation Container */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto flex flex-col min-w-0" id="main-content-area">
          
          {/* Top Control Tabs - Desktop Only */}
          <div className="hidden lg:flex bg-[#161920]/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/80 gap-1 mb-6 shadow-xl">
            <button
               id="tab-charts"
               onClick={() => setActiveTab('charts')}
               className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                 activeTab === 'charts'
                   ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                   : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1d25]/60 border-transparent'
               }`}
            >
              <TrendingUp className="w-4 h-4" />
              Wykres Progresu
            </button>
            
            <button
               id="tab-leaderboard"
               onClick={() => setActiveTab('leaderboard')}
               className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                 activeTab === 'leaderboard'
                   ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                   : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1d25]/60 border-transparent'
               }`}
            >
              <Trophy className="w-4 h-4" />
              Tabela i Rankingi
            </button>

            <button
               id="tab-profiles"
               onClick={() => setActiveTab('profiles')}
               className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                 activeTab === 'profiles'
                   ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                   : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1d25]/60 border-transparent'
               }`}
            >
              <User className="w-4 h-4" />
              Profil Zawodnika
            </button>

          </div>

          {/* ACTIVE VIEWPORTS */}
          {activeTab === 'charts' && (
            <div className="space-y-6 animate-fade-in" id="charts-viewport">
              
              {/* Chart Platform */}
              <div className="bg-[#161920] rounded-2xl border border-slate-800/80 p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <span 
                      className="px-2.5 py-1 rounded text-[10px] font-mono tracking-wider font-extrabold uppercase text-white shadow-sm inline-block"
                      style={{ backgroundColor: selectedExercise.color }}
                    >
                      {selectedExercise.name} ({selectedExercise.unit})
                    </span>
                    <h3 className="text-base font-bold text-slate-100 mt-2">
                      Przebieg Postępów Grupy Zawodników
                    </h3>
                    <p className="text-slate-200 text-xs mt-1.5 font-medium">
                      {selectedExercise.description}
                    </p>
                  </div>

                  {/* Highlight box */}
                  {performanceInsights && performanceInsights.athlete !== '-' && (
                    <div className="bg-[#11131a] border border-slate-800/70 rounded-xl p-3 flex items-center gap-3 self-start sm:self-auto">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-500 block">Największa zmiana (start ➜ meta):</span>
                        <strong className="text-slate-300 font-bold">{performanceInsights.athlete} </strong>
                        <span className="font-mono text-emerald-400 font-bold">({performanceInsights.formattedDiff})</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visual Legend Outside the Chart SVG to avoid mobile overlapping */}
                {selectedAthletes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 p-3 bg-[#11131a]/45 rounded-xl border border-slate-800/40">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 mr-2">
                      Legenda:
                    </span>
                    {selectedAthletes.map(athlete => {
                      const color = getAthleteColor(athlete, selectedAthletes);
                      return (
                        <div key={athlete} className="flex items-center gap-1.5 bg-[#12141c]/80 border border-slate-800/60 px-2.5 py-1 rounded-lg">
                          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                          <span className="text-xs font-semibold text-slate-300">{athlete}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recharts container */}
                {selectedAthletes.length === 0 ? (
                  <div className="h-96 w-full bg-[#11131a]/50 rounded-2xl flex flex-col items-center justify-center border border-slate-800/60">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                    <p className="text-sm font-semibold text-slate-300">Nie wybrano żadnego zawodnika</p>
                    <p className="text-xs text-slate-550 mt-1 text-slate-500">Zaznacz sportowców w lewym panelu bocznym, aby narysować linie wykresu.</p>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-96 w-full bg-[#11131a]/50 rounded-2xl flex flex-col items-center justify-center border border-slate-800/60 text-center px-4">
                    <Info className="w-8 h-8 text-sky-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">Brak danych dla wybranej grupy</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Wybrani zawodnicy nie posiadają jeszcze żadnych zapisanych wyników w ćwiczeniu "{selectedExercise.name}".
                    </p>
                  </div>
                ) : (
                  <div className="h-[420px] w-full" id="recharts-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 15, right: 30, left: 10, bottom: 15 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#222733" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#475569" 
                          tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 600 }}
                          fontFamily="sans-serif"
                          dy={10}
                          padding={
                            chartData.length === 1 
                              ? { left: 100, right: 100 } 
                              : chartData.length === 2 
                                ? { left: 80, right: 80 } 
                                : { left: 20, right: 20 }
                          }
                        />
                        <YAxis 
                          stroke="#475569" 
                          tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 600 }}
                          fontFamily="monospace"
                          dx={-10}
                          tickFormatter={val => selectedExercise.type === 'duration' ? formatSecondsToTime(val) : val}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {selectedAthletes.map(athlete => (
                          <Line
                            key={athlete}
                            type="monotone"
                            dataKey={athlete}
                            name={athlete}
                            stroke={getAthleteColor(athlete, selectedAthletes)}
                            strokeWidth={3}
                            activeDot={{ r: 8 }}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Small details table showing the precise comments representing the graph point */}
              {selectedAthletes.length > 0 && (() => {
                const commentedRows: Array<{ date: string; athlete: string; score: number; comment: string }> = [];
                allDates.forEach(date => {
                  selectedAthletes.forEach(athlete => {
                    const match = records.find(r => r.athlete === athlete && r.date === date);
                    if (!match) return;
                    const score = match[selectedExercise.valueKey] as number | null;
                    if (score === null || score === undefined) return;
                    const comment = selectedExercise.commentKey ? match[selectedExercise.commentKey as any] : null;
                    if (comment && String(comment).trim() !== "") {
                      commentedRows.push({
                        date,
                        athlete,
                        score,
                        comment: String(comment).trim()
                      });
                    }
                  });
                });

                return (
                  <div className="bg-[#161920] rounded-2xl border border-slate-800/80 p-5 mt-4" id="detailed-exercise-table">
                    <h4 className="text-sm font-bold text-slate-200 mb-3.5 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      Wykaz Komentarzy i Szczegółów (Dla Aktywnych Linii)
                    </h4>
                    
                    {commentedRows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="bg-[#11131a] text-slate-400 font-bold border-b border-slate-800/80">
                              <th className="p-3 font-semibold">Data</th>
                              <th className="p-3 font-semibold">Zawodnik</th>
                              <th className="p-3 font-semibold">Wynik</th>
                              <th className="p-3 font-semibold">Uwagi / Modyfikatory (np. obciążenie, scaling)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {commentedRows.map(({ date, athlete, score, comment }) => (
                              <tr key={`${date}-${athlete}`} className="hover:bg-[#11131a]/30 transition-colors">
                                <td className="p-3 font-mono text-slate-500">{date}</td>
                                <td className="p-3 font-bold text-slate-200">{athlete}</td>
                                <td className="p-3 font-mono font-bold text-slate-100">
                                  {selectedExercise.type === 'duration' ? formatSecondsToTime(score) : score}
                                </td>
                                <td className="p-3">
                                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium px-2.5 py-0.5 rounded-md inline-block">
                                    {comment}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-xs italic bg-[#11131a]/35 rounded-xl border border-slate-800/40">
                        Brak dodatkowych komentarzy
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="animate-fade-in" id="leaderboard-viewport">
              <Leaderboard 
                records={records}
                exercise={selectedExercise}
                allDates={allDates}
              />
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="space-y-6 animate-fade-in" id="profiles-viewport">
              {/* Select Athlete card profile */}
              <div className="bg-[#161920] p-5 rounded-2xl border border-slate-800/80 flex flex-wrap items-center gap-4 justify-between shadow-lg">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Wybierz profil zawodnika:</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Przestudiuj ich osobiste rekordy oraz kompletną historię.</p>
                </div>
                <select
                  id="profile-athlete-select"
                  value={selectedProfileAthlete}
                  onChange={(e) => setSelectedProfileAthlete(e.target.value)}
                  className="bg-[#0a0c10] border border-slate-800 rounded-lg px-4 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500/50 min-w-[200px]"
                >
                  {allAthletes.map(name => (
                    <option key={name} value={name} id={`profile-opt-${name.replace(/\s+/g, '-')}`} className="bg-[#0a0c10] text-slate-200">{name}</option>
                  ))}
                </select>
              </div>

              {selectedProfileAthlete ? (
                <AthleteProfile 
                  athleteName={selectedProfileAthlete}
                  records={records}
                  exercises={activeExercises}
                />
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs font-mono font-medium">
                  Upewnij się, że wczytane dane zawierają zawodników.
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Mobile Bottom Sheets Drawer Platform */}
      <AnimatePresence>
        {/* Szuflada 1: Ćwiczenia */}
        {isExerciseDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExerciseDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-xs lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 inset-x-0 bg-[#12141c] border-t border-slate-800 rounded-t-[28px] max-h-[82vh] flex flex-col z-50 shadow-2xl pb-6"
            >
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto my-3.5 shrink-0" />
              <div className="px-5 pb-3 border-b border-slate-800/70 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedExercise.color }} />
                  Wybierz Ćwiczenie
                </h3>
                <button
                  type="button"
                  onClick={() => setIsExerciseDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800/60 text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-5 pb-8">
                <ExerciseSelector
                  exercises={activeExercises}
                  selectedExerciseId={selectedExerciseId}
                  onSelectExercise={(id) => {
                    setSelectedExerciseId(id);
                    setIsExerciseDrawerOpen(false);
                  }}
                  variant="drawer"
                />
              </div>
            </motion.div>
          </>
        )}

        {/* Szuflada 2: Zawodnicy */}
        {isAthleteDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAthleteDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-xs lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 inset-x-0 bg-[#12141c] border-t border-slate-800 rounded-t-[28px] max-h-[82vh] flex flex-col z-50 shadow-2xl pb-6"
            >
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto my-3.5 shrink-0" />
              <div className="px-5 pb-3 border-b border-slate-800/70 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  Wybierz Zawodników
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAthleteDrawerOpen(false)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md"
                >
                  Gotowe
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-5 pb-8">
                <AthleteSelector
                  athletes={allAthletes}
                  selectedAthletes={selectedAthletes}
                  onToggleAthlete={handleToggleAthlete}
                  onSelectAllAthletes={handleSelectAllAthletes}
                  onSelectNoneAthletes={handleSelectNoneAthletes}
                  selectedExercise={selectedExercise}
                  records={records}
                  variant="drawer"
                />
              </div>
            </motion.div>
          </>
        )}

        {/* Szuflada 3: Ustawienia i Status Bazy */}
        {isSettingsDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-xs lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 inset-x-0 bg-[#12141c] border-t border-slate-800 rounded-t-[28px] max-h-[85vh] flex flex-col z-50 shadow-2xl pb-6"
            >
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto my-3.5 shrink-0" />
              <div className="px-5 pb-3 border-b border-slate-800/70 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  Status &amp; Ustawienia Bazy
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSettingsDrawerOpen(false)}
                  className="p-1 px-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md"
                >
                  Zamknij
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-5 pb-8 space-y-6">
                
                {/* Section 1: Connection Health */}
                <div className="bg-[#161a24]/60 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Metoda połączenia</span>
                      <h4 className="font-extrabold text-[#ffffff] text-xs">Arkusze Google (Google Sheets API)</h4>
                    </div>
                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 capitalize ${
                      syncStatus === 'loading' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                      syncStatus === 'error' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' : 
                      'bg-[#10b981]/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'loading' ? 'bg-blue-500 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-555'}`} />
                      {syncStatus === 'loading' ? 'Synchronizacja' : syncStatus === 'error' ? 'Błąd' : 'Połączono'}
                    </span>
                  </div>

                  {lastSyncedTime && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/40">
                      <span>Ostatnia aktualizacja:</span>
                      <span className="font-mono text-slate-200 font-bold">{lastSyncedTime}</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      fetchGoogleSheetData();
                    }}
                    disabled={syncStatus === 'loading'}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all disabled:opacity-45 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} />
                    Odśwież dane z Arkusza teraz
                  </button>
                </div>

                {/* Section 2: Sync preferences */}
                <div className="bg-[#161a24]/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <h4 className="text-slate-350 text-[11px] font-bold uppercase tracking-wider pb-1.5 border-b border-slate-800/40 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-blue-400" />
                    Preferencje odświeżania tła
                  </h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-200 font-bold block text-xs">Automatyczna aktualizacja</span>
                      <span className="text-[10px] text-slate-500 block font-sans">Odświeżaj dane bez przeładowywania</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAutoSync}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setIsAutoSync(val);
                          localStorage.setItem('gym_auto_sync_enabled', val ? 'true' : 'false');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#0a0c10] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-500 peer-checked:after:bg-emerald-400 after:border-transparent after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#10b981]/20 peer-checked:border-emerald-555"></div>
                    </label>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-slate-400 block text-[10px] font-semibold">Częstotliwość synchronizacji:</span>
                    <select
                      value={autoSyncInterval}
                      disabled={!isAutoSync}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setAutoSyncInterval(val);
                        localStorage.setItem('gym_auto_sync_interval', val.toString());
                      }}
                      className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500/40 disabled:opacity-35 cursor-pointer"
                    >
                      <option value="15" className="bg-[#12141c]">Co 15 sekund</option>
                      <option value="30" className="bg-[#12141c]">Co 30 sekund</option>
                      <option value="60" className="bg-[#12141c]">Co 1 minutę</option>
                      <option value="120" className="bg-[#12141c]">Co 2 minuty</option>
                      <option value="300" className="bg-[#12141c]">Co 5 minut</option>
                    </select>
                  </div>
                </div>

                {/* Section 3: Database statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1a1d25]/60 border border-slate-800/80 rounded-xl p-3 text-center">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Zawodnicy</span>
                    <span className="font-extrabold text-slate-100 font-mono text-base">{allAthletes.length}</span>
                  </div>
                  <div className="bg-[#1a1d25]/60 border border-slate-800/80 rounded-xl p-3 text-center">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Pomiary</span>
                    <span className="font-extrabold text-slate-105 font-mono text-base">{records.length}</span>
                  </div>
                  <div className="bg-[#1a1d25]/60 border border-slate-800/80 rounded-xl p-3 text-center">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Edycje</span>
                    <span className="font-extrabold text-slate-105 font-mono text-base">{allDates.length}</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
