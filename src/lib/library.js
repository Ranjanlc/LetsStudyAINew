import { apiFetch } from './api';

// Client-side helpers for the Subject -> Chapter -> Document library.

export async function fetchHierarchy() {
  const res = await apiFetch('/api/subjects');
  if (!res.ok) throw new Error('Failed to load subjects.');
  const data = await res.json();
  return data.subjects || [];
}

export async function createSubject({ name, color, deadline, priority, difficulty, estimatedHours }) {
  const res = await apiFetch('/api/subjects', {
    method: 'POST',
    body: { name, color, deadline, priority, difficulty, estimatedHours },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create subject.');
  return data.subject;
}

export async function deleteSubject(subjectId) {
  const res = await apiFetch(`/api/subjects/${subjectId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete subject.');
  }
}

export async function createChapter(subjectId, name) {
  const res = await apiFetch(`/api/subjects/${subjectId}/chapters`, {
    method: 'POST',
    body: { name },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create chapter.');
  return data.chapter;
}

export async function deleteChapter(chapterId) {
  const res = await apiFetch(`/api/subjects/chapters/${chapterId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete chapter.');
  }
}

export async function syncFromPlanner(plannerSubjects) {
  const res = await apiFetch('/api/subjects/sync-from-planner', {
    method: 'POST',
    body: { plannerSubjects },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to sync from planner.');
  return data;
}

// Flatten hierarchy into a list of every document the user owns.
export function flattenDocuments(library) {
  const out = [];
  for (const subject of library || []) {
    for (const chapter of subject.chapters || []) {
      for (const doc of chapter.documents || []) {
        out.push({
          ...doc,
          chapterId: chapter.id,
          chapterName: chapter.name,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectColor: subject.color,
        });
      }
    }
  }
  return out;
}
