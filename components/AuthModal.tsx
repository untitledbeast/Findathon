'use client';

import React, { createContext, useContext, useState } from 'react';
import { X, Trophy, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AuthModalContextType {
  isOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  isOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openAuthModal = () => setIsOpen(true);
  const closeAuthModal = () => setIsOpen(false);

  return (
    <AuthModalContext.Provider value={{ isOpen, openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign In Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md p-8 rounded-3xl glass-card border border-purple-500/30 shadow-2xl space-y-6 text-center overflow-hidden animate-cascade"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top right close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="w-14 h-14 rounded-2xl aurora-border p-0.5 shadow-lg shadow-purple-900/50">
            <div className="w-full h-full bg-[#060816] rounded-[14px] flex items-center justify-center">
              <Trophy className="w-7 h-7 text-purple-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight glow-text">Join Findathon</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Sign in to save hackathons, submit events, and connect with the global developer community.
            </p>
          </div>
        </div>

        {/* Google Sign-in Button */}
        <div className="pt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {/* Google SVG G icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Small terms note */}
        <p className="text-[11px] text-slate-500 leading-relaxed">
          By signing in you agree to our <a href="#" className="underline text-purple-400 hover:text-purple-300">Terms of Service</a> & <a href="#" className="underline text-purple-400 hover:text-purple-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
