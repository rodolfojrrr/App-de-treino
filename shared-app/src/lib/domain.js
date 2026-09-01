export const APP_VERSION = '1.1.0';
export const SCHEMA_VERSION = 6;

export const DAYS = [
  { id: 1, name: 'Segunda', short: 'SEG' },
  { id: 2, name: 'Terça', short: 'TER' },
  { id: 3, name: 'Quarta', short: 'QUA' },
  { id: 4, name: 'Quinta', short: 'QUI' },
  { id: 5, name: 'Sexta', short: 'SEX' },
  { id: 6, name: 'Sábado', short: 'SÁB' },
  { id: 0, name: 'Domingo', short: 'DOM' }
];

export const ACCENTS = ['#C7FF54', '#35E6A6', '#58A6FF', '#FF7A59', '#FFCF5A', '#B783FF', '#FF5C8A', '#E6F0FF'];

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createInitialCore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    revision: 0,
    user: null,
    settings: {
      theme: 'dark',
      accent: '#C7FF54',
      rememberLogin: true,
      defaultRestSec: 90,
      autoStartRest: false,
      notifications: true,
      haptics: true,
      dayColors: {
        1: '#35E6A6',
        2: '#FF7A59',
        3: '#58A6FF',
        4: '#B783FF',
        5: '#FF5C8A',
        6: '#FFCF5A',
        0: '#7F8EA3'
      },
      restDayMessage: 'Recuperar também faz parte da evolução.'
    },
    week: DAYS.map((day) => ({ ...day, workoutIds: [], note: '' })),
    workouts: [],
    scheduleOverrides: {},
    activeSession: null,
    history: [],
    goals: {
      weekly: 5,
      monthly: 20,
      weightTarget: '',
      exerciseGoals: []
    },
    body: {
      weights: [],
      photos: []
    },
    updatedAt: nowIso()
  };
}

export function normalizeCore(raw) {
  const base = createInitialCore();
  const source = raw && typeof raw === 'object' ? raw : {};
  const settings = {
    ...base.settings,
    ...(source.settings || {}),
    dayColors: { ...base.settings.dayColors, ...(source.settings?.dayColors || {}) }
  };
  const weekById = new Map((source.week || []).map((day) => [Number(day.id), day]));
  const week = DAYS.map((day) => ({
    ...day,
    ...(weekById.get(day.id) || {}),
    workoutIds: Array.isArray(weekById.get(day.id)?.workoutIds) ? weekById.get(day.id).workoutIds : []
  }));
  return {
    ...base,
    ...source,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    revision: Number(source.revision || 0),
    settings,
    week,
    workouts: Array.isArray(source.workouts) ? source.workouts.map(normalizeWorkout) : [],
    scheduleOverrides: source.scheduleOverrides && typeof source.scheduleOverrides === 'object' && !Array.isArray(source.scheduleOverrides) ? source.scheduleOverrides : {},
    history: Array.isArray(source.history) ? source.history : [],
    goals: { ...base.goals, ...(source.goals || {}) },
    body: {
      weights: Array.isArray(source.body?.weights) ? source.body.weights : [],
      photos: Array.isArray(source.body?.photos) ? source.body.photos : []
    },
    activeSession: source.activeSession || null,
    updatedAt: source.updatedAt || nowIso()
  };
}

export function normalizeWorkout(workout) {
  return {
    id: workout.id || uid('workout'),
    name: workout.name || 'Novo treino',
    icon: workout.icon || 'Dumbbell',
    color: workout.color || '#C7FF54',
    description: workout.description || '',
    archived: Boolean(workout.archived),
    createdAt: workout.createdAt || nowIso(),
    updatedAt: workout.updatedAt || nowIso(),
    exercises: Array.isArray(workout.exercises) ? workout.exercises.map(normalizeExercise) : []
  };
}

export function normalizeExercise(exercise) {
  const sets = Array.isArray(exercise.sets) && exercise.sets.length
    ? exercise.sets
    : [{ id: uid('set'), label: 'Série 1', type: 'work', targetReps: '10-12', defaultLoad: '' }];
  return {
    id: exercise.id || uid('exercise'),
    name: exercise.name || 'Novo exercício',
    group: exercise.group || '',
    notes: exercise.notes || '',
    restSec: Number.isFinite(Number(exercise.restSec)) ? Number(exercise.restSec) : 90,
    mediaIds: Array.isArray(exercise.mediaIds) ? exercise.mediaIds : [],
    substituteExerciseIds: Array.isArray(exercise.substituteExerciseIds) ? exercise.substituteExerciseIds : [],
    sets: sets.map((set, index) => ({
      id: set.id || uid('set'),
      label: set.label || `Série ${index + 1}`,
      type: set.type || 'work',
      targetReps: set.targetReps ?? '10-12',
      defaultLoad: set.defaultLoad ?? ''
    }))
  };
}

export function createWorkout(input = {}) {
  return normalizeWorkout({
    id: uid('workout'),
    name: input.name?.trim() || 'Novo treino',
    color: input.color || '#C7FF54',
    icon: input.icon || 'Dumbbell',
    description: input.description || '',
    exercises: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  });
}

export function createExercise(input = {}, defaultRestSec = 90) {
  const count = Math.max(1, Math.min(12, Number(input.setCount) || 4));
  return normalizeExercise({
    id: uid('exercise'),
    name: input.name?.trim() || 'Novo exercício',
    group: input.group?.trim() || '',
    notes: input.notes?.trim() || '',
    restSec: Number(input.restSec) || defaultRestSec,
    mediaIds: [],
    sets: Array.from({ length: count }, (_, index) => ({
      id: uid('set'),
      label: `Série ${index + 1}`,
      type: index === 0 && input.firstWarmup ? 'warmup' : 'work',
      targetReps: input.targetReps || '10-12',
      defaultLoad: input.defaultLoad || ''
    }))
  });
}

export function getTodayId() {
  return new Date().getDay();
}

export function localDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayPlan(core, date = new Date()) {
  const value = date instanceof Date ? date : new Date(`${date}T12:00:00`);
  const dateKey = localDateKey(value);
  const day = core.week.find((item) => item.id === value.getDay());
  const baseWorkoutIds = Array.isArray(day?.workoutIds) ? day.workoutIds : [];
  const override = core.scheduleOverrides?.[dateKey] || null;
  const workoutIds = [
    ...(override?.suppressBase ? [] : baseWorkoutIds),
    ...((override?.addedWorkoutIds || []).filter((id) => !baseWorkoutIds.includes(id) || override?.suppressBase))
  ];
  return {
    dateKey,
    day,
    override,
    workoutIds: [...new Set(workoutIds)],
    activity: override?.activity || null
  };
}

export function createActivitySession(activity = {}) {
  const startedAt = nowIso();
  const exerciseId = uid('activity');
  const name = activity.name || activity.type || 'Atividade avulsa';
  return {
    id: uid('session'),
    sessionType: 'activity',
    workoutId: null,
    workoutName: name,
    workoutColor: activity.color || '#58A6FF',
    startedAt,
    finishedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    currentExerciseId: exerciseId,
    exercises: [{
      exerciseId,
      name,
      group: 'Atividade avulsa',
      notes: activity.note || '',
      restSec: 0,
      mediaIds: [],
      skipped: false,
      sessionNote: '',
      sets: []
    }],
    activity: {
      type: activity.type || 'Outro',
      name,
      distanceKm: activity.distanceKm || '',
      calories: activity.calories || '',
      note: activity.note || ''
    },
    rest: null,
    note: ''
  };
}

export function formatElapsed(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function elapsedSession(session, at = Date.now()) {
  if (!session?.startedAt) return 0;
  const started = new Date(session.startedAt).getTime();
  const totalPausedMs = Number(session.totalPausedMs || 0);
  const end = session.finishedAt ? new Date(session.finishedAt).getTime() : at;
  const currentPause = session.pausedAt && !session.finishedAt ? Math.max(0, end - new Date(session.pausedAt).getTime()) : 0;
  return Math.max(0, end - started - totalPausedMs - currentPause);
}

export function findLastExercisePerformance(history, exerciseId) {
  const ordered = [...(history || [])].sort((a, b) => new Date(b.finishedAt || b.startedAt) - new Date(a.finishedAt || a.startedAt));
  for (const session of ordered) {
    const exercise = session.exercises?.find((item) => item.exerciseId === exerciseId);
    if (exercise) return { session, exercise };
  }
  return null;
}

export function createActiveSession(workout, history = []) {
  const startedAt = nowIso();
  const exercises = workout.exercises.map((exercise) => {
    const previous = findLastExercisePerformance(history, exercise.id)?.exercise;
    return {
      exerciseId: exercise.id,
      name: exercise.name,
      group: exercise.group,
      notes: exercise.notes,
      restSec: exercise.restSec,
      mediaIds: exercise.mediaIds || [],
      skipped: false,
      sessionNote: '',
      sets: exercise.sets.map((set, index) => ({
        setId: set.id,
        label: set.label || `Série ${index + 1}`,
        type: set.type || 'work',
        targetReps: set.targetReps ?? '',
        previousLoad: previous?.sets?.[index]?.load ?? '',
        previousReps: previous?.sets?.[index]?.reps ?? '',
        load: previous?.sets?.[index]?.load ?? set.defaultLoad ?? '',
        reps: '',
        done: false,
        doneAt: null
      }))
    };
  });
  return {
    id: uid('session'),
    workoutId: workout.id,
    workoutName: workout.name,
    workoutColor: workout.color,
    startedAt,
    finishedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    currentExerciseId: exercises[0]?.exerciseId || null,
    exercises,
    rest: null,
    note: ''
  };
}

export function finishSession(session) {
  const finishedAt = nowIso();
  let totalPausedMs = Number(session.totalPausedMs || 0);
  if (session.pausedAt) totalPausedMs += Math.max(0, Date.now() - new Date(session.pausedAt).getTime());
  const finished = { ...session, finishedAt, pausedAt: null, totalPausedMs, rest: null };
  return { ...finished, durationMs: elapsedSession(finished, new Date(finishedAt).getTime()) };
}

export function sessionProgress(session) {
  const sets = session?.exercises?.flatMap((exercise) => exercise.sets || []) || [];
  const done = sets.filter((set) => set.done).length;
  return { done, total: sets.length, percent: sets.length ? Math.round((done / sets.length) * 100) : 0 };
}

export function weeklySessions(history = [], reference = new Date()) {
  const current = new Date(reference);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return history.filter((session) => {
    const date = new Date(session.finishedAt || session.startedAt);
    return date >= start && date < end;
  });
}

export function monthlySessions(history = [], reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return history.filter((session) => {
    const date = new Date(session.finishedAt || session.startedAt);
    return date >= start && date < end;
  });
}

export function calculateStreak(history = []) {
  if (!history.length) return 0;
  const uniqueDays = new Set(history.map((session) => new Date(session.finishedAt || session.startedAt).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (uniqueDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

export async function hashPassword(password, saltBase64 = null, iterations = 210000) {
  if (!globalThis.crypto?.subtle) throw new Error('Criptografia indisponível neste dispositivo.');
  const encoder = new TextEncoder();
  const salt = saltBase64 ? Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256);
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltEncoded = btoa(String.fromCharCode(...salt));
  return { hash, salt: saltEncoded, iterations };
}

export async function verifyPassword(password, credentials) {
  const result = await hashPassword(password, credentials.salt, credentials.iterations || 210000);
  return result.hash === credentials.hash;
}

export function migrateLegacyCore(raw) {
  if (!raw || typeof raw !== 'object') return normalizeCore(raw);
  if (!raw.treinos && !raw.configuracoes && !raw.historico) return normalizeCore(raw);

  const base = createInitialCore();
  const legacyWorkouts = Array.isArray(raw.treinos) ? raw.treinos.map((treino) => ({
    id: treino.id || uid('workout'),
    name: treino.nome || 'Treino',
    description: treino.descricao || '',
    color: treino.cor || raw.configuracoes?.corPrincipal || base.settings.accent,
    icon: treino.icone || 'Dumbbell',
    archived: Boolean(treino.arquivado),
    createdAt: treino.criadoEm || nowIso(),
    updatedAt: treino.atualizadoEm || nowIso(),
    exercises: (treino.exercicios || []).map((exercicio) => {
      const count = Math.max(1, Number(exercicio.series) || 1);
      const repParts = String(exercicio.repeticoes || '').split(/[\/;,]+/).map((v) => v.trim()).filter(Boolean);
      return {
        id: exercicio.id || uid('exercise'),
        name: exercicio.nome || 'Exercício',
        group: exercicio.grupo || '',
        notes: exercicio.observacoes || '',
        restSec: Number(exercicio.descanso) || 90,
        mediaIds: Array.isArray(exercicio.mediaIds) ? exercicio.mediaIds : [],
        substituteExerciseIds: [],
        sets: Array.from({ length: count }, (_, index) => ({
          id: uid('set'),
          label: `Série ${index + 1}`,
          type: 'work',
          targetReps: repParts[index] || repParts[0] || exercicio.repeticoes || '',
          defaultLoad: exercicio.carga || ''
        }))
      };
    })
  })) : [];

  const legacyWeek = Array.isArray(raw.semana) ? raw.semana : [];
  const week = DAYS.map((day) => {
    const old = legacyWeek.find((item) => Number(item.id) === day.id);
    return { ...day, workoutIds: Array.isArray(old?.treinoIds) ? old.treinoIds : [], note: old?.nota || '' };
  });

  const history = Array.isArray(raw.historico) ? raw.historico.map((sessao) => ({
    id: sessao.id || uid('session'),
    workoutId: sessao.treinoId || '',
    workoutName: sessao.treinoNome || 'Treino',
    startedAt: sessao.iniciadoEm || sessao.finalizadoEm || nowIso(),
    finishedAt: sessao.finalizadoEm || nowIso(),
    totalPausedMs: 0,
    durationMs: Number(sessao.duracaoSegundos || 0) * 1000,
    note: '',
    exercises: (sessao.exercicios || []).map((ex) => ({
      exerciseId: ex.exercicioId || uid('exercise'),
      name: ex.nome || 'Exercício',
      group: '', notes: '', restSec: 90, mediaIds: [], skipped: false, sessionNote: '',
      sets: (ex.series || []).map((set, index) => ({
        setId: uid('set'), label: `Série ${index + 1}`, type: 'work', targetReps: '',
        load: set.carga ?? '', reps: set.reps ?? '', done: Boolean(set.concluida), doneAt: null
      }))
    }))
  })) : [];

  return normalizeCore({
    ...base,
    user: raw.user || null,
    settings: {
      ...base.settings,
      theme: raw.configuracoes?.tema || base.settings.theme,
      accent: raw.configuracoes?.corPrincipal || base.settings.accent,
      dayColors: { ...base.settings.dayColors, ...(raw.configuracoes?.coresDias || {}) },
      defaultRestSec: Number(raw.configuracoes?.descansoPadrao) || base.settings.defaultRestSec,
      restDayMessage: raw.configuracoes?.mensagemDescanso || base.settings.restDayMessage
    },
    week,
    workouts: legacyWorkouts,
    history,
    goals: { ...base.goals, weekly: Number(raw.configuracoes?.metaSemanal) || base.goals.weekly },
    updatedAt: raw.atualizadoEm || nowIso()
  });
}
