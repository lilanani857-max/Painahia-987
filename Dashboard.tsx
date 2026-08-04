import { useGetPlayerDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket, Trophy, Coins, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PlayerDashboard() {
  const { data: dash, isLoading } = useGetPlayerDashboard();

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!dash) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black tracking-tight text-primary">Mon Espace</h1>
        <Link href="/player/games">
          <Button size="lg" className="animate-pulse shadow-lg shadow-primary/20">
            <PlayCircle className="w-5 h-5 mr-2" /> Rejoindre une partie
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parties Actives</CardTitle>
            <PlayCircle className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{dash.activeGames}</div>
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mes Cartons</CardTitle>
            <Ticket className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{dash.totalCards}</div>
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Victoires</CardTitle>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{dash.totalWins}</div>
          </CardContent>
        </Card>
        
        <Card className="glass border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gains Totaux</CardTitle>
            <Coins className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{dash.totalWinnings.toLocaleString()} F</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass border-none shadow-lg">
          <CardHeader>
            <CardTitle>Parties Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!dash.recentGames?.length ? (
              <div className="text-muted-foreground">Aucune partie récente.</div>
            ) : (
              <div className="space-y-4">
                {dash.recentGames.map((game) => (
                  <div key={game.id} className="flex items-center justify-between p-4 rounded-xl bg-card border hover:border-primary/50 transition-colors">
                    <div>
                      <div className="font-bold">{game.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">{game.status} - {new Date(game.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Link href={`/player/games/${game.id}`}>
                      <Button variant="outline" size="sm">Entrer</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-lg">
          <CardHeader>
            <CardTitle>Mes derniers cartons</CardTitle>
          </CardHeader>
          <CardContent>
            {!dash.myCards?.length ? (
              <div className="text-muted-foreground">Vous n'avez acheté aucun carton.</div>
            ) : (
              <div className="space-y-4">
                {dash.myCards.slice(0, 5).map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-4 rounded-xl bg-card border">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-8 h-8 text-primary" />
                      <div>
                        <div className="font-bold">Carton #{card.id}</div>
                        <div className="text-sm text-muted-foreground">Acheté le {new Date(card.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/player/cards">
                  <Button variant="link" className="w-full text-muted-foreground">Voir tous mes cartons</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
