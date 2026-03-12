import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { LogIn, UserCircle, Sparkles, Fingerprint, Loader2, AlertCircle, ArrowRightCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import BrandedLogo from './BrandedLogo';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const GOOGLE_CLIENT_ID = '482285261060-4rv2jmv94794rg129lejgk1iij13d6oh.apps.googleusercontent.com';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGsi = () => {
      try {
        if (!(window as any).google) return;
        
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file openid profile email',
          callback: async (response: any) => {
            if (response.error) {
              setLoading(false);
              setAuthStatus('Handshake Interrupted');
              setError(`Auth Error: ${response.error_description || response.error}`);
              return;
            }

            setAuthStatus('Synchronizing Neural Identity...');
            try {
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const userInfo = await userInfoResponse.json();

              onLogin({
                id: userInfo.sub,
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.picture,
                accessToken: response.access_token
              });
            } catch (err) {
              setAuthStatus('Handshake Failure');
              setError('Failed to fetch user profile from Google.');
              setLoading(false);
            }
          },
        });
        setTokenClient(client);
      } catch (err) {
        console.error("GSI Init Error:", err);
      }
    };

    const scriptCheck = setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        initGsi();
        clearInterval(scriptCheck);
      }
    }, 100);

    return () => clearInterval(scriptCheck);
  }, [onLogin]);

  const handleGoogleSignIn = () => {
    setError(null);
    if (!tokenClient) {
      setAuthStatus('Identity Engine Offline. Retrying...');
      return;
    }
    triggerHaptic(20);
    setLoading(true);
    setAuthStatus('Opening Secure Gateway...');
    tokenClient.requestAccessToken();
  };

  const handleGuestSignIn = () => {
    setError(null);
    triggerHaptic();
    setGuestLoading(true);
    setAuthStatus('Initializing Local Sandbox...');
    
    setTimeout(() => {
      onLogin({
        id: 'guest-' + Math.random().toString(36).substring(7),
        name: 'Guest User',
        email: 'guest@local.host',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      });
      setGuestLoading(false);
    }, 1200);
  };

  const buttonBaseClass = "group w-full bg-white text-slate-950 font-black py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-[0_15px_40px_-10px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all duration-300 uppercase tracking-[0.2em] text-[11px]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-700">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-8 z-10 animate-slide-up">
        
        {/* GROUPED LOGO AND TITLE */}
        <div className="flex flex-col items-center w-full -space-y-4">
          {/* ANIMATED BRIEFCASE & COINS */}
          <div className="relative group h-44 flex items-center justify-center w-full">
            <div className="absolute inset-0 bg-yellow-400/5 blur-[80px] rounded-full scale-75 opacity-40"></div>
            <BrandedLogo size="lg" variant="gold" />
            <div className="absolute top-4 right-14 bg-yellow-500 p-1.5 rounded-xl shadow-xl animate-bounce-slow z-30 border border-yellow-400/50">
              <Sparkles size={14} className="text-white" />
            </div>
          </div>
          
          {/* Title & Vision */}
          <div className="text-center w-full space-y-4 px-4 pt-4">
            <div className="space-y-1">
              <h1 className="text-5xl font-black italic tracking-tighter text-white leading-none">
                Just<span className="text-yellow-500">Keep</span>
              </h1>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] opacity-80">The Wealth Protocol</p>
            </div>

            <p className="text-slate-400 text-sm font-bold leading-relaxed italic max-w-[260px] mx-auto">
              "Small, consistent choices to <span className="text-white not-italic">"just keep it"</span> compound into lasting wealth."
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 px-4">
          {loading || guestLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 h-[140px] bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-xl">
               <Loader2 className="text-yellow-500 animate-spin" size={32} />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{authStatus}</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogleSignIn}
                className={buttonBaseClass}
              >
                <LogIn size={18} strokeWidth={3} />
                Secure Login
              </button>

              <button
                onClick={handleGuestSignIn}
                className={buttonBaseClass}
              >
                <UserCircle size={18} strokeWidth={3} />
                Guest Sandbox
              </button>
            </>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-[24px] flex items-start gap-3 animate-kick">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-slate-400 leading-tight">{error}</p>
            </div>
          )}
        </div>

        {/* Scaled-down footer build info */}
        <div className="flex items-center gap-3 opacity-30 pt-4">
          <Fingerprint size={14} className="text-yellow-500" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Build 1.2.2 • V1 Stable</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;