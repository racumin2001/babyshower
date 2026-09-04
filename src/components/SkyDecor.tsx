function Wash({ className }: { className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src="/watercolor-cloud.png?v=1"
      alt=""
    />
  );
}

export function SkyDecor() {
  return (
    <div className="sky-decor" aria-hidden="true">
      <Wash className="wash-cloud wc-1" />
      <Wash className="wash-cloud wc-2" />
      <Wash className="wash-cloud wc-3" />
      <Wash className="wash-cloud wc-4" />
      <Wash className="wash-cloud wc-5" />
    </div>
  );
}
