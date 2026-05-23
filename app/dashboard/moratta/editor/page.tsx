"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ManualEditor } from '../components/ManualEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ManualEditorPage() {
  const router = useRouter();
  const [lotWidth, setLotWidth] = useState(10);
  const [lotLength, setLotLength] = useState(15);
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12">
        <div>
          <h1 className="text-2xl font-bold">Criar Planta do Zero</h1>
          <p className="text-muted-foreground mt-1">
            Defina as dimensões do terreno para começar a desenhar
          </p>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Largura (m)</Label>
              <Input
                id="width"
                type="number"
                min={5}
                max={100}
                step={0.5}
                value={lotWidth}
                onChange={(e) => setLotWidth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Comprimento (m)</Label>
              <Input
                id="length"
                type="number"
                min={5}
                max={200}
                step={0.5}
                value={lotLength}
                onChange={(e) => setLotLength(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Área total: <strong>{(lotWidth * lotLength).toFixed(0)}m²</strong>
          </div>

          <Button onClick={() => setStarted(true)} className="w-full" size="lg">
            Começar a desenhar
          </Button>
        </div>

        <Button variant="ghost" onClick={() => router.back()} className="w-full">
          ← Voltar
        </Button>
      </div>
    );
  }

  return <ManualEditor lotWidth={lotWidth} lotLength={lotLength} projectId="manual-draft" />;
}
