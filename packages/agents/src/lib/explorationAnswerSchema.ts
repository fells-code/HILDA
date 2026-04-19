export const explorationAnswerJsonSchema = {
  name: "hilda_exploration_answer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
      },
      answer: {
        type: "string",
      },
      metrics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string" },
          },
          required: ["label", "value"],
        },
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            items: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["title", "items"],
        },
      },
      evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string" },
          },
          required: ["label", "value"],
        },
      },
    },
    required: ["title", "answer", "metrics", "sections", "evidence"],
  },
} as const;
