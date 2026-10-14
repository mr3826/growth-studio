/**
 * Strict JSON Schemas for OpenAI Structured Outputs (Responses API).
 * Rules:
 * 1. additionalProperties: false on ALL object schemas.
 * 2. Every property defined in properties must be listed in required.
 * 3. Array schemas must have items defined.
 */

export const CONCEPTS_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'creative_concepts',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      concepts: {
        type: 'array',
        description: 'Three distinct creative advertising angles',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique slug like concept-problem-solution' },
            angleTitle: { type: 'string', description: 'Catchy concept title' },
            angleType: {
              type: 'string',
              enum: ['problem_solution', 'outcome_story', 'product_proof', 'educational', 'direct_response']
            },
            hookText: { type: 'string', description: 'Immediate first-3-seconds hook in project language' },
            targetPain: { type: 'string', description: 'Core customer frustration or problem addressed' },
            treatment: { type: 'string', description: 'Visual style and narrative approach' },
            suggestedDuration: { type: 'integer', description: 'Suggested length in seconds (15, 30, or 60)' },
            suggestedTemplateId: {
              type: 'string',
              enum: ['bold_kinetic', 'guided_product_story', 'app_showcase']
            },
            sceneOutline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sceneNumber: { type: 'integer' },
                  role: {
                    type: 'string',
                    enum: ['hook', 'problem', 'solution', 'ui_demo', 'proof', 'feature', 'stat', 'cta']
                  },
                  summary: { type: 'string' }
                },
                required: ['sceneNumber', 'role', 'summary'],
                additionalProperties: false
              }
            },
            voiceStyle: { type: 'string', description: 'Recommended narrator delivery tone' },
            riskNotes: { type: 'string', description: 'Factual boundary notes to avoid unverified claims' },
            creativeRationale: { type: 'string', description: 'Why this creative approach converts the target audience' }
          },
          required: [
            'id',
            'angleTitle',
            'angleType',
            'hookText',
            'targetPain',
            'treatment',
            'suggestedDuration',
            'suggestedTemplateId',
            'sceneOutline',
            'voiceStyle',
            'riskNotes',
            'creativeRationale'
          ],
          additionalProperties: false
        }
      }
    },
    required: ['concepts'],
    additionalProperties: false
  }
};

const SCENE_OBJECT_SCHEMA = {
  type: 'object',
  properties: {
    sceneId: { type: 'string', description: 'Stable alphanumeric scene identifier e.g. hook, problem, demo' },
    chapterNumber: { type: 'integer', description: '1-indexed chapter beat' },
    chapterTitle: { type: 'string', description: 'Short chapter title in project language' },
    sceneRole: {
      type: 'string',
      enum: ['hook', 'problem', 'solution', 'ui_demo', 'proof', 'feature', 'stat', 'cta', 'outro']
    },
    sceneKind: {
      type: 'string',
      enum: ['kinetic_text', 'problem', 'solution', 'ui_demo', 'feature', 'stat', 'cta']
    },
    durationSeconds: { type: 'integer', description: 'Duration in seconds (typically 3-8s)' },
    onscreen: {
      type: 'object',
      properties: {
        eyebrow: { type: 'string', description: 'Top eyebrow category pill text' },
        headline: { type: 'string', description: 'Main kinetic headline' },
        subheadline: { type: 'string', description: 'Supporting sentence or value prop' },
        highlightWords: {
          type: 'array',
          items: { type: 'string' },
          description: '1 to 3 words from headline to highlight with glowing pill'
        },
        ctaLabel: { type: 'string', description: 'Button or action label if cta scene, otherwise empty' },
        ctaDestination: { type: 'string', description: 'Destination URL if cta scene, otherwise empty' }
      },
      required: ['eyebrow', 'headline', 'subheadline', 'highlightWords', 'ctaLabel', 'ctaDestination'],
      additionalProperties: false
    },
    narration: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['bn', 'en', 'mixed'] },
        text: { type: 'string', description: 'Spoken voiceover script for this scene' },
        pronunciationNotes: { type: 'string', description: 'Phonetic or emphasis guidance for TTS' }
      },
      required: ['language', 'text', 'pronunciationNotes'],
      additionalProperties: false
    },
    visuals: {
      type: 'object',
      properties: {
        assetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Referenced user asset IDs from supplied assets, e.g. logo, inbox'
        },
        deviceType: {
          type: 'string',
          enum: ['none', 'mobile', 'browser_window', 'desktop']
        },
        layout: {
          type: 'string',
          enum: ['centered', 'split_left', 'split_right', 'stacked', 'device_mockup', 'full_bleed']
        },
        calloutLabel: { type: 'string', description: 'On-screen spotlight annotation text or empty' }
      },
      required: ['assetIds', 'deviceType', 'layout', 'calloutLabel'],
      additionalProperties: false
    },
    motion: {
      type: 'object',
      properties: {
        entrance: {
          type: 'string',
          enum: ['stagger_words', 'fade_up', 'slide_left', 'slide_right', 'scale_pop', 'mask_reveal', 'none']
        },
        emphasis: {
          type: 'string',
          enum: ['highlight', 'pulse', 'underline_sweep', 'none']
        },
        exit: {
          type: 'string',
          enum: ['fade', 'slide_left', 'slide_right', 'zoom_out', 'none']
        },
        transition: {
          type: 'string',
          enum: ['crossfade', 'cut', 'wipe_left', 'wipe_right', 'zoom']
        },
        cameraPreset: {
          type: 'string',
          enum: ['none', 'slow_pan', 'zoom_in', 'pan_and_scan', 'spotlight']
        },
        intensity: { type: 'number', description: 'Motion intensity scale 0.5 to 1.0' }
      },
      required: ['entrance', 'emphasis', 'exit', 'transition', 'cameraPreset', 'intensity'],
      additionalProperties: false
    },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claimText: { type: 'string' },
          evidenceId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['verified_live', 'approved_demo', 'planned', 'unknown']
          }
        },
        required: ['claimText', 'evidenceId', 'status'],
        additionalProperties: false
      }
    }
  },
  required: [
    'sceneId',
    'chapterNumber',
    'chapterTitle',
    'sceneRole',
    'sceneKind',
    'durationSeconds',
    'onscreen',
    'narration',
    'visuals',
    'motion',
    'claims'
  ],
  additionalProperties: false
};

export const STORYBOARD_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'video_storyboard',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      schemaVersion: { type: 'string', enum: ['1.0'] },
      conceptId: { type: 'string' },
      selectedTemplateId: {
        type: 'string',
        enum: ['bold_kinetic', 'guided_product_story', 'app_showcase']
      },
      estimatedDuration: { type: 'integer' },
      scenes: {
        type: 'array',
        items: SCENE_OBJECT_SCHEMA
      }
    },
    required: ['schemaVersion', 'conceptId', 'selectedTemplateId', 'estimatedDuration', 'scenes'],
    additionalProperties: false
  }
};

export const SCENE_REWRITE_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'scene_rewrite',
  strict: true,
  schema: SCENE_OBJECT_SCHEMA
};

export const CREATIVE_REVIEW_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'creative_review',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      hookScore: { type: 'integer', description: '1 to 10 rating of first 3 seconds hook' },
      benefitsScore: { type: 'integer', description: '1 to 10 rating of clarity of user benefits' },
      factsScore: { type: 'integer', description: '1 to 10 rating of fidelity to supplied truth profile' },
      brandScore: { type: 'integer', description: '1 to 10 rating of brand voice consistency' },
      pacingScore: { type: 'integer', description: '1 to 10 rating of scene duration & narrative flow' },
      mobileLegibilityScore: { type: 'integer', description: '1 to 10 rating of text length for vertical screens' },
      languageScore: { type: 'integer', description: '1 to 10 rating of Bangla/English grammatical naturalness' },
      overallScore: { type: 'integer', description: '1 to 10 overall creative impact rating' },
      summary: { type: 'string', description: 'Executive summary of creative review' },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['hook', 'headline', 'narration', 'pacing', 'motion', 'claims', 'cta']
            },
            severity: {
              type: 'string',
              enum: ['high', 'medium', 'low', 'info']
            },
            targetSceneId: { type: 'string' },
            currentText: { type: 'string' },
            proposedText: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['category', 'severity', 'targetSceneId', 'currentText', 'proposedText', 'rationale'],
          additionalProperties: false
        }
      }
    },
    required: [
      'hookScore',
      'benefitsScore',
      'factsScore',
      'brandScore',
      'pacingScore',
      'mobileLegibilityScore',
      'languageScore',
      'overallScore',
      'summary',
      'suggestions'
    ],
    additionalProperties: false
  }
};
