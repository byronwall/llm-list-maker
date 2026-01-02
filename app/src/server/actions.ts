import { action } from "@solidjs/router";

import type { Feature, FeatureStatus, Phase } from "~/lib/domain";
import { db } from "~/server/db";
import { generateCoreSectionSuggestions, type CoreSection } from "~/server/ai";

export const createProject = action(async (input: { name: string; ideaRaw: string }) => {
  "use server";
  return await db().createProject(input);
}, "projects:create");

export const addJourneyStep = action(async (input: { projectId: string; name: string }) => {
  "use server";
  return await db().addJourneyStep(input.projectId, input.name);
}, "project:journeyStep:add");

export const updateJourneyStep = action(
  async (input: { projectId: string; journeyStepId: string; name: string }) => {
    "use server";
    return await db().updateJourneyStep(input);
  },
  "project:journeyStep:update",
);

export const addUIArea = action(async (input: { projectId: string; name: string }) => {
  "use server";
  return await db().addUIArea(input.projectId, input.name);
}, "project:uiArea:add");

export const updateUIArea = action(
  async (input: { projectId: string; uiAreaId: string; name: string }) => {
    "use server";
    return await db().updateUIArea(input);
  },
  "project:uiArea:update",
);

export const createFeature = action(
  async (input: {
    projectId: string;
    title: string;
    description: string;
    journeyStepId: string | null;
    uiAreaId: string | null;
    phase: Phase;
    status: FeatureStatus;
  }) => {
    "use server";
    return await db().createFeature(input);
  },
  "project:feature:create",
);

export const updateFeature = action(
  async (input: { projectId: string; featureId: string; patch: Partial<Feature> }) => {
    "use server";
    return await db().updateFeature({
      projectId: input.projectId,
      featureId: input.featureId,
      patch: input.patch,
    });
  },
  "project:feature:update",
);

export const deleteFeature = action(async (input: { projectId: string; featureId: string }) => {
  "use server";
  await db().deleteFeature(input);
}, "project:feature:delete");

export const generateCoreSection = action(
  async (input: { projectId: string; section: CoreSection }) => {
    "use server";

    const board = await db().getProjectBoard(input.projectId);

    const aiResult = await generateCoreSectionSuggestions({
      section: input.section,
      projectName: board.project.name,
      ideaRaw: board.project.ideaRaw,
      existingJourneySteps: board.journeySteps.map((s) => s.name),
      existingUIAreas: board.uiAreas.map((a) => a.name),
      existingFeatureTitles: board.features.map((f) => f.title),
    });

    if (input.section === "journeySteps") {
      const names = (aiResult.object as any).items as string[];
      const created = [];
      const existing = new Set(board.journeySteps.map((s) => s.name.toLowerCase()));
      for (const raw of names) {
        const name = String(raw ?? "").trim();
        if (!name) continue;
        if (existing.has(name.toLowerCase())) continue;
        created.push(await db().addJourneyStep(input.projectId, name));
        existing.add(name.toLowerCase());
      }
      return { section: input.section, createdCount: created.length, created };
    }

    if (input.section === "uiAreas") {
      const names = (aiResult.object as any).items as string[];
      const created = [];
      const existing = new Set(board.uiAreas.map((a) => a.name.toLowerCase()));
      for (const raw of names) {
        const name = String(raw ?? "").trim();
        if (!name) continue;
        if (existing.has(name.toLowerCase())) continue;
        created.push(await db().addUIArea(input.projectId, name));
        existing.add(name.toLowerCase());
      }
      return { section: input.section, createdCount: created.length, created };
    }

    const features = (aiResult.object as any).items as { title: string; description: string }[];
    const created = [];
    const existing = new Set(board.features.map((f) => f.title.toLowerCase()));
    for (const f of features) {
      const title = String(f?.title ?? "").trim();
      const description = String(f?.description ?? "").trim();
      if (!title) continue;
      if (existing.has(title.toLowerCase())) continue;
      created.push(
        await db().createFeature({
          projectId: input.projectId,
          title,
          description,
          journeyStepId: null,
          uiAreaId: null,
          phase: "MVP",
          status: "accepted",
        }),
      );
      existing.add(title.toLowerCase());
    }

    return { section: input.section, createdCount: created.length, created };
  },
  "project:ai:generateCoreSection",
);


