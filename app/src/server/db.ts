import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AIRun,
  ExportArtifact,
  Feature,
  FeatureDependency,
  JourneyStep,
  Project,
  ProjectBoard,
  ResearchSource,
  UIArea,
} from "~/lib/domain";

type DbData = {
  projects: Project[];
  journeySteps: JourneyStep[];
  uiAreas: UIArea[];
  features: Feature[];
  featureDependencies: FeatureDependency[];
  researchSources: ResearchSource[];
  exportArtifacts: ExportArtifact[];
  aiRuns: AIRun[];
};

const DEFAULT_JOURNEY_STEPS = ["Onboarding", "Core Action", "Review / Share"];
const DEFAULT_UI_AREAS = ["Landing", "Auth", "Dashboard", "Settings"];

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function getDbFilePath() {
  // For local dev: write to repo directory.
  // Note: this is not suitable for serverless runtime persistence.
  return path.join(process.cwd(), "data", "db.json");
}

function emptyData(): DbData {
  return {
    projects: [],
    journeySteps: [],
    uiAreas: [],
    features: [],
    featureDependencies: [],
    researchSources: [],
    exportArtifacts: [],
    aiRuns: [],
  };
}

class JsonDb {
  private writeQueue: Promise<void> = Promise.resolve();

  private async readData(): Promise<DbData> {
    const filePath = getDbFilePath();
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as DbData;
      return {
        ...emptyData(),
        ...parsed,
      };
    } catch (err: any) {
      if (err?.code === "ENOENT") return emptyData();
      throw err;
    }
  }

  private async writeData(data: DbData): Promise<void> {
    const filePath = getDbFilePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  private async mutate<T>(fn: (data: DbData) => T | Promise<T>): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.readData();
      result = await fn(data);
      await this.writeData(data);
    });
    await this.writeQueue;
    return result;
  }

  async listProjects(): Promise<Project[]> {
    const data = await this.readData();
    return [...data.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(projectId: string): Promise<Project | null> {
    const data = await this.readData();
    return data.projects.find((p) => p.id === projectId) ?? null;
  }

  async createProject(input: { name: string; ideaRaw: string }): Promise<Project> {
    const name = input.name.trim();
    const ideaRaw = input.ideaRaw.trim();
    if (!name) throw new Error("Project name is required");

    return this.mutate((data) => {
      const createdAt = nowIso();
      const project: Project = {
        id: id(),
        name,
        ideaRaw,
        createdAt,
        updatedAt: createdAt,
      };
      data.projects.push(project);

      DEFAULT_JOURNEY_STEPS.forEach((stepName, idx) => {
        data.journeySteps.push({
          id: id(),
          projectId: project.id,
          name: stepName,
          order: idx,
        });
      });

      DEFAULT_UI_AREAS.forEach((areaName, idx) => {
        data.uiAreas.push({
          id: id(),
          projectId: project.id,
          name: areaName,
          order: idx,
        });
      });

      return project;
    });
  }

  async getProjectBoard(projectId: string): Promise<ProjectBoard> {
    const data = await this.readData();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) throw new Error("Project not found");

    const journeySteps = data.journeySteps
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    const uiAreas = data.uiAreas
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    const features = data.features
      .filter((f) => f.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return { project, journeySteps, uiAreas, features };
  }

  async addJourneyStep(projectId: string, name: string): Promise<JourneyStep> {
    const stepName = name.trim();
    if (!stepName) throw new Error("Journey step name is required");

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const order =
        Math.max(-1, ...data.journeySteps.filter((s) => s.projectId === projectId).map((s) => s.order)) + 1;

      const step: JourneyStep = { id: id(), projectId, name: stepName, order };
      data.journeySteps.push(step);
      project.updatedAt = nowIso();
      return step;
    });
  }

  async updateJourneyStep(input: { projectId: string; journeyStepId: string; name: string }): Promise<JourneyStep> {
    const name = input.name.trim();
    if (!name) throw new Error("Journey step name is required");

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const step = data.journeySteps.find((s) => s.id === input.journeyStepId && s.projectId === input.projectId);
      if (!step) throw new Error("Journey step not found");

      step.name = name;
      project.updatedAt = nowIso();
      return step;
    });
  }

  async addUIArea(projectId: string, name: string): Promise<UIArea> {
    const areaName = name.trim();
    if (!areaName) throw new Error("UI area name is required");

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const order =
        Math.max(-1, ...data.uiAreas.filter((a) => a.projectId === projectId).map((a) => a.order)) + 1;

      const area: UIArea = { id: id(), projectId, name: areaName, order };
      data.uiAreas.push(area);
      project.updatedAt = nowIso();
      return area;
    });
  }

  async updateUIArea(input: { projectId: string; uiAreaId: string; name: string }): Promise<UIArea> {
    const name = input.name.trim();
    if (!name) throw new Error("UI area name is required");

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const area = data.uiAreas.find((a) => a.id === input.uiAreaId && a.projectId === input.projectId);
      if (!area) throw new Error("UI area not found");

      area.name = name;
      project.updatedAt = nowIso();
      return area;
    });
  }

  async createFeature(input: {
    projectId: string;
    title: string;
    description: string;
    journeyStepId: string | null;
    uiAreaId: string | null;
    phase: Feature["phase"];
    status: Feature["status"];
  }): Promise<Feature> {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new Error("Feature title is required");

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const createdAt = nowIso();
      const feature: Feature = {
        id: id(),
        projectId: input.projectId,
        title,
        description,
        journeyStepId: input.journeyStepId,
        uiAreaId: input.uiAreaId,
        phase: input.phase,
        status: input.status,
        notes: null,
        acceptanceCriteria: [],
        tags: [],
        createdAt,
        updatedAt: createdAt,
      };
      data.features.push(feature);
      project.updatedAt = nowIso();
      return feature;
    });
  }

  async updateFeature(input: {
    projectId: string;
    featureId: string;
    patch: Partial<
      Pick<
        Feature,
        "title" | "description" | "journeyStepId" | "uiAreaId" | "phase" | "status" | "notes" | "tags" | "acceptanceCriteria"
      >
    >;
  }): Promise<Feature> {
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const feature = data.features.find((f) => f.id === input.featureId && f.projectId === input.projectId);
      if (!feature) throw new Error("Feature not found");

      const patch = { ...input.patch } as any;
      if (typeof patch.title === "string") patch.title = patch.title.trim();
      if (typeof patch.description === "string") patch.description = patch.description.trim();

      Object.assign(feature, patch);
      feature.updatedAt = nowIso();
      project.updatedAt = nowIso();
      return feature;
    });
  }

  async deleteFeature(input: { projectId: string; featureId: string }): Promise<void> {
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      data.features = data.features.filter((f) => !(f.projectId === input.projectId && f.id === input.featureId));
      data.featureDependencies = data.featureDependencies.filter(
        (d) => !(d.projectId === input.projectId && (d.fromFeatureId === input.featureId || d.toFeatureId === input.featureId)),
      );

      project.updatedAt = nowIso();
    });
  }
}

let singleton: JsonDb | null = null;

export function db() {
  if (!singleton) singleton = new JsonDb();
  return singleton;
}


