import { useState } from "react";
import { useGetMe, useUpdateUser, useCreateOrganizerRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Send } from "lucide-react";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const updateUser = useUpdateUser();
  const createRequest = useCreateOrganizerRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [requestMsg, setRequestMsg] = useState("");

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  // Set initial state
  if (!name && user.name) setName(user.name);

  const handleSaveProfile = async () => {
    try {
      await updateUser.mutateAsync({ id: user.id, data: { name } });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profil mis à jour" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  const handleSendRequest = async () => {
    try {
      await createRequest.mutateAsync({ data: { message: requestMsg } });
      toast({ title: "Demande envoyée", description: "Un administrateur va l'examiner prochainement." });
      setRequestMsg("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black tracking-tight text-primary">Mon Profil</h1>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Général</TabsTrigger>
          {user.role === "player" && <TabsTrigger value="organizer">Devenir Organisateur</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card className="glass border-none shadow-lg">
            <CardHeader>
              <CardTitle>Informations Personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={user.email} disabled className="bg-muted" />
              </div>
              <Button onClick={handleSaveProfile} disabled={updateUser.isPending || name === user.name}>
                {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Enregistrer
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-none shadow-lg">
            <CardHeader>
              <CardTitle>Préférences</CardTitle>
              <CardDescription>Choisissez votre thème polynésien préféré</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ThemeSwitcher />
                <span className="text-muted-foreground">Modifier le thème</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === "player" && (
          <TabsContent value="organizer" className="mt-6">
            <Card className="glass border-none shadow-lg bg-primary/5">
              <CardHeader>
                <CardTitle>Devenir Organisateur</CardTitle>
                <CardDescription>
                  Vous souhaitez organiser vos propres parties de Bingo ? Envoyez une demande à l'administration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pourquoi souhaitez-vous devenir organisateur ?</label>
                  <Textarea 
                    value={requestMsg} 
                    onChange={(e) => setRequestMsg(e.target.value)} 
                    placeholder="Expliquez brièvement votre projet..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button onClick={handleSendRequest} disabled={createRequest.isPending || requestMsg.length < 10} className="w-full">
                  {createRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Send className="w-4 h-4 mr-2" /> Envoyer la demande
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
