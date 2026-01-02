import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export type CoreSection = "journeySteps" | "uiAreas" | "features";

function getModel() {
  // OpenAI-compatible via Vercel AI SDK's OpenAI provider.
  // Requires: OPENAI_API_KEY
  const modelId = process.env.AI_MODEL || "gpt-4o-mini";
  return openai(modelId);
}

export async function generateCoreSectionSuggestions(input: {
  section: CoreSection;
  projectName: string;
  ideaRaw: string;
  existingJourneySteps: string[];
  existingUIAreas: string[];
  existingFeatureTitles: string[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment to enable AI suggestions.");
  }

  const baseContext = [
    `Project: ${input.projectName}`,
    `Idea: ${input.ideaRaw || "(empty)"}`,
    `Existing journey steps: ${input.existingJourneySteps.join(" | ") || "(none)"}`,
    `Existing UI areas: ${input.existingUIAreas.join(" | ") || "(none)"}`,
    `Existing feature titles: ${input.existingFeatureTitles.join(" | ") || "(none)"}`,
  ].join("\n");

  if (input.section === "journeySteps") {
    const schema = z.object({
      items: z.array(z.string().min(2)).min(3).max(5),
    });

    return await generateObject({
      model: getModel(),
      schema,
      prompt: [
        baseContext,
        "",
        "Generate 3-5 journey steps (user-facing phases) for this product.",
        "Return short names only. Avoid duplicates with existing journey steps.",
      ].join("\n"),
    });
  }

  if (input.section === "uiAreas") {
    const schema = z.object({
      items: z.array(z.string().min(2)).min(3).max(5),
    });

    return await generateObject({
      model: getModel(),
      schema,
      prompt: [
        baseContext,
        "",
        "Generate 3-5 UI areas (major surfaces/modules) for this product.",
        "Return short names only. Avoid duplicates with existing UI areas.",
      ].join("\n"),
    });
  }

  const schema = z.object({
    items: z
      .array(
        z.object({
          title: z.string().min(3),
          description: z.string().min(3),
        }),
      )
      .min(3)
      .max(5),
  });

  return await generateObject({
    model: getModel(),
    schema,
    prompt: [
      baseContext,
      "",
      "Generate 3-5 features for this product as title + short description.",
      "Keep features specific and actionable. Avoid duplicate titles.",
    ].join("\n"),
  });
}



