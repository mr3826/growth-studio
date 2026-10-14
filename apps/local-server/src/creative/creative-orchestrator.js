import fs from 'node:fs';
import path from 'node:path';
import { OpenAiCreativeProvider } from './creative-provider.js';
import { AiUsageRecorder } from './usage-recorder.js';
import { getTemplate } from '@kinetic-studio/template-engine';

export class CreativeOrchestrator {
  constructor({ storagePaths, provider = null } = {}) {
    this.storagePaths = storagePaths;
    this.usageRecorder = new AiUsageRecorder(storagePaths.root);
    this.provider = provider || new OpenAiCreativeProvider({ usageRecorder: this.usageRecorder });
  }

  getStatus() {
    return this.provider && typeof this.provider.getStatus === 'function'
      ? this.provider.getStatus()
      : { configured: false, offline: true, provider: 'openai', models: [] };
  }

  _getProjectDir(projectId) {
    const safeId = path.basename(projectId);
    return path.join(this.storagePaths.projects, safeId);
  }

  _loadProject(projectId) {
    const projDir = this._getProjectDir(projectId);
    const projFile = path.join(projDir, 'project.json');
    if (!fs.existsSync(projFile)) {
      throw new Error(`Project '${projectId}' not found`);
    }
    return JSON.parse(fs.readFileSync(projFile, 'utf8'));
  }

  _saveProject(projectId, project) {
    const projDir = this._getProjectDir(projectId);
    if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });
    const projFile = path.join(projDir, 'project.json');
    fs.writeFileSync(projFile, JSON.stringify(project, null, 2), 'utf8');
  }

  saveRevision(projectId, note = 'Draft update') {
    const project = this._loadProject(projectId);
    const projDir = this._getProjectDir(projectId);
    const histFile = path.join(projDir, 'creative-history.json');
    let history = [];
    if (fs.existsSync(histFile)) {
      try {
        history = JSON.parse(fs.readFileSync(histFile, 'utf8'));
      } catch (_) {}
    }

    const entry = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      note,
      conceptId: project.creative?.selectedConceptId || null,
      sceneCount: (project.scenes || []).length,
      scenes: (project.scenes || []).map(s => ({
        id: s.id,
        headline: s.headline,
        narrationText: s.narrationText,
        isApproved: Boolean(s.isApproved)
      }))
    };

    history.unshift(entry);
    if (history.length > 25) history = history.slice(0, 25);
    fs.writeFileSync(histFile, JSON.stringify(history, null, 2), 'utf8');

    return entry;
  }

  getHistory(projectId) {
    const projDir = this._getProjectDir(projectId);
    const histFile = path.join(projDir, 'creative-history.json');
    if (fs.existsSync(histFile)) {
      try {
        return JSON.parse(fs.readFileSync(histFile, 'utf8'));
      } catch (_) {}
    }
    return [];
  }

  async developConcepts(projectId, customBrief = {}, options = {}) {
    const project = this._loadProject(projectId);
    const availableAssetIds = (project.assets || []).map(a => a.id);

    const mergedBrief = {
      projectId,
      brandName: customBrief.brandName || project.brand?.name || project.project?.clientOrProduct || 'My Brand',
      category: customBrief.category || project.creative?.category || 'SaaS / Web App',
      audience: customBrief.audience || project.creative?.audience || 'Modern Teams',
      problem: customBrief.problem || project.creative?.painPoint || 'Customer frustration',
      keyMessage: customBrief.keyMessage || project.creative?.keyMessage || 'Fast, automated solution',
      benefits: customBrief.benefits || project.creative?.benefits || [project.creative?.keyMessage].filter(Boolean),
      language: customBrief.language || project.project?.language || 'en',
      targetDuration: customBrief.targetDuration || 30,
      communicationGoal: customBrief.communicationGoal || project.creative?.objective || 'awareness',
      funnelStage: customBrief.funnelStage || 'top_of_funnel',
      ctaLabel: customBrief.ctaLabel || project.creative?.cta?.label || 'Get Started',
      ctaDestination: customBrief.ctaDestination || project.creative?.cta?.destination || 'https://example.com',
      prohibitedTopics: customBrief.prohibitedTopics || project.creative?.prohibitedPhrases || [],
      availableAssetIds,
      productTruthProfile: project.creative?.productTruthProfile || []
    };

    const result = await this.provider.generateConcepts(mergedBrief, {
      projectId,
      model: options.model,
      signal: options.signal
    });

    // Attach concepts to project
    project.creative = project.creative || {};
    project.creative.concepts = result.data.concepts || [];
    project.creative.conceptsGeneratedAt = new Date().toISOString();
    project.creative.conceptsModel = result.modelUsed;

    this._saveProject(projectId, project);
    this.saveRevision(projectId, `Generated 3 creative concepts (${result.modelUsed})`);

    return {
      concepts: project.creative.concepts,
      modelUsed: result.modelUsed,
      usage: result.usage,
      durationMs: result.durationMs
    };
  }

  async compileStoryboard(projectId, conceptId, options = {}) {
    const project = this._loadProject(projectId);
    const concepts = project.creative?.concepts || [];
    const selectedConcept = concepts.find(c => c.id === conceptId) || concepts[0];

    if (!selectedConcept) {
      throw new Error(`Concept with ID '${conceptId}' not found. Please develop concepts first.`);
    }

    const availableAssetIds = (project.assets || []).map(a => a.id);
    const brief = {
      projectId,
      brandName: project.brand?.name || 'Brand',
      audience: project.creative?.audience || 'Audience',
      language: project.project?.language || 'en',
      ctaLabel: project.creative?.cta?.label || 'Learn More',
      ctaDestination: project.creative?.cta?.destination || 'https://example.com',
      availableAssetIds,
      productTruthProfile: project.creative?.productTruthProfile || []
    };

    const result = await this.provider.buildStoryboard(brief, selectedConcept, {
      projectId,
      model: options.model,
      signal: options.signal
    });

    const aiStoryboard = result.data;
    const targetTemplateId = aiStoryboard.selectedTemplateId || selectedConcept.suggestedTemplateId || project.template?.id || 'bold_kinetic';
    const templateDef = getTemplate(targetTemplateId);
    const allowedKinds = templateDef?.sceneKinds || ['kinetic_text', 'problem', 'solution', 'ui_demo', 'stat', 'cta'];
    const allowedMotions = templateDef?.motionPresets || ['stagger_words', 'fade_up', 'slide_left', 'scale_pop', 'mask_reveal'];

    // Map AI scenes into project schema scenes
    const compiledScenes = (aiStoryboard.scenes || []).map((s, index) => {
      // Validate scene kind against installed template
      const kind = allowedKinds.includes(s.sceneKind) ? s.sceneKind : 'kinetic_text';
      const entrance = allowedMotions.includes(s.motion?.entrance) ? s.motion.entrance : 'stagger_words';
      const exit = s.motion?.exit || 'fade';

      // Validate visual asset IDs against actual user assets
      const validMediaAssets = (s.visuals?.assetIds || []).filter(id => availableAssetIds.includes(id));
      if (validMediaAssets.length === 0 && (kind === 'ui_demo' || kind === 'solution')) {
        // If logo is available and scene is solution, attach logo
        if (availableAssetIds.includes('logo')) validMediaAssets.push('logo');
      }

      return {
        id: s.sceneId || `scene-${index + 1}`,
        chapterNumber: s.chapterNumber || index + 1,
        chapterTitle: s.chapterTitle || `Scene ${index + 1}`,
        kind,
        durationSeconds: Math.max(3, Math.min(12, Number(s.durationSeconds) || 5)),
        eyebrow: s.onscreen?.eyebrow || '',
        headline: s.onscreen?.headline || 'Headline',
        subheadline: s.onscreen?.subheadline || '',
        highlightWords: Array.isArray(s.onscreen?.highlightWords) ? s.onscreen.highlightWords : [],
        ctaLabel: s.onscreen?.ctaLabel || (kind === 'cta' ? project.creative?.cta?.label || 'Get Started' : ''),
        ctaDestination: s.onscreen?.ctaDestination || (kind === 'cta' ? project.creative?.cta?.destination || '' : ''),
        narrationText: s.narration?.text || s.onscreen?.headline || '',
        narrationAssetId: null,
        mediaAssetIds: validMediaAssets,
        layout: s.visuals?.layout || (kind === 'ui_demo' ? 'device_mockup' : 'centered'),
        deviceFrame: s.visuals?.deviceType && s.visuals.deviceType !== 'none' ? s.visuals.deviceType : (kind === 'ui_demo' ? 'browser_window' : 'none'),
        callouts: s.visuals?.calloutLabel ? [{ label: s.visuals.calloutLabel, x: 0.65, y: 0.4, placement: 'left' }] : [],
        motion: {
          entrance,
          emphasis: s.motion?.emphasis || 'highlight',
          exit,
          easing: 'spring',
          intensity: s.motion?.intensity || 0.75,
          staggerMilliseconds: 70
        },
        afterTransition: s.motion?.transition || 'crossfade',
        transitionDurationSeconds: 0.35,
        sceneRole: s.sceneRole || 'feature',
        approvalStatus: 'draft',
        isApproved: false,
        pronunciationNotes: s.narration?.pronunciationNotes || '',
        claims: s.claims || []
      };
    });

    project.template.id = targetTemplateId;
    project.creative.selectedConceptId = conceptId;
    project.scenes = compiledScenes;

    this._saveProject(projectId, project);
    this.saveRevision(projectId, `Compiled storyboard from concept '${selectedConcept.angleTitle}' (${result.modelUsed})`);

    return {
      success: true,
      project,
      modelUsed: result.modelUsed,
      usage: result.usage
    };
  }

  async rewriteScene(projectId, sceneId, instruction, options = {}) {
    const project = this._loadProject(projectId);
    const sceneIndex = (project.scenes || []).findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      throw new Error(`Scene with ID '${sceneId}' not found in project`);
    }

    const currentScene = project.scenes[sceneIndex];
    if (currentScene.isApproved && !options.force) {
      throw new Error(`Scene '${sceneId}' is marked approved/locked. Unlock or use force:true to rewrite.`);
    }

    const availableAssetIds = (project.assets || []).map(a => a.id);
    const brief = {
      projectId,
      brandName: project.brand?.name || 'Brand',
      language: project.project?.language || 'en',
      availableAssetIds,
      productTruthProfile: project.creative?.productTruthProfile || []
    };

    const result = await this.provider.rewriteSelectedScene(currentScene, brief, instruction, {
      projectId,
      model: options.model,
      signal: options.signal
    });

    const rewritten = result.data;
    const templateDef = getTemplate(project.template?.id || 'bold_kinetic');
    const allowedMotions = templateDef?.motionPresets || ['stagger_words', 'fade_up', 'slide_left', 'scale_pop', 'mask_reveal'];

    // Update ONLY the selected scene, preserving unaffected scenes and unchanged locks
    const updatedScene = {
      ...currentScene,
      chapterTitle: rewritten.chapterTitle || currentScene.chapterTitle,
      eyebrow: rewritten.onscreen?.eyebrow || currentScene.eyebrow,
      headline: rewritten.onscreen?.headline || currentScene.headline,
      subheadline: rewritten.onscreen?.subheadline || currentScene.subheadline,
      highlightWords: rewritten.onscreen?.highlightWords || currentScene.highlightWords,
      narrationText: rewritten.narration?.text || currentScene.narrationText,
      durationSeconds: Math.max(3, Math.min(12, Number(rewritten.durationSeconds) || currentScene.durationSeconds)),
      motion: {
        ...currentScene.motion,
        entrance: allowedMotions.includes(rewritten.motion?.entrance) ? rewritten.motion.entrance : currentScene.motion?.entrance,
        exit: rewritten.motion?.exit || currentScene.motion?.exit
      },
      pronunciationNotes: rewritten.narration?.pronunciationNotes || currentScene.pronunciationNotes,
      approvalStatus: 'draft',
      isApproved: false, // New draft requires review
      provenance: {
        generatedBy: 'openai',
        model: result.modelUsed,
        timestamp: new Date().toISOString()
      }
    };

    // If narration text changed, clear cached audio asset so it is regenerated on demand
    if (updatedScene.narrationText !== currentScene.narrationText) {
      updatedScene.narrationAssetId = null;
      updatedScene.narrationDurationSeconds = null;
    }

    project.scenes[sceneIndex] = updatedScene;
    this._saveProject(projectId, project);
    this.saveRevision(projectId, `Rewrote scene '${sceneId}' (${result.modelUsed})`);

    return {
      success: true,
      scene: updatedScene,
      project,
      modelUsed: result.modelUsed,
      usage: result.usage
    };
  }

  async reviewProject(projectId, options = {}) {
    const project = this._loadProject(projectId);
    const result = await this.provider.reviewStoryboard(project, {
      projectId,
      model: options.model,
      signal: options.signal
    });

    project.creative = project.creative || {};
    project.creative.creativeAudit = {
      ...result.data,
      auditedAt: new Date().toISOString(),
      model: result.modelUsed
    };

    this._saveProject(projectId, project);
    this.saveRevision(projectId, `Completed creative review (Overall score: ${result.data.overallScore}/10)`);

    return {
      audit: project.creative.creativeAudit,
      modelUsed: result.modelUsed,
      usage: result.usage
    };
  }
}
