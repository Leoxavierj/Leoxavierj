// Elementos gráficos genéricos (estrelas, controle, ícones) em SVG simples.

export function Estrelas() {
  return (
    <div className="estrelas" aria-hidden="true">
      <svg className="estrela e1" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" /></svg>
      <svg className="estrela e2" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" /></svg>
      <svg className="estrela e3" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" /></svg>
      <svg className="pixel p1" viewBox="0 0 3 3"><path d="M1 0h1v1h1v1H2v1H1V2H0V1h1z" /></svg>
      <svg className="pixel p2" viewBox="0 0 3 3"><path d="M1 0h1v1h1v1H2v1H1V2H0V1h1z" /></svg>
      <svg className="pixel p3" viewBox="0 0 3 3"><path d="M1 0h1v1h1v1H2v1H1V2H0V1h1z" /></svg>
    </div>
  );
}

export function Controle() {
  return (
    <svg className="icon-controle" viewBox="0 0 40 24" aria-hidden="true">
      <rect x="1" y="2" width="38" height="20" rx="10" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9h3V6h3v3h3v3h-3v3h-3v-3H9z" fill="currentColor" />
      <circle cx="28" cy="9" r="2.2" fill="#ffd60a" />
      <circle cx="32" cy="13" r="2.2" fill="#ffd60a" />
      <circle cx="24" cy="13" r="2.2" fill="#fff" />
      <circle cx="28" cy="17" r="2.2" fill="#fff" />
    </svg>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "icon",
};

export function IconCalendario() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconRelogio() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconPin() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
