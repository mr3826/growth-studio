import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from '../apps/local-server/src/index.js';

async function testLiveCreativeFlow() {
  console.log('=== Running Live Creative Director End-to-End Test ===\n');

  const server = await buildServer();

  // Check provider status
  const resStatus = await server.inject({ method: 'GET', url: '/api/creative/provider-status' });
  const statusData = JSON.parse(resStatus.body);
  console.log('Provider Status:', statusData);
  assert.strictEqual(statusData.configured, true, 'OpenAI key must be configured');

  // Create temporary project with a custom product truth profile
  const resCreate = await server.inject({
    method: 'POST',
    url: '/api/projects',
    payload: {
      name: 'OmniDesk Live Test',
      preset: 'blank'
    }
  });
  assert.strictEqual(resCreate.statusCode, 201);
  const project = JSON.parse(resCreate.body);
  const projectId = project.project.id;
  console.log(`Created live test project: ${projectId}`);

  // Test 1: Develop 3 Concepts using gpt-6.1-sol
  console.log('\n--- Step 1: Develop 3 Advertising Concepts ---');
  const briefPayload = {
    brief: {
      brandName: 'OmniDesk AI',
      category: 'Customer Support Automation',
      audience: 'E-commerce store owners and growing SaaS teams',
      problem: 'Support inboxes get flooded with repetitive questions, causing delayed responses',
      keyMessage: 'OmniDesk AI drafts accurate responses in 3 seconds while keeping humans in control',
      benefits: [
        'Instant multi-channel inbox triage',
        'One-click draft approval for human agents',
        'Zero hallucination on store policies'
      ],
      language: 'en',
      targetDuration: 30,
      ctaLabel: 'Start Free Trial',
      ctaDestination: 'https://omnidesk.ai/signup'
    },
    model: 'gpt-6.1-sol'
  };

  const startConcepts = Date.now();
  const resConcepts = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/concepts`,
    payload: briefPayload
  });
  console.log(`Concepts API completed in ${((Date.now() - startConcepts) / 1000).toFixed(2)}s, status: ${resConcepts.statusCode}`);

  if (resConcepts.statusCode !== 200) {
    console.error('Failed concepts response:', resConcepts.body);
    process.exit(1);
  }

  const conceptsResult = JSON.parse(resConcepts.body);
  assert.strictEqual(conceptsResult.success, true);
  assert.strictEqual(conceptsResult.concepts.length, 3, 'Must return exactly 3 distinct concepts');
  console.log('Concept 1:', conceptsResult.concepts[0].angleTitle, `[${conceptsResult.concepts[0].angleType}]`);
  console.log('Concept 2:', conceptsResult.concepts[1].angleTitle, `[${conceptsResult.concepts[1].angleType}]`);
  console.log('Concept 3:', conceptsResult.concepts[2].angleTitle, `[${conceptsResult.concepts[2].angleType}]`);

  // Verify usage was recorded
  const resUsage1 = await server.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/creative/usage`
  });
  const usage1 = JSON.parse(resUsage1.body);
  console.log(`Usage after concepts: Calls=${usage1.totalCalls}, Spent=$${usage1.totalSpentUsd.toFixed(4)}, Remaining=$${usage1.remainingBudgetUsd.toFixed(4)}`);
  assert.ok(usage1.totalCalls >= 1);
  assert.ok(usage1.totalSpentUsd > 0);

  // Test 2: Compile Storyboard from Concept 1
  console.log('\n--- Step 2: Compile Storyboard from Selected Concept ---');
  const selectedConceptId = conceptsResult.concepts[0].id;
  const startStoryboard = Date.now();
  const resStoryboard = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/storyboard`,
    payload: {
      conceptId: selectedConceptId,
      model: 'gpt-6.1-sol'
    }
  });
  console.log(`Storyboard API completed in ${((Date.now() - startStoryboard) / 1000).toFixed(2)}s, status: ${resStoryboard.statusCode}`);

  if (resStoryboard.statusCode !== 200) {
    console.error('Failed storyboard response:', resStoryboard.body);
    process.exit(1);
  }

  const storyboardResult = JSON.parse(resStoryboard.body);
  assert.strictEqual(storyboardResult.success, true);
  const compiledProject = storyboardResult.project;
  console.log(`Compiled ${compiledProject.scenes.length} scenes:`);
  compiledProject.scenes.forEach((s, idx) => {
    console.log(`  Scene ${idx + 1} (${s.kind}): "${s.headline}" [Motion: ${s.motion?.entrance}, Narration: "${s.narrationText.slice(0, 40)}..."]`);
  });
  assert.ok(compiledProject.scenes.length >= 3, 'Should produce at least 3 scenes');

  // Test 3: Selective Scene Rewrite using gpt-6-luna
  console.log('\n--- Step 3: Rewrite Scene 1 with Custom Revision Prompt ---');
  const scene1 = compiledProject.scenes[0];
  const startRewrite = Date.now();
  const resRewrite = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/scenes/${scene1.id}/rewrite`,
    payload: {
      instruction: 'Make the headline much punchier and emphasize that unanswered tickets cost sales',
      model: 'gpt-6-luna'
    }
  });
  console.log(`Rewrite API completed in ${((Date.now() - startRewrite) / 1000).toFixed(2)}s, status: ${resRewrite.statusCode}`);

  if (resRewrite.statusCode !== 200) {
    console.error('Failed rewrite response:', resRewrite.body);
    process.exit(1);
  }

  const rewriteResult = JSON.parse(resRewrite.body);
  assert.strictEqual(rewriteResult.success, true);
  console.log('Original headline:', scene1.headline);
  console.log('Rewritten headline:', rewriteResult.scene.headline);
  console.log('Rewritten narration:', rewriteResult.scene.narrationText);
  assert.strictEqual(rewriteResult.scene.id, scene1.id, 'Scene ID must remain stable');

  // Test 4: Project Creative Review
  console.log('\n--- Step 4: Creative Director Review Audit ---');
  const startReview = Date.now();
  const resReview = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/review`,
    payload: {
      model: 'gpt-6.1-sol'
    }
  });
  console.log(`Review API completed in ${((Date.now() - startReview) / 1000).toFixed(2)}s, status: ${resReview.statusCode}`);

  if (resReview.statusCode !== 200) {
    console.error('Failed review response:', resReview.body);
    process.exit(1);
  }

  const reviewResult = JSON.parse(resReview.body);
  assert.strictEqual(reviewResult.success, true);
  console.log(`Overall Score: ${reviewResult.audit.overallScore}/10`);
  console.log(`Hook Strength: ${reviewResult.audit.hookScore}/10`);
  console.log(`Benefits Clarity: ${reviewResult.audit.benefitsScore}/10`);
  console.log(`Facts Grounding: ${reviewResult.audit.factsScore}/10`);
  console.log(`Pacing: ${reviewResult.audit.pacingScore}/10`);
  if (reviewResult.audit.suggestions?.[0]) {
    const s0 = reviewResult.audit.suggestions[0];
    console.log(`Top Recommendation (${s0.category}): "${s0.proposedText}" -> ${s0.rationale}`);
  }

  // Check history
  const resHistory = await server.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/creative/history`
  });
  const history = JSON.parse(resHistory.body);
  console.log(`\nHistory log has ${history.length} revision entries:`);
  history.forEach(h => console.log(`  - [${h.timestamp}] ${h.note}`));
  assert.ok(history.length >= 3);

  // Check final usage receipts
  const resUsageFinal = await server.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/creative/usage`
  });
  const usageFinal = JSON.parse(resUsageFinal.body);
  console.log(`\nFinal Project Spend: Calls=${usageFinal.totalCalls}, TotalSpent=$${usageFinal.totalSpentUsd.toFixed(4)}, BudgetCap=$${usageFinal.budgetCapUsd.toFixed(2)}`);
  assert.ok(usageFinal.totalSpentUsd < usageFinal.budgetCapUsd, 'Total spend should be well under the $1.00 budget cap');

  // Clean up test project
  await server.inject({ method: 'DELETE', url: `/api/projects/${projectId}` });
  console.log(`\n✓ Cleaned up temporary test project ${projectId}`);

  console.log('\n======================================================');
  console.log('✓✓ ALL LIVE CREATIVE DIRECTOR ENDPOINTS PASSED VERIFIED');
  console.log('======================================================\n');
}

testLiveCreativeFlow().catch(err => {
  console.error('LIVE test failed:', err);
  process.exit(1);
});
