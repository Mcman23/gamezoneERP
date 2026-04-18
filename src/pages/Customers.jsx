import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useClub, fetchClubEntities } from '@/hooks/useClub';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Search, Phone, Clock, DollarSign, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Customers() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.Customer, user, {}, '-last_visit', 500) : [],
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      (c.phone || '').includes(q) || (c.name || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalRevenue = customers.reduce((a, c) => a + (c.total_spent || 0), 0);
  const totalSessions = customers.reduce((a, c) => a + (c.total_sessions || 0), 0);

  const handleSave = async () => {
    await base44.entities.Customer.create({
      name: form.name,
      phone: form.phone,
      total_sessions: 0,
      total_spent: 0,
      club_owner_id: clubOwnerId,
    });
    queryClient.invalidateQueries({ queryKey: ['customers', clubOwnerId] });
    setDialogOpen(false);
    setForm({ name: '', phone: '' });
    toast.success('Müştəri əlavə edildi');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Müştərilər</h1>
          <p className="text-sm text-muted-foreground mt-1">Müştəri bazası və əl ilə əlavə etmə</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Müştəri əlavə et
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Ümumi müştəri</p>
          </div>
        </Card>
        <Card className="p-4 border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalRevenue.toFixed(2)} ₼</p>
            <p className="text-xs text-muted-foreground">Ümumi gəlir</p>
          </div>
        </Card>
        <Card className="p-4 border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Ümumi sessiya</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Ad və ya telefon axtar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground/20 mb-3" />
          <p className="text-base font-medium text-foreground mb-1">Müştəri tapılmadı</p>
          <p className="text-sm text-muted-foreground">Sessiya başladarkən telefon nömrəsi daxil edin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(customer => (
            <Card key={customer.id} className="p-4 border-border hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {(customer.name || customer.phone || '?')[0].toUpperCase()}
                </div>
                <div className="text-right">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {customer.total_sessions || 0} sessiya
                  </span>
                </div>
              </div>
              <p className="font-semibold text-foreground">{customer.name || 'Ad yoxdur'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ümumi xərc</p>
                  <p className="text-sm font-bold text-primary">{(customer.total_spent || 0).toFixed(2)} ₼</p>
                </div>
                {customer.last_visit && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Son ziyarət</p>
                    <p className="text-xs text-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(customer.last_visit), 'dd.MM.yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Yeni Müştəri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Ad</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="Ad Soyad" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefon *</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="050..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={handleSave} disabled={!form.phone} className="bg-primary hover:bg-primary/90 text-primary-foreground">Əlavə et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}