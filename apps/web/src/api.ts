import {
  Project,
  PreflightReport,
  RenderJob,
  StarterTemplate,
  NarrationStatus,
  CreativeConcept,
  CreativeAudit,
  CreativeProviderStatus,
  CreativeUsage
} from './types';

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function fetchStarters(): Promise<StarterTemplate[]> {
  const res = await fetch(`${API_BASE}/starters`);
  if (!res.ok) throw new Error('Failed to fetch starter templates');
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error(`Failed to load project ${id}`);
  return res.json();
}

export async function createProject(payload: { name?: string; language?: string; preset?: string; starter?: string; templateId?: string }): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function saveProject(id: string, project: Project): Promise<{ success: boolean; project: Project }> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save project');
  }
  return res.json();
}

export async function deleteProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}

export async function uploadAsset(projectId: string, file: File): Promise<{ success: boolean; asset: any }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/projects/${projectId}/assets`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Asset upload failed');
  return res.json();
}

export async function fetchPreflight(projectId: string): Promise<PreflightReport> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/preflight`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Preflight check failed');
  return res.json();
}

export async function queueRender(projectId: string, targetId: string): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/renders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId })
  });
  if (!res.ok) throw new Error('Failed to queue render');
  return res.json();
}

export async function fetchRenderJob(jobId: string): Promise<RenderJob> {
  const res = await fetch(`${API_BASE}/renders/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch render job');
  return res.json();
}

export async function cancelRender(jobId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/renders/${jobId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to cancel render job');
  return res.json();
}

export function getPreviewHtmlUrl(projectId: string, targetId: string) {
  return `${API_BASE}/projects/${projectId}/preview-html?target=${targetId}&t=${Date.now()}`;
}

export function getDownloadUrl(jobId: string) {
  return `${API_BASE}/renders/${jobId}/file`;
}

export async function fetchNarrationStatus(): Promise<NarrationStatus> {
  const res = await fetch(`${API_BASE}/narration/provider-status`);
  if (!res.ok) throw new Error('Failed to fetch narration provider status');
  return res.json();
}

export async function previewNarration(text: string, voice = 'Puck'): Promise<Blob> {
  const res = await fetch(`${API_BASE}/narration/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to preview narration');
  }
  return res.blob();
}

export async function generateNarration(
  projectId: string,
  options: { sceneId?: string; allScenes?: boolean; voice?: string; fitDuration?: boolean }
): Promise<{ success: boolean; generated: any[]; project: Project }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/narration/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate narration');
  }
  return res.json();
}

export async function fitScenesToAudio(
  projectId: string,
  paddingSeconds = 0.5
): Promise<{ success: boolean; scenes: any[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/audio/fit-scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paddingSeconds })
  });
  if (!res.ok) throw new Error('Failed to fit scenes to audio');
  return res.json();
}

export async function fetchCreativeStatus(): Promise<CreativeProviderStatus> {
  const res = await fetch(`${API_BASE}/creative/provider-status`);
  if (!res.ok) throw new Error('Failed to fetch creative provider status');
  return res.json();
}

export async function generateCreativeConcepts(
  projectId: string,
  brief: any,
  model?: string
): Promise<{ success: boolean; concepts: CreativeConcept[]; project: Project; usage: any; durationMs: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/concepts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, model })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate creative concepts');
  }
  return res.json();
}

export async function compileCreativeStoryboard(
  projectId: string,
  conceptId: string,
  model?: string
): Promise<{ success: boolean; project: Project; usage: any }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conceptId, model })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to compile creative storyboard');
  }
  return res.json();
}

export async function rewriteCreativeScene(
  projectId: string,
  sceneId: string,
  instruction: string,
  model?: string,
  force = false
): Promise<{ success: boolean; scene: any; project: Project; usage: any }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/scenes/${sceneId}/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction, model, force })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to rewrite scene');
  }
  return res.json();
}

export async function reviewCreativeProject(
  projectId: string,
  model?: string
): Promise<{ success: boolean; audit: CreativeAudit; usage: any }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to perform creative review');
  }
  return res.json();
}

export async function fetchCreativeHistory(projectId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/history`);
  if (!res.ok) throw new Error('Failed to fetch creative history');
  return res.json();
}

export async function fetchCreativeUsage(projectId: string): Promise<CreativeUsage> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/usage`);
  if (!res.ok) throw new Error('Failed to fetch creative usage');
  return res.json();
}

export async function updateCreativeBudget(projectId: string, budgetCapUsd: number): Promise<{ success: boolean; usage: CreativeUsage }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/creative/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ budgetCapUsd })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update creative budget');
  }
  return res.json();
}

