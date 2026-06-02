import { openDB } from 'idb'

const DB_NAME = 'kids_study_app'
const DB_VERSION = 2  // 버전 증가 (강제 재생성)
const STORE_NAME = 'app_data'

export async function openDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 기존 스토어 삭제 후 재생성
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME)
      }
      db.createObjectStore(STORE_NAME)
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
    return null
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
    return false
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
