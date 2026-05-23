"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { FloorPlanData, Room, RoomType } from "@/lib/moratta/types"
import {
  moveWall,
  addRoom,
  removeRoom,
  undo,
  redo,
  createEditorState,
  snapToGrid,
  calculateRoomArea,
  type CanvasEditorState,
  type EditorAlert,
  type EditorActionResult,
} from "@/lib/moratta/services/editor-actions.service"
import { FloorPlanCanvas, type ViewportInfo } from "./FloorPlanCanvas"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// === Types ===

interface FloorPlanEditorProps {
  floorPlan: FloorPlanData
  projectId: string
  lotWidth: number
  lotLength: number
  onChange?: (floorPlan: FloorPlanData) => void
  onRegenerate?: () => void
}

interface AddRoomFormData {
  name: string
  type: RoomType
  width: string
  height: string
}

// === Room Type Labels ===

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: "sala_estar", label: "Sala de Estar" },
  { value: "sala_jantar", label: "Sala de Jantar" },
  { value: "cozinha", label: "Cozinha" },
  { value: "quarto", label: "Quarto" },
  { value: "banheiro", label: "Banheiro" },
  { value: "lavabo", label: "Lavabo" },
  { value: "garagem", label: "Garagem" },
  { value: "area_servico", label: "Área de Serviço" },
  { value: "area_gourmet", label: "Área Gourmet" },
  { value: "piscina", label: "Piscina" },
  { value: "corredor", label: "Corredor" },
  { value: "hall", label: "Hall" },
  { value: "escritorio", label: "Escritório" },
  { value: "varanda", label: "Varanda" },
  { value: "despensa", label: "Despensa" },
  { value: "closet", label: "Closet" },
]

// === Component ===

export function FloorPlanEditor({
  floorPlan,
  projectId,
  lotWidth,
  lotLength,
  onChange,
  onRegenerate,
}: FloorPlanEditorProps) {
  // Editor state
  const [editorState, setEditorState] = useState<CanvasEditorState>(() =>
    createEditorState(
      floorPlan.rooms,
      floorPlan.walls,
      floorPlan.doors,
      floorPlan.windows
    )
  )

  // UI state
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<EditorAlert[]>([])
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBoundaryFlash, setShowBoundaryFlash] = useState(false)
  const [showOverlapFlash, setShowOverlapFlash] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDraggingRoom, setIsDraggingRoom] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [addRoomForm, setAddRoomForm] = useState<AddRoomFormData>({
    name: "",
    type: "quarto",
    width: "3",
    height: "3",
  })

  // Wall dragging state
  const [draggingWallId, setDraggingWallId] = useState<string | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // Viewport state from canvas
  const [viewport, setViewport] = useState<ViewportInfo | null>(null)

  // Derive current floor plan from editor state
  const currentFloorPlan: FloorPlanData = {
    id: floorPlan.id,
    totalArea: editorState.rooms.reduce((sum, r) => sum + r.area, 0),
    rooms: editorState.rooms,
    walls: editorState.walls,
    doors: editorState.doors,
    windows: editorState.windows,
  }

  // Notify parent of changes
  const emitChange = useCallback(
    (state: CanvasEditorState) => {
      if (onChange) {
        const updatedPlan: FloorPlanData = {
          id: floorPlan.id,
          totalArea: state.rooms.reduce((sum, r) => sum + r.area, 0),
          rooms: state.rooms,
          walls: state.walls,
          doors: state.doors,
          windows: state.windows,
        }
        onChange(updatedPlan)
      }
    },
    [onChange, floorPlan.id]
  )

  // Apply editor result
  const applyResult = useCallback(
    (result: EditorActionResult) => {
      if (result.success) {
        setEditorState(result.state)
        setAlerts(result.alerts ?? [])
        emitChange(result.state)
      } else {
        // Show visual feedback for rejections
        if (result.code === "OVERLAP") {
          setShowOverlapFlash(true)
          setTimeout(() => setShowOverlapFlash(false), 1000)
        } else if (result.code === "BOUNDARY_VIOLATION") {
          setShowBoundaryFlash(true)
          setTimeout(() => setShowBoundaryFlash(false), 1000)
        }
      }
    },
    [emitChange]
  )

  // === Wall Dragging ===

  const handleWallDragStart = useCallback(
    (wallId: string, clientX: number, clientY: number) => {
      setDraggingWallId(wallId)
      dragStartRef.current = { x: clientX, y: clientY }
    },
    []
  )

  const handleWallDragEnd = useCallback(
    (wallId: string, deltaXMeters: number, deltaYMeters: number) => {
      const wall = editorState.walls.find((w) => w.id === wallId)
      if (!wall) return

      const newStartX = wall.startX + deltaXMeters
      const newStartY = wall.startY + deltaYMeters
      const newEndX = wall.endX + deltaXMeters
      const newEndY = wall.endY + deltaYMeters

      const result = moveWall(
        editorState,
        wallId,
        newStartX,
        newStartY,
        newEndX,
        newEndY,
        lotWidth,
        lotLength
      )

      applyResult(result)
      setDraggingWallId(null)
      dragStartRef.current = null
    },
    [editorState, lotWidth, lotLength, applyResult]
  )

  // === Undo/Redo ===

  const handleUndo = useCallback(() => {
    const result = undo(editorState)
    applyResult(result)
  }, [editorState, applyResult])

  const handleRedo = useCallback(() => {
    const result = redo(editorState)
    applyResult(result)
  }, [editorState, applyResult])

  // === Keyboard Shortcuts ===

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z = Undo, Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
      // Escape = exit fullscreen
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleUndo, handleRedo, isFullscreen])

  // === Fullscreen Toggle ===

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // === Room Drag & Drop ===

  const handleRoomDragEnd = useCallback(
    (roomId: string, newX: number, newY: number) => {
      const room = editorState.rooms.find((r) => r.id === roomId)
      if (!room) return

      // Snap to grid (0.25m increments for smoother feel)
      const snappedX = Math.round(newX * 4) / 4
      const snappedY = Math.round(newY * 4) / 4

      // Clamp within lot boundaries
      const clampedX = Math.max(0, Math.min(snappedX, lotWidth - room.width))
      const clampedY = Math.max(0, Math.min(snappedY, lotLength - room.height))

      // Update room position
      const updatedRooms = editorState.rooms.map((r) =>
        r.id === roomId
          ? { ...r, x: clampedX, y: clampedY }
          : r
      )

      // Check for overlaps
      const movedRoom = { ...room, x: clampedX, y: clampedY }
      const hasOverlap = updatedRooms.some((r) => {
        if (r.id === roomId) return false
        return (
          movedRoom.x < r.x + r.width &&
          movedRoom.x + movedRoom.width > r.x &&
          movedRoom.y < r.y + r.height &&
          movedRoom.y + movedRoom.height > r.y
        )
      })

      if (hasOverlap) {
        setShowOverlapFlash(true)
        setTimeout(() => setShowOverlapFlash(false), 1000)
        return
      }

      const newState: CanvasEditorState = {
        ...editorState,
        rooms: updatedRooms,
        undoStack: [...editorState.undoStack, editorState],
        redoStack: [],
      }

      setEditorState(newState)
      emitChange(newState)
      setIsDraggingRoom(false)
    },
    [editorState, lotWidth, lotLength, emitChange]
  )

  // === Add Room ===

  const handleAddRoom = useCallback(() => {
    const width = parseFloat(addRoomForm.width)
    const height = parseFloat(addRoomForm.height)

    if (
      !addRoomForm.name.trim() ||
      isNaN(width) ||
      isNaN(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return
    }

    const snappedWidth = snapToGrid(width)
    const snappedHeight = snapToGrid(height)
    const area = calculateRoomArea(snappedWidth, snappedHeight)

    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: addRoomForm.name.trim(),
      type: addRoomForm.type,
      x: 0,
      y: 0,
      width: snappedWidth,
      height: snappedHeight,
      area,
      floor: 0,
    }

    const result = addRoom(editorState, newRoom)
    applyResult(result)
    setShowAddRoomDialog(false)
    setAddRoomForm({ name: "", type: "quarto", width: "3", height: "3" })
  }, [editorState, addRoomForm, applyResult])

  // === Remove Room ===

  const handleRemoveRoom = useCallback(() => {
    if (!selectedRoomId) return

    const result = removeRoom(editorState, selectedRoomId)
    applyResult(result)
    setSelectedRoomId(null)
    setShowDeleteConfirm(false)
  }, [editorState, selectedRoomId, applyResult])

  // === Room Selection ===

  const handleRoomClick = useCallback((roomId: string) => {
    setSelectedRoomId((prev) => (prev === roomId ? null : roomId))
  }, [])

  // === Save ===

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/moratta/projects/${projectId}/floor-plan`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentFloorPlan),
        }
      )
      if (!response.ok) {
        throw new Error("Failed to save floor plan")
      }
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }, [projectId, currentFloorPlan])

  // === Derived State ===

  const canUndo = editorState.undoStack.length > 0
  const canRedo = editorState.redoStack.length > 0
  const selectedRoom = editorState.rooms.find((r) => r.id === selectedRoomId)
  const hasMinAreaAlerts = alerts.length > 0

  // === Render ===

  return (
    <div
      ref={editorContainerRef}
      className={`flex flex-col gap-2 overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-[100] bg-background p-4"
          : "max-w-full overflow-x-hidden"
      }`}
      role="region"
      aria-label="Editor de planta baixa"
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 p-2"
        role="toolbar"
        aria-label="Ferramentas de edição da planta"
      >
        {/* Undo/Redo */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Desfazer (Ctrl+Z)"
          title="Desfazer (Ctrl+Z)"
          className="min-h-[44px] min-w-[44px]"
        >
          <UndoIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Refazer (Ctrl+Shift+Z)"
          title="Refazer (Ctrl+Shift+Z)"
          className="min-h-[44px] min-w-[44px]"
        >
          <RedoIcon />
        </Button>

        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

        {/* Add Room */}
        <Button
          variant="outline"
          onClick={() => setShowAddRoomDialog(true)}
          aria-label="Adicionar ambiente"
          className="min-h-[44px] gap-2 px-3"
        >
          <PlusIcon />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>

        {/* Delete Room (visible when room selected) */}
        {selectedRoom && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Remover ambiente: ${selectedRoom.name}`}
            className="min-h-[44px] gap-2 px-3"
          >
            <TrashIcon />
            <span className="hidden sm:inline">Remover</span>
          </Button>
        )}

        <div className="flex-1" />

        {/* Regenerate */}
        {onRegenerate && (
          <Button
            variant="outline"
            onClick={onRegenerate}
            aria-label="Gerar nova planta"
            className="min-h-[44px] gap-2 px-3"
          >
            <RefreshIcon />
            <span className="hidden sm:inline">Gerar novamente</span>
          </Button>
        )}

        {/* Fullscreen Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
          title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
          className="min-h-[44px] min-w-[44px]"
        >
          {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
        </Button>

        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

        {/* Save */}
        <Button
          variant="default"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Salvar planta"
          className="min-h-[44px] gap-2 px-3"
        >
          <SaveIcon />
          <span className="hidden sm:inline">
            {isSaving ? "Salvando..." : "Salvar"}
          </span>
        </Button>
      </div>

      {/* Visual Alerts */}
      {hasMinAreaAlerts && (
        <div
          className="flex flex-wrap gap-2"
          role="alert"
          aria-live="polite"
        >
          {alerts.map((alert) => (
            <div
              key={alert.roomId}
              className="flex items-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm text-orange-800 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
            >
              <WarningIcon />
              <span>
                {alert.roomName}: {alert.area.toFixed(1)}m² (mín. 4m²)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Overlap/Boundary Flash Alerts */}
      {showOverlapFlash && (
        <div
          className="rounded-md border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          ⚠️ Movimento rejeitado: sobreposição entre ambientes detectada.
        </div>
      )}
      {showBoundaryFlash && (
        <div
          className="rounded-md border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          ⚠️ Movimento rejeitado: ultrapassa os limites do terreno.
        </div>
      )}

      {/* Canvas with legend and editing overlay */}
      <div className={`flex gap-3 ${isFullscreen ? "flex-1 min-h-0" : ""}`}>
        {/* Legend panel */}
        <div className="hidden sm:block w-56 shrink-0 overflow-y-auto rounded-lg border border-border bg-card p-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Ambientes</h3>
          <div className="space-y-1.5">
            {editorState.rooms.map((room, index) => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selectedRoomId === room.id
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2d6a4f] text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="flex-1 truncate text-xs font-medium">{room.name}</span>
                <span className="text-[10px] text-muted-foreground">{room.width.toFixed(1)}x{room.height.toFixed(1)}</span>
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-3 border-t pt-3 space-y-1">
            <p className="text-[10px] text-muted-foreground">
              🛏️ {editorState.rooms.filter(r => r.type === 'quarto').length} Quartos
            </p>
            <p className="text-[10px] text-muted-foreground">
              🚿 {editorState.rooms.filter(r => r.type === 'banheiro' || r.type === 'lavabo').length} Banheiros
            </p>
            <p className="text-[10px] text-muted-foreground">
              🚗 {editorState.rooms.filter(r => r.type === 'garagem').length > 0 ? '1 Garagem' : 'Sem garagem'}
            </p>
            <p className="text-[10px] font-medium text-foreground mt-2">
              📐 Área total: {currentFloorPlan.totalArea.toFixed(1)}m²
            </p>
          </div>
        </div>

        {/* Canvas area */}
        <div className={`relative flex-1 min-w-0 ${isFullscreen ? "h-full" : ""}`}>
          <FloorPlanCanvas
            floorPlan={currentFloorPlan}
            lotWidth={lotWidth}
            lotLength={lotLength}
            fullscreen={isFullscreen}
            onViewportChange={setViewport}
          />

          {/* Room drag & selection overlay */}
          {viewport && (
            <RoomDragOverlay
              rooms={editorState.rooms}
              selectedRoomId={selectedRoomId}
              alerts={alerts}
              lotWidth={lotWidth}
              lotLength={lotLength}
              viewport={viewport}
              onRoomClick={handleRoomClick}
              onRoomDragEnd={handleRoomDragEnd}
              onDragStart={() => setIsDraggingRoom(true)}
            />
          )}

          {/* Wall drag targets */}
          {!isDraggingRoom && viewport && (
            <WallDragOverlay
              walls={editorState.walls}
              lotWidth={lotWidth}
              lotLength={lotLength}
              viewport={viewport}
              onWallDragEnd={handleWallDragEnd}
              onWallDragStart={handleWallDragStart}
            />
          )}
        </div>
      </div>

      {/* Room info panel */}
      {selectedRoom && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">{selectedRoom.name}</p>
          <p className="text-xs text-muted-foreground">
            {selectedRoom.width.toFixed(1)}m × {selectedRoom.height.toFixed(1)}m
            = {selectedRoom.area.toFixed(1)}m²
          </p>
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Ambiente</DialogTitle>
            <DialogDescription>
              Defina o nome, tipo e dimensões do novo ambiente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="room-name" className="text-sm font-medium">
                Nome
              </label>
              <input
                id="room-name"
                type="text"
                value={addRoomForm.name}
                onChange={(e) =>
                  setAddRoomForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex: Quarto Principal"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="room-type" className="text-sm font-medium">
                Tipo
              </label>
              <select
                id="room-type"
                value={addRoomForm.type}
                onChange={(e) =>
                  setAddRoomForm((f) => ({
                    ...f,
                    type: e.target.value as RoomType,
                  }))
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ROOM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="room-width" className="text-sm font-medium">
                  Largura (m)
                </label>
                <input
                  id="room-width"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={addRoomForm.width}
                  onChange={(e) =>
                    setAddRoomForm((f) => ({ ...f, width: e.target.value }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="room-height" className="text-sm font-medium">
                  Comprimento (m)
                </label>
                <input
                  id="room-height"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={addRoomForm.height}
                  onChange={(e) =>
                    setAddRoomForm((f) => ({ ...f, height: e.target.value }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            {parseFloat(addRoomForm.width) * parseFloat(addRoomForm.height) <
              4 &&
              addRoomForm.width &&
              addRoomForm.height && (
                <p className="text-xs text-orange-600">
                  ⚠️ Área abaixo do mínimo recomendado (4m²)
                </p>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddRoomDialog(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddRoom}
              disabled={!addRoomForm.name.trim()}
              className="min-h-[44px]"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Ambiente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o ambiente &quot;{selectedRoom?.name}
              &quot;? Esta ação pode ser desfeita com Ctrl+Z.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveRoom}
              className="min-h-[44px]"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// === Sub-Components ===

/** Overlay for room drag & drop and selection (Figma-style) */
function RoomDragOverlay({
  rooms,
  selectedRoomId,
  alerts,
  lotWidth,
  lotLength,
  viewport,
  onRoomClick,
  onRoomDragEnd,
  onDragStart,
}: {
  rooms: Room[]
  selectedRoomId: string | null
  alerts: EditorAlert[]
  lotWidth: number
  lotLength: number
  viewport: ViewportInfo
  onRoomClick: (roomId: string) => void
  onRoomDragEnd: (roomId: string, newX: number, newY: number) => void
  onDragStart: () => void
}) {
  const alertRoomIds = new Set(alerts.map((a) => a.roomId))
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragStartPosRef = useRef<{ x: number; y: number; roomX: number; roomY: number } | null>(null)
  const hasDraggedRef = useRef(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, room: Room) => {
      e.preventDefault()
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      dragStartPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        roomX: room.x,
        roomY: room.y,
      }
      hasDraggedRef.current = false
      setDraggingId(room.id)
      setDragOffset({ x: 0, y: 0 })
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragStartPosRef.current) return

      const dx = e.clientX - dragStartPosRef.current.x
      const dy = e.clientY - dragStartPosRef.current.y

      if (!hasDraggedRef.current && Math.hypot(dx, dy) > 3) {
        hasDraggedRef.current = true
        onDragStart()
      }

      if (hasDraggedRef.current) {
        setDragOffset({ x: dx, y: dy })
      }
    },
    [draggingId, onDragStart]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !dragStartPosRef.current) {
        setDraggingId(null)
        return
      }

      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)

      if (hasDraggedRef.current) {
        const ppm = viewport.pixelsPerMeter * viewport.zoom
        const dx = e.clientX - dragStartPosRef.current.x
        const dy = e.clientY - dragStartPosRef.current.y

        const newX = dragStartPosRef.current.roomX + dx / ppm
        const newY = dragStartPosRef.current.roomY + dy / ppm

        onRoomDragEnd(draggingId, newX, newY)
      } else {
        onRoomClick(draggingId)
      }

      setDraggingId(null)
      setDragOffset({ x: 0, y: 0 })
      dragStartPosRef.current = null
    },
    [draggingId, viewport, onRoomDragEnd, onRoomClick]
  )

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {rooms.map((room) => {
        const isSelected = room.id === selectedRoomId
        const hasAlert = alertRoomIds.has(room.id)
        const isDragging = room.id === draggingId

        // Use viewport metersToPixels for exact alignment with canvas
        const topLeft = viewport.metersToPixels(room.x, room.y)
        const bottomRight = viewport.metersToPixels(room.x + room.width, room.y + room.height)
        const w = bottomRight.x - topLeft.x
        const h = bottomRight.y - topLeft.y

        return (
          <div
            key={room.id}
            className={`pointer-events-auto absolute rounded-sm border-2 transition-shadow ${
              isDragging
                ? "border-blue-500 bg-blue-500/20 shadow-lg ring-2 ring-blue-400/50 z-50"
                : isSelected
                  ? "border-blue-500 bg-blue-500/10 shadow-md"
                  : hasAlert
                    ? "border-orange-400 bg-orange-400/10"
                    : "border-transparent hover:border-blue-300 hover:bg-blue-300/5"
            } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{
              left: `${topLeft.x}px`,
              top: `${topLeft.y}px`,
              width: `${w}px`,
              height: `${h}px`,
              transform: isDragging
                ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
                : undefined,
              transition: isDragging ? "none" : "border-color 0.15s, background-color 0.15s",
            }}
            onPointerDown={(e) => handlePointerDown(e, room)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            aria-label={`${room.name} (${room.area.toFixed(1)}m²) - Arraste para mover`}
          >
            {/* Selection handles (Figma-style corners) */}
            {isSelected && !isDragging && (
              <>
                <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-sm border-2 border-blue-500 bg-white" />
                <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-sm border-2 border-blue-500 bg-white" />
                <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-sm border-2 border-blue-500 bg-white" />
                <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-sm border-2 border-blue-500 bg-white" />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Overlay for wall dragging (touch-friendly drag targets) */
function WallDragOverlay({
  walls,
  lotWidth,
  lotLength,
  viewport,
  onWallDragStart,
  onWallDragEnd,
}: {
  walls: CanvasEditorState["walls"]
  lotWidth: number
  lotLength: number
  viewport: ViewportInfo
  onWallDragStart: (wallId: string, clientX: number, clientY: number) => void
  onWallDragEnd: (wallId: string, deltaXMeters: number, deltaYMeters: number) => void
}) {
  const handleDrag = useCallback(
    (wallId: string, startClientX: number, startClientY: number) => {
      const ppm = viewport.pixelsPerMeter * viewport.zoom

      const handleEnd = (clientX: number, clientY: number) => {
        const deltaPixelsX = clientX - startClientX
        const deltaPixelsY = clientY - startClientY
        const deltaMetersX = deltaPixelsX / ppm
        const deltaMetersY = deltaPixelsY / ppm

        onWallDragEnd(wallId, deltaMetersX, deltaMetersY)

        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onTouchEnd)
      }

      const onMouseMove = () => {}
      const onMouseUp = (e: MouseEvent) => handleEnd(e.clientX, e.clientY)
      const onTouchMove = () => {}
      const onTouchEnd = (e: TouchEvent) => {
        const touch = e.changedTouches[0]
        handleEnd(touch.clientX, touch.clientY)
      }

      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
      window.addEventListener("touchmove", onTouchMove)
      window.addEventListener("touchend", onTouchEnd)
    },
    [viewport, onWallDragEnd]
  )

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {walls.map((wall) => {
        const isHorizontal = Math.abs(wall.startY - wall.endY) < 0.001
        const isVertical = Math.abs(wall.startX - wall.endX) < 0.001

        if (!isHorizontal && !isVertical) return null

        const topLeft = viewport.metersToPixels(
          Math.min(wall.startX, wall.endX),
          Math.min(wall.startY, wall.endY)
        )
        const bottomRight = viewport.metersToPixels(
          Math.max(wall.startX, wall.endX),
          Math.max(wall.startY, wall.endY)
        )

        const w = Math.max(bottomRight.x - topLeft.x, 12)
        const h = Math.max(bottomRight.y - topLeft.y, 12)

        // Center the hit target on the wall
        const offsetX = isVertical ? -6 : 0
        const offsetY = isHorizontal ? -6 : 0

        return (
          <div
            key={wall.id}
            className={`pointer-events-auto absolute ${
              isHorizontal ? "cursor-ns-resize" : "cursor-ew-resize"
            } rounded-sm hover:bg-blue-400/20 active:bg-blue-400/30`}
            style={{
              left: `${topLeft.x + offsetX}px`,
              top: `${topLeft.y + offsetY}px`,
              width: `${w}px`,
              height: `${h}px`,
              minWidth: "12px",
              minHeight: "12px",
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onWallDragStart(wall.id, e.clientX, e.clientY)
              handleDrag(wall.id, e.clientX, e.clientY)
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                e.preventDefault()
                e.stopPropagation()
                const touch = e.touches[0]
                onWallDragStart(wall.id, touch.clientX, touch.clientY)
                handleDrag(wall.id, touch.clientX, touch.clientY)
              }
            }}
            aria-label={`Arrastar parede`}
            role="slider"
            tabIndex={-1}
          />
        )
      })}
    </div>
  )
}

// === Icons (inline SVG for minimal dependencies) ===

function UndoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}

function MaximizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}
