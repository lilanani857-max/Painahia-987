import { useGetPlayerDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PlayerCards() {
  const { data: dash, isLoading } = useGetPlayerDashboard();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black tracking-tight text-primary">Mes Cartons</h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !dash?.myCards?.length ? (
        <Card className="glass border-none shadow-lg text-center p-12">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold mb-2">Aucun carton</h2>
          <p className="text-muted-foreground mb-6">Vous n'avez pas encore acheté de carton.</p>
          <Link href="/player/games">
            <Button size="lg">Trouver une partie</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dash.myCards.map((card) => (
            <Card key={card.id} className="glass border-none shadow-lg hover:-translate-y-1 transition-transform flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center mb-2">
                  <Ticket className="w-6 h-6 text-primary" />
                  <span className="text-sm font-mono text-muted-foreground">#{card.id.toString().padStart(6, '0')}</span>
                </div>
                <CardTitle>Partie #{card.gameId}</CardTitle>
                <div className="text-sm text-muted-foreground">Acheté le {new Date(card.createdAt).toLocaleDateString()}</div>
              </CardHeader>
              <CardContent className="flex-1 flex items-end">
                <Link href={`/player/games/${card.gameId}`} className="w-full">
                  <Button className="w-full" variant="outline">Aller à la partie</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
