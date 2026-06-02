import { openDB } from 'idb'

const DB_NAME = 'kids_study_app'
const DB_VERSION = 1
const STORE_NAME = 'app_data'

export async function openDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function loadFromDB() {
  try {
    const db = await openDatabase()
    const data = await db.get(STORE_NAME, 'main')
    db.close()
    return data
  } catch (e) {
    console.error('DB load error:', e)
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('kids_study_app_v1')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
}

export async function saveToDB(data) {
  try {
    const db = await openDatabase()
    await db.put(STORE_NAME, data, 'main')
    db.close()
    return true
  } catch (e) {
    console.error('DB save error:', e)
    // Fallback to localStorage
    try {
      localStorage.setItem('kids_study_app_v1', JSON.stringify(data))
      return true
    } catch (e2) {
      console.error('LocalStorage save error:', e2)
      return false
    }
  }
}

export async function clearDB() {
  try {
    const db = await openDatabase()
    await db.delete(STORE_NAME, 'main')
    db.close()
    return true
  } catch (e) {
    console.error('DB clear error:', e)
    return false
  }
}
