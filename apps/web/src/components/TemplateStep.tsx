import React from 'react';
import { Project } from '../types';
import { LayoutTemplate, Sparkles, Smartphone, Monitor, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface TemplateStepProps {
  project: Project;
  onChange: (updated: Project) => void;
  onBack: () => void;
  onNext: () => void;
}

export const TemplateStep: React.FC<TemplateStepProps> = ({
  project,
  onChange,
  onBack,
  onNext
}) => {
  const currentTemplateId = project.template?.id || 'guided_product_story';

  const templates = [
    {
      id: 'guided_product_story',
      title: 'Guided Product Story (Hero Reference)',
      badge: 'HERO SPEC',
      description: 'Reference-inspired editorial storytelling with Bengali & English kinetic typography, highlighted words, multi-chapter pacing, layered phone/browser mockups, and animated callout pins.',
      accent: '#CCFF00',
      features: ['Warm Editorial Cream or Dark Theme', 'Bengali Grapheme-Safe Type', 'Phone & Browser Mockups', 'Multi-Chapter Pacing']
    },
    {
      id: 'bold_kinetic',
      title: 'Bold Kinetic Typography',
      badge: 'PUNCHY PROMO',
      description: 'High-impact kinetic typography with giant staggered words, vibrant highlights, and strong promotional punch for short-form hooks and announcements.',
      accent: '#F4C35E',
      features: ['Oversized Staggered Reveal', 'Vibrant Glowing Gradients', 'High Contrast CTA Outro', 'Fast Paced Cuts']
    },
    {
      id: 'app_showcase',
      title: 'App & Product Showcase',
      badge: 'UI DEMO',
      description: 'Dedicated UI demonstration template showcasing mobile apps and web platforms with clean device framing, focus zoom, pan, screenshot layers, and pinpoint callouts.',
      accent: '#38BDF8',
      features: ['Realistic Mobile Frame', 'Desktop Browser Window', 'Pinpoint Radar Callouts', 'Camera Zoom & Pan Motion']
    }
  ];

  const handleSelectTemplate = (id: string) => {
    const updated = {
      ...project,
      template: {
        ...project.template,
        id
      }
    };

    // If switching to guided_product_story, set reference editorial palette defaults
    if (id === 'guided_product_story' && project.brand.backgroundColor === '#17223B') {
      updated.brand = {
        ...updated.brand,
        backgroundColor: '#F9F9F6',
        primaryColor: '#18181B',
        textColor: '#18181B',
        accentColor: '#CCFF00'
      };
    }

    onChange(updated);
  };

  const currentTargetIds = (project.targets || []).map(t => t.id);

  const toggleTarget = (targetId: string, defaultW: number, defaultH: number, defaultFps: number) => {
    let targets = [...(project.targets || [])];
    const exists = targets.some(t => t.id === targetId);

    if (exists) {
      if (targets.length <= 1) {
        alert('You must have at least one export target configured.');
        return;
      }
      targets = targets.filter(t => t.id !== targetId);
    } else {
      targets.push({
        id: targetId,
        width: defaultW,
        height: defaultH,
        fps: defaultFps,
        safeMarginPercent: targetId === 'portrait_4_5' ? 8 : (targetId === 'landscape' ? 7 : 9),
        fitMode: 'reflow'
      });
    }

    onChange({
      ...project,
      targets
    });
  };

  return (
    <div className="step-container template-step-view">
      <div className="step-header">
        <h2 className="step-title">Step 2: Choose Template Archetype & Targets</h2>
        <p className="step-subtitle">
          Select the structural grammar for your video and configure export aspect ratios.
        </p>
      </div>

      <div className="templates-cards-grid">
        {templates.map(t => {
          const isSelected = currentTemplateId === t.id;
          return (
            <div
              key={t.id}
              onClick={() => handleSelectTemplate(t.id)}
              className={`template-selection-card ${isSelected ? 'selected' : ''}`}
              style={{ borderColor: isSelected ? t.accent : undefined }}
            >
              <div className="template-card-top">
                <span className="template-badge-pill" style={{ background: `${t.accent}20`, color: t.accent }}>
                  {t.badge}
                </span>
                {isSelected && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              </div>
              <h3 className="template-card-title">{t.title}</h3>
              <p className="template-card-desc">{t.description}</p>
              <ul className="template-card-features">
                {t.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="target-selection-section mt-8">
        <h3 className="section-title">Enabled Export Aspect Ratios</h3>
        <p className="section-subtitle">Growth Studio reflows scenes responsively for each selected output.</p>

        <div className="targets-grid">
          <div
            onClick={() => toggleTarget('portrait_4_5', 1080, 1350, 25)}
            className={`target-option-box ${currentTargetIds.includes('portrait_4_5') ? 'active' : ''}`}
          >
            <div className="target-aspect-ratio-preview ar-4-5">4:5</div>
            <div className="target-details">
              <strong>4:5 Portrait (Reference Standard)</strong>
              <span>1080 × 1350 @ 25 FPS</span>
              <small className="text-emerald-400">Exact match for reference video grammar</small>
            </div>
            <input
              type="checkbox"
              checked={currentTargetIds.includes('portrait_4_5')}
              readOnly
              className="target-checkbox"
            />
          </div>

          <div
            onClick={() => toggleTarget('portrait', 1080, 1920, 30)}
            className={`target-option-box ${currentTargetIds.includes('portrait') ? 'active' : ''}`}
          >
            <div className="target-aspect-ratio-preview ar-9-16">9:16</div>
            <div className="target-details">
              <strong>9:16 Vertical Reel</strong>
              <span>1080 × 1920 @ 30 FPS</span>
              <small className="text-slate-400">TikTok, Instagram Reels & YouTube Shorts</small>
            </div>
            <input
              type="checkbox"
              checked={currentTargetIds.includes('portrait')}
              readOnly
              className="target-checkbox"
            />
          </div>

          <div
            onClick={() => toggleTarget('landscape', 1920, 1080, 30)}
            className={`target-option-box ${currentTargetIds.includes('landscape') ? 'active' : ''}`}
          >
            <div className="target-aspect-ratio-preview ar-16-9">16:9</div>
            <div className="target-details">
              <strong>16:9 Widescreen</strong>
              <span>1920 × 1080 @ 30 FPS</span>
              <small className="text-slate-400">YouTube, Website Heroes & Presentations</small>
            </div>
            <input
              type="checkbox"
              checked={currentTargetIds.includes('landscape')}
              readOnly
              className="target-checkbox"
            />
          </div>
        </div>
      </div>

      <div className="step-navigation-bar">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Projects</span>
        </button>
        <button onClick={onNext} className="btn-primary">
          <span>Next: Storyboard & Chapters</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
