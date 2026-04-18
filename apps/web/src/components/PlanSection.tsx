export function PlanSection({
  title,
  items,
  mutedTextStyle,
}: {
  title: string;
  items: string[];
  mutedTextStyle: any;
}) {
  return (
    <div>
      <div style={{ ...mutedTextStyle, marginBottom: 8 }}>{title}</div>
      <div
        style={{
          border: "1px solid #262f3c",
          borderRadius: 12,
          padding: 12,
          background: "#11161d",
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {items.map((item) => (
            <li
              key={item}
              style={{ marginBottom: 8, lineHeight: 1.5, color: "#d6dbe3" }}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
