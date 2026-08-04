import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateGame } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(3, "Nom trop court"),
  cardPrice: z.coerce.number().min(0, "Prix invalide"),
  maxCards: z.coerce.number().min(1, "Au moins 1 carton"),
  maxWinners: z.coerce.number().min(1, "Au moins 1 gagnant"),
  gameType: z.enum(["classic", "line", "full_card", "coverall"]),
  startTime: z.string().optional(),
});

export default function OrganizerCreateGame() {
  const createGame = useCreateGame();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "Super Bingo du Vendredi",
      cardPrice: 500,
      maxCards: 100,
      maxWinners: 1,
      gameType: "classic",
      startTime: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      // Ensure startTime is ISO if provided, else undefined
      const payload = {
        ...data,
        startTime: data.startTime ? new Date(data.startTime).toISOString() : undefined,
      };
      
      const game = await createGame.mutateAsync({ data: payload });
      toast({ title: "Partie créée !", description: "Vous pouvez maintenant inviter des joueurs." });
      setLocation(`/organizer/games/${game.id}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black tracking-tight text-primary">Nouvelle Partie</h1>
      
      <Card className="glass border-none shadow-lg">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Définissez les règles de votre partie de Bingo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nom de la partie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cardPrice" render={({ field }) => (
                  <FormItem><FormLabel>Prix d'un carton (FCFP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxCards" render={({ field }) => (
                  <FormItem><FormLabel>Cartons max disponibles</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="gameType" render={({ field }) => (
                  <FormItem><FormLabel>Type de victoire</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="classic">Classique (Ligne, Col, Diag)</SelectItem>
                        <SelectItem value="line">Ligne uniquement</SelectItem>
                        <SelectItem value="full_card">Carton plein</SelectItem>
                        <SelectItem value="coverall">Coverall (Tous les numéros)</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxWinners" render={({ field }) => (
                  <FormItem><FormLabel>Nombre de gagnants</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem><FormLabel>Heure de début (Optionnel)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={createGame.isPending}>
                {createGame.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer la partie
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
