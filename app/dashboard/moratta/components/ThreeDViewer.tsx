"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { ThreeDModelData } from "@/lib/moratta/types"

// === Types ===

interface ThreeDViewerProps {
  modelData: ThreeDModelData | null
  projectId: string
}

type ViewerState = "idle" | "loading" | "ready" | "error"

// === Style Colors ===

const STYLE_COLORS: Record<string, { wall: number; trim: number; accent: number }> = {
  moderno: { wall: 0xf5f5f5, trim: 0x333333, accent: 0x2196f3 },
  classico: { wall: 0xfff8e1, trim: 0x8d6e63, accent: 0xd4af37 },
  minimalista: { wall: 0xffffff, trim: 0x9e9e9e, accent: 0x607d8b },
  rustico: { wall: 0xd7ccc8, trim: 0x5d4037, accent: 0x795548 },
  contemporaneo: { wall: 0xeceff1, trim: 0x455a64, accent: 0x00bcd4 },
}

const ROOF_COLORS: Record<string, number> = {
  flat: 0x78909c,
  gable: 0x8d6e63,
  hip: 0xa1887f,
  mansard: 0x6d4c41,
}

// === Component ===

export default function ThreeDViewer({ modelData, projectId }: ThreeDViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<unknown>(null)
  const sceneRef = useRef<unknown>(null)
  const cameraRef = useRef<unknown>(null)
  const controlsRef = useRef<unknown>(null)
  const animationFrameRef = useRef<number | null>(null)
  const threeRef = useRef<typeof import("three") | null>(null)

  const [state, setState] = useState<ViewerState>(modelData ? "ready" : "idle")
  const [error, setError] = useState<string | null>(null)
  const [currentModelData, setCurrentModelData] = useState<ThreeDModelData | null>(modelData)
  const [controlMode, setControlMode] = useState<"firstPerson" | "orbit">("orbit")

  // Sync prop changes
  useEffect(() => {
    setCurrentModelData(modelData)
    if (modelData) {
      setState("ready")
    }
  }, [modelData])

  // === Generate 3D Model ===

  const handleGenerate = useCallback(async () => {
    setState("loading")
    setError(null)

    try {
      const response = await fetch(`/api/moratta/projects/${projectId}/3d/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const data = await response.json()
        const message = data?.errors?.[0]?.message ?? "Falha ao gerar modelo 3D."
        throw new Error(message)
      }

      const result = await response.json()
      setCurrentModelData(result.data)
      setState("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao gerar modelo 3D.")
      setState("error")
    }
  }, [projectId])

  // === Build Scene ===

  const buildScene = useCallback(
    async (data: ThreeDModelData) => {
      const container = containerRef.current
      if (!container) return

      // Dynamic import of Three.js to avoid SSR issues
      const THREE = await import("three")
      threeRef.current = THREE

      // Dispose previous scene
      disposeScene()

      // Create scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xe8eaed)
      scene.fog = new THREE.Fog(0xe8eaed, 30, 80)
      sceneRef.current = scene

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 20, 10)
      directionalLight.castShadow = true
      scene.add(directionalLight)

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
      fillLight.position.set(-5, 10, -5)
      scene.add(fillLight)

      // Get style colors
      const styleKey = data.facade?.style ?? "moderno"
      const colors = STYLE_COLORS[styleKey] ?? STYLE_COLORS.moderno

      // Build walls
      buildWalls(THREE, scene, data, colors)

      // Build floors
      buildFloors(THREE, scene, data)

      // Build roof
      buildRoof(THREE, scene, data)

      // Build openings (visual indicators)
      buildOpenings(THREE, scene, data, colors)

      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(100, 100)
      const groundMat = new THREE.MeshLambertMaterial({ color: 0x7ec850 })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -0.01
      ground.receiveShadow = true
      scene.add(ground)

      // Camera
      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000,
      )
      camera.position.set(10, 8, 15)
      camera.lookAt(0, 2, 0)
      cameraRef.current = camera

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      container.innerHTML = ""
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Handle WebGL context loss
      renderer.domElement.addEventListener("webglcontextlost", handleContextLost)
      renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored)

      // Setup controls
      await setupControls(THREE, camera, renderer.domElement)

      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate)
        if (controlsRef.current && typeof (controlsRef.current as { update: () => void }).update === "function") {
          (controlsRef.current as { update: () => void }).update()
        }
        renderer.render(scene, camera)
      }
      animate()
    },
    [controlMode],
  )

  // === Build Walls ===

  function buildWalls(
    THREE: typeof import("three"),
    scene: import("three").Scene,
    data: ThreeDModelData,
    colors: { wall: number; trim: number; accent: number },
  ) {
    for (const wall of data.walls) {
      const height = wall.height || 2.8
      const vertices = wall.vertices

      if (vertices.length < 6) continue

      // Compute wall dimensions from vertices
      const x1 = vertices[0]
      const z1 = vertices[2]
      const x2 = vertices.length >= 9 ? vertices[3] : vertices[0] + 0.15
      const z2 = vertices.length >= 9 ? vertices[5] : vertices[2]

      const dx = x2 - x1
      const dz = z2 - z1
      const length = Math.sqrt(dx * dx + dz * dz)
      const thickness = vertices.length >= 12 ? 0.15 : 0.15

      if (length < 0.01) continue

      // Material based on wall type
      const wallColor = wall.isExternal ? colors.wall : 0xfafafa
      const material = new THREE.MeshLambertMaterial({ color: wallColor })

      const geometry = new THREE.BoxGeometry(length, height, thickness)
      const mesh = new THREE.Mesh(geometry, material)

      // Position at midpoint
      mesh.position.set(
        (x1 + x2) / 2,
        height / 2,
        (z1 + z2) / 2,
      )

      // Rotate to align with wall direction
      const angle = Math.atan2(dz, dx)
      mesh.rotation.y = -angle

      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }

  // === Build Floors ===

  function buildFloors(
    THREE: typeof import("three"),
    scene: import("three").Scene,
    data: ThreeDModelData,
  ) {
    for (const floor of data.floors) {
      const vertices = floor.vertices
      if (vertices.length < 6) continue

      // Compute bounding box from vertices
      let minX = Infinity, maxX = -Infinity
      let minZ = Infinity, maxZ = -Infinity

      for (let i = 0; i < vertices.length; i += 3) {
        minX = Math.min(minX, vertices[i])
        maxX = Math.max(maxX, vertices[i])
        minZ = Math.min(minZ, vertices[i + 2])
        maxZ = Math.max(maxZ, vertices[i + 2])
      }

      const width = maxX - minX
      const depth = maxZ - minZ
      const level = floor.level || 0

      const geometry = new THREE.PlaneGeometry(width, depth)
      const material = new THREE.MeshLambertMaterial({
        color: floor.material === "tile" ? 0xd4c5a9 : 0xc8b896,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(
        (minX + maxX) / 2,
        level * 3.0 + 0.01,
        (minZ + maxZ) / 2,
      )
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }

  // === Build Roof ===

  function buildRoof(
    THREE: typeof import("three"),
    scene: import("three").Scene,
    data: ThreeDModelData,
  ) {
    const roof = data.roof
    if (!roof || !roof.vertices || roof.vertices.length < 6) return

    const roofColor = ROOF_COLORS[roof.type] ?? ROOF_COLORS.flat

    // Compute bounding box from vertices
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    let maxY = -Infinity

    for (let i = 0; i < roof.vertices.length; i += 3) {
      minX = Math.min(minX, roof.vertices[i])
      maxX = Math.max(maxX, roof.vertices[i])
      maxY = Math.max(maxY, roof.vertices[i + 1])
      minZ = Math.min(minZ, roof.vertices[i + 2])
      maxZ = Math.max(maxZ, roof.vertices[i + 2])
    }

    const width = maxX - minX
    const depth = maxZ - minZ
    const centerX = (minX + maxX) / 2
    const centerZ = (minZ + maxZ) / 2

    const material = new THREE.MeshLambertMaterial({
      color: roofColor,
      side: THREE.DoubleSide,
    })

    switch (roof.type) {
      case "gable": {
        // Triangular prism shape
        const shape = new THREE.Shape()
        shape.moveTo(-width / 2, 0)
        shape.lineTo(width / 2, 0)
        shape.lineTo(0, 1.5)
        shape.closePath()

        const extrudeSettings = { depth: depth, bevelEnabled: false }
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(centerX, maxY, centerZ - depth / 2)
        mesh.castShadow = true
        scene.add(mesh)
        break
      }
      case "hip": {
        // Pyramid-like shape
        const geometry = new THREE.ConeGeometry(
          Math.max(width, depth) / 1.5,
          1.5,
          4,
        )
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(centerX, maxY + 0.75, centerZ)
        mesh.rotation.y = Math.PI / 4
        mesh.castShadow = true
        scene.add(mesh)
        break
      }
      case "mansard": {
        // Two-slope roof (simplified as box + pyramid)
        const baseGeo = new THREE.BoxGeometry(width * 1.05, 0.8, depth * 1.05)
        const baseMesh = new THREE.Mesh(baseGeo, material)
        baseMesh.position.set(centerX, maxY + 0.4, centerZ)
        baseMesh.castShadow = true
        scene.add(baseMesh)

        const topGeo = new THREE.ConeGeometry(
          Math.max(width, depth) / 2,
          0.8,
          4,
        )
        const topMesh = new THREE.Mesh(topGeo, material)
        topMesh.position.set(centerX, maxY + 1.2, centerZ)
        topMesh.rotation.y = Math.PI / 4
        topMesh.castShadow = true
        scene.add(topMesh)
        break
      }
      case "flat":
      default: {
        // Flat slab
        const geometry = new THREE.BoxGeometry(width * 1.05, 0.2, depth * 1.05)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(centerX, maxY + 0.1, centerZ)
        mesh.castShadow = true
        scene.add(mesh)
        break
      }
    }
  }

  // === Build Openings ===

  function buildOpenings(
    THREE: typeof import("three"),
    scene: import("three").Scene,
    data: ThreeDModelData,
    colors: { wall: number; trim: number; accent: number },
  ) {
    for (const opening of data.openings) {
      const pos = opening.position
      if (!pos || pos.length < 3) continue

      const width = opening.width || 0.9
      const height = opening.height || (opening.type === "door" ? 2.1 : 1.2)

      if (opening.type === "door") {
        // Door frame
        const frameMaterial = new THREE.MeshLambertMaterial({ color: colors.trim })

        // Left frame
        const leftFrame = new THREE.BoxGeometry(0.05, height, 0.12)
        const leftMesh = new THREE.Mesh(leftFrame, frameMaterial)
        leftMesh.position.set(pos[0] - width / 2, height / 2, pos[2])
        scene.add(leftMesh)

        // Right frame
        const rightMesh = new THREE.Mesh(leftFrame.clone(), frameMaterial)
        rightMesh.position.set(pos[0] + width / 2, height / 2, pos[2])
        scene.add(rightMesh)

        // Top frame
        const topFrame = new THREE.BoxGeometry(width + 0.1, 0.05, 0.12)
        const topMesh = new THREE.Mesh(topFrame, frameMaterial)
        topMesh.position.set(pos[0], height, pos[2])
        scene.add(topMesh)

        // Door panel (slightly recessed)
        const doorMaterial = new THREE.MeshLambertMaterial({ color: colors.accent })
        const doorGeo = new THREE.BoxGeometry(width - 0.05, height - 0.05, 0.04)
        const doorMesh = new THREE.Mesh(doorGeo, doorMaterial)
        doorMesh.position.set(pos[0], height / 2, pos[2])
        scene.add(doorMesh)
      } else {
        // Window
        const sillHeight = pos[1] || 1.0
        const frameMaterial = new THREE.MeshLambertMaterial({ color: colors.trim })

        // Frame
        const frameGeo = new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.06)
        const frameMesh = new THREE.Mesh(frameGeo, frameMaterial)
        frameMesh.position.set(pos[0], sillHeight + height / 2, pos[2])
        scene.add(frameMesh)

        // Glass
        const glassMaterial = new THREE.MeshLambertMaterial({
          color: 0x87ceeb,
          transparent: true,
          opacity: 0.4,
        })
        const glassGeo = new THREE.BoxGeometry(width - 0.04, height - 0.04, 0.02)
        const glassMesh = new THREE.Mesh(glassGeo, glassMaterial)
        glassMesh.position.set(pos[0], sillHeight + height / 2, pos[2])
        scene.add(glassMesh)
      }
    }
  }

  // === Setup Controls ===

  async function setupControls(
    THREE: typeof import("three"),
    camera: import("three").PerspectiveCamera,
    domElement: HTMLCanvasElement,
  ) {
    if (controlMode === "firstPerson") {
      // First-person controls using PointerLockControls
      const { PointerLockControls } = await import("three/examples/jsm/controls/PointerLockControls.js")
      const controls = new PointerLockControls(camera, domElement)

      // Position camera at eye level inside the building
      camera.position.set(2, 1.6, 2)

      const velocity = { x: 0, z: 0 }
      const moveSpeed = 5
      const keys: Record<string, boolean> = {}

      const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true }
      const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false }

      document.addEventListener("keydown", onKeyDown)
      document.addEventListener("keyup", onKeyUp)

      domElement.addEventListener("click", () => {
        controls.lock()
      })

      // Override update to handle movement
      const originalUpdate = () => {
        const direction = new THREE.Vector3()
        const right = new THREE.Vector3()

        camera.getWorldDirection(direction)
        direction.y = 0
        direction.normalize()
        right.crossVectors(direction, new THREE.Vector3(0, 1, 0))

        velocity.x = 0
        velocity.z = 0

        if (keys["KeyW"] || keys["ArrowUp"]) {
          velocity.x += direction.x * moveSpeed * 0.016
          velocity.z += direction.z * moveSpeed * 0.016
        }
        if (keys["KeyS"] || keys["ArrowDown"]) {
          velocity.x -= direction.x * moveSpeed * 0.016
          velocity.z -= direction.z * moveSpeed * 0.016
        }
        if (keys["KeyA"] || keys["ArrowLeft"]) {
          velocity.x -= right.x * moveSpeed * 0.016
          velocity.z -= right.z * moveSpeed * 0.016
        }
        if (keys["KeyD"] || keys["ArrowRight"]) {
          velocity.x += right.x * moveSpeed * 0.016
          velocity.z += right.z * moveSpeed * 0.016
        }

        camera.position.x += velocity.x
        camera.position.z += velocity.z
      }

      controlsRef.current = { update: originalUpdate, dispose: () => {
        document.removeEventListener("keydown", onKeyDown)
        document.removeEventListener("keyup", onKeyUp)
        controls.dispose()
      }}
    } else {
      // Orbit controls
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js")
      const controls = new OrbitControls(camera, domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.maxPolarAngle = Math.PI / 2.1
      controls.minDistance = 2
      controls.maxDistance = 50
      controls.target.set(0, 1, 0)
      controlsRef.current = controls
    }
  }

  // === WebGL Context Loss Handling ===

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault()
    setState("error")
    setError("Contexto WebGL perdido. Tentando recuperar...")
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const handleContextRestored = useCallback(() => {
    setError(null)
    if (currentModelData) {
      buildScene(currentModelData)
    }
  }, [currentModelData, buildScene])

  // === Dispose Scene ===

  function disposeScene() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (controlsRef.current && typeof (controlsRef.current as { dispose?: () => void }).dispose === "function") {
      (controlsRef.current as { dispose: () => void }).dispose()
      controlsRef.current = null
    }

    if (rendererRef.current) {
      const renderer = rendererRef.current as import("three").WebGLRenderer
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost)
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored)
      renderer.dispose()
      rendererRef.current = null
    }

    if (sceneRef.current) {
      const scene = sceneRef.current as import("three").Scene
      scene.traverse((object) => {
        if ((object as import("three").Mesh).geometry) {
          (object as import("three").Mesh).geometry.dispose()
        }
        if ((object as import("three").Mesh).material) {
          const material = (object as import("three").Mesh).material
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose())
          } else {
            material.dispose()
          }
        }
      })
      sceneRef.current = null
    }
  }

  // === Build scene when model data is available ===

  useEffect(() => {
    if (state === "ready" && currentModelData) {
      buildScene(currentModelData)
    }

    return () => {
      disposeScene()
    }
  }, [state, currentModelData, buildScene])

  // === Handle Resize ===

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return
      const renderer = rendererRef.current as import("three").WebGLRenderer
      const camera = cameraRef.current as import("three").PerspectiveCamera

      const width = container.clientWidth
      const height = container.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  // === Render ===

  // Idle state - no model data, show generate button
  if (state === "idle") {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full min-h-[300px] sm:min-h-[400px] bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30"
        aria-label="Visualizador 3D - Nenhum modelo gerado"
      >
        <div className="text-center space-y-4 p-8">
          <div className="text-4xl">🏠</div>
          <h3 className="text-lg font-medium text-foreground">Visualização 3D</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Gere um modelo 3D a partir da sua planta baixa para visualizar a residência em três dimensões.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label="Gerar modelo 3D"
          >
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Gerar 3D
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (state === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full min-h-[300px] sm:min-h-[400px] bg-muted/30 rounded-lg"
        aria-label="Gerando modelo 3D"
        aria-live="polite"
      >
        <div className="text-center space-y-4 p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Gerando modelo 3D...</p>
          <p className="text-xs text-muted-foreground/70">Isso pode levar até 60 segundos</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state === "error") {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full min-h-[300px] sm:min-h-[400px] bg-destructive/5 rounded-lg border border-destructive/20"
        aria-label="Erro na visualização 3D"
        role="alert"
      >
        <div className="text-center space-y-4 p-8">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-lg font-medium text-destructive">Erro na Visualização</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
          <button
            onClick={handleGenerate}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label="Tentar gerar modelo 3D novamente"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Ready state - 3D viewer
  return (
    <div
      className="relative w-full h-full min-h-[300px] sm:min-h-[400px] rounded-lg overflow-hidden"
      aria-label="Visualizador 3D da residência. Use o mouse para rotacionar a câmera. WASD ou setas para mover em primeira pessoa."
    >
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          onClick={() => setControlMode(controlMode === "orbit" ? "firstPerson" : "orbit")}
          className="min-h-[44px] min-w-[44px] rounded-md border border-border bg-background/80 px-3 py-2 text-xs text-foreground backdrop-blur-sm transition-colors hover:bg-background/95"
          aria-label={
            controlMode === "orbit"
              ? "Alternar para navegação em primeira pessoa"
              : "Alternar para controle orbital"
          }
        >
          {controlMode === "orbit" ? "🚶 Primeira Pessoa" : "🔄 Orbital"}
        </button>
      </div>

      {/* Keyboard controls hint */}
      <div className="absolute bottom-3 left-3 hidden rounded-md border border-border/50 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm sm:block">
        {controlMode === "orbit" ? (
          <span>Arraste para rotacionar • Scroll para zoom</span>
        ) : (
          <span>Clique para ativar • WASD/Setas para mover • Mouse para olhar</span>
        )}
      </div>
    </div>
  )
}
