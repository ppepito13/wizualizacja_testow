import { AthleteRecord, ExerciseConfig } from './types';

export const EXERCISE_CONFIGS: ExerciseConfig[] = [
  {
    id: 'pullups',
    name: 'Podciągnięcia',
    type: 'numeric',
    valueKey: 'pullups',
    commentKey: 'pullupsComment',
    unit: 'powt.',
    color: '#3B82F6', // Blue 500
    description: 'Dynamiczne podciąganie na drążku (nachwytem/podchwytem).'
  },
  {
    id: 'pushups',
    name: 'Pompki',
    type: 'numeric',
    valueKey: 'pushups',
    commentKey: 'pushupsComment',
    unit: 'powt.',
    color: '#10B981', // Emerald 500
    description: 'Klasyczne pompki na płaskim podłożu z zachowaniem pełnej formy.'
  },
  {
    id: 'squats',
    name: 'Przysiady',
    type: 'numeric',
    valueKey: 'squats',
    commentKey: 'squatsComment',
    unit: 'powt.',
    color: '#F59E0B', // Amber 500
    description: 'Przysiady bez obciążeń lub z obciążeniem zewnętrznym (np. +20kg).'
  },
  {
    id: 'dips',
    name: 'Dipy',
    type: 'numeric',
    valueKey: 'dips',
    commentKey: 'dipsComment',
    unit: 'powt.',
    color: '#EC4899', // Pink 500
    description: 'Pompki na poręczach (dipy) na maksa.'
  },
  {
    id: 'deadHang',
    name: 'Zwis na drążku',
    type: 'duration',
    valueKey: 'deadHangSeconds',
    rawKey: 'deadHangRaw',
    commentKey: null,
    unit: 'min:sek',
    color: '#8B5CF6', // Purple 500
    description: 'Maksymalny czas swobodnego zwisu prostego na drążku.'
  },
  {
    id: 'plank',
    name: 'Plank (Deska)',
    type: 'duration',
    valueKey: 'plankSeconds',
    rawKey: 'plankRaw',
    commentKey: null,
    unit: 'min:sek',
    color: '#14B8A6', // Teal 500
    description: 'Podpór przodem na przedramionach (deska) na czas.'
  },
  {
    id: 'isometricSquat',
    name: 'Przysiad Izometryczny',
    type: 'duration',
    valueKey: 'isometricSquatSeconds',
    rawKey: 'isometricSquatRaw',
    commentKey: null,
    unit: 'min:sek',
    color: '#F43F5E', // Rose 500
    description: 'Trzymanie pozycji krzesełka przy ścianie na czas.'
  },
  {
    id: 'burpees',
    name: 'Krokodylki (Burpees)',
    type: 'numeric',
    valueKey: 'burpees',
    commentKey: 'burpeesComment',
    unit: 'powt.',
    color: '#84CC16', // Lime 500
    description: 'Dynamiczne ćwiczenie krokodylki (burpees) na maksymalną liczbę powtórzeń.'
  },
  {
    id: 'situps',
    name: 'Brzuszki (Situps)',
    type: 'numeric',
    valueKey: 'situps',
    commentKey: 'situpsComment',
    unit: 'powt.',
    color: '#06B6D4', // Cyan 500
    description: 'Klasyczne brzuszki na liczbę powtórzeń.'
  }
];

export function parseTimeToSeconds(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  if (!clean || clean === 'x' || clean === 'niedysponowany' || clean === '-') return null;

  // Check for Excel format 12:MM:SS AM or 12:MM:SS PM or simply 12:MM:SS
  const amPmRegex = /(\d+):(\d+):(\d+)\s*(AM|PM)?/i;
  const matchAmPm = clean.match(amPmRegex);
  if (matchAmPm) {
    const hh = parseInt(matchAmPm[1], 10);
    const mm = parseInt(matchAmPm[2], 10);
    const ss = parseInt(matchAmPm[3], 10);
    // Excel stores durations less than an hour typically as 12:MM:SS AM
    // If hour is 12, it represents 0 hours.
    const actualHours = hh === 12 ? 0 : hh;
    return actualHours * 3600 + mm * 60 + ss;
  }

  // Check for MM:SS
  const mmSsRegex = /^(\d+):(\d+)$/;
  const matchMmSs = clean.match(mmSsRegex);
  if (matchMmSs) {
    const mm = parseInt(matchMmSs[1], 10);
    const ss = parseInt(matchMmSs[2], 10);
    return mm * 60 + ss;
  }

  // Check for only digits (seconds)
  const num = Number(clean);
  if (!isNaN(num)) return num;

  return null;
}

export function formatSecondsToTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVToAthleteRecords(csvText: string): AthleteRecord[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  
  // Find column indices based on various possible names/fragments
  const getIndex = (names: string[]) => {
    return headers.findIndex(h => names.some(n => h.includes(n.toLowerCase()) || n.toLowerCase().includes(h)));
  };
  
  const idxAthlete = getIndex(['zawodnik', 'athlete', 'gracz', 'imię', 'nazwisko']);
  const idxPullups = getIndex(['podciąg', 'podciągnięcia', 'pullups', 'pull-ups']);
  const idxPullupsComment = getIndex(['podc comment', 'podciag comment', 'pullup comment']);
  const idxPushups = getIndex(['pompki', 'pomp', 'pushups', 'push-ups']);
  const idxPushupsComment = getIndex(['pomp comment', 'pushups comment']);
  const idxSquats = getIndex(['przysiady', 'przysiąd', 'squats']);
  const idxSquatsComment = getIndex(['przys comment', 'squats comment']);
  const idxDips = getIndex(['dipy', 'dip', 'dips']);
  const idxDipsComment = getIndex(['dipy comment', 'dip comment', 'dips comment']);
  const idxDeadHang = getIndex(['zwis', 'dead hang', 'zwis na drążku']);
  const idxPlank = getIndex(['plank', 'plank comment', 'plank time']);
  const idxIsometricSquat = getIndex(['przysiad izo', 'izometryczny', 'wall sit']);
  const idxBurpees = getIndex(['burpee', 'krokodyl', 'krokodylki', 'burpees']);
  const idxBurpeesComment = getIndex(['burpee comment', 'burpees comment', 'krokodyl comment', 'krokodylki comment']);
  const idxSitups = getIndex(['brzuszki', 'situp', 'sit-up', 'situps', 'brzuch']);
  const idxSitupsComment = getIndex(['brzuszki comment', 'situp comment', 'situps comment']);
  const idxDate = getIndex(['data', 'date']);

  const records: AthleteRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 2) continue; // Skip lines with too few columns
    
    const athlete = idxAthlete !== -1 && idxAthlete < row.length ? row[idxAthlete] : '';
    if (!athlete) continue;
    
    const parseNum = (val: string | undefined): number | null => {
      if (!val) return null;
      const cleanVal = val.trim();
      if (!cleanVal || cleanVal === 'x' || cleanVal === '-' || cleanVal === 'niedysponowany') return null;
      const parsed = parseFloat(cleanVal);
      return isNaN(parsed) ? null : parsed;
    };
    
    const parseComment = (val: string | undefined): string | null => {
      if (!val) return null;
      const cleanVal = val.trim();
      return cleanVal && cleanVal !== 'x' && cleanVal !== '-' ? cleanVal : null;
    };
    
    const pullups = idxPullups !== -1 && idxPullups < row.length ? parseNum(row[idxPullups]) : null;
    const pullupsComment = idxPullupsComment !== -1 && idxPullupsComment < row.length ? parseComment(row[idxPullupsComment]) : null;
    
    const pushups = idxPushups !== -1 && idxPushups < row.length ? parseNum(row[idxPushups]) : null;
    const pushupsComment = idxPushupsComment !== -1 && idxPushupsComment < row.length ? parseComment(row[idxPushupsComment]) : null;
    
    const squats = idxSquats !== -1 && idxSquats < row.length ? parseNum(row[idxSquats]) : null;
    const squatsComment = idxSquatsComment !== -1 && idxSquatsComment < row.length ? parseComment(row[idxSquatsComment]) : null;
    
    const dips = idxDips !== -1 && idxDips < row.length ? parseNum(row[idxDips]) : null;
    const dipsComment = idxDipsComment !== -1 && idxDipsComment < row.length ? parseComment(row[idxDipsComment]) : null;
    
    const deadHangRaw = idxDeadHang !== -1 && idxDeadHang < row.length ? parseComment(row[idxDeadHang]) : null;
    const deadHangSeconds = parseTimeToSeconds(deadHangRaw);
    
    const plankRaw = idxPlank !== -1 && idxPlank < row.length ? parseComment(row[idxPlank]) : null;
    const plankSeconds = parseTimeToSeconds(plankRaw);
    
    const isometricSquatRaw = idxIsometricSquat !== -1 && idxIsometricSquat < row.length ? parseComment(row[idxIsometricSquat]) : null;
    const isometricSquatSeconds = parseTimeToSeconds(isometricSquatRaw);

    const burpees = idxBurpees !== -1 && idxBurpees < row.length ? parseNum(row[idxBurpees]) : null;
    const burpeesComment = idxBurpeesComment !== -1 && idxBurpeesComment < row.length ? parseComment(row[idxBurpeesComment]) : null;

    const situps = idxSitups !== -1 && idxSitups < row.length ? parseNum(row[idxSitups]) : null;
    const situpsComment = idxSitupsComment !== -1 && idxSitupsComment < row.length ? parseComment(row[idxSitupsComment]) : null;
    
    const date = idxDate !== -1 && idxDate < row.length && row[idxDate] ? row[idxDate].trim() : 'Brak daty';
    
    records.push({
      athlete,
      pullups,
      pullupsComment,
      pushups,
      pushupsComment,
      squats,
      squatsComment,
      dips,
      dipsComment,
      deadHangRaw,
      deadHangSeconds,
      plankRaw,
      plankSeconds,
      isometricSquatRaw,
      isometricSquatSeconds,
      burpees,
      burpeesComment,
      situps,
      situpsComment,
      date
    });
  }
  
  return records;
}

export const DEFAULT_CSV_DATA = `Zawodnik,Podciągnięcia,Podc comment,Pompki,Pomp comment,Przysiady,Przys comment,Dipy,Dipy comment,Zwis na drążku,Plank,Przysiad Izometryczny,Data
Bartosz Jaszczak,22,,65,,30,+20KG,30,,,,,2024-03-29
Krzysztof Ostro.,12,,40,,72,+20KG,,,,,,2024-03-29
Łukasz,23,,62,,63,,,,,,,2024-03-29
Maks,16,,42,,,,,,,,,2024-03-29
Michał Wal.,12,,41,,52,+20KG,,,,,,2024-03-29
Przemysław Grze.,9,,25,,,,15,,,,,2024-03-29
Szymon,7,,39,,20,+20KG,9,,,,,2024-03-29
Adam Lewa.,15,,43,,1250,,30,,12:01:44 AM,,,2024-09-27
Anna Mul.,2,,39,,555,,,,,,,2024-09-27
Anna Netk.,4,,30,,510,,,,,,,2024-09-27
Bartłomiej Gra.,14,,36,,950,,26,,12:01:51 AM,,,2024-09-27
Bartosz Jaszczak,24,,53,,850,,53,,,,,2024-09-27
Jakub Żurawi.,2,3,21,22,750,,,,12:01:22 AM,12:01:34 AM,12:02:17 AM,2024-09-27
Jarosław Kubi.,14,,38,,1050,,23,,12:01:15 AM,12:02:30 AM,12:02:13 AM,2024-09-27
Jerzy Ceco.,18,,50,30,975,,,,,,,2024-09-27
Joanna Kozak.,2,,30,,465,,40,,12:02:31 AM,,,2024-09-27
Joanna Kubi.,5,guma 4/5,19,,290,,,,,,,2024-09-27
Karolina Modrz.,9,,21,22,720,,26,,12:02:09 AM,,,2024-09-27
Katarzyna Lew.,6,,16,bez kolan,435,,,,,,,2024-09-27
Klaudyna Kubiń.,18,,42,,495,,50,,12:02:39 AM,12:00:47 AM,12:06:46 AM,2024-09-27
Krzysztof Czerk.,14,,42,,825,,32,,12:02:05 AM,,,2024-09-27
Krzysztof Ostro.,17,,42,,912,,24,,12:01:22 AM,,12:02:46 AM,2024-09-27
Łukasz Kryc.,,,20,,450,,2,,12:00:57 AM,,,2024-09-27
Magdalena Luz.,2,,20,,290,,,,,,,2024-09-27
Mateusz Herb.,14,,39,,825,,25,,12:01:56 AM,12:01:30 AM,,2024-09-27
Michał Wal.,15,,44,,875,,33,,12:02:00 AM,,,2024-09-27
Mikołaj Zię.,10,,25,,630,,10,,12:03:00 AM,12:00:46 AM,12:03:03 AM,2024-09-27
Oliwia Szymko.,16,,29,,688,,,,,,,2024-09-27
Patryk Muraw.,12,,28,,560,,18,,12:01:31 AM,12:01:16 AM,12:02:03 AM,2024-09-27
Paula Micha.,15,,27,bez kolan,640,,38,,12:03:05 AM,,,2024-09-27
Piotr Okul.,11,,34,,1200,,18,,12:01:13 AM,12:02:30 AM,12:01:53 AM,2024-09-27
Piotr Płacz. ,16,,38,,1150,,33,,12:02:30 AM,,,2024-09-27
Przemysław Grze.,18,,29,,,niedysponowany ,10,,12:01:46 AM,,12:01:45 AM,2024-09-27
Roman Now.,5,,31,,,x,,,,,,2024-09-27
Sławomir Szymkow.,23,,45,,1075,,,,,,,2024-09-27
Urszula Radz.,3,,22,,450,,,,,,,2024-09-27
Wojciech Kwa.,5,7,40,,700,,20,21,12:02:03 AM,,,2024-09-27
Adam Lewa.,20,,53,,1250,,,,12:01:42 AM,,12:01:17 AM,2025-10-17
Adrian Druż.,7,guma,30,paral,1075,,,,12:01:47 AM,,12:03:00 AM,2025-10-17
Aleksandra Jędr.,7,Fiolet,31,technika lekko do poprawy,540,,,,12:03:19 AM,,,2025-10-17
Aneta Wit.,16,najgrubsza guma,32,,925,,,,12:02:07 AM,12:03:05 AM,12:04:13 AM,2025-10-17
Juliette Kwiatk.,15,fiolet,38,,510,,,,12:01:51 AM,12:06:00 AM,12:04:29 AM,2025-10-17
Krzysztof Czerk.,17,,50,,875,,,,12:02:39 AM,,,2025-10-17
Krzysztof Lang.,14,"połóweczki, najgrubsza guma",20,,675,,,,,,,2025-10-17
Magdalena Luz.,3,Fiolet,20,,480,,,,12:01:36 AM,,,2025-10-17
Malwina Kośm.,5,Fiolet,38,technika lekko do poprawy,495,,,,12:01:27 AM,12:05:20 AM,12:01:25 AM,2025-10-17
Michał Wal.,8,3norep,42,,875,,,,,,,2025-10-17
Monika P.,3,"3norep, najgrubsza guma",20,połóweczki,360,,,,,,,2025-10-17
Oliwia Tom.,3,Fiolet,27,,525,,,,12:02:06 AM,,12:02:36 AM,2025-10-17
Patrycja Klim.,10,najgrubsza guma,19,,420,,,,12:02:08 AM,12:03:36 AM,12:06:03 AM,2025-10-17
Patryk Muraw.,12,,33,,800,,,,12:01:35 AM,,12:01:58 AM,2025-10-17
Przemysław Grze.,21,,41,,1600,,,,,,,2025-10-17
Szymon Kuj.,16,,40,,875,,,,,,,2025-10-17
Alina (nowa),,,,,,,,,,,12:01:32 AM,2025-10-17
Lana (nowa),,,,,,,,,,,12:02:06 AM,2025-10-17
Daniel Rochow.,,,,,,,,,,,12:01:24 AM,2025-10-17
Monika Chyl.,,,,,,,,,,,12:04:00 AM,2025-10-17
Adam Lewa.,19,,47,,1125,,30,,12:01:19 AM,,12:01:25 AM,2025-04-11
Adrian Druż.,2,,36,,925,,18,,12:01:35 AM,,12:03:08 AM,2025-04-11
Aleksandra Jędr.,6,,21,tech do popr,460,,24,,12:02:45 AM,,12:02:46 AM,2025-04-11
Bartosz Jaszczak,19,,57,,1000,,54,,,,,2025-04-11
Daniel Rochow.,11,,27,,750,,22,,12:01:28 AM,,12:02:00 AM,2025-04-11
Dawid Mrocz.,6,,41,,825,,,,,,,2025-04-11
Elwira Ehrbach.,0,3,17,,450,,,,12:02:10 AM,,,2025-04-11
Julia Chukhv.,15,,17,tech do popr,460,,31,,,,12:02:30 AM,2025-04-11
Kamil Zawic.,6,guma,30,,600,,8,,,,,2025-04-11
Karina Titus,0,3,15,,405,,,,,,,2025-04-11
Krzysztof Czerk.,16,,48,,800,,29,,,,12:02:10 AM,2025-04-11
Krzysztof Ostro.,16,,44,,1025,,,,,,,2025-04-11
Krzysztof Owczar.,14,technika popr.,42,technika popr.,1025,,12,,,,,2025-04-11
Magdalena Luz.,2,,16,,285,,19,,12:01:43 AM,,12:01:27 AM,2025-04-11
Mateusz Herb.,15,,38,39,625,,28,,12:01:20 AM,,12:02:30 AM,2025-04-11
Oliwia Tom.,4,połówki,20,,540,,24,,,,,2025-04-11
Patryk Muraw.,14,,32,,850,,19,,12:01:19 AM,,12:02:10 AM,2025-04-11
Piotr Płacz. ,22,,47,,1680,,,,,,,2025-04-11
Przemysław Grze.,19,,41,,,,25,,12:01:18 AM,,12:03:10 AM,2025-04-11
Bartosz Jaszczak,25,,,,,,,,,,,2026-05-22`;

export const INITIAL_RECORDS = parseCSVToAthleteRecords(DEFAULT_CSV_DATA);
