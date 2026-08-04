import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../lib/socket";
import {
  getListDrawnNumbersQueryKey,
  getGetGameQueryKey,
  getListMessagesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/components/ui/use-toast";

export function useGameRoom(gameId: number | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();
    socket.emit("join_room", `game:${gameId}`);

    const onNumberDrawn = () => {
      queryClient.invalidateQueries({ queryKey: getListDrawnNumbersQueryKey(gameId) });
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
    };

    const onBingoDeclared = (data: { winnerName: string }) => {
      toast({
        title: "🎉 BINGO !",
        description: `${data.winnerName} a fait BINGO !`,
        variant: "default",
        className: "bg-primary text-primary-foreground border-none text-2xl font-bold p-6 shadow-xl animate-in zoom-in duration-300",
      });
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
    };

    const onGameStarted = () => {
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
      toast({
        title: "Le jeu commence !",
        description: "Préparez vos cartons !",
      });
    };

    const onGameClosed = () => {
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
      toast({
        title: "Le jeu est terminé",
        description: "Merci d'avoir joué !",
      });
    };

    const onChatMessage = () => {
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(gameId) });
    };

    socket.on("number:drawn", onNumberDrawn);
    socket.on("bingo:declared", onBingoDeclared);
    socket.on("game:started", onGameStarted);
    socket.on("game:closed", onGameClosed);
    socket.on("chat:message", onChatMessage);

    return () => {
      socket.off("number:drawn", onNumberDrawn);
      socket.off("bingo:declared", onBingoDeclared);
      socket.off("game:started", onGameStarted);
      socket.off("game:closed", onGameClosed);
      socket.off("chat:message", onChatMessage);
      socket.emit("leave_room", `game:${gameId}`);
    };
  }, [gameId, queryClient, toast]);
}
