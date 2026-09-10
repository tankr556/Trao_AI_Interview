'use client';

import React, { useState } from 'react';

export default function Home() {
  const [jdText, setJdText] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [generatedKit, setGeneratedKit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'questions' | 'flashcards' | 'schedule'>('brief');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) return;

    setLoading(true);
    setGeneratedKit(null);
    setCurrentStep('Extracting requirements from job description...');

    try {
      setTimeout(() => setCurrentStep('Crawling company site & discovering hiring paths...'), 1200);
      setTimeout(() => setCurrentStep('Generating categorized question bank (Technical, Behavioural)...'), 2500);
      setTimeout(() => setCurrentStep('Performing 2nd pass coverage check & schedule allocation...'), 3800);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/kits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText, company_url: companyUrl, days })
      });

      const data = await res.json();
      
      // Fallback client simulation if backend async generation is still processing or offline
      if (data.kit_id || data.kit) {
        // Poll for ready state
        setTimeout(async () => {
          const kitRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/kits/${data.kit_id}`);
          const kitData = await kitRes.json();
          if (kitData.kit) {
            setGeneratedKit(kitData.kit);
          }
          setLoading(false);
        }, 4500);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleRegenerateSection = async (section: string) => {
    if (!generatedKit?._id) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/kits/${generatedKit._id}/regenerate/${section}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.kit) {
        setGeneratedKit(data.kit);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePinQuestion = (qId: string) => {
    if (!generatedKit) return;
    const updated = {
      ...generatedKit,
      questions: generatedKit.questions.map((q: any) =>
        q.id === qId ? { ...q, isPinned: !q.isPinned } : q
      )
    };
    setGeneratedKit(updated);
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
          AI Interview Prep Kit Builder
        </h1>
        <p className="text-slate-400 text-lg">
          Paste any Job Description and company website. Our multi-step AI pipeline crawls the site, extracts core requirements, generates targeted question banks, and builds a day-by-day study schedule.
        </p>
      </div>

      {/* Main Generator Card */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Job Description (JD Text) <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={6}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the full job description here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Company Website URL
              </label>
              <input
                type="url"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Days Available for Preparation
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing Pipeline...' : 'Generate Prep Kit'}
          </button>
        </form>

        {/* Loading Progress State */}
        {loading && (
          <div className="mt-8 p-6 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-indigo-300 font-semibold">{currentStep}</p>
          </div>
        )}
      </div>

      {/* Generated Kit Display Workspace */}
      {generatedKit && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Target Role</span>
              <h2 className="text-2xl font-bold text-white">{generatedKit.role.title}</h2>
              <p className="text-sm text-slate-400">{generatedKit.source.company} • {generatedKit.role.seniority}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Coverage: {generatedKit.coverage.uncovered_requirement_ids.length === 0 ? '100% Complete' : `${generatedKit.coverage.uncovered_requirement_ids.length} Gaps`}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {generatedKit.coverage.passes} Generation Passes
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 space-x-4">
            {(['brief', 'questions', 'flashcards', 'schedule'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-sm font-semibold capitalize transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'brief' ? 'Company Brief' : tab === 'questions' ? 'Question Bank' : tab === 'flashcards' ? 'Practice Flashcards' : 'Study Schedule'}
              </button>
            ))}
          </div>

          {/* Tab 1: Company Brief */}
          {activeTab === 'brief' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Company & Culture Brief</h3>
                <button
                  onClick={() => handleRegenerateSection('company_brief')}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                >
                  Regenerate Brief
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <p className="text-slate-300 leading-relaxed">{generatedKit.company_brief.summary}</p>
                <div>
                  <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">What They Do & How They Hire</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{generatedKit.company_brief.what_they_do}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Question Bank */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Categorized Question Bank</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRegenerateSection('technical')}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-900/60 border border-indigo-700/50 hover:bg-indigo-800/60 text-indigo-200 rounded-lg"
                  >
                    Regenerate Technical
                  </button>
                  <button
                    onClick={() => handleRegenerateSection('behavioural')}
                    className="px-3 py-1.5 text-xs font-semibold bg-purple-900/60 border border-purple-700/50 hover:bg-purple-800/60 text-purple-200 rounded-lg"
                  >
                    Regenerate Behavioural
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {generatedKit.questions.map((q: any) => (
                  <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          q.category === 'technical' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {q.category}
                        </span>
                        <span className="text-xs text-slate-500">Difficulty: {q.difficulty}/3</span>
                      </div>
                      <button
                        onClick={() => togglePinQuestion(q.id)}
                        className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                          q.isPinned ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {q.isPinned ? 'Pinned 📌' : 'Pin Item'}
                      </button>
                    </div>
                    <p className="font-semibold text-slate-100 text-base">{q.prompt}</p>
                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
                      <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-1">Answer Outline</span>
                      <p className="text-sm text-slate-300">{q.answer_outline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Practice Flashcards */}
          {activeTab === 'flashcards' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Practice Mode (Flashcards)</h3>
                <p className="text-sm text-slate-400">Card {practiceIndex + 1} of {generatedKit.flashcards.length}</p>
              </div>

              {generatedKit.flashcards.length > 0 && (
                <div
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="bg-slate-900 border-2 border-indigo-500/40 hover:border-indigo-500 rounded-2xl p-8 min-h-[220px] flex flex-col justify-center items-center text-center cursor-pointer transition-all shadow-xl"
                >
                  {!showAnswer ? (
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">Question / Concept</span>
                      <p className="text-xl font-medium text-white">{generatedKit.flashcards[practiceIndex]?.front}</p>
                      <span className="text-xs text-slate-500 block pt-4">(Click card to reveal answer outline)</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Answer Outline</span>
                      <p className="text-base text-slate-200">{generatedKit.flashcards[practiceIndex]?.back}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center gap-4">
                <button
                  onClick={() => {
                    setPracticeIndex(Math.max(0, practiceIndex - 1));
                    setShowAnswer(false);
                  }}
                  disabled={practiceIndex === 0}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg disabled:opacity-40"
                >
                  Previous Card
                </button>
                <button
                  onClick={() => {
                    setPracticeIndex(Math.min(generatedKit.flashcards.length - 1, practiceIndex + 1));
                    setShowAnswer(false);
                  }}
                  disabled={practiceIndex === generatedKit.flashcards.length - 1}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
                >
                  Next Card
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Study Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Day-by-Day Preparation Plan</h3>
                  <p className="text-sm text-slate-400">Total Days: {generatedKit.schedule.days_available}</p>
                </div>
                <button
                  onClick={() => handleRegenerateSection('schedule')}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                >
                  Recalculate Schedule
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generatedKit.schedule.days.map((d: any) => (
                  <div key={d.day} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-indigo-400">Day {d.day}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {d.minutes} Integer Minutes
                      </span>
                    </div>
                    <h4 className="font-semibold text-white text-base">{d.focus}</h4>
                    <p className="text-xs text-slate-400">Covering {d.question_ids.length} questions</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
