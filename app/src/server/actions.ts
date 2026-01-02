import { action } from "@solidjs/router";

import type { Feature, FeatureStatus, Phase } from "~/lib/domain";
import { db } from "~/server/db";

export const createProject = action(async (input: { name: string; ideaRaw: string }) => {
  "use server";
  return await db().createProject(input);
}, "projects:create");

export const addJourneyStep = action(async (input: { projectId: string; name: string }) => {
  "use server";
  return await db().addJourneyStep(input.projectId, input.name);
}, "project:journeyStep:add");

export const addUIArea = action(async (input: { projectId: string; name: string }) => {
  "use server";
  return await db().addUIArea(input.projectId, input.name);
}, "project:uiArea:add");

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


