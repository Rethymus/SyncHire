/**
 * Template Manager
 * Handles saving, loading, and reusing custom resume templates
 */

import { ResumeTemplate, TemplateCustomization, createCustomizedTemplate } from "./resume-templates";

export interface SavedTemplate {
  id: string;
  name: string;
  baseTemplateId: string;
  customization: TemplateCustomization;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isDefault?: boolean;
}

const STORAGE_KEY = "saved_resume_templates";

/**
 * Get all saved templates from localStorage
 */
export function getSavedTemplates(): SavedTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultTemplates();

    const templates: SavedTemplate[] = JSON.parse(stored);
    return templates.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error("Failed to load saved templates:", error);
    return getDefaultTemplates();
  }
}

/**
 * Save a template to localStorage
 */
export function saveTemplate(
  name: string,
  baseTemplateId: string,
  customization: TemplateCustomization
): SavedTemplate {
  const templates = getSavedTemplates();
  const now = new Date().toISOString();

  const newTemplate: SavedTemplate = {
    id: `custom-${Date.now()}`,
    name,
    baseTemplateId,
    customization,
    createdAt: now,
    updatedAt: now,
  };

  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));

  return newTemplate;
}

/**
 * Update an existing saved template
 */
export function updateTemplate(
  id: string,
  updates: Partial<Pick<SavedTemplate, "name" | "customization">>
): SavedTemplate | null {
  const templates = getSavedTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) return null;

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates[index];
}

/**
 * Delete a saved template
 */
export function deleteTemplate(id: string): boolean {
  const templates = getSavedTemplates();
  const filtered = templates.filter((t) => t.id !== id);

  if (filtered.length === templates.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get a saved template by ID
 */
export function getSavedTemplate(id: string): SavedTemplate | null {
  const templates = getSavedTemplates();
  return templates.find((t) => t.id === id) || null;
}

/**
 * Apply a saved template to a base template
 */
export function applySavedTemplate(
  savedTemplate: SavedTemplate,
  baseTemplate: ResumeTemplate
): ResumeTemplate {
  return createCustomizedTemplate(baseTemplate, savedTemplate.customization);
}

/**
 * Get default saved templates
 */
function getDefaultTemplates(): SavedTemplate[] {
  return [
    {
      id: "default-minimal",
      name: "默认简约模板",
      baseTemplateId: "minimal",
      customization: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    },
    {
      id: "default-professional",
      name: "默认商务模板",
      baseTemplateId: "professional",
      customization: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    },
  ];
}

/**
 * Export templates to JSON file
 */
export function exportTemplates(): void {
  const templates = getSavedTemplates();
  const dataStr = JSON.stringify(templates, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resume-templates-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import templates from JSON file
 */
export async function importTemplates(file: File): Promise<SavedTemplate[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const existing = getSavedTemplates();

        // Filter out duplicates based on ID
        const newTemplates = imported.filter(
          (imp: SavedTemplate) => !existing.some((ext) => ext.id === imp.id)
        );

        const merged = [...existing, ...newTemplates];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        resolve(newTemplates);
      } catch (error) {
        reject(new Error("Invalid template file format"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Reset to default templates
 */
export function resetToDefaults(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getDefaultTemplates()));
}

/**
 * Clone a template
 */
export function cloneTemplate(id: string, newName: string): SavedTemplate | null {
  const original = getSavedTemplate(id);
  if (!original) return null;

  return saveTemplate(
    newName,
    original.baseTemplateId,
    original.customization
  );
}

/**
 * Get template usage statistics
 */
export function getTemplateStats(): {
  total: number;
  custom: number;
  default: number;
  mostUsed: string | null;
} {
  const templates = getSavedTemplates();

  return {
    total: templates.length,
    custom: templates.filter((t) => !t.isDefault).length,
    default: templates.filter((t) => t.isDefault).length,
    mostUsed: null, // Could be enhanced with usage tracking
  };
}