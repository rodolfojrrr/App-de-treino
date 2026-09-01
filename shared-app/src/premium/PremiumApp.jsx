import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, Bell, CalendarDays,
  Camera, Check, ChevronRight, CircleUserRound, Clock3, Dumbbell, Flame, Gauge, History,
  Image as ImageIcon, LogOut, Menu, Minus, Moon, MoreVertical, Pause, Pencil, Play,
  Plus, RefreshCw, RotateCcw, Save, Settings, ShieldCheck, Sparkles, Sun, Target,
  Trash2, Trophy, Upload, UserRound, Weight, Wifi, X, Zap
} from 'lucide-react';
import { useEngine, useMediaUrl } from '../lib/engine';
import {
  ACCENTS, calculateStreak, createActiveSession, createActivitySession, createExercise, createWorkout, elapsedSession,
  finishSession, formatElapsed, getDayPlan, getTodayId, hashPassword, localDateKey, monthlySessions, nowIso, sessionProgress,
  uid, verifyPassword, weeklySessions
} from '../lib/domain';

const NAV = [
  { id: 'home', label: 'Hoje', icon: Gauge },
  { id: 'workouts', label: 'Treinos', icon: Dumbbell },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'progress', label: 'Evolução', icon: BarChart3 },
  { id: 'goals', label: 'Metas', icon: Target }
];

function cls(...values) { return values.filter(Boolean).join(' '); }
function toNumber(value) { const n = Number(String(value).replace(',', '.')); return Number.isFinite(n) ? n : 0; }
function formatDate(iso) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)); }
function formatDateShort(iso) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso)); }
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

function useTicker(enabled = true, step = 1000) {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setTick(Date.now()), step);
    return () => clearInterval(timer);
  }, [enabled, step]);
  return tick;
}

function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={cls('btn', `btn-${variant}`, className)} {...props}>{Icon && <Icon size={18} />}{children}</button>;
}

function IconButton({ icon: Icon, label, className = '', ...props }) {
  return <button className={cls('icon-btn', className)} aria-label={label} title={label} {...props}><Icon size={20} /></button>;
}

function Modal({ open, title, subtitle, onClose, children, size = 'md' }) {
  if (!open) return null;
  return (
    <div className='modal-backdrop' onMouseDown={(e) => { if (e.currentTarget === e.target) onClose?.(); }}>
      <section className={cls('modal', `modal-${size}`)}>
        <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton icon={X} label='Fechar' onClick={onClose} /></header>
        <div className='modal-body'>{children}</div>
      </section>
    </div>
  );
}

function Field({ label, hint, children }) {
  return <label className='field'><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function EmptyState({ icon: Icon = Dumbbell, title, text, action }) {
  return <div className='empty-state'><div className='empty-icon'><Icon size={28} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function MediaThumb({ mediaId, alt = '', onRemove }) {
  const url = useMediaUrl(mediaId);
  return <div className='media-thumb'>{url ? <img src={url} alt={alt} /> : <div className='media-loading'><ImageIcon size={20} /></div>}{onRemove && <button type='button' onClick={onRemove}><X size={14} /></button>}</div>;
}

function AuthGate({ children }) {
  const { core, mutate, loading, error } = useEngine();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ displayName: '', username: '', password: '', confirm: '', remember: true });
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!core) return;
    if (!core.user) setMode('setup');
    const remembered = localStorage.getItem('treino.auth.user');
    if (core.user && core.settings.rememberLogin && remembered === core.user.id) setAuthenticated(true);
  }, [core?.user?.id, core?.settings?.rememberLogin]);

  if (loading || !core) return <Splash />;
  if (error) return <div className='fatal-screen'><ShieldCheck size={40} /><h1>Não consegui abrir seus dados</h1><p>{error}</p><Button onClick={() => location.reload()} icon={RefreshCw}>Tentar novamente</Button></div>;
  if (authenticated) return React.cloneElement(children, { onLogout: () => { localStorage.removeItem('treino.auth.user'); setAuthenticated(false); } });

  async function submit(e) {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      if (mode === 'setup') {
        if (form.username.trim().length < 3) throw new Error('Use um usuário com pelo menos 3 caracteres.');
        if (form.password.length < 4) throw new Error('Use uma senha com pelo menos 4 caracteres.');
        if (form.password !== form.confirm) throw new Error('As senhas não conferem.');
        const credentials = await hashPassword(form.password);
        const user = { id: uid('user'), displayName: form.displayName.trim() || form.username.trim(), username: form.username.trim().toLowerCase(), credentials, createdAt: nowIso() };
        mutate((draft) => { draft.user = user; draft.settings.rememberLogin = form.remember; });
        if (form.remember) localStorage.setItem('treino.auth.user', user.id);
        setAuthenticated(true);
      } else {
        if (form.username.trim().toLowerCase() !== core.user.username) throw new Error('Usuário ou senha incorretos.');
        const ok = await verifyPassword(form.password, core.user.credentials);
        if (!ok) throw new Error('Usuário ou senha incorretos.');
        mutate((draft) => { draft.settings.rememberLogin = form.remember; });
        if (form.remember) localStorage.setItem('treino.auth.user', core.user.id);
        else localStorage.removeItem('treino.auth.user');
        setAuthenticated(true);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className='auth-screen'>
      <div className='auth-art'>
        <div className='auth-glow' />
        <div className='brand-mark'><Dumbbell size={28} /><span>TREINO</span></div>
        <div className='auth-copy'><span className='kicker'>SEU PARCEIRO DE TREINO</span><h1>Mais constância.<br />Mais evolução.<br /><em>Do seu jeito.</em></h1><p>Organize a ficha no PC, treine no celular e continue exatamente de onde parou.</p></div>
        <div className='auth-features'><span><Clock3 size={18} /> Cronômetro persistente</span><span><Zap size={18} /> Carga por série</span><span><BarChart3 size={18} /> Evolução real</span></div>
      </div>
      <form className='auth-card' onSubmit={submit}>
        <div className='auth-card-head'><div className='auth-logo'><Dumbbell /></div><div><span className='kicker'>{mode === 'setup' ? 'PRIMEIRO ACESSO' : 'BEM-VINDO DE VOLTA'}</span><h2>{mode === 'setup' ? 'Crie seu perfil' : 'Entre no seu treino'}</h2></div></div>
        {mode === 'setup' && <Field label='Seu nome'><input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder='Como quer ser chamado?' autoComplete='name' /></Field>}
        <Field label='Usuário'><div className='input-icon'><UserRound size={18} /><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder='seuusuario' autoCapitalize='none' autoComplete='username' /></div></Field>
        <Field label='Senha'><div className='input-icon'><ShieldCheck size={18} /><input type='password' value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder='••••••••' autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} /></div></Field>
        {mode === 'setup' && <Field label='Confirmar senha'><input type='password' value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder='Repita a senha' autoComplete='new-password' /></Field>}
        <label className='check-row'><input type='checkbox' checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} /><span>Manter conectado neste dispositivo</span></label>
        {authError && <div className='form-error'>{authError}</div>}
        <Button type='submit' disabled={busy} icon={mode === 'setup' ? Sparkles : ArrowRight}>{busy ? 'Aguarde...' : mode === 'setup' ? 'Criar meu espaço' : 'Entrar'}</Button>
        <small className='auth-note'>Seu perfil e seus treinos ficam locais. Sem assinatura e sem internet obrigatória.</small>
      </form>
    </div>
  );
}

function Splash() {
  return <div className='splash-premium'><div className='splash-orbit'><Dumbbell size={34} /></div><strong>TREINO</strong><span>Performance Companion</span><div className='loader-line'><i /></div></div>;
}

export default function PremiumApp() {
  return <AuthGate><AuthenticatedApp /></AuthGate>;
}

function AuthenticatedApp({ onLogout }) {
  const { core, mutate, platform } = useEngine();
  const [page, setPage] = useState(core.activeSession ? 'active' : 'home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [builderWorkoutId, setBuilderWorkoutId] = useState(null);

  const navigate = (next) => { setPage(next); setMenuOpen(false); if (next !== 'workouts') setBuilderWorkoutId(null); };
  const active = core.activeSession;

  function startWorkout(workout) {
    if (core.activeSession && core.activeSession.workoutId !== workout.id) {
      if (!confirm('Já existe um treino em andamento. Retome ou finalize antes de iniciar outro.')) return;
      setPage('active');
      return;
    }
    if (!core.activeSession) mutate((draft) => { draft.activeSession = createActiveSession(workout, draft.history); });
    setPage('active');
  }

  function startActivity(activity) {
    if (core.activeSession) {
      if (!confirm('Já existe um treino em andamento. Retome ou finalize antes de iniciar uma atividade avulsa.')) return;
      setPage('active');
      return;
    }
    mutate((draft) => { draft.activeSession = createActivitySession(activity); });
    setPage('active');
  }

  function renderPage() {
    if (page === 'active') return <ActiveWorkoutPage onExit={() => setPage('home')} />;
    if (page === 'workouts') return <WorkoutsPage selectedId={builderWorkoutId} onSelect={setBuilderWorkoutId} onStart={startWorkout} />;
    if (page === 'history') return <HistoryPage />;
    if (page === 'progress') return <ProgressPage />;
    if (page === 'goals') return <GoalsPage />;
    if (page === 'settings') return <SettingsPage onLogout={onLogout} />;
    return <HomePage onStart={startWorkout} onStartActivity={startActivity} onNavigate={navigate} />;
  }

  return (
    <div className={cls('premium-shell', platform === 'desktop' && 'is-desktop')}>
      <aside className={cls('premium-sidebar', menuOpen && 'open')}>
        <button className='sidebar-brand' onClick={() => navigate('home')}><div className='brand-icon'><Dumbbell size={22} /></div><div><strong>TREINO</strong><span>Performance Companion</span></div></button>
        <div className='profile-chip'><div className='avatar'>{(core.user?.displayName || 'T')[0].toUpperCase()}</div><div><strong>{core.user?.displayName}</strong><span>@{core.user?.username}</span></div></div>
        <nav>{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
        <div className='sidebar-bottom'><button className={page === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Settings size={20} /><span>Configurações</span></button><div className='version-tag'>v1.1 Premium</div></div>
      </aside>
      {menuOpen && <button className='sidebar-scrim' onClick={() => setMenuOpen(false)} />}
      <section className='app-stage'>
        <header className='mobile-topbar'><IconButton icon={Menu} label='Menu' onClick={() => setMenuOpen(true)} /><button className='top-brand' onClick={() => navigate('home')}><Dumbbell size={20} /><strong>TREINO</strong></button><IconButton icon={Settings} label='Configurações' onClick={() => navigate('settings')} /></header>
        <main className={cls(active && page !== 'active' && 'has-live-dock')}>{renderPage()}</main>
        {active && page !== 'active' && <LiveWorkoutDock onResume={() => setPage('active')} />}
        <nav className='mobile-nav'>{NAV.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
      </section>
    </div>
  );
}

function LiveWorkoutDock({ onResume }) {
  const { core } = useEngine();
  const tick = useTicker(Boolean(core.activeSession));
  const session = core.activeSession;
  const progress = sessionProgress(session);
  if (!session) return null;
  return <button className='live-workout-dock' onClick={onResume}><div className='live-dot' /><div><span>{session.sessionType === 'activity' ? 'Atividade em andamento' : 'Treino em andamento'}</span><strong>{session.workoutName}</strong></div><div className='live-meta'><strong>{formatElapsed(elapsedSession(session, tick))}</strong><span>{session.sessionType === 'activity' ? (session.activity?.type || 'Atividade') : `${progress.done}/${progress.total} séries`}</span></div><ChevronRight size={20} /></button>;
}

function HomePage({ onStart, onStartActivity, onNavigate }) {
  const { core } = useEngine();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const todayPlan = getDayPlan(core, new Date());
  const today = todayPlan.day;
  const workouts = todayPlan.workoutIds.map((id) => core.workouts.find((w) => w.id === id)).filter(Boolean);
  const weekCount = weeklySessions(core.history).length;
  const monthCount = monthlySessions(core.history).length;
  const streak = calculateStreak(core.history);
  const weeklyGoal = Math.max(1, Number(core.goals.weekly) || 1);
  const weeklyPercent = Math.min(100, Math.round((weekCount / weeklyGoal) * 100));
  const latestWeight = [...core.body.weights].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  return <Page className='home-page'>
    <div className='hero-row'>
      <div><span className='kicker'>{greeting()}, {core.user?.displayName?.split(' ')[0]}</span><h1>Qual é a missão de hoje?</h1><p>Seu treino, suas cargas e sua evolução em um só lugar.</p></div>
      <div className='today-pill'><CalendarDays size={17} /><span>{today?.name}</span></div>
    </div>
    {core.activeSession && <section className='resume-card'><div className='resume-glow' /><div className='resume-icon'><Activity size={26} /></div><div className='resume-copy'><span>VOCÊ TEM UM TREINO ATIVO</span><h2>{core.activeSession.workoutName}</h2><p>O cronômetro continuou contando. Seus dados estão salvos.</p></div><Button icon={Play} onClick={() => onNavigate('active')}>Retomar treino</Button></section>}
    <div className='dashboard-grid'>
      <section className='today-workouts panel'>
        <div className='panel-head'>
          <div><span className='kicker'>PROGRAMAÇÃO</span><h2>Treinos de hoje</h2></div>
          <div className='panel-head-actions'><span className='count-badge'>{workouts.length + (todayPlan.activity ? 1 : 0)}</span><Button variant='secondary' icon={RefreshCw} onClick={() => setScheduleOpen(true)}>Ajustar dia</Button></div>
        </div>
        {todayPlan.override && <div className='schedule-override-banner'><RefreshCw size={16} /><div><strong>Ajuste pontual ativo</strong><span>{todayPlan.override.status === 'postponed' ? `Treino adiado para ${formatLocalDate(todayPlan.override.movedTo)}.` : todayPlan.override.status === 'activity' ? `Hoje entra ${todayPlan.activity?.name || 'uma atividade avulsa'} no lugar da ficha.` : todayPlan.override.status === 'replacement' ? 'A programação de hoje foi trocada sem alterar sua semana fixa.' : 'Hoje foi marcado como descanso/indisponível.'}</span></div></div>}
        {todayPlan.activity ? <div className='today-list'><div className='today-workout-card activity-card' style={{ '--workout-color': todayPlan.activity.color || core.settings.accent }}><div className='workout-color-bar' /><div className='workout-icon'><Activity size={23} /></div><div className='today-workout-copy'><strong>{todayPlan.activity.name}</strong><span>Atividade avulsa · cronômetro persistente</span></div><Button variant='ghost' icon={Play} onClick={() => onStartActivity(todayPlan.activity)}>Iniciar</Button></div></div> : workouts.length ? <div className='today-list'>{workouts.map((workout) => <div className='today-workout-card' key={workout.id} style={{ '--workout-color': workout.color }}><div className='workout-color-bar' /><div className='workout-icon'><Dumbbell size={23} /></div><div className='today-workout-copy'><strong>{workout.name}</strong><span>{workout.exercises.length} exercícios · {workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} séries</span></div><Button variant='ghost' icon={Play} onClick={() => onStart(workout)}>Iniciar</Button></div>)}</div> : <EmptyState icon={CalendarDays} title='Dia livre' text={todayPlan.override?.status === 'postponed' ? 'Seu treino foi adiado sem mexer na programação semanal.' : today?.note || core.settings.restDayMessage} action={<Button variant='secondary' onClick={() => setScheduleOpen(true)} icon={RefreshCw}>Ajustar programação</Button>} />}
      </section>
      <section className='goal-ring-card panel'><div className='panel-head'><div><span className='kicker'>CONSISTÊNCIA</span><h2>Meta semanal</h2></div><Flame size={22} /></div><div className='goal-ring-wrap'><div className='goal-ring' style={{ '--p': `${weeklyPercent * 3.6}deg` }}><div><strong>{weekCount}</strong><span>de {weeklyGoal}</span></div></div><div className='goal-copy'><strong>{weeklyPercent >= 100 ? 'Meta batida!' : `${Math.max(0, weeklyGoal - weekCount)} treino(s) para bater a meta`}</strong><span>{monthCount} treinos neste mês</span></div></div></section>
    </div>
    <div className='stats-grid'><StatCard icon={Flame} label='Sequência' value={`${streak} dia${streak === 1 ? '' : 's'}`} sub='Continue aparecendo.' /><StatCard icon={Dumbbell} label='Treinos totais' value={core.history.length} sub='Sessões finalizadas' /><StatCard icon={Weight} label='Peso atual' value={latestWeight ? `${latestWeight.value} kg` : '—'} sub={latestWeight ? formatDateShort(latestWeight.date) : 'Registre na evolução'} /><StatCard icon={Trophy} label='Mês atual' value={monthCount} sub={`Meta: ${core.goals.monthly || 0}`} /></div>
    <WeekStrip />
    <ScheduleAdjuster open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
  </Page>;
}

function formatLocalDate(dateKey) {
  if (!dateKey) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${dateKey}T12:00:00`));
}

function ScheduleAdjuster({ open, onClose }) {
  const { core, mutate } = useEngine();
  const todayKey = localDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [dateKey, setDateKey] = useState(todayKey);
  const [mode, setMode] = useState('postpone');
  const [targetDate, setTargetDate] = useState(localDateKey(tomorrow));
  const [replacementWorkoutId, setReplacementWorkoutId] = useState('');
  const [activityType, setActivityType] = useState('Corrida');
  const [activityName, setActivityName] = useState('');

  useEffect(() => {
    if (!open) return;
    setDateKey(todayKey);
    const next = new Date();
    next.setDate(next.getDate() + 1);
    setTargetDate(localDateKey(next));
    setMode('postpone');
    setReplacementWorkoutId(core.workouts.find((w) => !w.archived)?.id || '');
    setActivityType('Corrida');
    setActivityName('');
  }, [open]);

  if (!open) return null;
  const plan = getDayPlan(core, dateKey);
  const editableWorkoutIds = plan.override?.status === 'postponed' && Array.isArray(plan.override.movedWorkoutIds) ? plan.override.movedWorkoutIds : plan.workoutIds;
  const plannedWorkouts = editableWorkoutIds.map((id) => core.workouts.find((w) => w.id === id)).filter(Boolean);
  const activeWorkouts = core.workouts.filter((w) => !w.archived);

  function cleanupPreviousMove(draft, sourceDate) {
    const previous = draft.scheduleOverrides?.[sourceDate];
    if (!previous?.movedTo || !Array.isArray(previous.movedWorkoutIds)) return;
    const target = draft.scheduleOverrides?.[previous.movedTo];
    if (!target) return;
    target.addedWorkoutIds = (target.addedWorkoutIds || []).filter((id) => !previous.movedWorkoutIds.includes(id));
    if (!target.status && !target.suppressBase && !(target.addedWorkoutIds || []).length && !target.activity) delete draft.scheduleOverrides[previous.movedTo];
  }

  function save() {
    if (mode === 'postpone' && !plannedWorkouts.length) return alert('Não há treino programado nessa data para adiar.');
    if (mode === 'postpone' && (!targetDate || targetDate === dateKey)) return alert('Escolha outra data para receber o treino.');
    if (mode === 'replacement' && !replacementWorkoutId) return alert('Escolha um treino da sua biblioteca.');

    mutate((draft) => {
      draft.scheduleOverrides ||= {};
      cleanupPreviousMove(draft, dateKey);

      if (mode === 'reset') {
        delete draft.scheduleOverrides[dateKey];
        return;
      }

      if (mode === 'postpone') {
        const movedWorkoutIds = [...new Set(plannedWorkouts.map((w) => w.id))];
        const target = draft.scheduleOverrides[targetDate] || { suppressBase: false, addedWorkoutIds: [] };
        target.addedWorkoutIds = [...new Set([...(target.addedWorkoutIds || []), ...movedWorkoutIds])];
        draft.scheduleOverrides[targetDate] = target;
        draft.scheduleOverrides[dateKey] = {
          status: 'postponed',
          suppressBase: true,
          addedWorkoutIds: [],
          activity: null,
          movedTo: targetDate,
          movedWorkoutIds,
          note: `Adiado para ${targetDate}`
        };
        return;
      }

      if (mode === 'replacement') {
        draft.scheduleOverrides[dateKey] = {
          status: 'replacement',
          suppressBase: true,
          addedWorkoutIds: [replacementWorkoutId],
          activity: null
        };
        return;
      }

      if (mode === 'activity') {
        const name = activityType === 'Outro' ? (activityName.trim() || 'Atividade avulsa') : activityType;
        draft.scheduleOverrides[dateKey] = {
          status: 'activity',
          suppressBase: true,
          addedWorkoutIds: [],
          activity: { type: activityType, name, color: core.settings.accent }
        };
        return;
      }

      draft.scheduleOverrides[dateKey] = {
        status: 'rest',
        suppressBase: true,
        addedWorkoutIds: [],
        activity: null,
        note: 'Indisponível / descanso'
      };
    });
    onClose();
  }

  return <Modal open title='Ajuste pontual da programação' subtitle='Mude apenas uma data. Sua divisão semanal continua intacta.' onClose={onClose} size='lg'>
    <div className='schedule-adjuster'>
      <Field label='Qual data você quer ajustar?'><input type='date' value={dateKey} onChange={(e) => { setDateKey(e.target.value); const next = new Date(`${e.target.value}T12:00:00`); next.setDate(next.getDate() + 1); setTargetDate(localDateKey(next)); }} /></Field>
      <div className='schedule-plan-preview'><span>Programado para este dia</span><strong>{plannedWorkouts.length ? plannedWorkouts.map((w) => w.name).join(' + ') : plan.activity?.name || 'Sem treino'}</strong><small>{plan.override ? 'Esta data já possui um ajuste pontual.' : 'Baseado na sua semana fixa.'}</small></div>
      <div className='schedule-mode-grid'>
        <button className={mode === 'postpone' ? 'active' : ''} onClick={() => setMode('postpone')}><Clock3 size={20} /><strong>Adiar treino</strong><span>Move só esta ocorrência para outra data.</span></button>
        <button className={mode === 'replacement' ? 'active' : ''} onClick={() => setMode('replacement')}><RefreshCw size={20} /><strong>Trocar treino</strong><span>Usa outra ficha só neste dia.</span></button>
        <button className={mode === 'activity' ? 'active' : ''} onClick={() => setMode('activity')}><Activity size={20} /><strong>Atividade avulsa</strong><span>Corrida, caminhada, pedal, natação...</span></button>
        <button className={mode === 'rest' ? 'active' : ''} onClick={() => setMode('rest')}><Moon size={20} /><strong>Não vou treinar</strong><span>Marca o dia como indisponível sem mexer na semana.</span></button>
      </div>
      {mode === 'postpone' && <div className='schedule-option-panel'><Field label='Levar este treino para'><input type='date' min={dateKey} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field><p>Se já houver treino na data escolhida, o treino adiado será acrescentado naquele dia.</p></div>}
      {mode === 'replacement' && <div className='schedule-option-panel'><Field label='Treino que entra no lugar'><select value={replacementWorkoutId} onChange={(e) => setReplacementWorkoutId(e.target.value)}>{activeWorkouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field><p>A ficha semanal original continua exatamente como está.</p></div>}
      {mode === 'activity' && <div className='schedule-option-panel'><Field label='Atividade'><select value={activityType} onChange={(e) => setActivityType(e.target.value)}><option>Corrida</option><option>Caminhada</option><option>Pedal</option><option>Natação</option><option>Elíptico</option><option>Escada</option><option>Outro</option></select></Field>{activityType === 'Outro' && <Field label='Nome da atividade'><input value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder='Ex.: Futebol, trilha...' /></Field>}<p>A atividade terá cronômetro persistente e ficará salva no histórico.</p></div>}
      {plan.override && <button className='reset-schedule-btn' onClick={() => setMode('reset')}><RotateCcw size={17} /> Remover ajuste e voltar ao plano semanal</button>}
      <div className='modal-actions'><Button variant='secondary' onClick={onClose}>Cancelar</Button><Button icon={Check} onClick={save}>{mode === 'reset' ? 'Voltar ao plano' : 'Salvar ajuste'}</Button></div>
    </div>
  </Modal>;
}

function StatCard({ icon: Icon, label, value, sub }) { return <div className='stat-card'><div className='stat-icon'><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>; }

function WeekStrip() {
  const { core, mutate } = useEngine();
  return <section className='week-strip panel'><div className='panel-head'><div><span className='kicker'>SUA SEMANA</span><h2>Plano semanal</h2></div></div><div className='week-days'>{core.week.map((day) => { const assigned = day.workoutIds.map((id) => core.workouts.find((w) => w.id === id)).filter(Boolean); const isToday = day.id === getTodayId(); return <div className={cls('week-day', isToday && 'today')} key={day.id} style={{ '--day-color': core.settings.dayColors[day.id] }}><div className='day-head'><span>{day.short}</span>{isToday && <b>HOJE</b>}</div><strong>{day.name}</strong><div className='day-workouts'>{assigned.length ? assigned.map((w) => <span key={w.id} style={{ '--chip-color': w.color }}>{w.name}</span>) : <span className='rest-chip'>Descanso</span>}</div><button onClick={() => { const note = prompt(`Mensagem para ${day.name}`, day.note || ''); if (note !== null) mutate((d) => { d.week.find((x) => x.id === day.id).note = note; }); }}><Pencil size={13} /> nota</button></div>; })}</div></section>;
}

function Page({ children, className = '' }) { return <div className={cls('page', className)}>{children}</div>; }

function WorkoutsPage({ selectedId, onSelect, onStart }) {
  const { core, mutate } = useEngine();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', color: core.settings.accent, description: '' });
  const selected = selectedId ? core.workouts.find((w) => w.id === selectedId) : null;
  if (selected) return <WorkoutBuilder workout={selected} onBack={() => onSelect(null)} onStart={() => onStart(selected)} />;

  function create() {
    if (!form.name.trim()) return;
    const workout = createWorkout(form);
    mutate((d) => { d.workouts.push(workout); });
    setCreateOpen(false); setForm({ name: '', color: core.settings.accent, description: '' });
    onSelect(workout.id);
  }

  return <Page>
    <PageTitle kicker='BIBLIOTECA' title='Seus treinos' text='Monte suas fichas com calma no PC ou ajuste tudo pelo celular.' action={<Button icon={Plus} onClick={() => setCreateOpen(true)}>Novo treino</Button>} />
    {core.workouts.filter((w) => !w.archived).length ? <div className='workout-grid'>{core.workouts.filter((w) => !w.archived).map((workout) => <button className='workout-library-card' key={workout.id} style={{ '--workout-color': workout.color }} onClick={() => onSelect(workout.id)}><div className='library-top'><div className='workout-icon large'><Dumbbell size={26} /></div><span className='exercise-count'>{workout.exercises.length} exercícios</span></div><div><h3>{workout.name}</h3><p>{workout.description || 'Sua ficha personalizada.'}</p></div><div className='library-footer'><span>{workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} séries</span><ChevronRight size={20} /></div></button>)}</div> : <EmptyState title='Sua academia começa aqui' text='Crie Peito, Costas, Perna ou qualquer divisão que seu personal passar.' action={<Button icon={Plus} onClick={() => setCreateOpen(true)}>Criar primeiro treino</Button>} />}
    <Modal open={createOpen} title='Novo treino' subtitle='Crie a ficha e depois adicione os exercícios.' onClose={() => setCreateOpen(false)}>
      <Field label='Nome do treino'><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder='Ex.: Peito + Tríceps' /></Field>
      <Field label='Descrição'><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder='Ex.: foco em força e parte superior do peito' /></Field>
      <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
      <div className='modal-actions'><Button variant='secondary' onClick={() => setCreateOpen(false)}>Cancelar</Button><Button icon={Plus} onClick={create}>Criar treino</Button></div>
    </Modal>
  </Page>;
}

function PageTitle({ kicker, title, text, action, back }) { return <div className='page-title'>{back && <IconButton icon={ArrowLeft} label='Voltar' onClick={back} />}<div className='page-title-copy'><span className='kicker'>{kicker}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{action && <div className='page-title-action'>{action}</div>}</div>; }

function ColorPicker({ value, onChange }) { return <div className='color-picker'><span>Cor</span><div>{ACCENTS.map((color) => <button key={color} className={value === color ? 'selected' : ''} style={{ background: color }} onClick={() => onChange(color)} type='button'>{value === color && <Check size={14} />}</button>)}<input type='color' value={value} onChange={(e) => onChange(e.target.value)} /></div></div>; }

function WorkoutBuilder({ workout, onBack, onStart }) {
  const { core, mutate, repository } = useEngine();
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [editWorkout, setEditWorkout] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({ name: '', group: '', setCount: 4, targetReps: '10-12', defaultLoad: '', restSec: core.settings.defaultRestSec, notes: '', firstWarmup: false });
  const [workoutForm, setWorkoutForm] = useState({ name: workout.name, description: workout.description, color: workout.color });

  function addExercise() {
    if (!exerciseForm.name.trim()) return;
    const exercise = createExercise(exerciseForm, core.settings.defaultRestSec);
    mutate((d) => { const w = d.workouts.find((x) => x.id === workout.id); w.exercises.push(exercise); w.updatedAt = nowIso(); });
    setExerciseOpen(false);
    setExerciseForm({ name: '', group: '', setCount: 4, targetReps: '10-12', defaultLoad: '', restSec: core.settings.defaultRestSec, notes: '', firstWarmup: false });
  }

  function moveExercise(index, direction) {
    mutate((d) => { const list = d.workouts.find((x) => x.id === workout.id).exercises; const target = index + direction; if (target < 0 || target >= list.length) return; [list[index], list[target]] = [list[target], list[index]]; });
  }

  function saveWorkoutMeta() {
    mutate((d) => { const w = d.workouts.find((x) => x.id === workout.id); Object.assign(w, workoutForm, { updatedAt: nowIso() }); });
    setEditWorkout(false);
  }

  function toggleDay(dayId) {
    mutate((d) => { const day = d.week.find((x) => x.id === dayId); const exists = day.workoutIds.includes(workout.id); day.workoutIds = exists ? day.workoutIds.filter((id) => id !== workout.id) : [...day.workoutIds, workout.id]; });
  }

  return <Page>
    <PageTitle back={onBack} kicker='EDITOR DE TREINO' title={workout.name} text={workout.description || 'Monte a ficha exatamente como o personal passou.'} action={<div className='title-actions'><Button variant='secondary' icon={Pencil} onClick={() => setEditWorkout(true)}>Editar</Button><Button icon={Play} onClick={onStart}>Iniciar</Button></div>} />
    <section className='schedule-panel panel'><div><span className='kicker'>DIAS DA SEMANA</span><h3>Quando você treina esta ficha?</h3></div><div className='day-toggle-row'>{core.week.map((day) => <button key={day.id} className={day.workoutIds.includes(workout.id) ? 'active' : ''} style={{ '--day-color': core.settings.dayColors[day.id] }} onClick={() => toggleDay(day.id)}><span>{day.short}</span><small>{day.name}</small></button>)}</div></section>
    <div className='builder-head'><div><h2>Exercícios</h2><p>{workout.exercises.length} exercício(s) · {workout.exercises.reduce((s, e) => s + e.sets.length, 0)} séries</p></div><Button icon={Plus} onClick={() => setExerciseOpen(true)}>Adicionar exercício</Button></div>
    {workout.exercises.length ? <div className='exercise-builder-list'>{workout.exercises.map((exercise, index) => <ExerciseBuilderCard key={exercise.id} workoutId={workout.id} exercise={exercise} index={index} total={workout.exercises.length} onMove={moveExercise} repository={repository} />)}</div> : <EmptyState title='Ficha vazia' text='Adicione o primeiro exercício com séries, repetições, carga e observações.' action={<Button icon={Plus} onClick={() => setExerciseOpen(true)}>Adicionar exercício</Button>} />}

    <Modal open={exerciseOpen} title='Adicionar exercício' subtitle='Você poderá editar cada série separadamente depois.' onClose={() => setExerciseOpen(false)} size='lg'>
      <div className='form-grid two'><Field label='Nome'><input autoFocus value={exerciseForm.name} onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })} placeholder='Supino inclinado' /></Field><Field label='Grupo muscular'><input value={exerciseForm.group} onChange={(e) => setExerciseForm({ ...exerciseForm, group: e.target.value })} placeholder='Peito' /></Field><Field label='Quantidade de séries'><input type='number' min='1' max='12' value={exerciseForm.setCount} onChange={(e) => setExerciseForm({ ...exerciseForm, setCount: e.target.value })} /></Field><Field label='Repetições alvo'><input value={exerciseForm.targetReps} onChange={(e) => setExerciseForm({ ...exerciseForm, targetReps: e.target.value })} placeholder='10-12' /></Field><Field label='Carga base (opcional)'><input value={exerciseForm.defaultLoad} onChange={(e) => setExerciseForm({ ...exerciseForm, defaultLoad: e.target.value })} placeholder='20' inputMode='decimal' /></Field><Field label='Descanso (segundos)'><input type='number' value={exerciseForm.restSec} onChange={(e) => setExerciseForm({ ...exerciseForm, restSec: e.target.value })} /></Field></div>
      <Field label='Observação de execução'><textarea value={exerciseForm.notes} onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })} placeholder='Posição do banco, amplitude, dica do personal...' /></Field>
      <label className='check-row'><input type='checkbox' checked={exerciseForm.firstWarmup} onChange={(e) => setExerciseForm({ ...exerciseForm, firstWarmup: e.target.checked })} /><span>Primeira série é aquecimento</span></label>
      <div className='modal-actions'><Button variant='secondary' onClick={() => setExerciseOpen(false)}>Cancelar</Button><Button icon={Plus} onClick={addExercise}>Adicionar</Button></div>
    </Modal>

    <Modal open={editWorkout} title='Editar treino' onClose={() => setEditWorkout(false)}>
      <Field label='Nome'><input value={workoutForm.name} onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })} /></Field><Field label='Descrição'><textarea value={workoutForm.description} onChange={(e) => setWorkoutForm({ ...workoutForm, description: e.target.value })} /></Field><ColorPicker value={workoutForm.color} onChange={(color) => setWorkoutForm({ ...workoutForm, color })} /><div className='modal-actions'><Button variant='secondary' onClick={() => setEditWorkout(false)}>Cancelar</Button><Button icon={Save} onClick={saveWorkoutMeta}>Salvar</Button></div>
    </Modal>
  </Page>;
}

function ExerciseBuilderCard({ workoutId, exercise, index, total, onMove, repository }) {
  const { mutate } = useEngine();
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);

  function updateExercise(fn) { mutate((d) => { const ex = d.workouts.find((w) => w.id === workoutId).exercises.find((e) => e.id === exercise.id); fn(ex); }); }
  function deleteExercise() { if (confirm(`Excluir ${exercise.name}?`)) mutate((d) => { const w = d.workouts.find((x) => x.id === workoutId); w.exercises = w.exercises.filter((e) => e.id !== exercise.id); }); }
  function addSet() { updateExercise((ex) => ex.sets.push({ id: uid('set'), label: `Série ${ex.sets.length + 1}`, type: 'work', targetReps: ex.sets.at(-1)?.targetReps || '10-12', defaultLoad: ex.sets.at(-1)?.defaultLoad || '' })); }
  function removeSet(setId) { updateExercise((ex) => { if (ex.sets.length > 1) ex.sets = ex.sets.filter((s) => s.id !== setId); }); }
  async function addPhoto(file) { if (!file) return; const mediaId = await repository.addMedia(file, { kind: 'exercise', ownerId: exercise.id }); updateExercise((ex) => ex.mediaIds.push(mediaId)); }
  async function removePhoto(mediaId) { updateExercise((ex) => { ex.mediaIds = ex.mediaIds.filter((id) => id !== mediaId); }); await repository.deleteMedia(mediaId).catch(() => {}); }

  return <section className={cls('exercise-builder-card', open && 'expanded')}>
    <div className='exercise-card-main'><div className='exercise-number'>{String(index + 1).padStart(2, '0')}</div><button className='exercise-card-copy' onClick={() => setOpen(!open)}><div><strong>{exercise.name}</strong>{exercise.group && <span>{exercise.group}</span>}</div><small>{exercise.sets.length} séries · {exercise.sets.map((s) => s.targetReps).join(' / ')} · {exercise.restSec}s descanso</small></button><div className='exercise-order'><IconButton icon={ArrowUp} label='Subir' disabled={index === 0} onClick={() => onMove(index, -1)} /><IconButton icon={ArrowDown} label='Descer' disabled={index === total - 1} onClick={() => onMove(index, 1)} /><IconButton icon={open ? X : Pencil} label='Editar' onClick={() => setOpen(!open)} /></div></div>
    {open && <div className='exercise-editor'>
      <div className='form-grid two'><Field label='Nome'><input value={exercise.name} onChange={(e) => updateExercise((ex) => { ex.name = e.target.value; })} /></Field><Field label='Grupo muscular'><input value={exercise.group} onChange={(e) => updateExercise((ex) => { ex.group = e.target.value; })} /></Field><Field label='Descanso (segundos)'><input type='number' value={exercise.restSec} onChange={(e) => updateExercise((ex) => { ex.restSec = Number(e.target.value) || 0; })} /></Field></div>
      <Field label='Observações'><textarea value={exercise.notes} onChange={(e) => updateExercise((ex) => { ex.notes = e.target.value; })} placeholder='Dicas de execução...' /></Field>
      <div className='set-editor-head'><div><strong>Séries</strong><span>Configure repetições e carga base individualmente.</span></div><Button variant='secondary' icon={Plus} onClick={addSet}>Série</Button></div>
      <div className='set-editor-table'><div className='set-row set-row-head'><span>#</span><span>Tipo</span><span>Reps alvo</span><span>Carga base</span><span /></div>{exercise.sets.map((set, setIndex) => <div className='set-row' key={set.id}><strong>{setIndex + 1}</strong><select value={set.type} onChange={(e) => updateExercise((ex) => { ex.sets[setIndex].type = e.target.value; })}><option value='warmup'>Aquecimento</option><option value='work'>Trabalho</option><option value='drop'>Drop</option></select><input value={set.targetReps} onChange={(e) => updateExercise((ex) => { ex.sets[setIndex].targetReps = e.target.value; })} /><input value={set.defaultLoad} inputMode='decimal' onChange={(e) => updateExercise((ex) => { ex.sets[setIndex].defaultLoad = e.target.value; })} placeholder='kg' /><IconButton icon={Trash2} label='Remover série' className='danger-icon' onClick={() => removeSet(set.id)} /></div>)}</div>
      <div className='photos-editor'><div className='set-editor-head'><div><strong>Fotos do exercício</strong><span>Máquina, posição inicial, execução ou orientação do personal.</span></div><Button variant='secondary' icon={Camera} onClick={() => fileRef.current?.click()}>Adicionar foto</Button></div><input ref={fileRef} type='file' accept='image/*' hidden onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ''; }} /><div className='media-grid'>{exercise.mediaIds.map((id) => <MediaThumb key={id} mediaId={id} alt={exercise.name} onRemove={() => removePhoto(id)} />)}</div></div>
      <div className='editor-danger'><Button variant='danger' icon={Trash2} onClick={deleteExercise}>Excluir exercício</Button></div>
    </div>}
  </section>;
}

function ActiveWorkoutPage({ onExit }) {
  const { core, mutate, nativeBridge } = useEngine();
  const session = core.activeSession;
  const tick = useTicker(Boolean(session));
  const [confirmFinish, setConfirmFinish] = useState(false);
  const restRemaining = session?.rest ? Math.max(0, new Date(session.rest.endsAt).getTime() - tick) : 0;

  useEffect(() => {
    if (session?.rest && restRemaining <= 0 && !session.rest.notified) {
      mutate((d) => { if (d.activeSession?.rest) d.activeSession.rest.notified = true; });
      nativeBridge.haptic?.('heavy');
    }
  }, [Boolean(session?.rest), restRemaining <= 0]);

  if (!session) return <Page><EmptyState title='Nenhum treino em andamento' text='Inicie uma ficha pela tela Hoje ou Treinos.' action={<Button onClick={onExit}>Voltar</Button>} /></Page>;

  const progress = sessionProgress(session);
  const current = session.exercises.find((ex) => ex.exerciseId === session.currentExerciseId) || session.exercises[0] || null;
  const isActivity = session.sessionType === 'activity';

  function updateSet(exerciseId, setId, patch) {
    mutate((d) => {
      const ex = d.activeSession?.exercises?.find((x) => x.exerciseId === exerciseId);
      const set = ex?.sets?.find((x) => x.setId === setId);
      if (set) Object.assign(set, patch);
    });
  }

  function updateActivity(patch) {
    mutate((d) => {
      if (!d.activeSession?.activity) return;
      Object.assign(d.activeSession.activity, patch);
    });
  }

  function toggleSet(exercise, set) {
    const done = !set.done;
    updateSet(exercise.exerciseId, set.setId, { done, doneAt: done ? nowIso() : null });
    if (done) {
      nativeBridge.haptic?.('medium');
      if (core.settings.autoStartRest) startRest(exercise.restSec);
    }
  }

  function startRest(seconds) {
    const duration = Math.max(5, Number(seconds || core.settings.defaultRestSec)) * 1000;
    const id = Math.floor(Date.now() % 2000000000);
    const endsAt = new Date(Date.now() + duration).toISOString();
    mutate((d) => { d.activeSession.rest = { id, startedAt: nowIso(), endsAt, durationMs: duration, notified: false }; });
    if (core.settings.notifications) nativeBridge.scheduleRestNotification?.({ id, at: new Date(endsAt), title: 'Descanso finalizado', body: 'Hora da próxima série. Bora!' });
  }

  function stopRest() {
    const id = session.rest?.id;
    mutate((d) => { if (d.activeSession) d.activeSession.rest = null; });
    if (id) nativeBridge.cancelNotification?.(id);
  }

  function adjustRest(deltaSec) {
    mutate((d) => {
      if (!d.activeSession?.rest) return;
      const nextDuration = Math.max(0, Number(d.activeSession.rest.durationMs || 0) + deltaSec * 1000);
      d.activeSession.rest.endsAt = new Date(Math.max(Date.now(), new Date(d.activeSession.rest.endsAt).getTime() + deltaSec * 1000)).toISOString();
      d.activeSession.rest.durationMs = nextDuration;
    });
  }

  function togglePause() {
    mutate((d) => {
      const s = d.activeSession;
      if (!s) return;
      if (s.pausedAt) {
        s.totalPausedMs += Math.max(0, Date.now() - new Date(s.pausedAt).getTime());
        s.pausedAt = null;
      } else {
        s.pausedAt = nowIso();
      }
    });
  }

  function finish() {
    let notificationId = null;
    mutate((d) => {
      if (!d.activeSession) return;
      notificationId = d.activeSession.rest?.id || null;
      const completed = finishSession(d.activeSession);
      d.history.unshift(completed);
      d.activeSession = null;
    });
    if (notificationId) nativeBridge.cancelNotification?.(notificationId);
    setConfirmFinish(false);
    onExit();
  }

  return <div className='active-workout-screen'>
    <header className='active-top'>
      <IconButton icon={ArrowLeft} label='Voltar sem finalizar' onClick={onExit} />
      <div className='active-title'><span>{isActivity ? 'Atividade em andamento' : 'Treino em andamento'}</span><strong>{session.workoutName}</strong></div>
      <IconButton icon={Check} label='Finalizar treino' className='finish-icon-btn' onClick={() => setConfirmFinish(true)} />
    </header>

    <div className='active-timer-strip'>
      <div><Clock3 size={20} /><strong>{formatElapsed(elapsedSession(session, tick))}</strong><span>{session.pausedAt ? 'PAUSADO' : isActivity ? 'TEMPO DA ATIVIDADE' : 'TEMPO DE TREINO'}</span></div>
      {!isActivity && <div className='progress-block'><span>{progress.percent}% concluído · {progress.done}/{progress.total} séries</span><div className='progress-track'><i style={{ width: `${progress.percent}%` }} /></div></div>}
      {isActivity && <div className='progress-block activity-running-copy'><span>O cronômetro continua mesmo se você sair desta tela.</span><div className='progress-track activity-track'><i style={{ width: '100%' }} /></div></div>}
      <Button variant='secondary' icon={session.pausedAt ? Play : Pause} onClick={togglePause}>{session.pausedAt ? 'Retomar' : 'Pausar'}</Button>
    </div>

    <div className={cls('active-layout', isActivity && 'activity-layout')}>
      {!isActivity && <aside className='exercise-rail'>
        <span className='kicker'>EXERCÍCIOS</span>
        {session.exercises.map((ex, index) => {
          const done = ex.sets.filter((s) => s.done).length;
          return <button key={ex.exerciseId} className={cls(ex.exerciseId === current?.exerciseId && 'active', ex.skipped && 'skipped')} onClick={() => mutate((d) => { d.activeSession.currentExerciseId = ex.exerciseId; })}><span className='rail-index'>{String(index + 1).padStart(2, '0')}</span><div><strong>{ex.name}</strong><small>{ex.skipped ? 'Pulado' : `${done}/${ex.sets.length} séries`}</small></div>{done === ex.sets.length && !ex.skipped ? <Check size={18} /> : <ChevronRight size={18} />}</button>;
        })}
        <Button variant='danger-soft' icon={Check} onClick={() => setConfirmFinish(true)}>Finalizar treino</Button>
      </aside>}

      <main className='exercise-focus'>
        {isActivity ? <>
          <div className='exercise-focus-head'><div><span className='kicker'>ATIVIDADE AVULSA</span><h1>{session.activity?.name || session.workoutName}</h1><p>Registre o que fizer hoje sem alterar sua programação semanal.</p></div></div>
          <div className='activity-session-panel'>
            <div className='activity-big-timer'><Activity size={24} /><span>Tempo atual</span><strong>{formatElapsed(elapsedSession(session, tick))}</strong></div>
            <div className='activity-metrics-grid'>
              <Field label='Distância (km) — opcional'><input inputMode='decimal' value={session.activity?.distanceKm || ''} onChange={(e) => updateActivity({ distanceKm: e.target.value })} placeholder='Ex.: 5,2' /></Field>
              <Field label='Calorias — opcional'><input inputMode='numeric' value={session.activity?.calories || ''} onChange={(e) => updateActivity({ calories: e.target.value })} placeholder='Ex.: 420' /></Field>
            </div>
            <Field label='Observação da atividade'><textarea value={session.activity?.note || ''} onChange={(e) => updateActivity({ note: e.target.value })} placeholder='Ritmo, percurso, sensação, objetivo...' /></Field>
          </div>
        </> : current ? <>
          <div className='exercise-focus-head'><div><span className='kicker'>{current.group || 'EXERCÍCIO ATUAL'}</span><h1>{current.name}</h1>{current.notes && <p>{current.notes}</p>}</div><button className={cls('skip-toggle', current.skipped && 'active')} onClick={() => mutate((d) => { const ex = d.activeSession.exercises.find((x) => x.exerciseId === current.exerciseId); ex.skipped = !ex.skipped; })}>{current.skipped ? <RotateCcw size={17} /> : <ArrowRight size={17} />}{current.skipped ? 'Reativar' : 'Pular exercício'}</button></div>
          {current.mediaIds?.length > 0 && <div className='active-media-strip'>{current.mediaIds.map((id) => <MediaThumb key={id} mediaId={id} alt={current.name} />)}</div>}
          <div className='set-legend'><strong>Como preencher</strong><span><b>Reps alvo</b> = meta da série</span><span><b>Carga usada</b> = peso que está usando agora</span><span><b>Reps feitas</b> = quantas você realmente conseguiu</span></div>
          <div className='active-set-table'>
            <div className='active-set-head'><span>SÉRIE</span><span>REPS ALVO</span><span>CARGA USADA (KG)</span><span>REPS FEITAS</span><span>CONCLUIR</span></div>
            {current.sets.map((set, index) => <div className={cls('active-set-row', set.done && 'done')} key={set.setId}>
              <div className='set-ident'><strong>{index + 1}</strong><small>{set.type === 'warmup' ? 'Aquec.' : set.type === 'drop' ? 'Drop' : 'Trabalho'}</small></div>
              <div className='target-reps'><small className='mobile-set-label'>REPS ALVO</small><strong>{set.targetReps || '—'}</strong>{(set.previousLoad || set.previousReps) && <em>Anterior: {set.previousLoad ? `${set.previousLoad}kg` : '—'} × {set.previousReps || '—'}</em>}</div>
              <div className='set-input-group load-group'><small className='mobile-set-label'>CARGA USADA (KG)</small><div className='load-input'><button type='button' onClick={() => updateSet(current.exerciseId, set.setId, { load: Math.max(0, toNumber(set.load) - 1) || '' })}><Minus size={16} /></button><input aria-label={`Carga usada na série ${index + 1}`} value={set.load} inputMode='decimal' onChange={(e) => updateSet(current.exerciseId, set.setId, { load: e.target.value })} placeholder='kg' /><button type='button' onClick={() => updateSet(current.exerciseId, set.setId, { load: toNumber(set.load) + 1 })}><Plus size={16} /></button></div></div>
              <div className='set-input-group reps-group'><small className='mobile-set-label'>REPS FEITAS</small><input aria-label={`Repetições feitas na série ${index + 1}`} className='reps-input' value={set.reps} inputMode='numeric' onChange={(e) => updateSet(current.exerciseId, set.setId, { reps: e.target.value })} placeholder='reps' /></div>
              <div className='set-status-group'><small className='mobile-set-label'>CONCLUIR</small><button aria-label={`Concluir série ${index + 1}`} className={cls('set-check', set.done && 'done')} onClick={() => toggleSet(current, set)}>{set.done ? <Check size={20} /> : <span />}</button></div>
            </div>)}
          </div>
          <div className='exercise-actions'><Button variant='secondary' icon={Clock3} onClick={() => startRest(current.restSec)}>Descanso {current.restSec}s</Button><Field label='Nota desta sessão'><textarea value={current.sessionNote || ''} onChange={(e) => mutate((d) => { d.activeSession.exercises.find((x) => x.exerciseId === current.exerciseId).sessionNote = e.target.value; })} placeholder='Ex.: 40 kg ficou leve, subir na próxima.' /></Field></div>
        </> : <EmptyState icon={Dumbbell} title='Este treino ainda não tem exercícios' text='Você pode finalizar a sessão ou voltar e editar a ficha.' />}
      </main>
    </div>

    <div className='mobile-finish-bar'><Button variant='danger-soft' icon={Check} onClick={() => setConfirmFinish(true)}>{isActivity ? 'Finalizar atividade' : 'Finalizar treino'}</Button></div>

    {session.rest && <div className={cls('rest-dock', restRemaining <= 0 && 'finished')}><div className='rest-circle'><Clock3 size={22} /></div><div><span>{restRemaining > 0 ? 'DESCANSO' : 'BORA!'}</span><strong>{restRemaining > 0 ? formatElapsed(restRemaining) : 'Próxima série'}</strong></div><button onClick={() => adjustRest(-15)}>-15s</button><button onClick={() => adjustRest(15)}>+15s</button><Button variant={restRemaining > 0 ? 'secondary' : 'primary'} onClick={stopRest}>{restRemaining > 0 ? 'Pular' : 'Fechar'}</Button></div>}

    <Modal open={confirmFinish} title={isActivity ? 'Finalizar atividade?' : 'Finalizar treino?'} subtitle={isActivity ? 'A atividade será salva no histórico com o tempo e os dados registrados.' : 'Tudo que você registrou já está salvo. Você pode finalizar mesmo com séries pendentes.'} onClose={() => setConfirmFinish(false)}>
      <div className='finish-summary'><StatLine label='Tempo' value={formatElapsed(elapsedSession(session, tick))} />{isActivity ? <><StatLine label='Distância' value={session.activity?.distanceKm ? `${session.activity.distanceKm} km` : '—'} /><StatLine label='Tipo' value={session.activity?.type || 'Atividade'} /></> : <><StatLine label='Séries concluídas' value={`${progress.done}/${progress.total}`} /><StatLine label='Exercícios' value={session.exercises.length} /></>}</div>
      <Field label='Observação geral'><textarea value={session.note || ''} onChange={(e) => mutate((d) => { d.activeSession.note = e.target.value; })} placeholder='Como foi o treino hoje?' /></Field>
      {!isActivity && progress.done < progress.total && <div className='finish-warning'><ShieldCheck size={18} /><span>Há {progress.total - progress.done} série(s) pendente(s). Elas ficarão registradas como não concluídas.</span></div>}
      <div className='modal-actions'><Button variant='secondary' onClick={() => setConfirmFinish(false)}>Continuar</Button><Button icon={Check} onClick={finish}>Finalizar e salvar</Button></div>
    </Modal>
  </div>;
}

function StatLine({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function HistoryPage() {
  const { core } = useEngine();
  const [selected, setSelected] = useState(null);
  return <Page><PageTitle kicker='MEMÓRIA DE TREINO' title='Histórico' text='Cada sessão salva do jeito que aconteceu: carga, reps, tempo e observações.' />{core.history.length ? <div className='history-layout'><div className='history-list'>{core.history.map((session) => <button key={session.id} className={cls('history-card', selected?.id === session.id && 'active')} onClick={() => setSelected(session)}><div className='history-date'><strong>{new Date(session.finishedAt || session.startedAt).getDate()}</strong><span>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(session.finishedAt || session.startedAt)).replace('.', '')}</span></div><div className='history-copy'><strong>{session.workoutName}</strong><span><Clock3 size={14} /> {formatElapsed(session.durationMs || elapsedSession(session))} · {session.sessionType === 'activity' ? 'atividade avulsa' : `${session.exercises?.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).length, 0)} séries`}</span></div><ChevronRight size={20} /></button>)}</div><div className='history-detail panel'>{selected ? <SessionDetail session={selected} /> : <EmptyState icon={History} title='Escolha uma sessão' text='Toque em um treino da lista para ver todos os detalhes.' />}</div></div> : <EmptyState icon={History} title='Seu histórico começa no primeiro treino' text='Finalize uma sessão e ela aparecerá aqui automaticamente.' />}</Page>;
}

function SessionDetail({ session }) { return <div className='session-detail'><div className='session-detail-head'><span className='kicker'>{formatDate(session.finishedAt || session.startedAt)}</span><h2>{session.workoutName}</h2><div className='detail-metrics'><span><Clock3 size={16} /> {formatElapsed(session.durationMs || elapsedSession(session))}</span>{session.sessionType === 'activity' ? <span><Activity size={16} /> {session.activity?.type || 'Atividade'}</span> : <span><Dumbbell size={16} /> {session.exercises?.length || 0} exercícios</span>}</div></div>{session.note && <div className='session-note'>{session.note}</div>}{session.sessionType === 'activity' ? <div className='session-activity-detail'><StatLine label='Distância' value={session.activity?.distanceKm ? `${session.activity.distanceKm} km` : '—'} /><StatLine label='Calorias' value={session.activity?.calories || '—'} />{session.activity?.note && <div className='session-note'>{session.activity.note}</div>}</div> : <div className='session-exercises'>{session.exercises?.map((ex) => <div className='session-exercise' key={ex.exerciseId}><div><strong>{ex.name}</strong>{ex.sessionNote && <small>{ex.sessionNote}</small>}</div><div className='history-set-grid'>{ex.sets.map((set, i) => <span key={set.setId} className={set.done ? 'done' : ''}><b>S{i + 1}</b>{set.load ? `${set.load}kg` : '—'} × {set.reps || set.targetReps || '—'}</span>)}</div></div>)}</div>}</div>; }

function ProgressPage() {
  const { core, mutate, repository } = useEngine();
  const [weightValue, setWeightValue] = useState('');
  const fileRef = useRef(null);
  const weights = [...core.body.weights].sort((a, b) => new Date(a.date) - new Date(b.date));
  const prs = useMemo(() => computePRs(core.history), [core.history]);
  function addWeight() { if (!toNumber(weightValue)) return; mutate((d) => { d.body.weights.push({ id: uid('weight'), value: toNumber(weightValue), date: nowIso() }); }); setWeightValue(''); }
  async function addProgressPhoto(file) { if (!file) return; const mediaId = await repository.addMedia(file, { kind: 'progress' }); mutate((d) => { d.body.photos.unshift({ id: uid('photo'), mediaId, date: nowIso(), note: '' }); }); }
  return <Page><PageTitle kicker='EVOLUÇÃO' title='Seu progresso, visível' text='Veja força, frequência, peso e fotos sem transformar o treino em burocracia.' />
    <div className='progress-dashboard'><section className='panel weight-panel'><div className='panel-head'><div><span className='kicker'>PESO CORPORAL</span><h2>{weights.at(-1) ? `${weights.at(-1).value} kg` : 'Sem registros'}</h2></div><Weight size={22} /></div><MiniLineChart values={weights.map((w) => ({ x: w.date, y: w.value }))} /><div className='inline-form'><input value={weightValue} onChange={(e) => setWeightValue(e.target.value)} placeholder='Ex.: 82,4' inputMode='decimal' /><Button icon={Plus} onClick={addWeight}>Registrar</Button></div></section>
      <section className='panel pr-panel'><div className='panel-head'><div><span className='kicker'>MELHORES CARGAS</span><h2>PRs registrados</h2></div><Trophy size={22} /></div>{prs.length ? <div className='pr-list'>{prs.slice(0, 6).map((pr) => <div key={pr.exerciseId}><div><strong>{pr.name}</strong><span>{pr.date ? formatDateShort(pr.date) : ''}</span></div><b>{pr.load} kg</b></div>)}</div> : <EmptyState icon={Trophy} title='Sem PRs ainda' text='As melhores cargas aparecem conforme você conclui séries.' />}</section></div>
    <section className='panel photo-progress'><div className='panel-head'><div><span className='kicker'>FOTOS DE EVOLUÇÃO</span><h2>Seu álbum de progresso</h2></div><Button variant='secondary' icon={Camera} onClick={() => fileRef.current?.click()}>Adicionar foto</Button></div><input ref={fileRef} type='file' accept='image/*' hidden onChange={(e) => { addProgressPhoto(e.target.files?.[0]); e.target.value = ''; }} />{core.body.photos.length ? <div className='progress-photo-grid'>{core.body.photos.map((photo) => <ProgressPhoto key={photo.id} photo={photo} />)}</div> : <EmptyState icon={Camera} title='Sem fotos ainda' text='Registre seu progresso no seu ritmo. As fotos ficam no armazenamento do app.' />}</section>
  </Page>;
}

function computePRs(history) { const map = new Map(); for (const session of history || []) for (const ex of session.exercises || []) for (const set of ex.sets || []) { if (!set.done) continue; const load = toNumber(set.load); const current = map.get(ex.exerciseId); if (load > (current?.load || 0)) map.set(ex.exerciseId, { exerciseId: ex.exerciseId, name: ex.name, load, date: session.finishedAt || session.startedAt }); } return [...map.values()].sort((a, b) => b.load - a.load); }
function ProgressPhoto({ photo }) { const url = useMediaUrl(photo.mediaId); return <div className='progress-photo'>{url ? <img src={url} alt='Evolução' /> : <div className='media-loading'><ImageIcon /></div>}<span>{formatDateShort(photo.date)}</span></div>; }
function MiniLineChart({ values }) { if (values.length < 2) return <div className='chart-placeholder'><BarChart3 size={28} /><span>Registre pelo menos dois pesos para visualizar a curva.</span></div>; const width = 500, height = 150, pad = 14; const ys = values.map((v) => v.y); const min = Math.min(...ys), max = Math.max(...ys); const span = Math.max(1, max - min); const pts = values.map((v, i) => `${pad + (i / (values.length - 1)) * (width - pad * 2)},${height - pad - ((v.y - min) / span) * (height - pad * 2)}`).join(' '); return <svg className='mini-chart' viewBox={`0 0 ${width} ${height}`} preserveAspectRatio='none'><polyline points={pts} fill='none' stroke='var(--accent)' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round' /></svg>; }

function GoalsPage() {
  const { core, mutate } = useEngine();
  const week = weeklySessions(core.history).length, month = monthlySessions(core.history).length;
  return <Page><PageTitle kicker='METAS' title='Consistência sem pressão' text='Metas simples para te puxar para frente, sem ranking e sem gamificação infantil.' />
    <div className='goal-cards'><GoalCard title='Meta semanal' current={week} target={Number(core.goals.weekly) || 0} icon={Flame} /><GoalCard title='Meta mensal' current={month} target={Number(core.goals.monthly) || 0} icon={CalendarDays} /></div>
    <section className='panel goals-editor'><div className='panel-head'><div><span className='kicker'>AJUSTAR OBJETIVOS</span><h2>Seu ritmo</h2></div></div><div className='form-grid two'><Field label='Treinos por semana'><input type='number' min='1' max='7' value={core.goals.weekly} onChange={(e) => mutate((d) => { d.goals.weekly = Number(e.target.value) || 0; })} /></Field><Field label='Treinos por mês'><input type='number' min='1' max='31' value={core.goals.monthly} onChange={(e) => mutate((d) => { d.goals.monthly = Number(e.target.value) || 0; })} /></Field><Field label='Meta de peso (opcional)'><input value={core.goals.weightTarget} inputMode='decimal' onChange={(e) => mutate((d) => { d.goals.weightTarget = e.target.value; })} placeholder='kg' /></Field></div></section>
  </Page>;
}
function GoalCard({ title, current, target, icon: Icon }) { const p = target ? Math.min(100, Math.round((current / target) * 100)) : 0; return <div className='goal-card panel'><div className='goal-icon'><Icon /></div><span>{title}</span><div><strong>{current}</strong><small>/ {target}</small></div><div className='progress-track'><i style={{ width: `${p}%` }} /></div><p>{p >= 100 ? 'Meta concluída. Excelente trabalho.' : `${Math.max(0, target - current)} para chegar lá.`}</p></div>; }

function SettingsPage({ onLogout }) {
  const { core, mutate, repository, platform, refresh, nativeBridge } = useEngine();
  const [sync, setSync] = useState({ host: localStorage.getItem('treino.sync.host') || '', code: '', busy: false, message: '' });
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ displayName: core.user?.displayName || '', username: core.user?.username || '', password: '', confirm: '' });
  const importRef = useRef(null);
  useEffect(() => { if (platform === 'desktop' && repository.getSyncInfo) repository.getSyncInfo().then(setDesktopInfo).catch(() => {}); }, [platform, repository]);

  async function exportBackup() { const backup = await repository.exportBackup(); const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' }); nativeBridge.saveBackup?.(blob, `Treino-backup-${new Date().toISOString().slice(0, 10)}.treino`) || downloadBlob(blob, `Treino-backup-${new Date().toISOString().slice(0, 10)}.treino`); }
  async function importBackup(file) { if (!file) return; try { const backup = JSON.parse(await file.text()); if (!confirm('Restaurar este backup? O app criará uma cópia de segurança antes de substituir os dados.')) return; await repository.importBackup(backup); localStorage.removeItem('treino.auth.user'); await refresh(); location.reload(); } catch (err) { alert(err.message || 'Backup inválido.'); } }
  async function syncAction(direction) { setSync((s) => ({ ...s, busy: true, message: '' })); try { localStorage.setItem('treino.sync.host', sync.host); if (direction === 'pull') await repository.pullFromDesktop(sync.host, sync.code); else await repository.pushToDesktop(sync.host, sync.code); await refresh(); setSync((s) => ({ ...s, busy: false, message: direction === 'pull' ? 'Treinos recebidos do PC.' : 'Dados enviados para o PC.' })); } catch (err) { setSync((s) => ({ ...s, busy: false, message: err.message || 'Falha na conexão.' })); } }
  async function saveAccount() {
    if (accountForm.username.trim().length < 3) return alert('Use um usuário com pelo menos 3 caracteres.');
    if (accountForm.password && accountForm.password !== accountForm.confirm) return alert('As novas senhas não conferem.');
    const credentials = accountForm.password ? await hashPassword(accountForm.password) : core.user.credentials;
    mutate((d) => { d.user.displayName = accountForm.displayName.trim() || accountForm.username.trim(); d.user.username = accountForm.username.trim().toLowerCase(); d.user.credentials = credentials; });
    setAccountForm((f) => ({ ...f, password: '', confirm: '' }));
    setAccountOpen(false);
  }

  return <Page><PageTitle kicker='CONFIGURAÇÕES' title='Do seu jeito' text='Visual, descanso, conta, backup e conexão com o computador.' />
    <div className='settings-grid'>
      <section className='panel setting-section'><div className='panel-head'><div><span className='kicker'>APARÊNCIA</span><h2>Interface</h2></div>{core.settings.theme === 'dark' ? <Moon /> : <Sun />}</div><div className='segmented'><button className={core.settings.theme === 'dark' ? 'active' : ''} onClick={() => mutate((d) => { d.settings.theme = 'dark'; })}><Moon size={17} /> Escuro</button><button className={core.settings.theme === 'light' ? 'active' : ''} onClick={() => mutate((d) => { d.settings.theme = 'light'; })}><Sun size={17} /> Claro</button></div><ColorPicker value={core.settings.accent} onChange={(color) => mutate((d) => { d.settings.accent = color; })} /><div className='day-color-settings'>{core.week.map((day) => <label key={day.id}><span>{day.short}</span><input type='color' value={core.settings.dayColors[day.id]} onChange={(e) => mutate((d) => { d.settings.dayColors[day.id] = e.target.value; })} /></label>)}</div></section>
      <section className='panel setting-section'><div className='panel-head'><div><span className='kicker'>DURANTE O TREINO</span><h2>Comportamento</h2></div><Clock3 /></div><Field label='Descanso padrão (segundos)'><input type='number' value={core.settings.defaultRestSec} onChange={(e) => mutate((d) => { d.settings.defaultRestSec = Number(e.target.value) || 0; })} /></Field><Toggle checked={core.settings.autoStartRest} onChange={(value) => mutate((d) => { d.settings.autoStartRest = value; })} label='Iniciar descanso automaticamente ao concluir série' /><Toggle checked={core.settings.notifications} onChange={(value) => { mutate((d) => { d.settings.notifications = value; }); if (value) nativeBridge.requestNotifications?.(); }} label='Avisar quando o descanso terminar' /><Toggle checked={core.settings.haptics} onChange={(value) => mutate((d) => { d.settings.haptics = value; })} label='Vibração de confirmação' /></section>
    </div>
    <section className='panel sync-panel'><div className='panel-head'><div><span className='kicker'>PC ↔ CELULAR</span><h2>Central de sincronização</h2></div><Wifi /></div>{platform === 'desktop' ? <div className='desktop-sync-info'><p>Deixe o App de Treino aberto no computador e conecte o celular na mesma rede Wi-Fi.</p>{desktopInfo ? <div className='pairing-card'><div><span>Endereço do PC</span><strong>{desktopInfo.ips?.[0] || 'Sem IP de rede'}:{desktopInfo.port}</strong></div><div><span>Código de pareamento</span><strong className='pair-code'>{desktopInfo.codigo}</strong></div></div> : <span>Carregando dados de conexão...</span>}</div> : <div className='mobile-sync-form'><div className='form-grid two'><Field label='IP / endereço do PC'><input value={sync.host} onChange={(e) => setSync({ ...sync, host: e.target.value })} placeholder='192.168.0.15:3035' /></Field><Field label='Código de pareamento'><input value={sync.code} inputMode='numeric' onChange={(e) => setSync({ ...sync, code: e.target.value })} placeholder='000000' /></Field></div><div className='sync-actions'><Button variant='secondary' icon={ArrowDown} disabled={sync.busy} onClick={() => syncAction('pull')}>Receber do PC</Button><Button icon={ArrowUp} disabled={sync.busy} onClick={() => syncAction('push')}>Enviar para o PC</Button></div>{sync.message && <div className='sync-message'>{sync.message}</div>}</div>}</section>
    <section className='panel backup-panel'><div className='panel-head'><div><span className='kicker'>SEUS DADOS</span><h2>Backup e restauração</h2></div><ShieldCheck /></div><p>Inclui treinos, histórico, metas, conta local e fotos. Atualizações do app não devem apagar seus dados.</p><div className='backup-actions'><Button variant='secondary' icon={Upload} onClick={() => importRef.current?.click()}>Restaurar backup</Button><Button icon={Save} onClick={exportBackup}>Gerar backup</Button><input hidden ref={importRef} type='file' accept='.treino,.json,application/json' onChange={(e) => { importBackup(e.target.files?.[0]); e.target.value = ''; }} /></div></section>
    <section className='panel account-panel'><div className='panel-head'><div><span className='kicker'>CONTA LOCAL</span><h2>{core.user?.displayName}</h2></div><CircleUserRound /></div><p>@{core.user?.username} · seus dados continuam armazenados localmente.</p><Toggle checked={core.settings.rememberLogin} onChange={(value) => { mutate((d) => { d.settings.rememberLogin = value; }); if (!value) localStorage.removeItem('treino.auth.user'); else localStorage.setItem('treino.auth.user', core.user.id); }} label='Manter conectado neste dispositivo' /><div className='account-actions'><Button variant='secondary' icon={Pencil} onClick={() => setAccountOpen(true)}>Editar perfil</Button><Button variant='danger-soft' icon={LogOut} onClick={onLogout}>Sair da sessão</Button></div></section>
    <Modal open={accountOpen} title='Editar perfil e acesso' subtitle='Altere seu nome, usuário ou defina uma nova senha.' onClose={() => setAccountOpen(false)}><Field label='Nome'><input value={accountForm.displayName} onChange={(e) => setAccountForm({ ...accountForm, displayName: e.target.value })} /></Field><Field label='Usuário'><input value={accountForm.username} autoCapitalize='none' onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} /></Field><Field label='Nova senha (opcional)'><input type='password' value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} placeholder='Deixe em branco para manter' /></Field>{accountForm.password && <Field label='Confirmar nova senha'><input type='password' value={accountForm.confirm} onChange={(e) => setAccountForm({ ...accountForm, confirm: e.target.value })} /></Field>}<div className='modal-actions'><Button variant='secondary' onClick={() => setAccountOpen(false)}>Cancelar</Button><Button icon={Save} onClick={saveAccount}>Salvar perfil</Button></div></Modal>
  </Page>;
}

function Toggle({ checked, onChange, label }) { return <label className='toggle-row'><button type='button' className={checked ? 'on' : ''} onClick={() => onChange(!checked)}><i /></button><span>{label}</span></label>; }
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
