"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { HouseFilters } from "@/components/house-filters";
import { HouseTable, House } from "@/components/house-table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface HaeuserClientWrapperProps {
  haeuser: House[];
  serverAction: (formData: FormData) => Promise<void>;
}

export default function HaeuserClientWrapper({ haeuser, serverAction }: HaeuserClientWrapperProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [formData, setFormData] = useState({ name: "", strasse: "", ort: "" });
  const tableReloadRef = useRef<() => void>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = () => {
      setEditingHouse(null);
      setFormData({ name: "", strasse: "", ort: "" });
      setDialogOpen(true);
    };
    window.addEventListener("open-add-house-modal", handler);
    return () => window.removeEventListener("open-add-house-modal", handler);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingHouse(null);
      setFormData({ name: "", strasse: "", ort: "" });
    }
  };

  const handleEdit = useCallback((house: House) => {
    setEditingHouse(house);
    setFormData({ name: house.name, strasse: house.strasse ?? "", ort: house.ort });
    setDialogOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Häuser</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Häuser und Immobilien</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              {editingHouse ? "Haus bearbeiten" : "Haus hinzufügen"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingHouse ? "Haus bearbeiten" : "Haus hinzufügen"}</DialogTitle>
              <DialogDescription>
                {editingHouse ? "Aktualisiere die Hausinformationen." : "Gib die Hausinformationen ein."}
              </DialogDescription>
            </DialogHeader>
            <form action={serverAction} className="grid gap-4 py-4">
              {editingHouse && <input type="hidden" name="id" value={editingHouse.id} />}
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="strasse">Straße</Label>
                <Input
                  type="text"
                  id="strasse"
                  name="strasse"
                  value={formData.strasse}
                  onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ort">Ort</Label>
                <Input
                  type="text"
                  id="ort"
                  name="ort"
                  value={formData.ort}
                  onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">{editingHouse ? "Aktualisieren" : "Speichern"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Hausliste</CardTitle>
          <CardDescription>Hier können Sie Ihre Häuser verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HouseFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <HouseTable filter={filter} searchQuery={searchQuery} reloadRef={tableReloadRef} onEdit={handleEdit} initialHouses={haeuser} />
        </CardContent>
      </Card>
    </div>
  );
}
