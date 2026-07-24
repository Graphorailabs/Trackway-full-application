export default function TopCanvasToolbar() {
  return (
    <div
      aria-hidden
      className="absolute left-0 right-0"
      style={{
        top: 0,
        height: 5,
        background: "rgba(0,0,0,0.45)",
        pointerEvents: "auto",
        zIndex: 50,
      }}
    />
  );
}
