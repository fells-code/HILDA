export const plannerJsonSchema = {
  name: "hilda_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
      },
      impactedFiles: {
        type: "array",
        items: { type: "string" },
      },
      steps: {
        type: "array",
        items: { type: "string" },
      },
      risks: {
        type: "array",
        items: { type: "string" },
      },
      validation: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["summary", "assumptions", "impactedFiles", "steps", "risks", "validation"],
  },
} as const;
