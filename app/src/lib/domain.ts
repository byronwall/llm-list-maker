export type Phase = "MVP" | "V1" | "Later";
export type FeatureStatus =
  | "proposed"
  | "accepted"
  | "in_progress"
  | "done"
  | "cut";

export interface Project {
  id: string;
  name: string;
  ideaRaw: string;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyStep {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface UIArea {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface Feature {
  id: string;
  projectId: string;

  title: string;
  description: string;

  journeyStepId: string | null;
  uiAreaId: string | null;

  phase: Phase;
  status: FeatureStatus;

  notes: string | null;
  acceptanceCriteria: string[];
  tags: string[];

  createdAt: string;
  updatedAt: string;
}

export interface FeatureDependency {
  id: string;
  projectId: string;
  fromFeatureId: string;
  toFeatureId: string;
}

export interface ResearchSource {
  id: string;
  projectId: string;

  url: string;
  title: string | null;
  summary: string;
  snippet: string | null;
  relevance: number; // 0-100
  status: "kept" | "discarded" | "unknown";

  createdAt: string;
}

export interface ExportArtifact {
  id: string;
  projectId: string;

  kind: "prd" | "worklist" | "ui_spec" | "data_spec";
  format: "markdown" | "json";
  content: string;

  createdAt: string;
}

export interface AIRun {
  id: string;
  projectId: string;

  purpose:
    | "prior_art_scan"
    | "feature_extract"
    | "grouping"
    | "mvp_cutline"
    | "export_prd"
    | "export_worklist"
    | "export_ui_spec"
    | "export_data_spec";

  model: string;
  durationMs: number;

  inputHash: string;
  promptTemplateId: string;

  createdAt: string;
}

export interface ProjectBoard {
  project: Project;
  journeySteps: JourneyStep[];
  uiAreas: UIArea[];
  features: Feature[];
}
