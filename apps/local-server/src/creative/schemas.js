import Ajv2020 from 'ajv/dist/2020.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });

const conceptAngleTypes = [
  'problem_solution',
  'outcome_story',
  'product_proof',
  'educational',
  'direct_response'
];

const sceneRoles = ['hook', 'problem', 'solution', 'ui_demo', 'proof', 'feature', 'stat', 'cta', 'outro'];
const claimStatuses = ['verified_live', 'approved_demo'];

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: 'object', properties, required, additionalProperties: false };
}

function responseFormat(name, schema) {
  return { type: 'json_schema', name, strict: true, schema };
}

export function makeConceptsResponseFormat(templateIds) {
  const supportedTemplates = [...new Set(templateIds)].filter(Boolean);
  if (supportedTemplates.length === 0) throw new Error('No installed video templates are available.');

  const outlineItem = objectSchema({
    sceneNumber: { type: 'integer', minimum: 1, maximum: 20 },
    role: { type: 'string', enum: sceneRoles },
    summary: { type: 'string', minLength: 1, maxLength: 240 }
  });

  const concept = objectSchema({
    id: { type: 'string', minLength: 1, maxLength: 48 },
    angleTitle: { type: 'string', minLength: 1, maxLength: 100 },
    angleType: { type: 'string', enum: conceptAngleTypes },
    hookText: { type: 'string', minLength: 1, maxLength: 180 },
    targetPain: { type: 'string', maxLength: 240 },
    treatment: { type: 'string', minLength: 1, maxLength: 400 },
    suggestedDuration: { type: 'integer', enum: [15, 30, 60] },
    suggestedTemplateId: { type: 'string', enum: supportedTemplates },
    sceneOutline: { type: 'array', items: outlineItem },
    voiceStyle: { type: 'string', minLength: 1, maxLength: 160 },
    riskNotes: { type: 'string', maxLength: 400 },
    creativeRationale: { type: 'string', minLength: 1, maxLength: 400 }
  });

  return responseFormat('creative_concepts_v1', objectSchema({
    schemaVersion: { type: 'string', enum: ['1.0'] },
    concepts: { type: 'array', items: concept }
  }));
}

function makeSceneObjectSchema({ templateManifest, availableAssetIds }) {
  const options = templateManifest.motionOptions || {};
  const sceneKinds = templateManifest.sceneKinds || [];
  const layouts = templateManifest.layoutPresets || ['centered'];
  const assets = [...new Set(availableAssetIds || [])];
  // The sentinel only makes the strict provider schema valid when no assets
  // exist; local validation rejects it before any scene reaches the project.
  const assetEnum = assets.length > 0 ? assets : ['__no_assets_available__'];

  return objectSchema({
    sceneId: { type: 'string', minLength: 1, maxLength: 40 },
    chapterNumber: { type: 'integer', minimum: 1, maximum: 20 },
    chapterTitle: { type: 'string', minLength: 1, maxLength: 100 },
    sceneRole: { type: 'string', enum: sceneRoles },
    sceneKind: { type: 'string', enum: sceneKinds },
    durationSeconds: { type: 'integer', minimum: 3, maximum: 8 },
    onscreen: objectSchema({
      eyebrow: { type: 'string', maxLength: 60 },
      headline: { type: 'string', minLength: 1, maxLength: 120 },
      subheadline: { type: 'string', maxLength: 220 },
      highlightWords: { type: 'array', items: { type: 'string', maxLength: 40 } },
      ctaLabel: { type: 'string', maxLength: 80 },
      ctaDestination: { type: 'string', maxLength: 300 },
      statValue: { type: 'string', maxLength: 30 },
      statLabel: { type: 'string', maxLength: 100 }
    }),
    narration: objectSchema({
      language: { type: 'string', enum: ['bn', 'en', 'mixed'] },
      text: { type: 'string', minLength: 1, maxLength: 500 },
      pronunciationNotes: { type: 'string', maxLength: 240 }
    }),
    visuals: objectSchema({
      assetIds: { type: 'array', items: { type: 'string', enum: assetEnum } },
      deviceType: { type: 'string', enum: ['none', 'mobile', 'browser_window', 'desktop'] },
      layout: { type: 'string', enum: layouts },
      calloutLabel: { type: 'string', maxLength: 100 }
    }),
    motion: objectSchema({
      entrance: { type: 'string', enum: options.entrance || [] },
      emphasis: { type: 'string', enum: options.emphasis || [] },
      exit: { type: 'string', enum: options.exit || [] },
      transition: { type: 'string', enum: options.transition || [] },
      cameraPreset: { type: 'string', enum: options.camera || [] },
      intensity: { type: 'number', minimum: 0.5, maximum: 1 }
    }),
    claims: {
      type: 'array',
      items: objectSchema({
        claimText: { type: 'string', minLength: 1, maxLength: 300 },
        evidenceId: { type: 'string', minLength: 1, maxLength: 80 },
        status: { type: 'string', enum: claimStatuses },
        disclaimer: { type: 'string', maxLength: 180 }
      })
    }
  });
}

export function makeStoryboardResponseFormat({ templateManifest, availableAssetIds = [] }) {
  if (!templateManifest?.id || !Array.isArray(templateManifest.sceneKinds)) {
    throw new Error('A valid installed template manifest is required for storyboard generation.');
  }
  return responseFormat('video_storyboard_v1', objectSchema({
    schemaVersion: { type: 'string', enum: ['1.0'] },
    conceptId: { type: 'string', minLength: 1, maxLength: 48 },
    selectedTemplateId: { type: 'string', enum: [templateManifest.id] },
    estimatedDuration: { type: 'integer', minimum: 15, maximum: 60 },
    scenes: {
      type: 'array',
      items: makeSceneObjectSchema({ templateManifest, availableAssetIds })
    }
  }));
}

export function makeSceneRewriteResponseFormat({
  templateManifest,
  availableAssetIds = [],
  stableSceneId
}) {
  const schema = makeSceneObjectSchema({ templateManifest, availableAssetIds });
  schema.properties.sceneId = { type: 'string', enum: [stableSceneId] };
  return responseFormat('scene_rewrite_v1', schema);
}

export const CREATIVE_REVIEW_RESPONSE_FORMAT = responseFormat('creative_review_v1', objectSchema({
  hookScore: { type: 'integer', minimum: 1, maximum: 10 },
  benefitsScore: { type: 'integer', minimum: 1, maximum: 10 },
  factsScore: { type: 'integer', minimum: 1, maximum: 10 },
  brandScore: { type: 'integer', minimum: 1, maximum: 10 },
  pacingScore: { type: 'integer', minimum: 1, maximum: 10 },
  mobileLegibilityScore: { type: 'integer', minimum: 1, maximum: 10 },
  languageScore: { type: 'integer', minimum: 1, maximum: 10 },
  motionVarietyScore: { type: 'integer', minimum: 1, maximum: 10 },
  audioSyncScore: { type: 'integer', minimum: 1, maximum: 10 },
  ctaScore: { type: 'integer', minimum: 1, maximum: 10 },
  overallScore: { type: 'integer', minimum: 1, maximum: 10 },
  summary: { type: 'string', minLength: 1, maxLength: 600 },
  suggestions: {
    type: 'array',
    items: objectSchema({
      category: { type: 'string', enum: ['hook', 'headline', 'narration', 'pacing', 'motion', 'claims', 'cta'] },
      severity: { type: 'string', enum: ['high', 'medium', 'low', 'info'] },
      targetSceneId: { type: 'string', maxLength: 40 },
      currentText: { type: 'string', maxLength: 300 },
      proposedText: { type: 'string', maxLength: 300 },
      rationale: { type: 'string', minLength: 1, maxLength: 400 }
    })
  }
}));

const compiledValidators = new WeakMap();

export function validateStructuredOutput(format, data) {
  let validate = compiledValidators.get(format);
  if (!validate) {
    validate = ajv.compile(format.schema);
    compiledValidators.set(format, validate);
  }
  if (!validate(data)) {
    const details = (validate.errors || [])
      .slice(0, 8)
      .map(error => `${error.instancePath || '/'} ${error.message || 'is invalid'}`)
      .join('; ');
    throw new Error(`Structured response failed local schema validation: ${details}`);
  }
  return data;
}

export function validateConceptsOutput(format, data) {
  validateStructuredOutput(format, data);
  if (data.schemaVersion !== '1.0' || data.concepts.length !== 3) {
    throw new Error('Creative response must contain exactly three concepts with schema version 1.0.');
  }
  const ids = data.concepts.map(concept => concept.id);
  const angles = data.concepts.map(concept => concept.angleType);
  const hooks = data.concepts.map(concept => concept.hookText.trim().toLocaleLowerCase());
  if (new Set(ids).size !== 3 || new Set(angles).size !== 3 || new Set(hooks).size !== 3) {
    throw new Error('Creative response concepts must have unique IDs, advertising angles, and hooks.');
  }
  return data;
}

function isSafeWebDestination(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateStoryboardOutput(format, data, { conceptId, templateManifest, availableAssetIds = [], productTruthProfile = [], ctaDestination = '' }) {
  validateStructuredOutput(format, data);
  if (data.schemaVersion !== '1.0' || data.conceptId !== conceptId || data.selectedTemplateId !== templateManifest.id) {
    throw new Error('Storyboard response does not match the selected concept and template.');
  }
  if (data.scenes.length < 3 || data.scenes.length > 12) {
    throw new Error('Storyboard response must contain 3 to 12 scenes.');
  }
  const sceneIds = data.scenes.map(scene => scene.sceneId);
  if (new Set(sceneIds).size !== sceneIds.length || sceneIds.some(id => !/^[a-z0-9][a-z0-9_-]{0,39}$/i.test(id))) {
    throw new Error('Storyboard scene IDs must be unique stable IDs using letters, numbers, underscore, or hyphen.');
  }
  const assetIds = new Set(availableAssetIds);
  const truthItems = new Map(productTruthProfile.map(item => [item.id, item]));
  for (const scene of data.scenes) {
    if (!templateManifest.sceneKinds.includes(scene.sceneKind)) {
      throw new Error(`Scene '${scene.sceneId}' uses a kind unsupported by template '${templateManifest.id}'.`);
    }
    if (scene.visuals.assetIds.some(id => !assetIds.has(id))) {
      throw new Error(`Scene '${scene.sceneId}' references an asset that is not in the project manifest.`);
    }
    if (scene.sceneKind === 'ui_demo' && scene.visuals.assetIds.length === 0) {
      throw new Error(`UI demonstration scene '${scene.sceneId}' requires an approved project screenshot.`);
    }
    if (!isSafeWebDestination(scene.onscreen.ctaDestination) || (scene.onscreen.ctaDestination && scene.onscreen.ctaDestination !== ctaDestination)) {
      throw new Error(`Scene '${scene.sceneId}' used a CTA destination that was not supplied by the user.`);
    }
    if (scene.sceneKind === 'stat') {
      const supportedStat = scene.claims.some(claim => {
        const item = truthItems.get(claim.evidenceId);
        return item && ['verified_live', 'approved_demo'].includes(item.status || item.verificationStatus) &&
          (item.isApproved === true || item.approved === true) &&
          String(item.statement || item.label || '').includes(scene.onscreen.statValue) && scene.onscreen.statValue.trim();
      });
      if (!supportedStat) throw new Error(`Stat scene '${scene.sceneId}' requires a number that appears in approved product evidence.`);
    }
    if (scene.sceneKind === 'testimonial') {
      const exactTestimonial = scene.claims.some(claim => {
        const item = truthItems.get(claim.evidenceId);
        return item && /testimonial|quote/i.test(item.category || '') &&
          (item.isApproved === true || item.approved === true) &&
          scene.onscreen.headline === (item.statement || item.label);
      });
      if (!exactTestimonial) throw new Error(`Testimonial scene '${scene.sceneId}' must use an exact, approved testimonial supplied by the user.`);
    }
    if (scene.claims.some(claim => claim.status === 'approved_demo' && !claim.disclaimer.trim())) {
      throw new Error(`Demo claims in scene '${scene.sceneId}' require an on-screen demo disclaimer.`);
    }
  }
  const totalSeconds = data.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  if (totalSeconds < 15 || totalSeconds > 60) {
    throw new Error('Storyboard scene durations must total between 15 and 60 seconds.');
  }
  return data;
}

export function validateSceneRewriteOutput(format, data, { scene, availableAssetIds = [], productTruthProfile = [] }) {
  validateStructuredOutput(format, data);
  if (data.sceneId !== scene.id) throw new Error('Scene rewrite changed the stable scene ID.');
  if (data.visuals.assetIds.some(id => !availableAssetIds.includes(id))) {
    throw new Error('Scene rewrite referenced an asset that is not in the project manifest.');
  }
  if (!isSafeWebDestination(data.onscreen.ctaDestination) || (data.onscreen.ctaDestination && data.onscreen.ctaDestination !== (scene.ctaDestination || ''))) {
    throw new Error('Scene rewrite used a CTA destination that was not supplied by the user.');
  }
  const truthItems = new Map(productTruthProfile.map(item => [item.id, item]));
  if (data.sceneKind === 'ui_demo' && data.visuals.assetIds.length === 0) {
    throw new Error('A rewritten UI demonstration needs an approved project screenshot.');
  }
  if (data.sceneKind === 'stat') {
    const supportedStat = data.claims.some(claim => {
      const item = truthItems.get(claim.evidenceId);
      return item && ['verified_live', 'approved_demo'].includes(item.status || item.verificationStatus) &&
        (item.isApproved === true || item.approved === true) &&
        String(item.statement || item.label || '').includes(data.onscreen.statValue) && data.onscreen.statValue.trim();
    });
    if (!supportedStat) throw new Error('A rewritten stat scene needs a value present in approved product evidence.');
  }
  if (data.sceneKind === 'testimonial') {
    const exactTestimonial = data.claims.some(claim => {
      const item = truthItems.get(claim.evidenceId);
      return item && /testimonial|quote/i.test(item.category || '') &&
        (item.isApproved === true || item.approved === true) &&
        data.onscreen.headline === (item.statement || item.label);
    });
    if (!exactTestimonial) throw new Error('A rewritten testimonial must use exact, approved user-supplied testimonial text.');
  }
  return data;
}
