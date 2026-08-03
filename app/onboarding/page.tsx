'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { profileApi } from '@/lib/modules/profile/api/profile';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Sparkles, ArrowRight, Check, Code, Shield, Cloud, Smartphone, Cpu, Palette, Globe } from 'lucide-react';

const TECH_INTERESTS = [
  { id: 'ai', name: 'Artificial Intelligence & ML', icon: Cpu },
  { id: 'web3', name: 'Web3 & Blockchain', icon: Shield },
  { id: 'cloud', name: 'Cloud Native & DevOps', icon: Cloud },
  { id: 'mobile', name: 'Mobile Apps', icon: Smartphone },
  { id: 'frontend', name: 'Frontend & Design', icon: Palette },
  { id: 'backend', name: 'Backend Systems', icon: Code },
  { id: 'open_source', name: 'Open Source', icon: Globe },
];

const SKILL_OPTIONS = [
  'React / Next.js',
  'Node.js / Express',
  'Python / FastApi',
  'Solidity / Smart Contracts',
  'Tailwind CSS',
  'PostgreSQL / Supabase',
  'Flutter / React Native',
  'UI/UX Design',
];

const GOAL_OPTIONS = [
  'Learn new technologies',
  'Build cool side projects',
  'Win prize money',
  'Network with developers',
  'Find job opportunities',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(() => profile?.full_name || (profile as any)?.fullName || user?.email?.split('@')[0] || '');
  const [username, setUsername] = useState(() => (profile?.full_name || (profile as any)?.fullName || user?.email?.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [university, setUniversity] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least 1 interest to continue');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await profileApi.updateProfile({
        fullName,
        organization: university,
        interests: selectedInterests,
        skills: selectedSkills,
        isFirstLogin: false,
        onboardingComplete: true
      });
      await refreshProfile();
      router.push('/account?welcome=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="max-w-xl w-full glass-card p-8 rounded-3xl border border-purple-900/30 shadow-2xl relative overflow-hidden">
          
          {/* STEP PROGRESS INDICATOR */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-purple-900/20">
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step === num
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-400/50'
                      : step > num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'glass-card text-slate-500 border-purple-900/30'
                  }`}
                >
                  {step > num ? <Check className="w-4 h-4" /> : num}
                </div>
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-400">Step {step} of 3</span>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Welcome to Findathon
                </div>
                <h1 className="text-2xl font-black text-white">Let&apos;s build your developer identity</h1>
                <p className="text-xs text-slate-400 mt-1">This is how hackathon organizers and teammates will see you.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Sagar Gupta"
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-xs text-slate-500 font-mono">findathon.com/</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      className="w-full pl-32 pr-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: INTERESTS */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">What technologies excite you?</h1>
                <p className="text-xs text-slate-400 mt-1">Select topics to personalize your hackathon recommendations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TECH_INTERESTS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleInterest(item.id)}
                      className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-500/10'
                          : 'glass-card border-purple-900/30 text-slate-300 hover:border-purple-800'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-600 text-white' : 'glass-card text-purple-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold">{item.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-5 rounded-xl glass-card text-slate-400 font-bold text-xs hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep2}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BACKGROUND */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">Your Background & Goals</h1>
                <p className="text-xs text-slate-400 mt-1">Help teammates find you for team building.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">University / Organization</label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. Stanford University or Independent"
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Primary Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">I&apos;m looking to...</label>
                  <div className="space-y-2">
                    {GOAL_OPTIONS.map((goal) => {
                      const isSelected = selectedGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleGoal(goal)}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-white'
                              : 'glass-card border-purple-900/30 text-slate-300 hover:border-purple-800'
                          }`}
                        >
                          {goal}
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-5 rounded-xl glass-card text-slate-400 font-bold text-xs hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinish}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Finishing Setup...' : 'Finish Setup 🎉'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
