import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen bg-[oklch(0.25_0.08_250)] overflow-hidden flex items-center justify-center">
      {/* Efeito de água animado */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="water-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.4 0.15 250)" />
              <stop offset="100%" stopColor="oklch(0.2 0.1 250)" />
            </linearGradient>
          </defs>
          
          {/* Ondas animadas */}
          <g className="animate-wave-slow">
            <path
              d="M0,160 Q250,100 500,160 T1000,160 T1500,160 T2000,160 V400 H0 Z"
              fill="url(#water-gradient)"
              opacity="0.3"
            />
          </g>
          
          <g className="animate-wave-medium">
            <path
              d="M0,180 Q200,120 400,180 T800,180 T1200,180 T1600,180 T2000,180 V400 H0 Z"
              fill="url(#water-gradient)"
              opacity="0.4"
            />
          </g>
          
          <g className="animate-wave-fast">
            <path
              d="M0,200 Q150,140 300,200 T600,200 T900,200 T1200,200 T1500,200 T1800,200 T2100,200 V400 H0 Z"
              fill="url(#water-gradient)"
              opacity="0.5"
            />
          </g>
        </svg>
      </div>

      {/* Bolhas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-bubble"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 40 + 10}px`,
              height: `${Math.random() * 40 + 10}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
      </div>

      {/* Botão centralizado */}
      <div className="relative z-10">
        <Button
          onClick={() => setLocation("/main")}
          size="lg"
          className="text-xl px-12 py-8 bg-white/90 hover:bg-white text-[oklch(0.25_0.08_250)] font-semibold rounded-2xl shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105"
        >
          Clique aqui
        </Button>
      </div>
    </div>
  );
}
