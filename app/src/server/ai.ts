import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

function getModel() {
  // OpenAI-compatible via Vercel AI SDK's OpenAI provider.
  // Requires: OPENAI_API_KEY
  const modelId = process.env.AI_MODEL || "gpt-5.2";
  return openai(modelId);
}

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set it in your environment to enable AI suggestions."
    );
  }
}

function normalizeTitle(s: unknown) {
  return String(s ?? "").trim();
}

export async function suggestLists(input: {
  projectTitle: string;
  projectDescription: string;
  existingListTitles: string[];
  userInput?: string;
}) {
  requireApiKey();

  const schema = z.object({
    lists: z
      .array(
        z.object({
          title: z.string().min(2),
          description: z.string().min(0).max(240),
        })
      )
      .min(3)
      .max(20),
  });

  const baseContext = [
    `Project: ${normalizeTitle(input.projectTitle)}`,
    `Description: ${normalizeTitle(input.projectDescription) || "(empty)"}`,
    `Existing lists: ${input.existingListTitles.join(" | ") || "(none)"}`,
  ].join("\n");

  const user = normalizeTitle(input.userInput);

  return await generateObject({
    model: getModel(),
    schema,
    prompt: [
      baseContext,
      "",
      user
        ? [
            "User instructions (highest priority):",
            '"""',
            user,
            '"""',
            "",
            "Heavily prioritize the user instructions above. If they conflict with the project description, follow the user instructions.",
            "If the user provides specific list names, use them verbatim (unless they duplicate existing lists).",
          ].join("\n")
        : "No user instructions were provided. Use the project context only.",
      "",
      "Suggest 3-20 list columns for organizing items in this project.",
      "Default to 3-7 unless the user explicitly asks for more (e.g. a list per year).",
      "Lists should be simple and reusable. Avoid duplicates with existing lists.",
      "Return JSON only via the provided schema.",
    ].join("\n"),
  });
}

export async function suggestItems(input: {
  projectTitle: string;
  projectDescription: string;
  lists: { title: string; description: string }[];
  existingItemLabels: string[];
  userInput?: string;
}) {
  requireApiKey();

  const schema = z.object({
    items: z
      .array(
        z.object({
          label: z.string().min(2),
          description: z.string().min(0).max(240),
          listTitleOrLoose: z.string().min(1),
        })
      )
      .min(5)
      .max(30),
  });

  const listTitles = input.lists.map((l) => l.title);
  const baseContext = [
    `Project: ${normalizeTitle(input.projectTitle)}`,
    `Description: ${normalizeTitle(input.projectDescription) || "(empty)"}`,
    `Lists: ${listTitles.join(" | ") || "(none)"}`,
    `Existing item labels: ${input.existingItemLabels.join(" | ") || "(none)"}`,
  ].join("\n");

  const user = normalizeTitle(input.userInput);

  return await generateObject({
    model: getModel(),
    schema,
    prompt: [
      baseContext,
      "",
      user
        ? [
            "User instructions (highest priority):",
            '"""',
            user,
            '"""',
            "",
            "Heavily prioritize the user instructions above. If they conflict with the project description, follow the user instructions.",
            "If the user provides specific items, turn them into items (and do not invent unrelated ones unless asked).",
            "If the user provides constraints (scope, audience, timeline), reflect them in the item labels/descriptions.",
          ].join("\n")
        : "No user instructions were provided. Use the project context only.",
      "",
      "Suggest 5-30 items to add to this board.",
      "If the user requests a specific count, aim to satisfy it (within limits).",
      'For each item, choose listTitleOrLoose as either an existing list title, or exactly the word "Loose".',
      "Avoid duplicates with existing item labels.",
      "Return JSON only via the provided schema.",
    ].join("\n"),
  });
}

export async function suggestItemsForList(input: {
  projectTitle: string;
  projectDescription: string;
  listTitle: string;
  listDescription?: string;
  existingItemLabels: string[];
  userInput?: string;
  maxItems: number;
}) {
  requireApiKey();

  const maxItems = Math.max(1, Math.min(20, Math.floor(input.maxItems)));

  const schema = z.object({
    items: z
      .array(
        z.object({
          label: z.string().min(2),
          description: z.string().min(0).max(240),
        })
      )
      .min(1)
      .max(maxItems),
  });

  const baseContext = [
    `Project: ${normalizeTitle(input.projectTitle)}`,
    `Description: ${normalizeTitle(input.projectDescription) || "(empty)"}`,
    `Target list: ${normalizeTitle(input.listTitle)}`,
    `Target list description: ${normalizeTitle(input.listDescription) || "(empty)"}`,
    `Existing item labels: ${input.existingItemLabels.join(" | ") || "(none)"}`,
  ].join("\n");

  const user = normalizeTitle(input.userInput);

  return await generateObject({
    model: getModel(),
    schema,
    prompt: [
      baseContext,
      "",
      user
        ? [
            "User instructions (highest priority):",
            '"""',
            user,
            '"""',
            "",
            "Heavily prioritize the user instructions above.",
          ].join("\n")
        : "No user instructions were provided. Use the project context only.",
      "",
      `Generate up to ${maxItems} items to add to the Target list (and ONLY that list).`,
      "Prefer returning the full count unless the user instructions make that impossible.",
      "Each label must be unique, concrete, and specific (do not output placeholders like 'Item 1').",
      "Avoid duplicates with existing item labels.",
      "Return JSON only via the provided schema.",
    ].join("\n"),
  });
}

export async function suggestReorg(input: {
  projectTitle: string;
  projectDescription: string;
  lists: { title: string; description: string }[];
  items: { label: string; description: string; listTitleOrLoose: string }[];
  userInput?: string;
}) {
  requireApiKey();

  const schema = z.object({
    moves: z
      .array(
        z.object({
          itemLabel: z.string().min(1),
          targetListTitleOrLoose: z.string().min(1),
          rationale: z.string().min(0).max(240).optional(),
        })
      )
      .min(1)
      .max(30),
  });

  const listTitles = input.lists.map((l) => l.title);
  const itemLines = input.items
    .map((it) => `- ${it.label} (${it.listTitleOrLoose})`)
    .join("\n");
  const baseContext = [
    `Project: ${normalizeTitle(input.projectTitle)}`,
    `Description: ${normalizeTitle(input.projectDescription) || "(empty)"}`,
    `Lists: ${listTitles.join(" | ") || "(none)"}`,
    "Items:",
    itemLines || "(none)",
  ].join("\n");

  const user = normalizeTitle(input.userInput);

  return await generateObject({
    model: getModel(),
    schema,
    prompt: [
      baseContext,
      "",
      user
        ? [
            "User instructions (highest priority):",
            '"""',
            user,
            '"""',
            "",
            "Heavily prioritize the user instructions above. If they conflict with the current board organization, follow the user instructions.",
            "If the user mentions how items should be grouped, treat that as the primary signal for moving items.",
          ].join("\n")
        : "No user instructions were provided. Use the project context only.",
      "",
      "Reorganize the board by proposing moves of existing items into better lists.",
      'targetListTitleOrLoose must be either an existing list title, or exactly the word "Loose".',
      "Only move items that clearly belong elsewhere. Leave items unmoved if unsure.",
      "Return JSON only via the provided schema.",
    ].join("\n"),
  });
}

export async function reviewBoard(input: {
  projectTitle: string;
  projectDescription: string;
  lists: { title: string; description: string }[];
  items: { label: string; description: string; listTitleOrLoose: string }[];
}) {
  requireApiKey();

  const schema = z.object({
    commentary: z.string().min(10),
    questions: z.array(z.string().min(5)).min(3).max(10),
  });

  const listTitles = input.lists.map((l) => l.title);
  const itemLines = input.items
    .map((it) => `- ${it.label} (${it.listTitleOrLoose})`)
    .join("\n");
  const baseContext = [
    `Project: ${normalizeTitle(input.projectTitle)}`,
    `Description: ${normalizeTitle(input.projectDescription) || "(empty)"}`,
    `Lists: ${listTitles.join(" | ") || "(none)"}`,
    "Items:",
    itemLines || "(none)",
  ].join("\n");

  return await generateObject({
    model: getModel(),
    schema,
    prompt: [
      baseContext,
      "",
      "Provide short commentary on the current organization.",
      "Then ask 3-10 high-signal questions to improve clarity, completeness, and structure.",
      "Return JSON only via the provided schema.",
    ].join("\n"),
  });
}
