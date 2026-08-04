import { useState } from "react";
import { useListOrganizerRequests, useUpdateOrganizerRequest, getListOrganizerRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminOrganizerRequests() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const { data: requests, isLoading } = useListOrganizerRequests(statusFilter !== "all" ? { status: statusFilter as any } : undefined);
  const updateRequest = useUpdateOrganizerRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedReq, setSelectedReq] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");

  const handleAction = async () => {
    if (!selectedReq || !actionType) return;
    try {
      await updateRequest.mutateAsync({ id: selectedReq, data: { status: actionType, adminNote: note } });
      queryClient.invalidateQueries({ queryKey: getListOrganizerRequestsQueryKey() });
      toast({ title: "Demande traitée", description: `La demande a été ${actionType === "approved" ? "approuvée" : "rejetée"}.` });
      setSelectedReq(null);
      setNote("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black tracking-tight text-primary">Demandes d'Organisateurs</h1>
      
      <Card className="glass border-none shadow-lg">
        <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between">
          <CardTitle>Liste des demandes</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Rejetées</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !requests?.length ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">Aucune demande trouvée.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.userName}</div>
                      <div className="text-sm text-muted-foreground">{req.userEmail}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={req.message}>{req.message}</TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="icon" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => { setSelectedReq(req.id); setActionType("approved"); }}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => { setSelectedReq(req.id); setActionType("rejected"); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReq} onOpenChange={(o) => !o && setSelectedReq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approved" ? "Approuver la demande" : "Rejeter la demande"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Ajoutez une note (optionnel) :</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Raison de la décision..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReq(null)}>Annuler</Button>
            <Button onClick={handleAction} disabled={updateRequest.isPending}>
              {updateRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
