import { useGetGame, useListDrawnNumbers, useListGameCards, useDeclareBingo, getGetGameQueryKey } from "@workspace/api-client-react";
import { useGameRoom } from "@/hooks/use-game-room";
import { useParams } from "wouter";
import { Loader2, Trophy } from "lucide-react";
import { ChatPanel } from "@/components/game/ChatPanel";
import { BingoCard } from "@/components/game/BingoCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

export default function PlayerGameRoom() {
  const { id } = useParams();
  const gameId = parseInt(id || "0");
  useGameRoom(gameId);

  const { data: game, isLoading: loadGame } = useGetGame(gameId);
  const { data: drawnNumbers, isLoading: loadNums } = useListDrawnNumbers(gameId);
  const { data: cards, isLoading: loadCards } = useListGameCards(gameId);
  
  const declareBingo = useDeclareBingo();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (loadGame || loadCards) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!game) return null;

  const drawnNums = drawnNumbers?.map(d => d.number) || [];
  const history = drawnNumbers ? [...drawnNumbers].reverse().slice(0, 8) : [];
  const lastDrawn = history[0];

  const handleBingo = async (cardId: number) => {
    try {
      const res = await declareBingo.mutateAsync({ id: gameId, data: { cardId } });
      if (res.valid) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        toast({ title: "BINGO VALIDÉ !", description: "Félicitations, vous avez gagné !", className: "bg-green-500 text-white" });
      } else {
        toast({ variant: "destructive", title: "Bingo Invalide", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  const myCard = cards?.[0]; // Assuming player has 1 card for simple layout, or map them

  const checkBingo = (card: any, drawn: number[]) => {
    const drawnSet = new Set(drawn);
    // Rows
    for (let r = 0; r < 5; r++) {
      if (card.grid[r].every((num: any) => num === null || drawnSet.has(num))) return true;
    }
    // Cols
    for (let c = 0; c < 5; c++) {
      let colWin = true;
      for (let r = 0; r < 5; r++) {
        const num = card.grid[r][c];
        if (num !== null && !drawnSet.has(num)) colWin = false;
      }
      if (colWin) return true;
    }
    // Diags
    let diag1 = true, diag2 = true;
    for (let i = 0; i < 5; i++) {
      const n1 = card.grid[i][i];
      const n2 = card.grid[i][4 - i];
      if (n1 !== null && !drawnSet.has(n1)) diag1 = false;
      if (n2 !== null && !drawnSet.has(n2)) diag2 = false;
    }
    if (diag1 || diag2) return true;
    
    // Check if gameType requires full card
    if (game.gameType === "full_card" || game.gameType === "coverall") {
      let full = true;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const num = card.grid[r][c];
          if (num !== null && !drawnSet.has(num)) full = false;
        }
      }
      return full;
    }

    return false;
  };

  const hasBingoLocal = myCard ? checkBingo(myCard, drawnNums) : false;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-primary">{game.name}</h1>
          <div className="text-sm text-muted-foreground capitalize">{game.gameType.replace('_', ' ')} • {game.status}</div>
        </div>
        
        {/* Draw History */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
          {history.length > 0 ? history.map((h, i) => (
            <div key={h.id} className={`flex-shrink-0 flex items-center justify-center font-bold border rounded-lg transition-all ${
              i === 0 ? 'w-16 h-16 text-2xl border-primary bg-primary/10 text-primary shadow-lg animate-in zoom-in' : 'w-12 h-12 text-sm bg-card text-muted-foreground opacity-70'
            }`}>
              {h.column}{h.number}
            </div>
          )) : (
            <div className="text-sm text-muted-foreground italic">Aucun tirage</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Player Card */}
        <div className="lg:col-span-2 space-y-8 flex flex-col items-center">
          {game.status === 'pending' && (
            <div className="glass p-8 rounded-2xl w-full text-center">
              <div className="text-6xl mb-4 animate-bounce">⏳</div>
              <h2 className="text-2xl font-bold mb-2">En attente de l'organisateur</h2>
              <p className="text-muted-foreground">La partie n'a pas encore commencé. Préparez-vous !</p>
            </div>
          )}

          {!myCard ? (
            <div className="glass p-8 rounded-2xl w-full text-center text-muted-foreground">
              Vous n'avez pas de carton pour cette partie.
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <BingoCard card={myCard} drawnNumbers={drawnNums} />
              
              <Button 
                size="lg" 
                className="mt-8 px-12 py-8 text-2xl font-black h-auto bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-2xl hover:scale-110 transition-transform animate-pulse border-4 border-yellow-200"
                onClick={() => handleBingo(myCard.id)}
                disabled={game.status !== 'active' || declareBingo.isPending}
              >
                {declareBingo.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "🎉 BINGO !"}
              </Button>
            </div>
          )}
        </div>

        {/* Side Column: Chat */}
        <div className="space-y-6">
          <ChatPanel gameId={gameId} />
        </div>
      </div>
    </div>
  );
}
