import { useListGames, useCreateCard, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Ticket, Info } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";

export default function PlayerGames() {
  const { data: games, isLoading } = useListGames({ status: "pending" }); // show pending/active
  const { data: user } = useGetMe();
  const createCard = useCreateCard();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [buyGame, setBuyGame] = useState<any>(null);

  const handleBuy = async () => {
    if (!buyGame || !user) return;
    try {
      await createCard.mutateAsync({ data: { userId: user.id }, id: buyGame.id } as any);
      toast({ title: "Carton acheté !", description: "Vous êtes inscrit à la partie." });
      setBuyGame(null);
      setLocation(`/player/games/${buyGame.id}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur d'achat", description: e.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black tracking-tight text-primary">Parties Disponibles</h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !games?.length ? (
        <Card className="glass border-none shadow-lg text-center p-12">
          <div className="text-6xl mb-4">🌺</div>
          <h2 className="text-2xl font-bold mb-2">Aucune partie disponible</h2>
          <p className="text-muted-foreground">Revenez plus tard pour voir les nouvelles parties organisées.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map(game => (
            <Card key={game.id} className="glass border-none shadow-lg flex flex-col hover:-translate-y-1 transition-transform">
              <CardHeader className="pb-4 border-b bg-muted/10">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={game.status === "active" ? "default" : "secondary"} className="capitalize">
                    {game.status}
                  </Badge>
                  <span className="text-lg font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{game.cardPrice} F</span>
                </div>
                <CardTitle className="text-xl line-clamp-1" title={game.name}>{game.name}</CardTitle>
                <div className="text-sm text-muted-foreground">Par {game.organizerName}</div>
              </CardHeader>
              <CardContent className="flex-1 py-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Type de victoire</span>
                    <span className="font-medium capitalize">{game.gameType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Gagnants max</span>
                    <span className="font-medium">{game.maxWinners}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Joueurs inscrits</span>
                    <span className="font-medium">{game.playerCount || 0}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button className="w-full text-lg h-auto py-4 shadow-xl hover:scale-105 transition-transform" onClick={() => setBuyGame(game)}>
                  <Ticket className="w-5 h-5 mr-2" /> Acheter un carton
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!buyGame} onOpenChange={(o) => !o && setBuyGame(null)}>
        <DialogContent className="glass border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Confirmer l'achat</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'acheter un carton pour la partie.
            </DialogDescription>
          </DialogHeader>
          {buyGame && (
            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-xl border">
                <div className="font-bold">{buyGame.name}</div>
                <div className="text-2xl font-black text-primary">{buyGame.cardPrice} F</div>
              </div>
              <div className="flex gap-2 items-start text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p>En confirmant cet achat, le montant sera déduit de votre solde. Si la partie est annulée, vous serez remboursé.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyGame(null)}>Annuler</Button>
            <Button onClick={handleBuy} disabled={createCard.isPending} className="px-8 shadow-lg">
              {createCard.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Payer {buyGame?.cardPrice} F
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
