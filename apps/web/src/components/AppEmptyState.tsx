import React from "react";
import { Card } from "./Card";
import { mutedTextStyle } from "../styles";

export function AppEmptyState({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: string;
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      <p style={mutedTextStyle}>{body}</p>
    </Card>
  );
}
