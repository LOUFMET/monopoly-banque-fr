import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getCloudConfig, saveCloudConfig } from '../../services/supabaseClient';
import {
  X,
  Copy,
  Check,
  Users,
  LogOut,
  Volume2,
  Cloud,
  Shield,
  Smartphone,
  Sparkles,
  Info,
} from 'lucide-react';
import { playSound, triggerHaptic } from '../../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBankerConsole: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenBankerConsole,
}) => {
  const { session, currentPlayer, isBanker, leaveGame, switchPlayer, addToast } = useGame();

  const [copied, setCopied] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const cloudConfig = getCloudConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(cloudConfig.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(cloudConfig.supabaseKey || '');

  if (!isOpen || !session || !currentPlayer) return null;

  const copyShareLink = () => {
    const url = window.location.origin + window.location.pathname + `?room=${session.roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    addToast({
      type: 'info',
      title: 'Lien copié !',
      message: 'Partagez ce lien avec les autres joueurs pour rejoindre la partie.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCloud = (e: React.FormEvent) => {
    e.preventDefault();
    saveCloudConfig(supabaseUrl, supabaseKey);
    addToast({
      type: 'success',
      title: 'Configuration Cloud sauvegardée',
      message: 'La connexion Supabase Realtime est configurée.',
    });
    setShowCloudConfig(false);
  };

  const handleTestSound = () => {
    playSound('coin');
    triggerHaptic('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Paramètres & Salon</h3>
              <p className="text-xs text-slate-400">Monopoly Banque v1.0 (FR)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Code Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 text-center space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Code d'accès du Salon
          </span>
          <div className="text-3xl font-mono font-black text-amber-400 tracking-widest">
            {session.roomCode}
          </div>
          <button
            onClick={copyShareLink}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            Copier le lien d'invitation
          </button>
        </div>

        {/* Multi-Player Hotseat Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Joueurs connectés ({session.players.length})</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {session.players.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  switchPlayer(p.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                  p.id === currentPlayer.id
                    ? 'bg-amber-500/15 border border-amber-500/30 text-white font-bold'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{p.token}</span>
                  <span className="truncate">{p.name}</span>
                  {p.isBanker && (
                    <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300">
                      Banquier
                    </span>
                  )}
                </div>
                <span className="font-mono text-emerald-400">{p.balance} €</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Astuce : vous pouvez basculer d'un joueur à l'autre pour tester ou jouer sur un seul téléphone.
          </p>
        </div>

        {/* Banker Console Button (if host/banker) */}
        {isBanker && (
          <button
            onClick={() => {
              onClose();
              onOpenBankerConsole();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Ouvrir la Console du Banquier
          </button>
        )}

        {/* Sound Feedback Test */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Effets sonores & vibrations</span>
          </div>
          <button
            onClick={handleTestSound}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Tester
          </button>
        </div>

        {/* Optional Cloud Sync Configuration */}
        <div className="space-y-2">
          <button
            onClick={() => setShowCloudConfig(!showCloudConfig)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200"
          >
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              Synchronisation Multi-Appareils Cloud
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {showCloudConfig ? 'Masquer' : 'Configurer'}
            </span>
          </button>

          {showCloudConfig && (
            <form onSubmit={handleSaveCloud} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs animate-in fade-in">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Par défaut, l'application synchronise instantanément les onglets et fenêtres ouverts. Pour synchroniser sur plusieurs smartphones distants, renseignez votre projet Supabase :
              </p>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  URL Supabase
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Clé Anonyme (anon key)
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[11px]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
              >
                Enregistrer la configuration Cloud
              </button>
            </form>
          )}
        </div>

        {/* Leave Game */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              leaveGame();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Quitter la partie en cours
          </button>
        </div>
      </div>
    </div>
  );
};
