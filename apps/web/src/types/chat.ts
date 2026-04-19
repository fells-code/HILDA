export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  kind: "question" | "plan" | "patch" | "validation" | "system";
  title?: string;
  body: string;
}
