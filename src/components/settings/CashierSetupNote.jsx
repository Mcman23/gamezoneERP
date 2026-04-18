import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function CashierSetupNote() {
  return (
    <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Kassir hesabı qurulması</p>
          <p className="text-xs text-muted-foreground">Əvvəlcə kassir cihazında bir dəfə normal giriş/qeydiyyat edin, sonra bu bölmədən həmin email-i kluba bağlayın və şifrə təyin edin.</p>
        </div>
      </div>
    </Card>
  );
}