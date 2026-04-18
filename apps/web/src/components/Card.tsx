import type { PropsWithChildren, ReactNode } from "react";

interface CardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ title, subtitle, action, children }: CardProps) {
  return (
    <section
      style={{
        border: "1px solid #262f3c",
        borderRadius: 16,
        padding: 20,
        background: "#141922",
        boxShadow: "0 10px 26px rgba(0,0,0,0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "8px 0 0",
                color: "#8b98aa",
                fontSize: 14,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
