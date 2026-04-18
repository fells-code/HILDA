import { buildPlan } from "./buildPlan";
import { getOpenAIClient, getPlannerModel } from "./openai";
import { plannerJsonSchema } from "./plannerSchema";
import type { GeneratedPlan, PlanMatch } from "../state/planState";

export interface PlannerResult {
  plan: GeneratedPlan;
  mode: "llm" | "fallback";
  model?: string;
}

function formatEvidence(matches: PlanMatch[]): string {
  if (matches.length === 0) {
    return "No lexical evidence was found.";
  }

  return matches
    .slice(0, 8)
    .map((match, index) => {
      return [
        `Evidence ${index + 1}`,
        `Path: ${match.path}`,
        `Score: ${match.score}`,
        `Snippet: ${match.snippet}`,
      ].join("\n");
    })
    .join("\n\n");
}

export async function generatePlanWithLLM(
  prompt: string,
  matches: PlanMatch[],
): Promise<PlannerResult> {
  try {
    const client = getOpenAIClient();
    const model = getPlannerModel();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "developer",
          content: [
            "You are HILDA, a human-in-the-loop engineering planner.",
            "Generate a structured implementation plan grounded in repository evidence.",
            "Do not invent repository facts not supported by the provided evidence.",
            "Prefer small, safe changes.",
            "Keep impactedFiles limited to files that appear in or are directly suggested by the evidence.",
            "Assume approval is required before implementation.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Task request:\n${prompt}`,
            "",
            "Repository evidence:",
            formatEvidence(matches),
            "",
            "Return a structured engineering plan.",
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: plannerJsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Planner model returned no content");
    }

    return {
      plan: JSON.parse(content) as GeneratedPlan,
      mode: "llm",
      model,
    };
  } catch {
    return {
      plan: buildPlan(prompt, matches),
      mode: "fallback",
    };
  }
}
