/**
 * BIA v4 · R15 · BioSlicer — Armazenamento de malhas no browser (IndexedDB)
 * STL da Etapa 1 / Studio / upload → chega ao fatiador por referência.
 */

const DB_NAME = "bia-bioslicer"
const STORE = "meshes"
const VERSION = 1
const LAST_KEY = "bia:slicer:lastMeshId"

export interface StoredMesh {
  id: string
  name: string
  bytes: ArrayBuffer
  format: "stl" | "obj" | "ply"
  createdAt: number
  source: string
  meta?: Record<string, unknown>
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponível"))
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putMesh(m: StoredMesh): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(m)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  try { localStorage.setItem(LAST_KEY, m.id) } catch { /* noop */ }
}

export async function getMesh(id: string): Promise<StoredMesh | null> {
  const db = await openDB()
  const out = await new Promise<StoredMesh | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as StoredMesh) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return out
}

export async function listMeshes(): Promise<Array<Omit<StoredMesh, "bytes"> & { sizeKb: number }>> {
  const db = await openDB()
  const out = await new Promise<StoredMesh[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as StoredMesh[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return out
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ bytes, ...rest }) => ({ ...rest, sizeKb: Math.round(bytes.byteLength / 1024) }))
}

export async function deleteMesh(id: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export function getLastMeshId(): string | null {
  try { return localStorage.getItem(LAST_KEY) } catch { return null }
}

export function newMeshId(prefix = "mesh"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** TriMesh flat → bytes STL binário. */
export function triMeshToSTL(vertices: Float32Array, triangleCount: number, header = "BIA v4 BioSlicer"): ArrayBuffer {
  const buf = new ArrayBuffer(84 + triangleCount * 50)
  const dv = new DataView(buf)
  new Uint8Array(buf, 0, 80).set(new TextEncoder().encode(header.slice(0, 79)))
  dv.setUint32(80, triangleCount, true)
  let off = 84
  for (let t = 0; t < triangleCount; t++) {
    const b = t * 9
    const ax = vertices[b], ay = vertices[b + 1], az = vertices[b + 2]
    const bx = vertices[b + 3], by = vertices[b + 4], bz = vertices[b + 5]
    const cx = vertices[b + 6], cy = vertices[b + 7], cz = vertices[b + 8]
    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const L = Math.hypot(nx, ny, nz) || 1
    nx /= L; ny /= L; nz /= L
    dv.setFloat32(off, nx, true); dv.setFloat32(off + 4, ny, true); dv.setFloat32(off + 8, nz, true)
    off += 12
    for (let k = 0; k < 9; k++) { dv.setFloat32(off, vertices[b + k], true); off += 4 }
    dv.setUint16(off, 0, true)
    off += 2
  }
  return buf
}
