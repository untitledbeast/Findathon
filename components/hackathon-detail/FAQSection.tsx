'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQSectionProps {
  faq: { question: string; answer: string }[];
}

export function FAQSection({ faq }: FAQSectionProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  if (!faq || faq.length === 0) return null;

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-purple-400" /> Frequently Asked Questions
      </h3>

      <div className="space-y-3">
        {faq.map((item, idx) => (
          <div key={idx} className="rounded-2xl glass-card border border-purple-900/30 overflow-hidden">
            <button
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              className="w-full p-4 text-left flex items-center justify-between text-sm font-bold text-white hover:text-purple-300"
            >
              <span>{item.question}</span>
              {activeFaq === idx ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {activeFaq === idx && (
              <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-purple-900/20 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
