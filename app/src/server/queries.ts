import { query } from "@solidjs/router";

import type { Project, ProjectBoard } from "~/lib/domain";
import { db } from "~/server/db";

export const listProjects = query(async (): Promise<Project[]> => {
  "use server";
  return await db().listProjects();
}, "projects:list");

export const getProjectBoard = query(async (projectId: string): Promise<ProjectBoard> => {
  "use server";
  return await db().getProjectBoard(projectId);
}, "project:board");



