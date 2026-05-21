export interface AthleteRecord {
  athlete: string;
  pullups: number | null;
  pullupsComment: string | null;
  pushups: number | null;
  pushupsComment: string | null;
  squats: number | null;
  squatsComment: string | null;
  dips: number | null;
  dipsComment: string | null;
  deadHangRaw: string | null;
  deadHangSeconds: number | null;
  plankRaw: string | null;
  plankSeconds: number | null;
  isometricSquatRaw: string | null;
  isometricSquatSeconds: number | null;
  burpees: number | null;
  burpeesComment: string | null;
  situps: number | null;
  situpsComment: string | null;
  date: string; // YYYY-MM-DD
}

export type ExerciseId = 'pullups' | 'pushups' | 'squats' | 'dips' | 'deadHang' | 'plank' | 'isometricSquat' | 'burpees' | 'situps';

export interface ExerciseConfig {
  id: ExerciseId;
  name: string;
  type: 'numeric' | 'duration';
  valueKey: 'pullups' | 'pushups' | 'squats' | 'dips' | 'deadHangSeconds' | 'plankSeconds' | 'isometricSquatSeconds' | 'burpees' | 'situps';
  rawKey?: 'deadHangRaw' | 'plankRaw' | 'isometricSquatRaw';
  commentKey: 'pullupsComment' | 'pushupsComment' | 'squatsComment' | 'dipsComment' | 'burpeesComment' | 'situpsComment' | null;
  unit: string;
  color: string;
  description: string;
}
