import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const IMPORT_TYPES = [
  {
    id: 'expenses',
    label: 'Xərclər',
    entity: 'Expense',
    fields: ['title', 'category', 'amount', 'date', 'note', 'payment_method'],
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string' },
        note: { type: 'string' },
        payment_method: { type: 'string' },
      },
    },
    sampleRows: [
      ['İşçi maaşı', 'staff', '500', '2024-01-15', 'Yanvar maaşı', 'cash'],
      ['Elektrik', 'utilities', '120', '2024-01-20', '', 'card'],
    ],
    required: ['title', 'category', 'amount', 'date'],
    categoryNote: 'category: staff, utilities, service, marketing, transport, purchases, other',
  },
  {
    id: 'products',
    label: 'Anbar / Məhsullar',
    entity: 'Product',
    fields: ['name', 'category', 'price', 'purchase_price', 'stock_quantity', 'unit'],
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        price: { type: 'number' },
        purchase_price: { type: 'number' },
        stock_quantity: { type: 'number' },
        unit: { type: 'string' },
      },
    },
    sampleRows: [
      ['Coca Cola', 'icki', '1.5', '0.8', '24', 'piece'],
      ['Çips', 'atistirmalik', '1.2', '0.6', '30', 'piece'],
    ],
    required: ['name', 'category', 'price'],
    categoryNote: 'category: yemek, icki, atistirmalik, diger | unit: piece, gram, portion',
  },
  {
    id: 'sessions',
    label: 'Sessiyalar (Keçmiş)',
    entity: 'Session',
    fields: ['table_name', 'table_category', 'start_time', 'end_time', 'duration_minutes', 'hourly_rate', 'session_cost', 'orders_cost', 'total_cost', 'payment_method'],
    schema: {
      type: 'object',
      properties: {
        table_name: { type: 'string' },
        table_category: { type: 'string' },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
        duration_minutes: { type: 'number' },
        hourly_rate: { type: 'number' },
        session_cost: { type: 'number' },
        orders_cost: { type: 'number' },
        total_cost: { type: 'number' },
        payment_method: { type: 'string' },
      },
    },
    sampleRows: [
      ['PC1', 'computer', '2024-01-10 14:00', '2024-01-10 16:00', '120', '2', '4', '0', '4', 'cash'],
    ],
    required: ['table_name', 'start_time'],
    categoryNote: 'table_category: computer, playstation, cabinet, simulator | payment_method: cash, card, mixed',
    transform: (row) => ({ ...row, status: 'completed', paid: true, table_id: row.table_id || '' }),
  },
  {
    id: 'orders',
    label: 'Sifarişlər (Keçmiş)',
    entity: 'Order',
    fields: ['table_name', 'total_amount', 'status'],
    schema: {
      type: 'object',
      properties: {
        table_name: { type: 'string' },
        total_amount: { type: 'number' },
        status: { type: 'string' },
      },
    },
    sampleRows: [
      ['PC1', '3.5', 'delivered'],
    ],
    required: ['table_name', 'total_amount'],
    categoryNote: 'status: pending, delivered, cancelled',
    transform: (row) => ({ ...row, table_id: row.table_id || '', session_id: row.session_id || '', items: row.items || [] }),
  },
];

function generateCSV(type) {
  const header = type.fields.join(',');
  const rows = type.sampleRows.map(r => r.join(',')).join('\n');
  return `${header}\n${rows}`;
}

function downloadSample(type) {
  const csv = generateCSV(type);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `numune_${type.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataImport() {
  const [selectedType, setSelectedType] = useState(IMPORT_TYPES[0]);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | preview | importing | done | error
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('idle');
    setPreview([]);
    setResult(null);
    setError('');
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setFile(null);
    setStatus('idle');
    setPreview([]);
    setResult(null);
    setError('');
  };

  const handleExtract = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStatus('uploading');
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: selectedType.schema,
          },
        },
      },
    });
    if (extracted.status !== 'success' || !extracted.output) {
      setError('Fayl oxuna bilmədi. Formatı yoxlayın.');
      setStatus('error');
      return;
    }
    const rows = Array.isArray(extracted.output) ? extracted.output : (extracted.output.rows || []);
    setPreview(rows.slice(0, 5));
    setResult({ allRows: rows });
    setStatus('preview');
  };

  const handleImport = async () => {
    if (!result?.allRows?.length) return;
    setStatus('importing');
    const entity = base44.entities[selectedType.entity];
    const rows = result.allRows.map(row => selectedType.transform ? selectedType.transform(row) : row);
    await entity.bulkCreate(rows);
    setStatus('done');
    setResult({ count: rows.length });
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setPreview([]);
    setResult(null);
    setError('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Məlumat İdxalı</h1>
        <p className="text-muted-foreground text-sm mt-1">Keçmiş tarixlərə aid məlumatları CSV və ya Excel faylı ilə sisteme əlavə edin</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {IMPORT_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => handleTypeChange(type)}
            className={cn(
              'p-3 rounded-xl border-2 text-left transition-all',
              selectedType.id === type.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            <FileSpreadsheet className="w-5 h-5 mb-1" />
            <p className="text-sm font-semibold">{type.label}</p>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground flex items-center justify-between">
            <span>📋 {selectedType.label} — Sahələr</span>
            <Button size="sm" variant="outline" onClick={() => downloadSample(selectedType)} className="gap-1.5 text-xs h-7">
              <Download className="w-3 h-3" /> Nümunə CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {selectedType.fields.map(f => (
              <Badge key={f} variant={selectedType.required?.includes(f) ? 'default' : 'secondary'} className="text-xs font-mono">
                {f}{selectedType.required?.includes(f) ? '*' : ''}
              </Badge>
            ))}
          </div>
          {selectedType.categoryNote && (
            <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">{selectedType.categoryNote}</p>
          )}
        </CardContent>
      </Card>

      {/* Upload */}
      {status === 'idle' || status === 'error' ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <label className={cn(
              'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all',
              file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40'
            )}>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{file ? file.name : 'Fayl seçin və ya buraya sürükləyin'}</p>
                <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS</p>
              </div>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            {file && (
              <Button onClick={handleExtract} className="mt-4 w-full gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Faylı Oxu və Önizlə
              </Button>
            )}
          </CardContent>
        </Card>
      ) : status === 'uploading' ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Fayl emal edilir...</p>
          </CardContent>
        </Card>
      ) : status === 'preview' ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground flex items-center justify-between">
              <span>Önizləmə (ilk 5 sətir) — Cəmi: {result.allRows.length} qeyd</span>
              <Button size="sm" variant="ghost" onClick={reset} className="text-xs">Sıfırla</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary">
                    {selectedType.fields.map(f => (
                      <th key={f} className="px-3 py-2 text-left text-muted-foreground font-medium">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {selectedType.fields.map(f => (
                        <td key={f} className="px-3 py-2 text-foreground max-w-[120px] truncate">{String(row[f] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleImport} className="w-full gap-2 bg-primary hover:bg-primary/90">
              <Upload className="w-4 h-4" /> {result.allRows.length} Qeydi Sisteme Əlavə Et
            </Button>
          </CardContent>
        </Card>
      ) : status === 'importing' ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Məlumatlar sisteme yazılır...</p>
          </CardContent>
        </Card>
      ) : status === 'done' ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex flex-col items-center gap-4 py-10">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{result.count} qeyd uğurla əlavə edildi!</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedType.label} bölməsindən yoxlaya bilərsiniz</p>
            </div>
            <Button onClick={reset} variant="outline">Yeni İdxal Et</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}