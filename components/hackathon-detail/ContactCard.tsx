'use client';

import React from 'react';
import { Mail, Phone } from 'lucide-react';

interface ContactCardProps {
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function ContactCard({ contactEmail, contactPhone }: ContactCardProps) {
  if (!contactEmail && !contactPhone) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-purple-900/30 space-y-3">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Organizer Contact</h4>
      {contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-purple-300 truncate"
        >
          <Mail className="w-4 h-4 text-purple-400 shrink-0" /> {contactEmail}
        </a>
      )}
      {contactPhone && (
        <a
          href={`https://wa.me/91${contactPhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:underline"
        >
          <Phone className="w-4 h-4 shrink-0" /> WhatsApp Support
        </a>
      )}
    </div>
  );
}
