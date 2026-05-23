"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { FloorPlanData, RoomType } from "@/lib/moratta/types"

// === Constants ===

const MIN_ZOOM = 0.2
const MAX_ZOOM = 5
const ZOOM_SENSITIVITY = 0.001
const GRID_SIZE_METERS = 0.1 // 10cm grid
const DEFAULT_WALL_THICKNESS = 0.15
const GRID_VISIBLE_MIN_ZOOM = 0.5

// === Room Colors ===

const ROOM_COLORS: Record<RoomType, string> = {
  sala_estar: "rgba(173, 216, 230, 0.4)",
  sala_jantar: "rgba(144, 238, 144, 0.4)",
  cozinha: "rgba(255, 228, 181, 0.4)",
  quarto: "rgba(221, 160, 221, 0.4)",
  banheiro: "rgba(176, 224, 230, 0.4)",
  lavabo: "rgba(175, 238, 238, 0.4)",
  garagem: "rgba(211, 211, 211, 0.4)",
  area_servico: "rgba(245, 222, 179, 0.4)",
  area_gourmet: "rgba(255, 218, 185, 0.4)",
  piscina: "rgba(135, 206, 250, 0.4)",
  corredor: "rgba(230, 230, 230, 0.4)",
  hall: "rgba(240, 230, 210, 0.4)",
  escritorio: "rgba(188, 210, 238, 0.4)",
  varanda: "rgba(152, 251, 152, 0.4)",
  despensa: "rgba(222, 184, 135, 0.4)",
  closet: "rgba(216, 191, 216, 0.4)",
}

const ROOM_BORDER_COLORS: Record<RoomType, string> = {
  sala_estar: "rgba(70, 130, 180, 0.8)",
  sala_jantar: "rgba(60, 179, 113, 0.8)",
  cozinha: "rgba(210, 150, 80, 0.8)",
  quarto: "rgba(148, 103, 189, 0.8)",
  banheiro: "rgba(72, 160, 176, 0.8)",
  lavabo: "rgba(64, 180, 180, 0.8)",
  garagem: "rgba(128, 128, 128, 0.8)",
  area_servico: "rgba(180, 150, 100, 0.8)",
  area_gourmet: "rgba(200, 140, 100, 0.8)",
  piscina: "rgba(30, 144, 255, 0.8)",
  corredor: "rgba(160, 160, 160, 0.8)",
  hall: "rgba(180, 160, 120, 0.8)",
  escritorio: "rgba(100, 140, 200, 0.8)",
  varanda: "rgba(60, 179, 60, 0.8)",
  despensa: "rgba(160, 120, 80, 0.8)",
  closet: "rgba(150, 120, 180, 0.8)",
}

// === Props ===

interface FloorPlanCanvasProps {
  floorPlan: FloorPlanData
  lotWidth: number
  lotLength: number
  fullscreen?: boolean
  onViewportChange?: (viewport: ViewportInfo) => void
}

export interface ViewportInfo {
  zoom: number
  pan: { x: number; y: number }
  canvasSize: { width: number; height: number }
  pixelsPerMeter: number
  /** Convert meters to pixel position relative to the canvas container */
  metersToPixels: (mx: number, my: number) => { x: number; y: number }
}

// === Component ===

export function FloorPlanCanvas({ floorPlan, lotWidth, lotLength, fullscreen, onViewportChange }: FloorPlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // View state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Interaction state
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const lastTouchDistRef = useRef<number | null>(null)
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null)

  // Calculate pixels per meter based on canvas size and lot dimensions
  const getPixelsPerMeter = useCallback(() => {
    const paddingFactor = 0.85
    const scaleX = (canvasSize.width * paddingFactor) / lotWidth
    const scaleY = (canvasSize.height * paddingFactor) / lotLength
    return Math.min(scaleX, scaleY)
  }, [canvasSize, lotWidth, lotLength])

  // Convert meters to canvas pixels (accounting for zoom and pan)
  const metersToPixels = useCallback(
    (mx: number, my: number) => {
      const ppm = getPixelsPerMeter()
      const offsetX = (canvasSize.width - lotWidth * ppm * zoom) / 2 + pan.x
      const offsetY = (canvasSize.height - lotLength * ppm * zoom) / 2 + pan.y
      return {
        x: offsetX + mx * ppm * zoom,
        y: offsetY + my * ppm * zoom,
      }
    },
    [getPixelsPerMeter, canvasSize, lotWidth, lotLength, zoom, pan]
  )

  // Notify parent of viewport changes
  useEffect(() => {
    if (onViewportChange) {
      onViewportChange({
        zoom,
        pan,
        canvasSize,
        pixelsPerMeter: getPixelsPerMeter(),
        metersToPixels,
      })
    }
  }, [zoom, pan, canvasSize, getPixelsPerMeter, metersToPixels, onViewportChange])

  // === Drawing Functions ===

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (zoom < GRID_VISIBLE_MIN_ZOOM) return

      const ppm = getPixelsPerMeter()
      const gridPixels = GRID_SIZE_METERS * ppm * zoom

      // Only draw grid if grid lines are at least 4px apart
      if (gridPixels < 4) return

      const topLeft = metersToPixels(0, 0)

      ctx.save()
      ctx.strokeStyle = "rgba(200, 200, 200, 0.3)"
      ctx.lineWidth = 0.5

      // Vertical lines
      for (let mx = 0; mx <= lotWidth; mx += GRID_SIZE_METERS) {
        const { x } = metersToPixels(mx, 0)
        if (x < 0 || x > canvasSize.width) continue
        ctx.beginPath()
        ctx.moveTo(x, topLeft.y)
        ctx.lineTo(x, topLeft.y + lotLength * ppm * zoom)
        ctx.stroke()
      }

      // Horizontal lines
      for (let my = 0; my <= lotLength; my += GRID_SIZE_METERS) {
        const { y } = metersToPixels(0, my)
        if (y < 0 || y > canvasSize.height) continue
        ctx.beginPath()
        ctx.moveTo(topLeft.x, y)
        ctx.lineTo(topLeft.x + lotWidth * ppm * zoom, y)
        ctx.stroke()
      }

      // Draw 1m grid lines slightly darker
      ctx.strokeStyle = "rgba(180, 180, 180, 0.5)"
      ctx.lineWidth = 1

      for (let mx = 0; mx <= lotWidth; mx += 1) {
        const { x } = metersToPixels(mx, 0)
        if (x < 0 || x > canvasSize.width) continue
        ctx.beginPath()
        ctx.moveTo(x, topLeft.y)
        ctx.lineTo(x, topLeft.y + lotLength * ppm * zoom)
        ctx.stroke()
      }

      for (let my = 0; my <= lotLength; my += 1) {
        const { y } = metersToPixels(0, my)
        if (y < 0 || y > canvasSize.height) continue
        ctx.beginPath()
        ctx.moveTo(topLeft.x, y)
        ctx.lineTo(topLeft.x + lotWidth * ppm * zoom, y)
        ctx.stroke()
      }

      ctx.restore()
    },
    [zoom, getPixelsPerMeter, metersToPixels, canvasSize, lotWidth, lotLength]
  )

  const drawLotBoundary = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const topLeft = metersToPixels(0, 0)
      const bottomRight = metersToPixels(lotWidth, lotLength)

      ctx.save()
      ctx.setLineDash([8, 4])
      ctx.strokeStyle = "rgba(100, 100, 100, 0.7)"
      ctx.lineWidth = 2
      ctx.strokeRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      )
      ctx.setLineDash([])
      ctx.restore()
    },
    [metersToPixels, lotWidth, lotLength]
  )

  const drawRooms = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (const room of floorPlan.rooms) {
        const topLeft = metersToPixels(room.x, room.y)
        const bottomRight = metersToPixels(room.x + room.width, room.y + room.height)
        const w = bottomRight.x - topLeft.x
        const h = bottomRight.y - topLeft.y

        // Fill
        ctx.save()
        ctx.fillStyle = ROOM_COLORS[room.type] ?? "rgba(200, 200, 200, 0.3)"
        ctx.fillRect(topLeft.x, topLeft.y, w, h)

        // Border
        ctx.strokeStyle = ROOM_BORDER_COLORS[room.type] ?? "rgba(100, 100, 100, 0.8)"
        ctx.lineWidth = 1.5
        ctx.strokeRect(topLeft.x, topLeft.y, w, h)

        // Room number badge (green circle with number)
        const ppm = getPixelsPerMeter()
        const centerX = topLeft.x + w / 2
        const centerY = topLeft.y + h / 2
        const badgeRadius = Math.max(10, Math.min(16, ppm * zoom * 0.2))
        const roomIndex = floorPlan.rooms.indexOf(room) + 1

        // Only draw badge if room is large enough on screen
        if (w > 24 && h > 24) {
          // Green circle
          ctx.beginPath()
          ctx.arc(centerX, centerY, badgeRadius, 0, Math.PI * 2)
          ctx.fillStyle = "#2d6a4f"
          ctx.fill()

          // White number
          const fontSize = Math.max(9, badgeRadius * 1.1)
          ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
          ctx.fillStyle = "#ffffff"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(String(roomIndex), centerX, centerY)
        }

        ctx.restore()
      }
    },
    [floorPlan.rooms, metersToPixels, getPixelsPerMeter, zoom]
  )

  const drawWalls = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const ppm = getPixelsPerMeter()

      for (const wall of floorPlan.walls) {
        const start = metersToPixels(wall.startX, wall.startY)
        const end = metersToPixels(wall.endX, wall.endY)
        const thickness = (wall.thickness || DEFAULT_WALL_THICKNESS) * ppm * zoom

        ctx.save()
        ctx.strokeStyle = wall.isExternal
          ? "rgba(40, 40, 40, 0.95)"
          : "rgba(80, 80, 80, 0.85)"
        ctx.lineWidth = Math.max(2, thickness)
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        ctx.restore()
      }
    },
    [floorPlan.walls, metersToPixels, getPixelsPerMeter, zoom]
  )

  const drawDoors = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const ppm = getPixelsPerMeter()

      for (const door of floorPlan.doors) {
        const wall = floorPlan.walls.find((w) => w.id === door.wallId)
        if (!wall) continue

        // Calculate door position along the wall
        const wallDx = wall.endX - wall.startX
        const wallDy = wall.endY - wall.startY
        const doorCenterX = wall.startX + wallDx * door.position
        const doorCenterY = wall.startY + wallDy * door.position

        const doorPos = metersToPixels(doorCenterX, doorCenterY)
        const doorWidthPx = door.width * ppm * zoom

        // Determine wall angle
        const angle = Math.atan2(wallDy, wallDx)

        ctx.save()
        ctx.translate(doorPos.x, doorPos.y)
        ctx.rotate(angle)

        // Draw door opening (gap in wall)
        ctx.strokeStyle = "rgba(255, 255, 255, 1)"
        ctx.lineWidth = Math.max(3, DEFAULT_WALL_THICKNESS * ppm * zoom + 2)
        ctx.beginPath()
        ctx.moveTo(-doorWidthPx / 2, 0)
        ctx.lineTo(doorWidthPx / 2, 0)
        ctx.stroke()

        // Draw door arc
        if (door.type === "sliding") {
          // Sliding door: dashed line
          ctx.setLineDash([4, 3])
          ctx.strokeStyle = "rgba(100, 60, 20, 0.7)"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(-doorWidthPx / 2, 0)
          ctx.lineTo(doorWidthPx / 2, 0)
          ctx.stroke()
          ctx.setLineDash([])
        } else {
          // Single/double door: arc showing swing direction
          ctx.strokeStyle = "rgba(100, 60, 20, 0.7)"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(
            -doorWidthPx / 2,
            0,
            doorWidthPx,
            -Math.PI / 2,
            0,
            false
          )
          ctx.stroke()

          // Door leaf line
          ctx.beginPath()
          ctx.moveTo(-doorWidthPx / 2, 0)
          ctx.lineTo(-doorWidthPx / 2, -doorWidthPx)
          ctx.stroke()

          // Double door: mirror arc
          if (door.type === "double") {
            ctx.beginPath()
            ctx.arc(
              doorWidthPx / 2,
              0,
              doorWidthPx,
              -Math.PI,
              -Math.PI / 2,
              false
            )
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(doorWidthPx / 2, 0)
            ctx.lineTo(doorWidthPx / 2, -doorWidthPx)
            ctx.stroke()
          }
        }

        ctx.restore()
      }
    },
    [floorPlan.doors, floorPlan.walls, metersToPixels, getPixelsPerMeter, zoom]
  )

  const drawWindows = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const ppm = getPixelsPerMeter()

      for (const win of floorPlan.windows) {
        const wall = floorPlan.walls.find((w) => w.id === win.wallId)
        if (!wall) continue

        const wallDx = wall.endX - wall.startX
        const wallDy = wall.endY - wall.startY
        const winCenterX = wall.startX + wallDx * win.position
        const winCenterY = wall.startY + wallDy * win.position

        const winPos = metersToPixels(winCenterX, winCenterY)
        const winWidthPx = win.width * ppm * zoom

        const angle = Math.atan2(wallDy, wallDx)

        ctx.save()
        ctx.translate(winPos.x, winPos.y)
        ctx.rotate(angle)

        // Draw window opening (gap in wall)
        ctx.strokeStyle = "rgba(255, 255, 255, 1)"
        ctx.lineWidth = Math.max(3, DEFAULT_WALL_THICKNESS * ppm * zoom + 2)
        ctx.beginPath()
        ctx.moveTo(-winWidthPx / 2, 0)
        ctx.lineTo(winWidthPx / 2, 0)
        ctx.stroke()

        // Draw window indicator (dashed line with small perpendicular lines)
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = "rgba(30, 120, 200, 0.8)"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-winWidthPx / 2, 0)
        ctx.lineTo(winWidthPx / 2, 0)
        ctx.stroke()
        ctx.setLineDash([])

        // Small perpendicular marks at window edges
        const markSize = Math.max(3, 4 * zoom)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(-winWidthPx / 2, -markSize)
        ctx.lineTo(-winWidthPx / 2, markSize)
        ctx.moveTo(winWidthPx / 2, -markSize)
        ctx.lineTo(winWidthPx / 2, markSize)
        ctx.stroke()

        ctx.restore()
      }
    },
    [floorPlan.windows, floorPlan.walls, metersToPixels, getPixelsPerMeter, zoom]
  )

  // === Dimension Lines & Front Indicator ===

  const drawDimensions = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const ppm = getPixelsPerMeter()
      const topLeft = metersToPixels(0, 0)
      const bottomRight = metersToPixels(lotWidth, lotLength)
      const lotW = bottomRight.x - topLeft.x
      const lotH = bottomRight.y - topLeft.y

      ctx.save()

      // === Bottom dimension line (width) ===
      const dimOffset = 25 // pixels below the lot
      const bottomY = bottomRight.y + dimOffset

      // Line
      ctx.strokeStyle = "rgba(60, 60, 60, 0.8)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(topLeft.x, bottomY)
      ctx.lineTo(bottomRight.x, bottomY)
      ctx.stroke()

      // End ticks
      ctx.beginPath()
      ctx.moveTo(topLeft.x, bottomY - 6)
      ctx.lineTo(topLeft.x, bottomY + 6)
      ctx.moveTo(bottomRight.x, bottomY - 6)
      ctx.lineTo(bottomRight.x, bottomY + 6)
      ctx.stroke()

      // Label
      const fontSize = Math.max(11, Math.min(14, ppm * zoom * 0.2))
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = "rgba(30, 30, 30, 0.9)"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillText(`${lotWidth.toFixed(2)} m`, topLeft.x + lotW / 2, bottomY + 8)

      // === Right dimension line (length) ===
      const rightX = bottomRight.x + dimOffset

      // Line
      ctx.beginPath()
      ctx.moveTo(rightX, topLeft.y)
      ctx.lineTo(rightX, bottomRight.y)
      ctx.stroke()

      // End ticks
      ctx.beginPath()
      ctx.moveTo(rightX - 6, topLeft.y)
      ctx.lineTo(rightX + 6, topLeft.y)
      ctx.moveTo(rightX - 6, bottomRight.y)
      ctx.lineTo(rightX + 6, bottomRight.y)
      ctx.stroke()

      // Label (rotated)
      ctx.save()
      ctx.translate(rightX + 8, topLeft.y + lotH / 2)
      ctx.rotate(Math.PI / 2)
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(`${lotLength.toFixed(2)} m`, 0, 0)
      ctx.restore()

      // === Front indicator (bottom of canvas = front/street) ===
      const streetY = bottomRight.y + dimOffset + 30
      const streetHeight = 18

      // Street rectangle
      ctx.fillStyle = "rgba(80, 80, 80, 0.15)"
      ctx.fillRect(topLeft.x, streetY, lotW, streetHeight)

      // Street label
      ctx.font = `${Math.max(9, fontSize * 0.75)}px Inter, system-ui, sans-serif`
      ctx.fillStyle = "rgba(100, 100, 100, 0.8)"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("RUA / FRENTE", topLeft.x + lotW / 2, streetY + streetHeight / 2)

      // "FUNDOS" label at top
      ctx.fillStyle = "rgba(150, 150, 150, 0.6)"
      ctx.font = `${Math.max(9, fontSize * 0.7)}px Inter, system-ui, sans-serif`
      ctx.textBaseline = "bottom"
      ctx.fillText("FUNDOS", topLeft.x + lotW / 2, topLeft.y - 8)

      ctx.restore()
    },
    [getPixelsPerMeter, metersToPixels, lotWidth, lotLength, zoom]
  )

  // === Main Render ===

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    // Background
    ctx.fillStyle = "#fafafa"
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw layers in order
    drawGrid(ctx)
    drawLotBoundary(ctx)
    drawRooms(ctx)
    drawWalls(ctx)
    drawDoors(ctx)
    drawWindows(ctx)
    drawDimensions(ctx)
  }, [canvasSize, drawGrid, drawLotBoundary, drawRooms, drawWalls, drawDoors, drawWindows, drawDimensions])

  // === Resize Observer ===

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: containerHeight } = entry.contentRect
        if (fullscreen) {
          // In fullscreen, use all available height
          setCanvasSize({ width, height: containerHeight || 700 })
        } else {
          // Maintain aspect ratio based on lot dimensions
          const aspectRatio = lotLength / lotWidth
          const height = Math.min(width * aspectRatio, 700)
          setCanvasSize({ width, height })
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [lotWidth, lotLength, fullscreen])

  // === Animation Frame Rendering ===

  useEffect(() => {
    const scheduleRender = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        render()
        animationFrameRef.current = null
      })
    }

    scheduleRender()

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  // === Zoom Handler (Mouse Wheel) ===

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const delta = -e.deltaY * ZOOM_SENSITIVITY
      setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * (1 + delta))))
    },
    []
  )

  // === Pan Handlers (Middle Mouse / Drag) ===

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button or left button with space (handled via isPanning)
    if (e.button === 1 || e.button === 0) {
      isPanningRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanningRef.current) return
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  // === Touch Handlers (Pinch Zoom + Two-Finger Pan) ===

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      lastTouchDistRef.current = Math.hypot(dx, dy)
      lastTouchCenterRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      isPanningRef.current = true
      lastMousePosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.hypot(dx, dy)
        const scale = dist / lastTouchDistRef.current
        lastTouchDistRef.current = dist

        setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * scale)))

        // Pan with two fingers
        const center = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }
        if (lastTouchCenterRef.current) {
          const panDx = center.x - lastTouchCenterRef.current.x
          const panDy = center.y - lastTouchCenterRef.current.y
          setPan((prev) => ({ x: prev.x + panDx, y: prev.y + panDy }))
        }
        lastTouchCenterRef.current = center
      } else if (e.touches.length === 1 && isPanningRef.current) {
        const dx = e.touches[0].clientX - lastMousePosRef.current.x
        const dy = e.touches[0].clientY - lastMousePosRef.current.y
        lastMousePosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      }
    },
    []
  )

  const handleTouchEnd = useCallback(() => {
    isPanningRef.current = false
    lastTouchDistRef.current = null
    lastTouchCenterRef.current = null
  }, [])

  // === Keyboard Shortcuts ===

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    switch (e.key) {
      case "+":
      case "=":
        e.preventDefault()
        setZoom((prev) => Math.min(MAX_ZOOM, prev * 1.2))
        break
      case "-":
      case "_":
        e.preventDefault()
        setZoom((prev) => Math.max(MIN_ZOOM, prev / 1.2))
        break
      case "0":
        e.preventDefault()
        setZoom(1)
        setPan({ x: 0, y: 0 })
        break
      case "ArrowUp":
        e.preventDefault()
        setPan((prev) => ({ ...prev, y: prev.y + 20 }))
        break
      case "ArrowDown":
        e.preventDefault()
        setPan((prev) => ({ ...prev, y: prev.y - 20 }))
        break
      case "ArrowLeft":
        e.preventDefault()
        setPan((prev) => ({ ...prev, x: prev.x + 20 }))
        break
      case "ArrowRight":
        e.preventDefault()
        setPan((prev) => ({ ...prev, x: prev.x - 20 }))
        break
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-lg border border-border bg-background ${
        fullscreen ? "h-full" : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        className="block cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Planta baixa do projeto com ${floorPlan.rooms.length} ambientes. Use + e - para zoom, setas para mover, 0 para resetar.`}
        tabIndex={0}
        role="img"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
      />

      {/* Zoom controls (Figma-style) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-background/90 p-1 shadow-sm backdrop-blur-sm border border-border">
        <button
          onClick={() => setZoom((prev) => Math.max(MIN_ZOOM, prev / 1.3))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Diminuir zoom"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          className="flex h-7 min-w-[44px] items-center justify-center rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Resetar zoom"
          title="Resetar (0)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((prev) => Math.min(MAX_ZOOM, prev * 1.3))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Aumentar zoom"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </button>
      </div>
    </div>
  )
}
