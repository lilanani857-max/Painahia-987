import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Ticket, Users, Trophy } from "lucide-react";

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Decorative Ocean Waves Background */}
      <div className="absolute inset-0 polynesian-pattern opacity-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center p-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🌺</div>
          <div className="text-2xl font-black tracking-tighter text-primary">PA'INA 987</div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <Button variant="outline" className="glass" onClick={() => setAuthOpen(true)}>Connexion</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 -mt-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary font-medium mb-8 animate-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          Le Bingo Polynésien connecté
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6 max-w-4xl animate-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          L'ambiance des îles, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">où que vous soyez.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 animate-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          Rejoignez des parties en temps réel, achetez vos cartons virtuels et vivez la magie du bingo polynésien avec vos amis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <Button size="lg" className="text-lg px-8 py-6 h-auto shadow-xl hover:scale-105 transition-transform" onClick={() => setAuthOpen(true)}>
            Jouer maintenant
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto glass hover:scale-105 transition-transform" onClick={() => setAuthOpen(true)}>
            Devenir Organisateur
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 animate-in fade-in duration-1000 delay-700 fill-mode-both">
          {[
            { icon: Ticket, title: "Cartons Numériques", desc: "Plus besoin de papier, tout est sur votre écran." },
            { icon: Users, title: "Multijoueur en Direct", desc: "Chattez et jouez avec des centaines de joueurs." },
            { icon: Trophy, title: "Gains Automatiques", desc: "Le système détecte les BINGO automatiquement." }
          ].map((feat, i) => (
            <div key={i} className="glass p-6 rounded-2xl flex flex-col items-center text-center space-y-4 hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <feat.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">{feat.title}</h3>
              <p className="text-muted-foreground">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
