import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Download, RefreshCw, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

// Admin page to generate BAT scripts for each table's client machine
export default function KioskSetup() {
  const [copiedId, setCopiedId] = useState(null);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['kiosk-tables'],
    queryFn: () => base44.entities.GameTable.list('order_number', 100),
  });

  const appUrl = window.location.origin;
  const POLL_INTERVAL = 30; // seconds

  const generateBatScript = (table) => {
    const tableId = table.code || table.id;
    const endpointUrl = `${appUrl}/functions/getTableCommand`;

    return `@echo off
title GameZone Kiosk - ${tableId}
echo GameZone Kiosk Client is running for table: ${tableId}
echo Polling server every ${POLL_INTERVAL} seconds...
echo.

set TABLE_ID=${tableId}
set ENDPOINT=${endpointUrl}
set LAST_VERSION=

:LOOP
echo [%time%] Checking for updates...

:: Use PowerShell to call the API and process command
powershell -Command ^
  "$body = '{ \"table_id\": \"${tableId}\", \"last_version\": \"%LAST_VERSION%\" }'; ^
  $res = Invoke-RestMethod -Uri '${endpointUrl}' -Method POST -Body $body -ContentType 'application/json' -ErrorAction SilentlyContinue; ^
  if ($res.has_command -eq $true) { ^
    Write-Host 'NEW COMMAND: ' $res.command.cmd; ^
    $env:NEW_VERSION = $res.version; ^
    if ($res.command.cmd -eq 'RELOAD_MENU') { ^
      Start-Process 'chrome.exe' '--new-window ${appUrl}/kiosk?table_id=${tableId}' -ErrorAction SilentlyContinue; ^
    } ^
  } else { ^
    Write-Host 'No changes.'; ^
  }"

:: Wait before next poll
timeout /t ${POLL_INTERVAL} /nobreak > nul
goto LOOP
`;
  };

  const generatePwshScript = (table) => {
    const tableId = table.code || table.id;
    const endpointUrl = `${appUrl}/functions/getTableCommand`;
    const kioskUrl = `${appUrl}/kiosk?table_id=${tableId}`;

    return `# GameZone Kiosk Client — PowerShell version
# Table: ${tableId}
# Save as: gamezone_${tableId}.ps1 and run: powershell -ExecutionPolicy Bypass -File gamezone_${tableId}.ps1

$TableId = "${tableId}"
$Endpoint = "${endpointUrl}"
$KioskUrl = "${kioskUrl}"
$PollInterval = ${POLL_INTERVAL}
$LastVersion = ""

Write-Host "GameZone Kiosk starting for table: $TableId" -ForegroundColor Cyan

while ($true) {
    try {
        $body = @{ table_id = $TableId; last_version = $LastVersion } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri $Endpoint -Method POST -Body $body -ContentType "application/json"

        if ($res.has_command -eq $true) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] NEW COMMAND: $($res.command.cmd)" -ForegroundColor Green
            $LastVersion = $res.version

            if ($res.command.cmd -eq "RELOAD_MENU") {
                # Open/refresh Chrome with kiosk URL
                Start-Process "chrome.exe" "--new-window $KioskUrl"
            }
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] No changes. Version: $($res.version)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Connection error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds $PollInterval
}
`;
  };

  const downloadScript = (table, type) => {
    const tableId = table.code || table.id;
    const content = type === 'bat' ? generateBatScript(table) : generatePwshScript(table);
    const filename = type === 'bat' ? `gamezone_${tableId}.bat` : `gamezone_${tableId}.ps1`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} yükləndi`);
  };

  const copyKioskUrl = (table) => {
    const tableId = table.code || table.id;
    const url = `${appUrl}/kiosk?table_id=${tableId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('URL kopyalandı');
  };

  const categoryIcon = { computer: '🖥️', playstation: '🎮', cabinet: '🚪', simulator: '🕹️' };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Kiosk Quraşdırması</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Hər masanın kompüterinə quraşdırılacaq client skriptlər. Skript hər {POLL_INTERVAL} saniyədə bir server yoxlayır və yeni məhsul əlavə olunduqda avtomatik yenilənir.
          </p>
        </div>

        {/* How it works */}
        <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
          <p className="text-sm font-semibold text-foreground mb-3">Necə işləyir:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: '1', text: 'Admin məhsul əlavə edir və ya yeniləyir' },
              { step: '2', text: `Client skript ${POLL_INTERVAL}s-də bir server sorğusu atır` },
              { step: '3', text: 'Yeni versiya aşkarlanırsa Chrome avtomatik yenilənir' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {step}
                </span>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Table list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tables.map(table => {
              const tableId = table.code || table.id;
              const kioskUrl = `${appUrl}/kiosk?table_id=${tableId}`;
              return (
                <Card key={table.id} className="p-4 border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryIcon[table.category] || '🖥️'}</span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{table.name}</p>
                        <p className="text-xs text-muted-foreground">{tableId}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{table.hourly_rate} ₼/saat</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 break-all bg-secondary rounded px-2 py-1.5 font-mono">
                    {kioskUrl}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => copyKioskUrl(table)}
                    >
                      {copiedId === table.id
                        ? <><Check className="w-3 h-3 text-green-500" /> Kopyalandı</>
                        : <><Copy className="w-3 h-3" /> URL Kopyala</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-primary hover:bg-primary/90"
                      onClick={() => downloadScript(table, 'ps1')}
                    >
                      <Download className="w-3 h-3" /> .ps1 Yüklə
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1"
                      onClick={() => downloadScript(table, 'bat')}
                    >
                      <Download className="w-3 h-3" /> .bat Yüklə
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}