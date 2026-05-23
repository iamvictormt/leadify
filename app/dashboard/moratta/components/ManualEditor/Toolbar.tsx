"use client"

import type { EditorTool } from './types';

interface ToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFullscreen: () => void;
  isFullscreen: boolean;
  onExportPNG: () => void;
  doorStyle: 'arc' | 'frame';
  onDoorStyleChange: (style: 'arc' | 'frame') => void;
}

const tools: { id: EditorTool; label: string; icon: string; shortcut: string }[] = [
  { id: 'select', label: 'Selecionar', icon: '↖', shortcut: 'V' },
  { id: 'wall', label: 'Parede', icon: '▬', shortcut: 'W' },
  { id: 'box', label: 'Cômodo', icon: '▢', shortcut: 'B' },
  { id: 'door', label: 'Porta', icon: '🚪', shortcut: 'D' },
  { id: 'window', label: 'Janela', icon: '⊞', shortcut: 'J' },
  { id: 'room', label: 'Ambiente', icon: '⬜', shortcut: 'R' },
  { id: 'measure', label: 'Medir', icon: '📏', shortcut: 'M' },
  { id: 'eraser', label: 'Apagar', icon: '✕', shortcut: 'E' },
];

export function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFullscreen,
  isFullscreen,
  onExportPNG,
  doorStyle,
  onDoorStyleChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1.5 shadow-sm">
      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex h-9 w-9 items-center justify-center rounded-md text-sm hover:bg-muted disabled:opacity-30"
        title="Desfazer (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex h-9 w-9 items-center justify-center rounded-md text-sm hover:bg-muted disabled:opacity-30"
        title="Refazer (Ctrl+Shift+Z)"
      >
        ↪
      </button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`flex h-9 min-w-[36px] items-center justify-center rounded-md px-2 text-sm transition-colors ${
            activeTool === tool.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground'
          }`}
          title={`${tool.label} (${tool.shortcut})`}
        >
          <span className="text-base">{tool.icon}</span>
        </button>
      ))}

      <div className="flex-1" />

      {/* Door style toggle (visible when door tool active) */}
      {activeTool === 'door' && (
        <>
          <div className="mx-1 h-6 w-px bg-border" />
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              onClick={() => onDoorStyleChange('arc')}
              className={`flex h-7 items-center gap-1 rounded px-2 text-xs transition-colors ${
                doorStyle === 'arc' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              title="Porta solta (só arco)"
            >
              ◠ Solta
            </button>
            <button
              onClick={() => onDoorStyleChange('frame')}
              className={`flex h-7 items-center gap-1 rounded px-2 text-xs transition-colors ${
                doorStyle === 'frame' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              title="Porta com batente (quadrado)"
            >
              ▭ Batente
            </button>
          </div>
        </>
      )}

      {/* Export */}
      <button
        onClick={onExportPNG}
        className="flex h-9 items-center gap-1.5 rounded-md px-3 text-xs hover:bg-muted text-muted-foreground"
        title="Exportar PNG"
      >
        📥 <span className="hidden sm:inline">PNG</span>
      </button>

      {/* Fullscreen */}
      <button
        onClick={onFullscreen}
        className="flex h-9 w-9 items-center justify-center rounded-md text-sm hover:bg-muted text-muted-foreground"
        title={isFullscreen ? 'Sair tela cheia (Esc)' : 'Tela cheia'}
      >
        {isFullscreen ? '⊟' : '⊞'}
      </button>
    </div>
  );
}
