import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PLAYER_COLORS } from '../../types/game';
import { storageService } from '../../services/storageService';
import { Landmark, Users, Play, PlusCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const { createGame, joinGame } = useGame();

  const [mode, setMode] = useState<'SELECT' | 'CREATE' | 'JOIN'>('SELECT');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0].hex);
  const [startingCash, setStartingCash] = useState(1500);

  const lastRoom = storageService.getLastRoomCode();
  const hasSavedGame = Boolean(lastRoom && storageService.loadSession(lastRoom));

  const [isJoining, setIsJoining] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGame(name || 'Banquier', selectedColor, startingCash);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || isJoining) return;
    setIsJoining(true);
    try {
      await joinGame(roomCode, name || 'Joueur', selectedColor);
    } finally {
      setIsJoining(false);
    }
  };

  const handleResumeLast = async () => {
    if (!lastRoom || isJoining) return;
    const session = storageService.loadSession(lastRoom);
    if (session && session.players.length > 0) {
      setIsJoining(true);
      try {
        await joinGame(lastRoom, session.players[0].name, session.players[0].color);
      } finally {
        setIsJoining(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-radial from-slate-900 via-slate-950 to-black">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4 border border-amber-300/30">
            <span className="text-4xl">🎩</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
            MONOPOLY <span className="text-amber-400">BANQUE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Compagnon de transactions & gestion de propriétés en direct
          </p>
        </div>

        {/* MODE SELECT */}
        {mode === 'SELECT' && (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <button
                onClick={() => {
                  setName('Banquier');
                  setMode('CREATE');
                }}
                className="w-full group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-black/15 text-slate-950">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-bold">Créer une partie</div>
                    <div className="text-xs text-slate-900/80 font-medium">Hôte & Console Banquier</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setName('Joueur');
                  setMode('JOIN');
                }}
                className="w-full group flex items-center justify-between p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white font-bold border border-slate-700/80 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-bold">Rejoindre une partie</div>
                    <div className="text-xs text-slate-400 font-normal">Entrer le code à 4 lettres</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {hasSavedGame && (
                <button
                  onClick={handleResumeLast}
                  className="w-full flex items-center justify-center gap-2 p-3 text-sm rounded-xl bg-slate-900/60 hover:bg-slate-900 text-amber-300 border border-amber-500/30 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Reprendre la dernière partie ({lastRoom})
                </button>
              )}
            </div>

            <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Règles et noms officiels français (28 titres inclus)
            </div>
          </div>
        )}

        {/* CREATE GAME FORM */}
        {mode === 'CREATE' && (
          <form onSubmit={handleCreateSubmit} className="glass-panel p-6 rounded-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                Nouvelle Partie
              </h2>
              <button
                type="button"
                onClick={() => setMode('SELECT')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Retour
              </button>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Votre Nom (Banquier)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Alex ou Banquier"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-medium"
              />
            </div>

            {/* Mise de départ */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Argent de départ par joueur
                </label>
                <span className="text-sm font-bold font-mono text-amber-400">{startingCash} €</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1500, 2000, 2500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStartingCash(amt)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      startingCash === amt
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {amt} €
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur & Identité Visuelle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Votre Couleur
                </label>
                <span className="text-xs text-slate-400 font-medium">
                  {PLAYER_COLORS.find((c) => c.hex === selectedColor)?.label}
                </span>
              </div>

              {/* Aperçu du badge avatar */}
              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-md transition-colors shrink-0 ring-2 ring-white/10"
                  style={{ backgroundColor: selectedColor }}
                >
                  {(name.trim() || 'B').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {name.trim() || 'Banquier'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Badge d’identification sur vos propriétés et virements
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-between">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      selectedColor === c.hex ? 'ring-4 ring-white scale-110 shadow-lg' : 'opacity-75 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              Lancer la partie
            </button>
          </form>
        )}

        {/* JOIN GAME FORM */}
        {mode === 'JOIN' && (
          <form onSubmit={handleJoinSubmit} className="glass-panel p-6 rounded-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Rejoindre une Partie
              </h2>
              <button
                type="button"
                onClick={() => setMode('SELECT')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Retour
              </button>
            </div>

            {/* Code Salon */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Code du Salon (4 lettres)
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ex: PARI"
                maxLength={6}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono text-2xl font-black tracking-widest text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Nom */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Votre Nom de Joueur
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Sarah"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-medium"
              />
            </div>

            {/* Couleur & Identité Visuelle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Votre Couleur
                </label>
                <span className="text-xs text-slate-400 font-medium">
                  {PLAYER_COLORS.find((c) => c.hex === selectedColor)?.label}
                </span>
              </div>

              {/* Aperçu du badge avatar */}
              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-md transition-colors shrink-0 ring-2 ring-white/10"
                  style={{ backgroundColor: selectedColor }}
                >
                  {(name.trim() || 'J').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {name.trim() || 'Joueur'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Badge d’identification sur vos propriétés et virements
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-between">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      selectedColor === c.hex ? 'ring-4 ring-white scale-110 shadow-lg' : 'opacity-75 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-black text-base shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Users className="w-5 h-5" />
              {isJoining ? 'Connexion en cours...' : 'Rejoindre la partie'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
