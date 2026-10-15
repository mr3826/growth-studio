import React, { useState, useEffect } from 'react';
import { Project, CreativeConcept, ProductTruthItem, CreativeProviderStatus } from '../types';
import {
  fetchCreativeStatus,
  generateCreativeConcepts,
  compileCreativeStoryboard,
  fetchCreativeUsage
} from '../api';
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  DollarSign,
  ArrowRight,
  Info
} from 'lucide-react';

interface ConceptComparisonModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onStoryboardCompiled: (updatedProject: Project) => void;
}

export const ConceptComparisonModal: React.FC<ConceptComparisonModalProps> = ({
  project,
  isOpen,
  onClose,
  onStoryboardCompiled
}) => {
  const [providerStatus, setProviderStatus] = useState<CreativeProviderStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'truth' | 'concepts'>('brief');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-6.1-sol');
  const [consentToOpenAi, setConsentToOpenAi] = useState(false);

  // Brief state
  const [brandName, setBrandName] = useState<string>(project.brand?.name || project.project?.clientOrProduct || '');
  const [category, setCategory] = useState<string>(project.creative?.category || '');
  const [audience, setAudience] = useState<string>(project.creative?.audience || '');
  const [problem, setProblem] = useState<string>(project.creative?.painPoint || '');
  const [keyMessage, setKeyMessage] = useState<string>(project.creative?.keyMessage || '');
  const [benefitsText, setBenefitsText] = useState<string>((project.creative?.benefits || []).join('\n'));
  const [language, setLanguage] = useState<string>(project.project?.language || 'en');
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [ctaLabel, setCtaLabel] = useState<string>(project.creative?.cta?.label || '');
  const [ctaDestination, setCtaDestination] = useState<string>(project.creative?.cta?.destination || '');

  // Product Truth Profile state
  const [truthItems, setTruthItems] = useState<ProductTruthItem[]>(
    project.creative?.productTruthProfile || []
  );

  // Concepts state
  const [concepts, setConcepts] = useState<CreativeConcept[]>(project.creative?.concepts || []);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [budgetUsage, setBudgetUsage] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCreativeStatus().then(st => {
        setProviderStatus(st);
        if (st.activeModel) setSelectedModel(st.activeModel);
      }).catch(console.error);
      setConsentToOpenAi(false);

      fetchCreativeUsage(project.project.id).then(setBudgetUsage).catch(() => {});
      if (project.creative?.concepts && project.creative.concepts.length > 0) {
        setConcepts(project.creative.concepts);
        setActiveTab('concepts');
      }
    }
  }, [isOpen, project.project.id]);

  if (!isOpen) return null;

  const handleAddTruthItem = () => {
    const newItem: ProductTruthItem = {
      id: `truth-${Date.now().toString(36)}`,
      category: 'feature',
      statement: '',
      verificationStatus: 'unknown',
      isApproved: false,
      notes: ''
    };
    setTruthItems([...truthItems, newItem]);
  };

  const handleRemoveTruthItem = (id: string) => {
    setTruthItems(truthItems.filter(item => item.id !== id));
  };

  const handleUpdateTruthItem = (id: string, updates: Partial<ProductTruthItem>) => {
    setTruthItems(truthItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleGenerateConcepts = async (forceRegenerate = false) => {
    setIsGenerating(true);
    setErrorMessage(null);

    const benefits = benefitsText.split('\n').map(b => b.trim()).filter(Boolean);
    const brief = {
      brandName,
      category,
      audience,
      problem,
      keyMessage,
      benefits,
      language,
      targetDuration,
      ctaLabel,
      ctaDestination,
      productTruthProfile: truthItems
    };

    try {
      const res = await generateCreativeConcepts(project.project.id, brief, selectedModel, consentToOpenAi, forceRegenerate);
      if (res.success && res.concepts) {
        setConcepts(res.concepts);
        setActiveTab('concepts');
        // Refresh usage
        fetchCreativeUsage(project.project.id).then(setBudgetUsage).catch(() => {});
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate concepts');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectConcept = async (conceptId: string) => {
    if (!consentToOpenAi) {
      setErrorMessage('Review and confirm the OpenAI data-sharing consent before building a storyboard.');
      return;
    }
    const replaceScenesConfirmed = (project.scenes || []).length === 0 || window.confirm('This will replace the current scene list with an editable storyboard draft. Approved scenes and their audio will be replaced. Continue?');
    if (!replaceScenesConfirmed) return;
    setIsCompiling(conceptId);
    setErrorMessage(null);
    try {
      const res = await compileCreativeStoryboard(project.project.id, conceptId, selectedModel, consentToOpenAi, replaceScenesConfirmed);
      if (res.success && res.project) {
        onStoryboardCompiled(res.project);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compile storyboard');
    } finally {
      setIsCompiling(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">OpenAI Creative Director</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  V0.03
                </span>
                {providerStatus?.configured ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Key configured · API not checked
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Offline / No Key
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Ground promotional concepts in verified product facts, then compile into editable video scenes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {budgetUsage && (
              <div className="text-right text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                <span className="text-slate-400">Project Spend: </span>
                <span className="font-mono font-bold text-amber-400">${budgetUsage.totalSpentUsd?.toFixed(4) || '0.0000'}</span>
                <span className="text-slate-500"> / ${budgetUsage.budgetCapUsd?.toFixed(2) || '1.00'}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/40">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('brief')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'brief'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>1. Creative Brief</span>
            </button>
            <button
              onClick={() => setActiveTab('truth')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'truth'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>2. Product Truth Profile</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {truthItems.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'concepts'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>3. 3 Advertising Concepts</span>
              {concepts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                  {concepts.length} Ready
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <label className="text-xs text-slate-400">Model:</label>
            <select
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-md px-2 py-1 outline-none focus:border-indigo-500"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {providerStatus?.models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: CREATIVE BRIEF */}
          {activeTab === 'brief' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Brand or Product Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={brandName}
                    placeholder="Enter the product or brand name"
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Category</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={category}
                    placeholder="e.g. E-Commerce Automation, B2B SaaS, Mobile FinTech"
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                  value={audience}
                  placeholder="e.g. Online store founders, Facebook page owners, operations managers"
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Problem / Core Pain Point</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                  value={problem}
                  placeholder="Describe the urgent problem your target audience suffers from daily..."
                  onChange={(e) => setProblem(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Key Value Message</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none font-medium"
                  value={keyMessage}
                  placeholder="The central promise of your product in one compelling sentence..."
                  onChange={(e) => setKeyMessage(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Key Benefits (One per line)</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none font-mono text-xs"
                  value={benefitsText}
                  placeholder="Feature 1 with tangible outcome&#10;Feature 2 with tangible outcome"
                  onChange={(e) => setBenefitsText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English (International)</option>
                    <option value="bn">Bangla (বাংলা প্রমোশনাল)</option>
                    <option value="mixed">Mixed (Bangla + English Tech Terms)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Duration</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value, 10))}
                  >
                    <option value={15}>15 seconds (Punchy Ad / Reel)</option>
                    <option value={30}>30 seconds (Standard Showcase)</option>
                    <option value={60}>60 seconds (Comprehensive Tour)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Call To Action Label</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={ctaLabel}
                    placeholder="e.g. Try EasyModerator Free"
                    onChange={(e) => setCtaLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('truth')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>Review Product Truth Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT TRUTH PROFILE */}
          {activeTab === 'truth' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <label className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
                <input type="checkbox" checked={consentToOpenAi} onChange={e => setConsentToOpenAi(e.target.checked)} className="mt-0.5 accent-amber-500" />
                <span><strong>Online — OpenAI.</strong> I approve sending the brief, truth statements, language, CTA, selected concept and scene text for the creative action. Project media files are not uploaded. Calls may incur usage charges; per-request caps are up to $0.15 for concepts and $0.20 for a storyboard, with a $${budgetUsage?.budgetCapUsd?.toFixed(2) || '1.00'} project cap.</span>
              </label>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-indigo-200">
                  <strong>Strict Claim Grounding:</strong> The OpenAI Creative Director is instructed to only feature claims with <span className="underline font-semibold">verified_live</span> or <span className="underline font-semibold">approved_demo</span> status. Unverified or planned features will not be hallucinated as production reality.
                </div>
              </div>

              <div className="space-y-3">
                {truthItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-start gap-3 transition hover:border-slate-700"
                  >
                    <span className="text-xs font-mono text-slate-500 w-6 text-center">#{index + 1}</span>

                    <div className="w-28 flex-shrink-0">
                      <select
                        className="w-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-2 py-1 outline-none"
                        value={item.category}
                        onChange={(e) => handleUpdateTruthItem(item.id, { category: e.target.value })}
                      >
                        <option value="feature">Feature</option>
                        <option value="integration">Integration</option>
                        <option value="metric">Metric</option>
                        <option value="policy">Policy / Security</option>
                      </select>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-indigo-500"
                        placeholder="Product fact or claim"
                        value={item.statement}
                        onChange={(e) => handleUpdateTruthItem(item.id, { statement: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-300 outline-none focus:border-indigo-500"
                        placeholder="Source or evidence details"
                        value={item.notes || ''}
                        onChange={e => handleUpdateTruthItem(item.id, { notes: e.target.value })}
                      />
                    </div>

                    <div className="w-36 flex-shrink-0 space-y-2">
                      <select
                        className={`w-full border text-[11px] font-semibold rounded px-2 py-1 outline-none ${
                          item.verificationStatus === 'verified_live'
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : item.verificationStatus === 'approved_demo'
                            ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}
                        value={item.verificationStatus}
                        onChange={(e: any) => handleUpdateTruthItem(item.id, { verificationStatus: e.target.value })}
                      >
                        <option value="verified_live">Verified Live</option>
                        <option value="approved_demo">Approved Demo</option>
                        <option value="planned">Planned Feature</option>
                        <option value="unknown">Unknown</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-slate-400">
                        <input type="checkbox" checked={Boolean(item.isApproved)} onChange={e => handleUpdateTruthItem(item.id, { isApproved: e.target.checked })} className="accent-emerald-500" />
                        Approved for marketing
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTruthItem(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Remove claim"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddTruthItem}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Verification Statement</span>
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('brief')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Back to Brief
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateConcepts}
                    disabled={isGenerating || !providerStatus?.configured || !consentToOpenAi}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>{isGenerating ? 'Synthesizing 3 Angles...' : 'Generate 3 Concepts with OpenAI'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3 CONCEPTS COMPARISON */}
          {activeTab === 'concepts' && (
            <div className="space-y-6">
              <label className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
                <input type="checkbox" checked={consentToOpenAi} onChange={e => setConsentToOpenAi(e.target.checked)} className="mt-0.5 accent-amber-500" />
                <span><strong>Online — OpenAI.</strong> Allow this request to send the selected concept, product brief, truth evidence and scene text. Project assets stay local. Per-request caps are up to $0.15 for concepts and $0.20 for a storyboard; project cap ${budgetUsage?.budgetCapUsd?.toFixed(2) || '1.00'}.</span>
              </label>
              {concepts.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Layers className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">No Concepts Generated Yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Fill out your Creative Brief and Product Truth Profile, then click Generate to create 3 distinct advertising angles.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateConcepts}
                    disabled={isGenerating || !providerStatus?.configured || !consentToOpenAi}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Concepts Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {concepts.map((concept, index) => {
                    const isSelected = project.creative?.selectedConceptId === concept.id;
                    const isCompilingThis = isCompiling === concept.id;

                    return (
                      <div
                        key={concept.id || index}
                        className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-slate-900/90 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Badge header */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Angle #{index + 1}: {concept.angleType.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {concept.suggestedDuration}s
                            </span>
                          </div>

                          {/* Title */}
                          <div>
                            <h3 className="text-base font-bold text-white leading-snug">
                              {concept.angleTitle}
                            </h3>
                            <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800/80 rounded-lg text-xs italic text-amber-300/90">
                              "{concept.hookText}"
                            </div>
                          </div>

                          {/* Problem / Solution treatment */}
                          <div className="text-xs text-slate-300 space-y-2">
                            <p className="line-clamp-3 text-slate-400">
                              <strong className="text-slate-200">Treatment: </strong>
                              {concept.treatment}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              <strong className="text-slate-300">Voice Tone: </strong>
                              {concept.voiceStyle}
                            </p>
                          </div>

                          {/* Scene outline beats */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Scene Flow ({concept.sceneOutline?.length || 0} beats)
                            </span>
                            <div className="space-y-1">
                              {(concept.sceneOutline || []).slice(0, 5).map((beat, bIdx) => (
                                <div key={bIdx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                                  <span className="text-indigo-400 font-mono font-bold">#{beat.sceneNumber}</span>
                                  <span className="capitalize font-medium text-slate-300">[{beat.role}]:</span>
                                  <span className="truncate">{beat.summary}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Factual boundary notes */}
                          {concept.riskNotes && (
                            <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px] text-amber-300/80">
                              <strong>Truth Boundary: </strong>{concept.riskNotes}
                            </div>
                          )}
                        </div>

                        {/* Action CTA */}
                        <div className="pt-6">
                          <button
                            onClick={() => handleSelectConcept(concept.id)}
                    disabled={Boolean(isCompiling) || !consentToOpenAi}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                              isSelected
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                            }`}
                          >
                            {isCompilingThis ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Compiling Storyboard Scenes...</span>
                              </>
                            ) : isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Active Concept (Recompile)</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Select Concept & Build Storyboard</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {concepts.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Want different creative ideas? You can regenerate concepts at any time.
                  </span>
                  <button
                    onClick={() => handleGenerateConcepts(true)}
                    disabled={isGenerating || !providerStatus?.configured || !consentToOpenAi}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate 3 Angles</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Template Target: <strong>{project.template?.id}</strong></span>
            <span>•</span>
            <span>Language: <strong>{project.project?.language?.toUpperCase()}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Continue in Manual Mode
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
