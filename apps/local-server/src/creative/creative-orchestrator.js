import fs from 'node:fs';
import path from 'node:path';
import { OpenAiCreativeProvider } from './creative-provider.js';
import { AiUsageRecorder } from './usage-recorder.js';
import { getTemplate } from '@kinetic-studio/template-engine';

function getVisualAssetIds(assets = []) {
  const audioExtensions = new Set(['.wav', '.mp3', '.aac', '.m4a', '.ogg', '.flac']);
  const visualKinds = new Set(['image', 'logo', 'screenshot', 'video', 'screen_recording', 'media']);
  return assets.filter(asset => {
    const kind = String(asset.kind || '').toLowerCase();
    const extension = path.extname(asset.file || '').toLowerCase();
    return !audioExtensions.has(extension) && (visualKinds.has(kind) || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp4', '.mov', '.webm'].includes(extension));
  }).map(asset => asset.id);
}

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
    const availableAssetIds = getVisualAssetIds(project.assets || []);

    const mergedBrief = {
      projectId,
      brandName: customBrief.brandName ?? project.brand?.name ?? project.project?.clientOrProduct ?? project.project?.name ?? '',
      category: customBrief.category ?? project.creative?.category ?? '',
      audience: customBrief.audience ?? project.creative?.audience ?? '',
      problem: customBrief.problem ?? project.creative?.painPoint ?? project.creative?.problem ?? '',
      keyMessage: customBrief.keyMessage ?? project.creative?.keyMessage ?? '',
      benefits: customBrief.benefits ?? project.creative?.benefits ?? [],
      language: customBrief.language || project.project?.language || 'en',
      targetDuration: customBrief.targetDuration ?? project.creative?.targetDuration ?? 30,
      communicationGoal: customBrief.communicationGoal ?? project.creative?.communicationGoal ?? project.creative?.objective ?? '',
      funnelStage: customBrief.funnelStage ?? project.creative?.funnelStage ?? '',
      ctaLabel: customBrief.ctaLabel ?? project.creative?.cta?.label ?? '',
      ctaDestination: customBrief.ctaDestination ?? project.creative?.cta?.destination ?? '',
      prohibitedTopics: customBrief.prohibitedTopics || project.creative?.prohibitedPhrases || [],
      availableAssetIds,
      productTruthProfile: customBrief.productTruthProfile ?? project.creative?.productTruthProfile ?? []
    };

    if (options.consentToSend !== true) {
      const error = new Error('Confirm that the displayed text may be sent to OpenAI before generating.');
      error.code = 'consent_required';
      throw error;
    }

    // Persist source brief and evidence separately from generated concepts.
    project.creative = project.creative || {};
    project.creative.category = mergedBrief.category;
    project.creative.audience = mergedBrief.audience;
    project.creative.painPoint = mergedBrief.problem;
    project.creative.keyMessage = mergedBrief.keyMessage;
    project.creative.benefits = mergedBrief.benefits;
    project.creative.targetDuration = mergedBrief.targetDuration;
    project.creative.communicationGoal = mergedBrief.communicationGoal;
    project.creative.funnelStage = mergedBrief.funnelStage;
    project.creative.prohibitedTopics = mergedBrief.prohibitedTopics;
    project.creative.productTruthProfile = mergedBrief.productTruthProfile;
    project.creative.cta = { ...(project.creative.cta || {}), label: mergedBrief.ctaLabel, destination: mergedBrief.ctaDestination };
    this._saveProject(projectId, project);

    const result = await this.provider.generateConcepts(mergedBrief, {
      projectId,
      model: options.model,
      consentToSend: options.consentToSend,
      forceRegenerate: options.forceRegenerate,
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
      estimatedCostUsd: result.estimatedCostUsd,
      cacheHit: result.cacheHit,
      durationMs: result.durationMs
    };
  }

  async compileStoryboard(projectId, conceptId, options = {}) {
    const project = this._loadProject(projectId);
    const concepts = project.creative?.concepts || [];
    const selectedConcept = concepts.find(c => c.id === conceptId);

    if (!selectedConcept) {
      throw new Error(`Concept with ID '${conceptId}' not found. Please develop concepts first.`);
    }

    if (options.consentToSend !== true) {
      const error = new Error('Confirm that the displayed text may be sent to OpenAI before generating.');
      error.code = 'consent_required';
      throw error;
    }
    if ((project.scenes || []).length > 0 && options.replaceScenesConfirmed !== true) {
      throw new Error('Confirm replacing the existing storyboard before generating a new scene set.');
    }
    const selectedTemplateId = project.template?.id;
    const templateDef = getTemplate(selectedTemplateId);
    if (!templateDef) throw new Error('Select one of the installed templates before generating a storyboard.');

    const availableAssetIds = getVisualAssetIds(project.assets || []);
    const brief = {
      projectId,
      brandName: project.brand?.name || project.project?.clientOrProduct || project.project?.name || '',
      audience: project.creative?.audience || '',
      keyMessage: project.creative?.keyMessage || '',
      language: project.project?.language || 'en',
      ctaLabel: project.creative?.cta?.label || '',
      ctaDestination: project.creative?.cta?.destination || '',
      targetDuration: project.creative?.targetDuration || selectedConcept.suggestedDuration,
      templateId: selectedTemplateId,
      availableAssetIds,
      productTruthProfile: project.creative?.productTruthProfile || []
    };

    const result = await this.provider.buildStoryboard(brief, selectedConcept, {
      projectId,
      templateId: selectedTemplateId,
      model: options.model,
      consentToSend: options.consentToSend,
      forceRegenerate: options.forceRegenerate,
      signal: options.signal
    });

    const aiStoryboard = result.data;
    if (aiStoryboard.selectedTemplateId !== selectedTemplateId) throw new Error('Storyboard template differs from the user-selected template.');

    // Map AI scenes into project schema scenes
    const compiledScenes = (aiStoryboard.scenes || []).map((s, index) => {
      const kind = s.sceneKind;
      const truthById = new Map((project.creative.productTruthProfile || []).map(item => [item.id, item]));
      const claims = s.claims.map(claim => {
        const evidence = truthById.get(claim.evidenceId);
        const status = evidence?.verificationStatus || evidence?.status;
        const approved = evidence?.isApproved === true || evidence?.approved === true;
        if (!evidence || !approved || status !== claim.status || !['verified_live', 'approved_demo'].includes(status)) {
          throw new Error(`Claim in scene '${s.sceneId}' is not supported by approved product evidence.`);
        }
        return { claimText: claim.claimText, evidenceId: claim.evidenceId, status, disclaimer: claim.disclaimer };
      });

      return {
        id: s.sceneId,
        chapterNumber: s.chapterNumber,
        chapterTitle: s.chapterTitle,
        kind,
        durationSeconds: s.durationSeconds,
        eyebrow: s.onscreen.eyebrow,
        headline: s.onscreen.headline,
        subheadline: s.onscreen.subheadline,
        highlightWords: s.onscreen.highlightWords,
        ctaLabel: s.onscreen.ctaLabel,
        ctaDestination: s.onscreen.ctaDestination,
        statValue: s.onscreen.statValue,
        statLabel: s.onscreen.statLabel,
        narrationText: s.narration.text,
        narrationAssetId: null,
        mediaAssetIds: s.visuals.assetIds,
        layout: s.visuals.layout,
        deviceFrame: s.visuals.deviceType,
        callouts: s.visuals.calloutLabel ? [{ label: s.visuals.calloutLabel, x: 0.65, y: 0.4, placement: 'left' }] : [],
        motion: {
          entrance: s.motion.entrance,
          emphasis: s.motion.emphasis,
          exit: s.motion.exit,
          transition: s.motion.transition,
          cameraPreset: s.motion.cameraPreset,
          easing: 'spring',
          intensity: s.motion.intensity,
          staggerMilliseconds: 70
        },
        afterTransition: s.motion.transition,
        transitionDurationSeconds: s.motion.transition === 'cut' ? 0 : 0.35,
        sceneRole: s.sceneRole,
        approvalStatus: 'draft',
        isApproved: false,
        pronunciationNotes: s.narration.pronunciationNotes,
        narrationLanguage: s.narration.language,
        claims,
        claimDisclaimer: claims.filter(claim => claim.status === 'approved_demo').map(claim => claim.disclaimer).join(' · '),
        provenance: { generatedBy: 'openai', model: result.modelUsed, generatedAt: new Date().toISOString(), conceptId }
      };
    });

    project.template.id = selectedTemplateId;
    project.creative.selectedConceptId = conceptId;
    project.scenes = compiledScenes;

    this._saveProject(projectId, project);
    this.saveRevision(projectId, `Compiled storyboard from concept '${selectedConcept.angleTitle}' (${result.modelUsed})`);

    return {
      success: true,
      project,
      modelUsed: result.modelUsed,
      usage: result.usage,
      estimatedCostUsd: result.estimatedCostUsd,
      cacheHit: result.cacheHit
    };
  }

  async rewriteScene(projectId, sceneId, instruction, options = {}) {
    const project = this._loadProject(projectId);
    const sceneIndex = (project.scenes || []).findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      throw new Error(`Scene with ID '${sceneId}' not found in project`);
    }

    const currentScene = project.scenes[sceneIndex];
    if (currentScene.isApproved || ['approved', 'locked'].includes(currentScene.approvalStatus)) {
      throw new Error(`Scene '${sceneId}' is approved or locked. Duplicate/unlock it manually before requesting a rewrite.`);
    }

    const availableAssetIds = getVisualAssetIds(project.assets || []);
    const brief = {
      projectId,
      brandName: project.brand?.name || project.project?.name || '',
      language: project.project?.language || 'en',
      templateId: project.template?.id,
      availableAssetIds,
      productTruthProfile: project.creative?.productTruthProfile || []
    };

    const result = await this.provider.rewriteSelectedScene(currentScene, brief, instruction, {
      projectId,
      templateId: project.template?.id,
      model: options.model,
      consentToSend: options.consentToSend,
      forceRegenerate: options.forceRegenerate,
      signal: options.signal
    });

    const rewritten = result.data;
    const truthById = new Map((project.creative?.productTruthProfile || []).map(item => [item.id, item]));
    const claims = rewritten.claims.map(claim => {
      const evidence = truthById.get(claim.evidenceId);
      const status = evidence?.verificationStatus || evidence?.status;
      const approved = evidence?.isApproved === true || evidence?.approved === true;
      if (!evidence || !approved || status !== claim.status || !['verified_live', 'approved_demo'].includes(status)) {
        throw new Error('Rewritten scene claim is not supported by approved product evidence.');
      }
      return { claimText: claim.claimText, evidenceId: claim.evidenceId, status, disclaimer: claim.disclaimer };
    });

    // Update ONLY the selected scene, preserving unaffected scenes and unchanged locks
    const updatedScene = {
      ...currentScene,
      kind: rewritten.sceneKind,
      chapterTitle: rewritten.chapterTitle || currentScene.chapterTitle,
      eyebrow: rewritten.onscreen?.eyebrow || currentScene.eyebrow,
      headline: rewritten.onscreen?.headline || currentScene.headline,
      subheadline: rewritten.onscreen?.subheadline || currentScene.subheadline,
      highlightWords: rewritten.onscreen?.highlightWords || currentScene.highlightWords,
      ctaLabel: rewritten.onscreen?.ctaLabel || currentScene.ctaLabel,
      ctaDestination: rewritten.onscreen?.ctaDestination || currentScene.ctaDestination,
      statValue: rewritten.onscreen?.statValue || currentScene.statValue,
      statLabel: rewritten.onscreen?.statLabel || currentScene.statLabel,
      narrationText: rewritten.narration?.text || currentScene.narrationText,
      durationSeconds: Math.max(3, Math.min(12, Number(rewritten.durationSeconds) || currentScene.durationSeconds)),
      mediaAssetIds: rewritten.visuals.assetIds,
      layout: rewritten.visuals.layout,
      deviceFrame: rewritten.visuals.deviceType,
      callouts: rewritten.visuals.calloutLabel ? [{ label: rewritten.visuals.calloutLabel, x: 0.65, y: 0.4, placement: 'left' }] : [],
      motion: {
        ...currentScene.motion,
        entrance: rewritten.motion.entrance,
        emphasis: rewritten.motion.emphasis,
        exit: rewritten.motion.exit,
        transition: rewritten.motion.transition,
        cameraPreset: rewritten.motion.cameraPreset,
        intensity: rewritten.motion.intensity
      },
      afterTransition: rewritten.motion.transition,
      transitionDurationSeconds: rewritten.motion.transition === 'cut' ? 0 : 0.35,
      sceneRole: rewritten.sceneRole,
      pronunciationNotes: rewritten.narration?.pronunciationNotes || currentScene.pronunciationNotes,
      narrationLanguage: rewritten.narration.language,
      claims,
      claimDisclaimer: claims.filter(claim => claim.status === 'approved_demo').map(claim => claim.disclaimer).join(' · '),
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
      usage: result.usage,
      estimatedCostUsd: result.estimatedCostUsd,
      cacheHit: result.cacheHit
    };
  }

  async reviewProject(projectId, options = {}) {
    const project = this._loadProject(projectId);
    const result = await this.provider.reviewStoryboard(project, {
      projectId,
      model: options.model,
      consentToSend: options.consentToSend,
      forceRegenerate: options.forceRegenerate,
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
      usage: result.usage,
      estimatedCostUsd: result.estimatedCostUsd,
      cacheHit: result.cacheHit
    };
  }
}
