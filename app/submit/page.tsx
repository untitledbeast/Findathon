'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { submitHackathon } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Globe,
  MapPin,
  Building2,
  Link2,
  Image as ImageIcon,
  Phone,
  Mail,
  User as UserIcon,
  MessageSquare,
  Check,
  Loader2,
  FileCode2
} from 'lucide-react';

function TwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

const AVAILABLE_TAGS = [
  'AI', 'Web3', 'Mobile', 'Cloud', 'HealthTech', 'FinTech',
  'GovTech', 'Open Source', 'ML', 'Blockchain', 'AR/VR',
  'IoT', 'Cybersecurity', 'Gaming', 'Social Impact'
];

const ELIGIBILITY_OPTIONS = [
  'Open to All', 'Students Only', 'Undergrads Only',
  'Professionals', 'School Students'
];

export default function SubmitPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form State with Lazy Initializer from storageService draft
  const [formData, setFormData] = useState(() => {
    const draft = storageService.getSubmitDraft() || {};
    return {
      title: draft.title || '',
      tagline: draft.tagline || '',
      description: draft.description || '',
      cover_image_url: draft.cover_image_url || '',
      tags: draft.tags || [],
      domain: draft.domain || '',
      start_date: draft.start_date || '',
      end_date: draft.end_date || '',
      registration_deadline: draft.registration_deadline || '',
      mode: draft.mode || 'Online',
      location_city: draft.location_city || '',
      location_college: draft.location_college || '',
      full_address: draft.full_address || '',
      prize_pool: draft.prize_pool || '',
      registration_fee: draft.registration_fee || 'Free',
      registration_fee_amount: draft.registration_fee_amount || '',
      solo_allowed: draft.solo_allowed ?? true,
      min_team_size: draft.min_team_size || 1,
      max_team_size: draft.max_team_size || 4,
      eligibility: draft.eligibility || ['Open to All'],
      requirements: draft.requirements || '',
      register_url: draft.register_url || '',
      contact_name: draft.contact_name || '',
      organization: draft.organization || '',
      contact_email: draft.contact_email || '',
      contact_phone: draft.contact_phone || '',
      social_twitter: draft.social_twitter || '',
      social_linkedin: draft.social_linkedin || '',
      social_discord: draft.social_discord || '',
      social_instagram: draft.social_instagram || '',
      confirm_accurate: false,
      confirm_contact: false
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (fields: Partial<typeof formData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...fields };
      storageService.setSubmitDraft(updated);
      return updated;
    });
  };

  // Field change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Tags toggle handler (max 5)
  const handleTagToggle = (tag: string) => {
    const current = formData.tags;
    if (current.includes(tag)) {
      updateFormData({ tags: current.filter(t => t !== tag) });
    } else {
      if (current.length >= 5) {
        setErrors(prev => ({ ...prev, tags: 'Maximum 5 tags allowed' }));
        return;
      }
      setErrors(prev => ({ ...prev, tags: '' }));
      updateFormData({ tags: [...current, tag] });
    }
  };

  // Eligibility toggle handler
  const handleEligibilityToggle = (item: string) => {
    const current = formData.eligibility;
    if (current.includes(item)) {
      updateFormData({ eligibility: current.filter(e => e !== item) });
    } else {
      updateFormData({ eligibility: [...current, item] });
    }
  };

  // STEP VALIDATIONS
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Hackathon title is required.';
      if (!formData.tagline.trim()) newErrors.tagline = 'Tagline is required.';
      if (!formData.description.trim()) newErrors.description = 'Full description is required.';
    }

    if (step === 2) {
      if (!formData.start_date) newErrors.start_date = 'Start date is required.';
      if (!formData.end_date) newErrors.end_date = 'End date is required.';
      if (!formData.registration_deadline) newErrors.registration_deadline = 'Registration deadline is required.';

      if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = 'End date must be on or after start date.';
      }
      if (formData.start_date && formData.registration_deadline && new Date(formData.registration_deadline) > new Date(formData.start_date)) {
        newErrors.registration_deadline = 'Deadline must be before or on start date.';
      }

      if (formData.mode !== 'Online') {
        if (!formData.location_city.trim()) newErrors.location_city = 'City is required for in-person / hybrid events.';
        if (!formData.location_college.trim()) newErrors.location_college = 'Venue name is required.';
        if (!formData.full_address.trim()) newErrors.full_address = 'Full address is required.';
      }

      if (formData.registration_fee === 'Paid' && !formData.registration_fee_amount.trim()) {
        newErrors.registration_fee_amount = 'Please enter fee amount.';
      }
    }

    if (step === 3) {
      if (!formData.register_url.trim()) newErrors.register_url = 'Registration URL is required.';
      if (formData.min_team_size > formData.max_team_size) {
        newErrors.min_team_size = 'Min team size cannot exceed max team size.';
      }
    }

    if (step === 4) {
      if (!formData.contact_name.trim()) newErrors.contact_name = 'Contact person name is required.';
      if (!formData.organization.trim()) newErrors.organization = 'Organization name is required.';
      if (!formData.contact_email.trim()) newErrors.contact_email = 'Official email is required.';
      if (!formData.contact_phone.trim()) newErrors.contact_phone = 'Phone number is required.';
      if (!formData.confirm_accurate) newErrors.confirm_accurate = 'You must confirm information accuracy.';
      if (!formData.confirm_contact) newErrors.confirm_contact = 'You must agree to verification contact.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4) || !user) return;

    setSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      tagline: formData.tagline.trim(),
      description: formData.description.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date,
      registration_deadline: formData.registration_deadline,
      is_online: formData.mode === 'Online',
      mode: formData.mode,
      location_city: formData.mode === 'Online' ? null : formData.location_city.trim(),
      location_college: formData.mode === 'Online' ? null : formData.location_college.trim(),
      full_address: formData.mode === 'Online' ? null : formData.full_address.trim(),
      tags: formData.tags.length > 0 ? formData.tags : ['General'],
      domain: formData.domain.trim() || null,
      prize_pool: formData.prize_pool.trim() || null,
      registration_fee: formData.registration_fee,
      registration_fee_amount: formData.registration_fee === 'Paid' ? formData.registration_fee_amount.trim() : null,
      min_team_size: formData.min_team_size,
      max_team_size: formData.max_team_size,
      solo_allowed: formData.solo_allowed,
      eligibility: formData.eligibility,
      requirements: formData.requirements.trim() || null,
      register_url: formData.register_url.trim(),
      organizer: formData.organization.trim(),
      organization: formData.organization.trim(),
      cover_image_url: formData.cover_image_url.trim() || null,
      contact_name: formData.contact_name.trim(),
      contact_email: formData.contact_email.trim(),
      contact_phone: formData.contact_phone.trim(),
      social_twitter: formData.social_twitter.trim() || null,
      social_linkedin: formData.social_linkedin.trim() || null,
      social_discord: formData.social_discord.trim() || null,
      social_instagram: formData.social_instagram.trim() || null,
      submitted_by: user.id,
      status: 'pending'
    };

    const res = await submitHackathon(payload);
    setSubmitting(false);

    if (res.success) {
      setSubmittedSuccess(true);
      storageService.clearSubmitDraft();
    } else {
      setErrors({ submit: res.error || 'Failed to submit hackathon. Please try again.' });
    }
  };

  const handleResetForm = () => {
    setSubmittedSuccess(false);
    setCurrentStep(1);
    setFormData({
      title: '', tagline: '', description: '', cover_image_url: '', tags: [], domain: '',
      start_date: '', end_date: '', registration_deadline: '', mode: 'Online',
      location_city: '', location_college: '', full_address: '', prize_pool: '',
      registration_fee: 'Free', registration_fee_amount: '', solo_allowed: true,
      min_team_size: 1, max_team_size: 4, eligibility: ['Open to All'], requirements: '',
      register_url: '', contact_name: profile?.full_name || '', organization: profile?.organization || '',
      contact_email: user?.email || '', contact_phone: profile?.phone || '',
      social_twitter: '', social_linkedin: '', social_discord: '', social_instagram: '',
      confirm_accurate: false, confirm_contact: false
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-between text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Protected route guard
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-between text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-20 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl">
            <FileCode2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Sign In to Submit a Hackathon</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Please sign in with Google to publish your event on Findathon and track review verification.
          </p>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all"
          >
            <span>Sign In with Google</span>
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // SUCCESS SCREEN WITH CSS CONFETTI
  if (submittedSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 text-center space-y-8 relative overflow-hidden">
          
          {/* CSS Confetti animation elements */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-10 left-1/4 w-3 h-3 bg-purple-500 rounded-full animate-bounce" />
            <div className="absolute top-20 right-1/4 w-4 h-4 bg-indigo-400 rotate-45 animate-pulse" />
            <div className="absolute top-16 left-10 w-2 h-4 bg-amber-400 animate-ping" />
            <div className="absolute top-24 right-10 w-3 h-3 bg-emerald-400 rounded-full animate-bounce" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-1 shadow-2xl shadow-purple-900/60">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white">🎉 Hackathon Submitted Successfully!</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Our team will review your submission within 24-48 hours. You will receive a confirmation update at <span className="text-purple-300 font-bold">{user.email}</span>.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/account?tab=submissions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xl"
              >
                <span>View My Submissions</span>
              </Link>

              <button
                onClick={handleResetForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-purple-900/40"
              >
                <span>Submit Another Hackathon</span>
              </button>
            </div>
          </div>

        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hackathons
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Hackathon Submission Wizard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Submit a <span className="text-gradient">Hackathon</span>
          </h1>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className={currentStep === 1 ? 'text-purple-400' : ''}>1. Event Info</span>
            <span className={currentStep === 2 ? 'text-purple-400' : ''}>2. Dates & Location</span>
            <span className={currentStep === 3 ? 'text-purple-400' : ''}>3. Team Rules</span>
            <span className={currentStep === 4 ? 'text-purple-400' : ''}>4. Organizer Contact</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-purple-900/30">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {errors.submit && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs font-semibold">{errors.submit}</p>
          </div>
        )}

        {/* MULTI-STEP FORM CONTAINER */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-purple-900/40 backdrop-blur-xl space-y-6 shadow-2xl">
          
          {/* STEP 1: ABOUT THE EVENT */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-purple-900/30 pb-3">
                <h3 className="text-lg font-bold text-white">Step 1 — About the Event</h3>
                <p className="text-xs text-slate-400">Basic title, tagline, description, and cover image.</p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200">
                    Hackathon Title <span className="text-purple-400">*</span>
                  </label>
                  <span className="text-slate-500">{formData.title.length}/100</span>
                </div>
                <input
                  type="text"
                  name="title"
                  maxLength={100}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Global AI Innovators Hackathon 2026"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.title && <p className="text-xs text-rose-400">{errors.title}</p>}
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200">
                    Tagline / Short Description <span className="text-purple-400">*</span>
                  </label>
                  <span className="text-slate-500">{formData.tagline.length}/150</span>
                </div>
                <input
                  type="text"
                  name="tagline"
                  maxLength={150}
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="e.g. Build next-gen LLM and Autonomous Agent applications"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.tagline && <p className="text-xs text-rose-400">{errors.tagline}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200">
                    Full Description <span className="text-purple-400">*</span>
                  </label>
                  <span className="text-slate-500">{formData.description.length}/1000</span>
                </div>
                <textarea
                  name="description"
                  rows={4}
                  maxLength={1000}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detail problem statements, eligibility criteria, schedule, and tracks..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.description && <p className="text-xs text-rose-400">{errors.description}</p>}
              </div>

              {/* Cover Image URL + Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Cover Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  <input
                    type="url"
                    name="cover_image_url"
                    value={formData.cover_image_url}
                    onChange={handleChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {formData.cover_image_url && (
                  <div className="mt-2 w-full h-36 rounded-2xl overflow-hidden bg-slate-950 border border-purple-900/40 relative">
                    <img
                      src={formData.cover_image_url}
                      alt="Preview thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              {/* Category Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200">
                    Category Tags (Select up to 5)
                  </label>
                  <span className="text-purple-400">{formData.tags.length}/5 selected</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_TAGS.map(tag => {
                    const isSelected = formData.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-purple-900/30 hover:border-purple-500/40'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
                {errors.tags && <p className="text-xs text-rose-400">{errors.tags}</p>}
              </div>

            </div>
          )}

          {/* STEP 2: DATE & LOCATION */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-purple-900/30 pb-3">
                <h3 className="text-lg font-bold text-white">Step 2 — Date & Location</h3>
                <p className="text-xs text-slate-400">Specify dates, deadline, format, and prize pool.</p>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Start Date <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {errors.start_date && <p className="text-xs text-rose-400">{errors.start_date}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    End Date <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {errors.end_date && <p className="text-xs text-rose-400">{errors.end_date}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Registration Deadline <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="registration_deadline"
                    value={formData.registration_deadline}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {errors.registration_deadline && <p className="text-xs text-rose-400">{errors.registration_deadline}</p>}
                </div>
              </div>

              {/* Mode Toggle (Online / Offline / Hybrid) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Event Format / Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Online', 'Offline', 'Hybrid'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateFormData({ mode: m })}
                      className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                        formData.mode === m
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-purple-900/30 hover:border-purple-500/40'
                      }`}
                    >
                      {m === 'Online' && <Globe className="w-4 h-4" />}
                      {m === 'Offline' && <MapPin className="w-4 h-4" />}
                      {m === 'Hybrid' && <Building2 className="w-4 h-4" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Offline / Hybrid Location inputs */}
              {formData.mode !== 'Online' && (
                <div className="space-y-4 pt-2 border-t border-purple-900/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">
                        City Location <span className="text-purple-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="location_city"
                        value={formData.location_city}
                        onChange={handleChange}
                        placeholder="e.g. San Francisco or Bengaluru"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {errors.location_city && <p className="text-xs text-rose-400">{errors.location_city}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">
                        College / Venue Name <span className="text-purple-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="location_college"
                        value={formData.location_college}
                        onChange={handleChange}
                        placeholder="e.g. Stanford University Auditorium"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {errors.location_college && <p className="text-xs text-rose-400">{errors.location_college}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      Full Venue Address <span className="text-purple-400">*</span>
                    </label>
                    <textarea
                      name="full_address"
                      rows={2}
                      value={formData.full_address}
                      onChange={handleChange}
                      placeholder="e.g. 450 Jane Stanford Way, Stanford, CA 94305"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {errors.full_address && <p className="text-xs text-rose-400">{errors.full_address}</p>}
                  </div>
                </div>
              )}

              {/* Prize Pool & Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Prize Pool (Optional)
                  </label>
                  <input
                    type="text"
                    name="prize_pool"
                    value={formData.prize_pool}
                    onChange={handleChange}
                    placeholder="e.g. $50,000 or ₹5,00,000"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Registration Fee
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateFormData({ registration_fee: 'Free', registration_fee_amount: '' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                        formData.registration_fee === 'Free'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-950 text-slate-400 border-purple-900/30'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFormData({ registration_fee: 'Paid' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                        formData.registration_fee === 'Paid'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-950 text-slate-400 border-purple-900/30'
                      }`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {formData.registration_fee === 'Paid' && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      Fee Amount <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="registration_fee_amount"
                      value={formData.registration_fee_amount}
                      onChange={handleChange}
                      placeholder="e.g. ₹200 per team"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {errors.registration_fee_amount && <p className="text-xs text-rose-400">{errors.registration_fee_amount}</p>}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* STEP 3: TEAM REQUIREMENTS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-purple-900/30 pb-3">
                <h3 className="text-lg font-bold text-white">Step 3 — Team Requirements</h3>
                <p className="text-xs text-slate-400">Team sizes, eligibility criteria, and registration link.</p>
              </div>

              {/* Solo Allowed Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-purple-900/30">
                <div>
                  <h4 className="text-xs font-bold text-white">Allow Solo Participation?</h4>
                  <p className="text-[11px] text-slate-400">Can hackers participate as individual solo builders?</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateFormData({ solo_allowed: !formData.solo_allowed })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.solo_allowed
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-900 text-slate-400 border-purple-900/30'
                  }`}
                >
                  {formData.solo_allowed ? 'Yes (Solo Allowed)' : 'No (Team Only)'}
                </button>
              </div>

              {/* Team Size Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Minimum Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    name="min_team_size"
                    value={formData.min_team_size}
                    onChange={(e) => updateFormData({ min_team_size: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {errors.min_team_size && <p className="text-xs text-rose-400">{errors.min_team_size}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Maximum Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    name="max_team_size"
                    value={formData.max_team_size}
                    onChange={(e) => updateFormData({ max_team_size: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Eligibility Checkboxes */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Eligibility Criteria
                </label>
                <div className="flex flex-wrap gap-2">
                  {ELIGIBILITY_OPTIONS.map(opt => {
                    const isSelected = formData.eligibility.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleEligibilityToggle(opt)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-purple-900/30'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Additional Requirements */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200">Additional Requirements (Optional)</label>
                  <span className="text-slate-500">{formData.requirements.length}/300</span>
                </div>
                <textarea
                  name="requirements"
                  rows={2}
                  maxLength={300}
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="e.g. Participants must bring their own laptop and college ID card."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Registration Link */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Official Registration Link / Website URL <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  <input
                    type="url"
                    name="register_url"
                    value={formData.register_url}
                    onChange={handleChange}
                    placeholder="https://devpost.com/hackathon-xyz or official site"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {errors.register_url && <p className="text-xs text-rose-400">{errors.register_url}</p>}
              </div>

            </div>
          )}

          {/* STEP 4: ORGANIZER CONTACT DETAILS */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-purple-900/30 pb-3">
                <h3 className="text-lg font-bold text-white">Step 4 — Contact Details & Authorization</h3>
                <p className="text-xs text-slate-400">These details help us verify your event and allow participants to reach you.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Contact Person Name <span className="text-purple-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      placeholder="Full name of organizer"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {errors.contact_name && <p className="text-xs text-rose-400">{errors.contact_name}</p>}
                </div>

                {/* Organization Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Organization / College Name <span className="text-purple-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      placeholder="e.g. Stanford AI Club"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {errors.organization && <p className="text-xs text-rose-400">{errors.organization}</p>}
                </div>

                {/* Official Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Official Email <span className="text-purple-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      placeholder="organizer@college.edu"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {errors.contact_email && <p className="text-xs text-rose-400">{errors.contact_email}</p>}
                </div>

                {/* WhatsApp / Phone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Phone / WhatsApp Number <span className="text-purple-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  {errors.contact_phone && <p className="text-xs text-rose-400">{errors.contact_phone}</p>}
                </div>
              </div>

              {/* Social Links for Queries */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Social Channels for Participant Queries (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-400">
                      <TwitterIcon />
                    </div>
                    <input
                      type="text"
                      name="social_twitter"
                      value={formData.social_twitter}
                      onChange={handleChange}
                      placeholder="Twitter/X handle"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-400">
                      <LinkedinIcon />
                    </div>
                    <input
                      type="text"
                      name="social_linkedin"
                      value={formData.social_linkedin}
                      onChange={handleChange}
                      placeholder="LinkedIn URL"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      name="social_discord"
                      value={formData.social_discord}
                      onChange={handleChange}
                      placeholder="Discord username or invite"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-400">
                      <InstagramIcon />
                    </div>
                    <input
                      type="text"
                      name="social_instagram"
                      value={formData.social_instagram}
                      onChange={handleChange}
                      placeholder="Instagram handle"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Confirmations */}
              <div className="space-y-3 pt-4 border-t border-purple-900/30">
                <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.confirm_accurate}
                    onChange={(e) => updateFormData({ confirm_accurate: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-950 border-purple-900/40"
                  />
                  <span>
                    I confirm all information provided is accurate and I am authorized to post this event. <span className="text-purple-400">*</span>
                  </span>
                </label>
                {errors.confirm_accurate && <p className="text-xs text-rose-400">{errors.confirm_accurate}</p>}

                <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.confirm_contact}
                    onChange={(e) => updateFormData({ confirm_contact: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-950 border-purple-900/40"
                  />
                  <span>
                    I agree that Findathon team may contact me for verification purposes. <span className="text-purple-400">*</span>
                  </span>
                </label>
                {errors.confirm_contact && <p className="text-xs text-rose-400">{errors.confirm_contact}</p>}
              </div>

            </div>
          )}

          {/* NAV CONTROLS */}
          <div className="pt-6 border-t border-purple-900/30 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-900 text-slate-300 border border-purple-900/40"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 ml-auto"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/50 disabled:opacity-50 ml-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing to Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Hackathon</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

        </form>

      </main>

      <Footer />
    </div>
  );
}
