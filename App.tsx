
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Upgrade, Business, TimeMode } from './types';
import { INITIAL_UPGRADES, INITIAL_BUSINESSES, ACHIEVEMENTS, CURRENT_VERSION, VERSION_SUMMARY } from './constants';
import { formatCurrency, formatTime } from './utils/formatters';
import { 
  TrendingUp, 
  Briefcase, 
  Award, 
  RefreshCcw, 
  Info, 
  ChevronUp, 
  Clock, 
  Zap,
  TrendingDown,
  Moon,
  Sun,
  Sparkles,
  Volume2,
  VolumeX,
  Music,
  Play,
  Pause,
  Upload,
  Activity,
  FastForward,
  Timer,
  Snowflake,
  PlayCircle,
  Coins
} from 'lucide-react';

const SAVE_KEY = 'timemint_save_v1';
const THEME_KEY = 'timemint_theme';
const SOUND_KEY = 'timemint_sound';

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  char: string;
  color: string;
  duration: string;
}

const App: React.FC = () => {
  // Game State
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, lastUpdate: Date.now() };
      } catch (e) {
        console.error("Failed to parse save", e);
      }
    }
    return {
      balance: 0,
      totalEarned: 0,
      lastUpdate: Date.now(),
      upgrades: {},
      businesses: {},
      achievements: [],
      prestigePoints: 0,
      prestigeMultiplier: 1,
      version: CURRENT_VERSION
    };
  });

  const [activeTab, setActiveTab] = useState<'upgrades' | 'businesses' | 'stats'>('upgrades');
  const [offlineEarnings, setOfflineEarnings] = useState<number | null>(null);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === 'dark';
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const savedSound = localStorage.getItem(SOUND_KEY);
    return savedSound === 'true';
  });
  
  // Timeline State
  const [timeMode, setTimeMode] = useState<TimeMode>('normal');
  const [showInitialModeSelector, setShowInitialModeSelector] = useState(true);

  // Juice State
  const [lastBoughtId, setLastBoughtId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const milestoneRef = useRef<number[]>([]);

  // Music State
  const [musicLoaded, setMusicLoaded] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicFileName, setMusicFileName] = useState<string>('');
  const [rhythmMultiplier, setRhythmMultiplier] = useState(1.0);
  const [isBeatActive, setIsBeatActive] = useState(false);
  
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lastUpdateRef = useRef<number>(Date.now());
  const tickRef = useRef<number | null>(null);

  // Beat Detection Refs
  const lastBeatTimeRef = useRef<number>(0);
  const beatCountRef = useRef<number>(0);
  const currentRhythmMultiplierRef = useRef<number>(1.0);

  // Procedural Sound Generator (SFX)
  const playSound = (type: 'upgrade' | 'business' | 'achievement' | 'tap' | 'milestone') => {
    if (isMuted) return;
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'upgrade') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'business') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'achievement' || type === 'milestone') {
      const playNote = (freq: number, startTime: number, duration: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(freq, startTime);
        g.gain.setValueAtTime(0.05, startTime);
        g.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        o.start(startTime);
        o.stop(startTime + duration);
      };
      playNote(523.25, now, 0.1);
      playNote(659.25, now + 0.1, 0.1);
      playNote(783.99, now + 0.2, 0.3);
    } else if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  };

  // Particle System
  const createMilestoneParticles = () => {
    const newParticles: Particle[] = [];
    const colors = ['#2dd4bf', '#f59e0b', '#3b82f6', '#10b981'];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: Math.random(),
        x: 0,
        y: 0,
        tx: (Math.random() - 0.5) * 400,
        ty: (Math.random() - 0.5) * 400,
        char: Math.random() > 0.5 ? '$' : 'Mint',
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: (0.5 + Math.random() * 1) + 's'
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  };

  // Music & Visualizer Logic
  const initVisualizer = () => {
    if (!musicAudioRef.current) return;
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 128;
    }
    if (!sourceNodeRef.current) {
      sourceNodeRef.current = ctx.createMediaElementSource(musicAudioRef.current);
      sourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < 4; i++) sum += dataArray[i];
      const avgBass = sum / 4;
      const now = Date.now();
      if (avgBass > 180 && now - lastBeatTimeRef.current > 250) {
        lastBeatTimeRef.current = now;
        setIsBeatActive(true);
        setTimeout(() => setIsBeatActive(false), 100);
        let boostFactor = timeMode === 'slow' ? 150 : 400;
        beatCountRef.current = Math.min(100, beatCountRef.current + 4);
        currentRhythmMultiplierRef.current = 1.0 + (beatCountRef.current / boostFactor);
        setRhythmMultiplier(currentRhythmMultiplierRef.current);
      } else {
        beatCountRef.current = Math.max(0, beatCountRef.current - (timeMode === 'fast' ? 0.5 : 0.2));
        setRhythmMultiplier(1.0 + (beatCountRef.current / (timeMode === 'slow' ? 150 : 400)));
      }
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      for(let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        if (timeMode === 'fast') barHeight *= 1.2;
        canvasCtx.fillStyle = isDarkMode 
          ? `rgba(45, 212, 191, ${0.1 + (barHeight / canvas.height) * 0.4})`
          : `rgba(13, 148, 136, ${0.1 + (barHeight / canvas.height) * 0.4})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMusicFileName(file.name);
      if (musicAudioRef.current) {
        musicAudioRef.current.src = url;
        musicAudioRef.current.load();
        setMusicLoaded(true);
        setIsMusicPlaying(true);
        musicAudioRef.current.play();
        initVisualizer();
      }
    }
  };

  const toggleMusic = () => {
    if (!musicAudioRef.current || !musicLoaded) return;
    if (isMusicPlaying) musicAudioRef.current.pause();
    else {
      musicAudioRef.current.play();
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  // Theme
  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
    if (isDarkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [isDarkMode]);

  // IPS Calc
  const calculateIPS = useCallback((currState: GameState) => {
    if (timeMode === 'freeze') return 0;
    let baseIps = 1;
    INITIAL_UPGRADES.forEach(u => baseIps += (currState.upgrades[u.id] || 0) * u.incomePerSecond);
    INITIAL_BUSINESSES.forEach(b => baseIps += (currState.businesses[b.id] || 0) * b.baseIncome);
    let modeMultiplier = 1.0;
    if (timeMode === 'fast') modeMultiplier = 2.0;
    if (timeMode === 'slow') modeMultiplier = 0.5;
    return baseIps * currState.prestigeMultiplier * currentRhythmMultiplierRef.current * modeMultiplier;
  }, [timeMode, currentRhythmMultiplierRef.current]);

  const ips = calculateIPS(state);

  // Persistence
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [state]);

  // Main Loop
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const dt = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;
      setState(prev => {
        const gain = calculateIPS(prev) * dt;
        const newBalance = prev.balance + gain;
        
        // Milestone Detection
        const thresholds = [10000, 100000, 1000000, 10000000, 100000000];
        thresholds.forEach(t => {
          if (newBalance >= t && !milestoneRef.current.includes(t)) {
            milestoneRef.current.push(t);
            playSound('milestone');
            createMilestoneParticles();
          }
        });

        const newAchievements = [...prev.achievements];
        let newlyUnlocked = false;
        ACHIEVEMENTS.forEach(ach => {
          if (!newAchievements.includes(ach.id)) {
            let met = false;
            if (ach.type === 'balance' && newBalance >= ach.requirement) met = true;
            if (ach.type === 'totalEarned' && (prev.totalEarned + gain) >= ach.requirement) met = true;
            if (ach.type === 'upgrades' && Object.values(prev.upgrades).reduce((a, b) => a + b, 0) >= ach.requirement) met = true;
            if (ach.type === 'prestige' && prev.prestigePoints >= ach.requirement) met = true;
            if (met) { newAchievements.push(ach.id); newlyUnlocked = true; }
          }
        });
        if (newlyUnlocked) playSound('achievement');
        return {
          ...prev,
          balance: newBalance,
          totalEarned: prev.totalEarned + gain,
          lastUpdate: now,
          achievements: newAchievements
        };
      });
      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
    return () => { if (tickRef.current) cancelAnimationFrame(tickRef.current); };
  }, [calculateIPS]);

  const handleManualTap = () => {
    if (timeMode !== 'freeze') return;
    let normalIps = 1;
    INITIAL_UPGRADES.forEach(u => normalIps += (state.upgrades[u.id] || 0) * u.incomePerSecond);
    INITIAL_BUSINESSES.forEach(b => normalIps += (state.businesses[b.id] || 0) * b.baseIncome);
    const burstValue = normalIps * state.prestigeMultiplier * 5;
    playSound('tap');
    setState(prev => ({
      ...prev,
      balance: prev.balance + burstValue,
      totalEarned: prev.totalEarned + burstValue,
    }));
  };

  const buyUpgrade = (u: Upgrade) => {
    const cost = u.basePrice * Math.pow(u.priceMultiplier, state.upgrades[u.id] || 0);
    if (state.balance >= cost) {
      playSound('upgrade');
      setLastBoughtId(u.id);
      setTimeout(() => setLastBoughtId(null), 400);
      setState(prev => ({
        ...prev,
        balance: prev.balance - cost,
        upgrades: { ...prev.upgrades, [u.id]: (prev.upgrades[u.id] || 0) + 1 }
      }));
    }
  };

  const buyBusiness = (b: Business) => {
    const cost = b.basePrice * Math.pow(b.priceMultiplier, state.businesses[b.id] || 0);
    if (state.balance >= cost) {
      playSound('business');
      setLastBoughtId(b.id);
      setTimeout(() => setLastBoughtId(null), 400);
      setState(prev => ({
        ...prev,
        balance: prev.balance - cost,
        businesses: { ...prev.businesses, [b.id]: (prev.businesses[b.id] || 0) + 1 }
      }));
    }
  };

  const performPrestige = () => {
    if (state.totalEarned < 100000) return;
    const newPoints = Math.floor(Math.sqrt(state.totalEarned / 100000));
    if (window.confirm(`Prestige for ${newPoints} points?`)) {
      playSound('achievement');
      milestoneRef.current = []; // Reset milestone triggers for particles
      setState(prev => ({
        ...prev,
        balance: 0,
        totalEarned: 0,
        lastUpdate: Date.now(),
        upgrades: {},
        businesses: {},
        prestigePoints: prev.prestigePoints + newPoints,
        prestigeMultiplier: 1 + ((prev.prestigePoints + newPoints) * 0.1),
      }));
    }
  };

  const modeData = {
    normal: { name: 'Normal', icon: <PlayCircle size={14} />, desc: '1x Income' },
    fast: { name: 'Fast Forward', icon: <FastForward size={14} />, desc: '2x Income' },
    slow: { name: 'Slow Motion', icon: <Timer size={14} />, desc: 'Big Beat Bonus' },
    freeze: { name: 'Freeze', icon: <Snowflake size={14} />, desc: 'Burst Tapping' }
  };

  return (
    <div className={`min-h-screen flex flex-col w-full relative transition-colors duration-500 ease-in-out ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <audio ref={musicAudioRef} onEnded={() => setIsMusicPlaying(false)} className="hidden" loop />
      
      {/* Header */}
      <header className={`border-b transition-all duration-500 sticky top-0 z-30 backdrop-blur-md ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 md:py-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-teal-600 tracking-tight">TimeMint</h1>
                <button onClick={() => setShowVersionInfo(true)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                  <span className="text-[10px] font-bold tracking-wider">v{CURRENT_VERSION}</span>
                  <Sparkles size={12} className="text-teal-500" />
                </button>
              </div>
              <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Currency that counts itself.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-center">
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
                 <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-teal-500 transition-colors" title="Upload Soundtrack">
                      <Upload size={18} />
                    </button>
                    {musicLoaded && (
                      <button onClick={toggleMusic} className="p-2 text-teal-600 hover:text-teal-400 transition-colors">
                        {isMusicPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                    )}
                 </div>
                 <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-50">Audio</span>
              </div>
              <div className="flex flex-col items-center">
                <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-2xl transition-all duration-300 shadow-sm ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-50">Sound</span>
              </div>
              <div className="flex flex-col items-center">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 rounded-2xl transition-all duration-300 shadow-sm ${isDarkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-50">Theme</span>
              </div>
            </div>
          </div>

          <div 
            onClick={handleManualTap}
            className={`rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden max-w-2xl transition-all duration-700 cursor-pointer group ${isDarkMode ? 'bg-slate-900 border border-slate-800 ring-1 ring-teal-500/20' : 'bg-slate-900 shadow-teal-500/10'} ${timeMode === 'freeze' ? 'ring-2 ring-blue-400 shadow-blue-400/20' : ''}`}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" width={600} height={200} />
            {timeMode === 'freeze' && <div className="absolute inset-0 bg-blue-400/5 backdrop-blur-[1px] pointer-events-none animate-pulse"></div>}
            
            {/* Particles Wrapper */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              {particles.map(p => (
                <div key={p.id} className="particle font-black text-lg" style={{
                  color: p.color,
                  '--duration': p.duration,
                  '--tw-translate-x': `${p.tx}px`,
                  '--tw-translate-y': `${p.ty}px`
                } as any}>
                  {p.char}
                </div>
              ))}
            </div>

            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
              <Clock size={160} className={`transition-transform duration-100 ${isBeatActive ? 'scale-110' : 'scale-100'} ${timeMode === 'fast' ? 'animate-tick duration-[30s]' : 'animate-tick'}`} />
            </div>

            <div className="relative z-10">
              <span className="text-teal-400 text-[10px] font-black uppercase tracking-[0.2em]">Net Worth</span>
              <div className={`text-5xl md:text-6xl font-mono font-bold mt-2 tracking-tighter drop-shadow-md transition-transform duration-75 ${isBeatActive ? 'scale-[1.02]' : 'scale-100'} ${timeMode === 'freeze' ? 'text-blue-100 group-active:scale-95' : ''}`}>
                {formatCurrency(state.balance)}
              </div>
              <div className="flex items-center flex-wrap gap-3 mt-6">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/5 backdrop-blur-sm">
                  {timeMode === 'freeze' ? <Snowflake size={18} className="text-blue-400" /> : <TrendingUp size={18} className="text-teal-400" />}
                  <span className="text-sm md:text-lg font-bold font-mono tracking-tight">
                    {timeMode === 'freeze' ? 'TAP TO MINT' : `${formatCurrency(ips)}/sec`}
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}>
                  {modeData[timeMode].icon}
                  <span className="text-xs font-black uppercase tracking-wider">{modeData[timeMode].name}</span>
                </div>
                {rhythmMultiplier > 1.01 && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border animate-in zoom-in duration-300 ${isDarkMode ? 'bg-teal-500/20 border-teal-500/40 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-600'}`}>
                    <Activity size={14} className={isBeatActive ? 'animate-pulse' : ''} />
                    <span className="text-xs font-black uppercase tracking-wider">Rhythm x{rhythmMultiplier.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-8 pb-32 max-w-6xl mx-auto w-full">
        {/* Timeline HUD */}
        <div className="flex flex-col items-center mb-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Timeline Flow</span>
          <div className={`flex p-1 rounded-2xl border transition-all shadow-lg ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            {(['normal', 'fast', 'slow', 'freeze'] as TimeMode[]).map(m => (
              <button key={m} onClick={() => setTimeMode(m)} className={`px-4 py-3 rounded-xl flex flex-col items-center gap-1 transition-all min-w-[80px] ${timeMode === m ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 hover:text-teal-500'}`}>
                {modeData[m].icon}
                <span className="text-[8px] font-black uppercase tracking-tighter">{modeData[m].name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Bar */}
        <nav className={`flex p-1.5 rounded-2xl mb-10 sticky top-[100px] md:top-[140px] z-20 backdrop-blur-xl max-w-md mx-auto sm:mx-0 shadow-lg border transition-all ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white/60 border-slate-200'}`}>
          <button onClick={() => setActiveTab('upgrades')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'upgrades' ? (isDarkMode ? 'bg-teal-500 text-white shadow-teal-500/20' : 'bg-teal-600 text-white shadow-teal-600/20') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}><Zap size={18} /> Upgrades</button>
          <button onClick={() => setActiveTab('businesses')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'businesses' ? (isDarkMode ? 'bg-teal-500 text-white shadow-teal-500/20' : 'bg-teal-600 text-white shadow-teal-600/20') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}><Briefcase size={18} /> Ventures</button>
          <button onClick={() => setActiveTab('stats')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'stats' ? (isDarkMode ? 'bg-teal-500 text-white shadow-teal-500/20' : 'bg-teal-600 text-white shadow-teal-600/20') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')}`}><Award size={18} /> Stats</button>
        </nav>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {INITIAL_UPGRADES.map(u => {
                const count = state.upgrades[u.id] || 0;
                const cost = u.basePrice * Math.pow(u.priceMultiplier, count);
                const canAfford = state.balance >= cost;
                const isPopping = lastBoughtId === u.id;
                return (
                  <button key={u.id} onClick={() => buyUpgrade(u)} disabled={!canAfford} className={`group text-left p-6 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden ${isPopping ? 'animate-purchase ring-4 ring-teal-500 shadow-teal-500/40' : ''} ${canAfford ? `${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} hover:border-teal-500 hover:-translate-y-1.5 hover:shadow-2xl active:scale-95` : `${isDarkMode ? 'bg-slate-900 border-transparent' : 'bg-slate-50 border-transparent'} opacity-40 grayscale cursor-not-allowed`}`}>
                    <div className="flex items-start gap-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm transition-all duration-500 ${isDarkMode ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-teal-50 group-hover:bg-teal-100'}`}>{u.icon}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-black text-lg leading-tight transition-colors ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{u.name}</h3>
                          <span className="text-[10px] font-black text-teal-600 bg-teal-50 dark:bg-teal-900/40 px-2 py-1 rounded-lg">LV {count}</span>
                        </div>
                        <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{u.description}</p>
                        <div className="flex items-center justify-between mt-5">
                          <span className={`text-lg font-mono font-black ${canAfford ? 'text-teal-500' : 'text-slate-400'}`}>{formatCurrency(cost)}</span>
                          <ChevronUp size={16} className={`text-teal-500 ${canAfford ? 'animate-bounce' : 'opacity-0'}`} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'businesses' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {INITIAL_BUSINESSES.map(b => {
                const count = state.businesses[b.id] || 0;
                const cost = b.basePrice * Math.pow(b.priceMultiplier, count);
                const canAfford = state.balance >= cost;
                const isPopping = lastBoughtId === b.id;
                let modeMult = timeMode === 'fast' ? 2.0 : timeMode === 'slow' ? 0.5 : timeMode === 'freeze' ? 0 : 1.0;
                const incomeGenerated = count * b.baseIncome * state.prestigeMultiplier * currentRhythmMultiplierRef.current * modeMult;
                return (
                  <button key={b.id} onClick={() => buyBusiness(b)} disabled={!canAfford} className={`group text-left p-6 rounded-3xl border-2 transition-all duration-300 relative ${isPopping ? 'animate-purchase ring-4 ring-teal-500 shadow-teal-500/40' : ''} ${canAfford ? `${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} hover:border-teal-500 hover:-translate-y-1.5 hover:shadow-2xl active:scale-95` : `${isDarkMode ? 'bg-slate-900 border-transparent' : 'bg-slate-50 border-transparent'} opacity-40 cursor-not-allowed`}`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-inner border-4 transition-all duration-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'} group-hover:border-teal-500 group-hover:scale-105`}>{b.icon}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h3 className={`font-black text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{b.name}</h3>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>x{count}</span>
                        </div>
                        <div className={`w-full h-2.5 rounded-full mt-4 overflow-hidden shadow-inner ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <div className="bg-gradient-to-r from-teal-600 to-teal-400 h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (state.balance / cost) * 100)}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between mt-5">
                          <span className={`text-base font-black font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatCurrency(cost)}</span>
                          <span className="text-xs font-mono font-bold text-teal-600">+{formatCurrency(incomeGenerated)}/s</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="max-w-4xl space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className={`p-8 rounded-3xl border-2 shadow-sm transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lifetime Income</span>
                  <p className={`text-3xl md:text-4xl font-mono font-black mt-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatCurrency(state.totalEarned)}</p>
                </div>
                <div className={`p-8 rounded-3xl border-2 shadow-sm transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em]">Active Multiplier</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl md:text-4xl font-mono font-black text-teal-500">
                      x{(state.prestigeMultiplier * rhythmMultiplier * (timeMode === 'fast' ? 2 : timeMode === 'slow' ? 0.5 : timeMode === 'freeze' ? 0 : 1)).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">(Combined)</span>
                  </div>
                </div>
              </div>

              {/* Music Player */}
              <div className={`p-8 rounded-3xl border-2 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Music size={24} className="text-teal-500" />
                    <h3 className="text-xl font-black">Atmospheric Boost</h3>
                  </div>
                  {rhythmMultiplier > 1.0 && (
                    <div className="flex items-center gap-2 text-teal-500 animate-pulse">
                      <Activity size={18} />
                      <span className="text-sm font-black uppercase tracking-widest">Beat Sync Active</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className={`w-full md:w-48 h-48 rounded-2xl flex items-center justify-center border-2 border-dashed transition-all cursor-pointer hover:border-teal-500 group ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} onClick={() => fileInputRef.current?.click()}>
                    <div className="text-center">
                      <Upload size={32} className={`mx-auto mb-2 transition-colors ${isDarkMode ? 'text-slate-700 group-hover:text-teal-500' : 'text-slate-300 group-hover:text-teal-500'}`} />
                      <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{musicLoaded ? 'Change Track' : 'Upload MP3'}</p>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    {musicLoaded ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Now Streaming</p>
                          <p className="font-bold text-lg truncate max-w-xs">{musicFileName}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={toggleMusic} className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${isMusicPlaying ? 'bg-teal-500 shadow-teal-500/20' : 'bg-slate-500 shadow-slate-500/20'}`}>
                            {isMusicPlaying ? <Pause size={28} /> : <Play size={28} />}
                          </button>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 font-medium italic mb-2">Each peak in the visualizer grants a temporary yield boost.</p>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              <div className="h-full bg-teal-500 transition-all duration-300 ease-out" style={{ width: `${(beatCountRef.current / 100) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 leading-relaxed">Sync custom audio to activate the Rhythm Engine and dynamic yield multipliers.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`rounded-[2.5rem] p-8 md:p-12 text-white text-center shadow-2xl transition-all duration-500 border-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-slate-800'}`}>
                <h3 className="text-3xl font-black mb-4 tracking-tight">Evolve Your Empire</h3>
                <p className="text-sm text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">Transcending resets local progress to generate permanent <span className="text-teal-400 font-bold">Chronos Shards</span>.</p>
                <div className="mb-12 flex flex-wrap items-center justify-center gap-6">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 min-w-[200px] backdrop-blur-sm">
                    <div className="text-5xl font-mono font-black text-teal-400">{state.totalEarned >= 100000 ? Math.floor(Math.sqrt(state.totalEarned / 100000)) : 0}</div>
                    <span className="text-[10px] font-black text-slate-500 uppercase mt-3 block tracking-widest">Potential Shards</span>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 min-w-[200px] backdrop-blur-sm">
                    <div className="text-5xl font-mono font-black text-teal-400">{state.prestigePoints}</div>
                    <span className="text-[10px] font-black text-slate-500 uppercase mt-3 block tracking-widest">Banked Shards</span>
                  </div>
                </div>
                <button onClick={performPrestige} disabled={state.totalEarned < 100000} className={`group w-full max-w-sm py-6 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-4 mx-auto ${state.totalEarned >= 100000 ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/40 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}>
                  <RefreshCcw size={24} className="group-hover:rotate-180 transition-transform duration-700" /> Transcension
                </button>
              </div>

              <div>
                <h3 className={`text-xl font-black mb-6 px-1 flex items-center gap-3 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><Award size={24} className="text-amber-500" /> Milestones</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACHIEVEMENTS.map(ach => {
                    const unlocked = state.achievements.includes(ach.id);
                    return (
                      <div key={ach.id} className={`p-5 rounded-3xl border-2 flex items-center gap-5 transition-all ${unlocked ? (isDarkMode ? 'bg-amber-900/10 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-md') : (isDarkMode ? 'bg-slate-900 border-slate-800 opacity-20' : 'bg-slate-50 border-slate-100 opacity-40')}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${unlocked ? 'bg-amber-100' : 'bg-slate-200 dark:bg-slate-800'}`}>{unlocked ? '✨' : '🔒'}</div>
                        <div><h4 className={`font-black tracking-tight ${unlocked ? (isDarkMode ? 'text-amber-400' : 'text-slate-800') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>{ach.name}</h4><p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>{ach.description}</p></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Mode Selector Initial Modal */}
      {showInitialModeSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-700">
          <div className={`rounded-[3rem] p-8 md:p-12 w-full max-w-2xl text-center shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <h2 className="text-4xl font-black mb-2 tracking-tighter">Choose Your Timeline</h2>
             <p className="text-slate-500 text-sm mb-12">How should the wealth of time flow today?</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
               {(['normal', 'fast', 'slow', 'freeze'] as TimeMode[]).map(m => (
                 <button key={m} onClick={() => { setTimeMode(m); setShowInitialModeSelector(false); }} className={`p-6 rounded-3xl border-2 transition-all text-left hover:scale-[1.02] active:scale-95 group ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-teal-500' : 'bg-slate-50 border-slate-100 hover:border-teal-500'}`}>
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">{modeData[m].icon}</div>
                     <div><h3 className="font-black uppercase tracking-tight text-sm">{modeData[m].name}</h3><p className="text-[10px] text-slate-500 font-bold">{modeData[m].desc}</p></div>
                   </div>
                 </button>
               ))}
             </div>
             <button onClick={() => setShowInitialModeSelector(false)} className="text-slate-500 text-xs font-black uppercase tracking-widest hover:text-teal-500 transition-colors">Skip to normal flow</button>
          </div>
        </div>
      )}

      {/* Update Log Modal */}
      {showVersionInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in zoom-in duration-300">
          <div className={`rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Update Log</h2>
              <button onClick={() => setShowVersionInfo(false)} className="text-slate-400 hover:text-teal-500 transition-colors p-2"><Zap size={28} /></button>
            </div>
            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
              <div className={`flex items-start gap-5 p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <div className="bg-teal-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shrink-0 shadow-lg">v{CURRENT_VERSION}</div>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{VERSION_SUMMARY} Update</h3>
                  <p className="text-xs mt-2 leading-relaxed font-medium">Visual polish and improved feedback.</p>
                  <ul className="text-xs text-teal-600 font-bold mt-4 space-y-3">
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 shrink-0"></div><span>Upgrade Juice: Cards now "pop" and flash on purchase</span></li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 shrink-0"></div><span>Wealth Explosion: Milestone particles spray from Net Worth</span></li>
                    <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 shrink-0"></div><span>UI Clarity: Descriptive labels added to all header controls</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <button onClick={() => setShowVersionInfo(false)} className={`w-full mt-10 py-5 rounded-3xl font-black text-lg transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Back to Minting</button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className={`p-4 fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-2xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-xl mx-auto flex justify-around items-center h-16">
          <button onClick={() => setActiveTab('upgrades')} className={`flex flex-col items-center gap-1.5 transition-all px-6 py-2 rounded-2xl active:scale-90 ${activeTab === 'upgrades' ? 'text-teal-500' : (isDarkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600')}`}><Zap size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Grind</span></button>
          <button onClick={() => setActiveTab('businesses')} className={`flex flex-col items-center gap-1.5 transition-all px-6 py-2 rounded-2xl active:scale-90 ${activeTab === 'businesses' ? 'text-teal-500' : (isDarkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600')}`}><Briefcase size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Wealth</span></button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1.5 transition-all px-6 py-2 rounded-2xl active:scale-90 ${activeTab === 'stats' ? 'text-teal-500' : (isDarkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600')}`}><Award size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Legacy</span></button>
          <button className={`flex flex-col items-center gap-1.5 cursor-not-allowed opacity-20 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}><TrendingDown size={24} /><span className="text-[9px] font-black uppercase tracking-widest">Shop</span></button>
        </div>
      </footer>

      {/* Decors */}
      <div className={`fixed -bottom-64 -left-64 w-[32rem] h-[32rem] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${isDarkMode ? 'bg-teal-500/10' : 'bg-teal-400/20'}`}></div>
      <div className={`fixed -top-64 -right-64 w-[32rem] h-[32rem] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${isDarkMode ? 'bg-teal-500/10' : 'bg-teal-400/20'}`}></div>
    </div>
  );
};

export default App;
