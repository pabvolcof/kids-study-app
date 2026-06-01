import { useState, useCallback, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'kids_study_app_v1'
const DATA_VERSION = 2
const DEFAULT_PIN = '534453'

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'ggkids_salt'))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const DEFAULT_SUBJECTS = [
  { id: 'math', name: '수학', emoji: '🔢', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'korean', name: '국어', emoji: '📖', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'english', name: '영어', emoji: '🔤', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'science', name: '과학', emoji: '🔬', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'social', name: '사회', emoji: '🌍', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'reading', name: '독서', emoji: '📚', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'room', name: '내 방 정리', emoji: '🧹', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'chores', name: '집안일 돕기', emoji: '🏠', color: 'bg-pink-100 text-pink-700 border-pink-200' },
]

function migrateData(raw) {
  if (!raw) return null
  const version = raw.dataVersion || 1
  let data = { ...raw }
  if (version < 2) {
    data.adminPinHash = null
    data.adminUnlockUntil = null
    data.dataVersion = 2
  }
  // 새 subjects 병합 (없는 것만 추가)
  if (data.subjects) {
    const existingIds = new Set(data.subjects.map(s => s.id))
    DEFAULT_SUBJECTS.forEach(s => {
      if (!existingIds.has(s.id)) data.subjects = [...data.subjects, s]
    })
  }
  data.dataVersion = DATA_VERSION
  return data
}

const DEFAULT_TASKS = [
  { id: 't1', subjectId: 'math', title: '수학 문제집 1장', points: 10 },
  { id: 't2', subjectId: 'korean', title: '국어 교과서 읽기', points: 10 },
  { id: 't3', subjectId: 'english', title: '영어 단어 10개', points: 10 },
  { id: 't4', subjectId: 'reading', title: '책 20분 읽기', points: 15 },
]

const createProfile = (name, avatar) => ({
  id: Date.now().toString(),
  name,
  avatar,
  tasks: DEFAULT_TASKS.map(t => ({ ...t, id: `${t.id}_${Date.now()}` })),
  completions: {},
  totalPoints: 0,
  level: 1,
  streak: 0,
  lastCompletedDate: null,
  rewards: [],
})

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return migrateData(JSON.parse(raw))
  } catch {
    return null
  }
}

function saveData(data) {
  try {
    // 30일 이상 된 completions 정리 (용량 최적화)
    const cleaned = cleanOldData(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
  } catch (e) {
    console.error('저장 실패:', e)
  }
}

// 30일 이상 된 completions 자동 정리
function cleanOldData(data) {
  if (!data || !data.profiles) return data
  
  const today = new Date()
  const cutoffDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) // 30일 전
  const cutoffStr = cutoffDate.toISOString().split('T')[0]
  
  return {
    ...data,
    profiles: data.profiles.map(profile => {
      if (!profile.completions) return profile
      
      // 30일 이내 completions만 유지
      const recentCompletions = {}
      Object.entries(profile.completions).forEach(([date, comp]) => {
        if (date >= cutoffStr) {
          recentCompletions[date] = comp
        }
      })
      
      return {
        ...profile,
        completions: recentCompletions
      }
    })
  }
}

export function useStore() {
  const [data, setData] = useState(() => {
    const saved = loadData()
    if (saved) return { ...saved, activeProfileId: null }
    return {
      dataVersion: DATA_VERSION,
      profiles: [],
      activeProfileId: null,
      subjects: DEFAULT_SUBJECTS,
      adminPinHash: null,
      adminUnlockUntil: null,
      trash: [],
      adminLogs: [], // 관리자 변경 로그
    }
  })
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'
  const isSyncingFromRemote = useRef(false)

  useEffect(() => {
    hashPin(DEFAULT_PIN).then(defaultHash => {
      if (!data.adminPinHash || data.adminPinHash !== defaultHash) {
        const newData = { ...data, adminPinHash: defaultHash }
        setData(newData)
        saveData(newData)
      }
    })
  }, [])

  // Supabase에서 초기 데이터 로드 - 로컬 데이터와 병합
  useEffect(() => {
    setSyncStatus('syncing')
    supabase.from('app_data').select('data').eq('id', 'main').single()
      .then(({ data: row, error }) => {
        if (error || !row) { setSyncStatus('error'); return }
        const remote = row.data
        const local = data
        
        if (remote && remote.profiles && remote.profiles.length > 0) {
          // 로컬 프로필과 원격 프로필 병합 (ID 기준)
          const localProfileIds = new Set((local.profiles || []).map(p => p.id))
          const remoteProfileIds = new Set(remote.profiles.map(p => p.id))
          
          // 로컬에만 있는 프로필 추가
          const localOnlyProfiles = (local.profiles || []).filter(p => !remoteProfileIds.has(p.id))
          // 원격에만 있는 프로필 추가
          const remoteOnlyProfiles = remote.profiles.filter(p => !localProfileIds.has(p.id))
          
          // 공통 프로필은 completions 데이터 병합 - 로컬 우선
          const commonProfiles = (local.profiles || []).filter(p => remoteProfileIds.has(p.id)).map(localProfile => {
            const remoteProfile = remote.profiles.find(p => p.id === localProfile.id)
            const mergedCompletions = {
              ...(remoteProfile.completions || {}),
              ...(localProfile.completions || {})
            }
            return {
              ...remoteProfile,
              ...localProfile,
              completions: mergedCompletions,
              totalPoints: localProfile.totalPoints || remoteProfile.totalPoints,
              level: localProfile.level || remoteProfile.level,
              streak: localProfile.streak || remoteProfile.streak,
              lastCompletedDate: localProfile.lastCompletedDate || remoteProfile.lastCompletedDate
            }
          })
          
          const mergedProfiles = [...remoteOnlyProfiles, ...commonProfiles, ...localOnlyProfiles]
          
          const merged = migrateData({
            ...remote,
            profiles: mergedProfiles,
            activeProfileId: local.activeProfileId || null,
            trash: [...(remote.trash || []), ...(local.trash || [])]
          })
          
          setData(merged)
          saveData(merged)
        }
        setSyncStatus('synced')
      })
  }, [])

  // Realtime 구독 - 다른 기기 변경사항 수신
  useEffect(() => {
    const channel = supabase
      .channel('app_data_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_data', filter: 'id=eq.main' },
        (payload) => {
          if (isSyncingFromRemote.current) return
          const remote = payload.new.data
          // 최신 로컬 데이터 가져오기
          const localRaw = localStorage.getItem(STORAGE_KEY)
          const local = localRaw ? JSON.parse(localRaw) : data
          
          if (remote && remote.profiles) {
            // 로컬 프로필과 원격 프로필 병합
            const localProfileIds = new Set((local.profiles || []).map(p => p.id))
            const remoteProfileIds = new Set(remote.profiles.map(p => p.id))
            
            const localOnlyProfiles = (local.profiles || []).filter(p => !remoteProfileIds.has(p.id))
            const remoteOnlyProfiles = remote.profiles.filter(p => !localProfileIds.has(p.id))
            
            // 공통 프로필은 completions 데이터 병합
            const commonProfiles = (local.profiles || []).filter(p => remoteProfileIds.has(p.id)).map(localProfile => {
              const remoteProfile = remote.profiles.find(p => p.id === localProfile.id)
              // completions 병합 - 로컬 우선 (최신 체크 상태 유지)
              const mergedCompletions = {
                ...(remoteProfile.completions || {}),
                ...(localProfile.completions || {})
              }
              return {
                ...remoteProfile,
                ...localProfile,
                completions: mergedCompletions,
                // 로컬의 최신 상태 유지
                totalPoints: localProfile.totalPoints || remoteProfile.totalPoints,
                level: localProfile.level || remoteProfile.level,
                streak: localProfile.streak || remoteProfile.streak,
                lastCompletedDate: localProfile.lastCompletedDate || remoteProfile.lastCompletedDate
              }
            })
            
            const mergedProfiles = [...remoteOnlyProfiles, ...commonProfiles, ...localOnlyProfiles]
            
            const merged = migrateData({
              ...remote,
              profiles: mergedProfiles,
              activeProfileId: local.activeProfileId || null,
              trash: [...(remote.trash || []), ...(local.trash || [])]
            })
            
            setData(prev => ({ ...merged, activeProfileId: prev.activeProfileId }))
            saveData({ ...merged, activeProfileId: null })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const persist = useCallback((newData) => {
    setData(newData)
    saveData(newData)
    // Supabase에 비동기 저장 (activeProfileId 제외)
    const { activeProfileId, ...toSave } = newData
    isSyncingFromRemote.current = true
    setSyncStatus('syncing')
    supabase.from('app_data').upsert({ id: 'main', data: toSave })
      .then(({ error }) => {
        setSyncStatus(error ? 'error' : 'synced')
        setTimeout(() => { isSyncingFromRemote.current = false }, 500)
      })
  }, [])

  const activeProfile = data.profiles.find(p => p.id === data.activeProfileId) || null

  const addProfile = useCallback((name, avatar) => {
    const profile = createProfile(name, avatar)
    persist({
      ...data,
      profiles: [...data.profiles, profile],
      activeProfileId: profile.id,
    })
    return profile
  }, [data, persist])

  const switchProfile = useCallback((id) => {
    persist({ ...data, activeProfileId: id })
  }, [data, persist])

  const deleteProfile = useCallback((id) => {
    const profiles = data.profiles.filter(p => p.id !== id)
    persist({
      ...data,
      profiles,
      activeProfileId: profiles.length > 0 ? profiles[0].id : null,
    })
  }, [data, persist])

  const updateProfile = useCallback((id, updates) => {
    persist({
      ...data,
      profiles: data.profiles.map(p => p.id === id ? { ...p, ...updates } : p),
    })
  }, [data, persist])

  const today = format(new Date(), 'yyyy-MM-dd')

  const getTodayCompletions = useCallback((profileId) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return {}
    return profile.completions[today] || {}
  }, [data, today])

  // 연속 일수 계산 함수 - 마지막 완료일부터 거슬러 올라가며 계산
  const calculateStreak = useCallback((profile, checkDate) => {
    const completions = profile.completions || {}
    const tasks = profile.tasks || []
    
    if (!tasks.length) return { streak: 0, lastDate: null }
    
    // checkDate부터 거슬러 올라가며 연속 완료일 계산
    let streak = 0
    let currentDate = new Date(checkDate)
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const dayComp = completions[dateStr] || {}
      
      // 해당 날짜에 모든 목표 완료했는지 확인
      const allDone = tasks.every(t => dayComp[t.id])
      
      if (allDone) {
        streak++
        // 하루 전으로 이동
        currentDate = new Date(currentDate.getTime() - 86400000)
      } else {
        break
      }
    }
    
    // 마지막 완료일 (streak이 0이면 null, 아니면 checkDate)
    const lastDate = streak > 0 ? checkDate : profile.lastCompletedDate
    
    return { streak, lastDate }
  }, [])

  const toggleTask = useCallback((profileId, taskId, targetDate = null, isAdmin = false) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return null

    const date = targetDate || today
    const dateComp = profile.completions[date] || {}
    const wasCompleted = !!dateComp[taskId]
    const task = profile.tasks.find(t => t.id === taskId)
    if (!task) return null

    const newDateComp = { ...dateComp, [taskId]: !wasCompleted }
    
    // 오늘 날짜거나 관리자 모드이면 포인트/레벨/스트릭 계산
    const shouldCalculate = date === today || isAdmin
    
    let updatedProfile = {
      ...profile,
      completions: { ...profile.completions, [date]: newDateComp },
    }
    
    // 관리자 변경 로그
    let newAdminLogs = data.adminLogs || []
    if (isAdmin) {
      const logEntry = {
        id: `log_${Date.now()}`,
        type: 'task_toggle',
        profileId,
        taskId,
        taskTitle: task.title,
        date,
        action: wasCompleted ? 'uncomplete' : 'complete',
        timestamp: new Date().toISOString(),
      }
      newAdminLogs = [logEntry, ...(newAdminLogs.slice(0, 99))] // 최근 100개만 유지
    }
    
    if (shouldCalculate) {
      const pointDelta = wasCompleted ? -task.points : task.points
      const newTotalPoints = Math.max(0, (profile.totalPoints || 0) + pointDelta)
      const newLevel = Math.floor(newTotalPoints / 100) + 1

      const allDone = profile.tasks.every(t => newDateComp[t.id])
      
      // 개선된 연속 일수 계산
      let newStreak = profile.streak || 0
      let newLastDate = profile.lastCompletedDate
      
      if (allDone) {
        // 오늘 완료했을 때
        if (date === today && profile.lastCompletedDate !== today) {
          const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
          newStreak = profile.lastCompletedDate === yesterday ? (profile.streak || 0) + 1 : 1
          newLastDate = today
        } 
        // 관리자가 과거 날짜 완료했을 때 - 연속 일수 재계산
        else if (isAdmin && date !== today) {
          // 해당 날짜 기준으로 연속 일수 계산
          const { streak, lastDate } = calculateStreak({ ...profile, completions: updatedProfile.completions }, date)
          newStreak = streak
          newLastDate = lastDate
        }
      }

      const oldLevel = profile.level || 1
      const isMilestone = newLevel > oldLevel && newLevel % 10 === 0
      const newPendingMilestones = isMilestone
        ? [...(data.pendingMilestones || []), { profileId, profileName: profile.name, level: newLevel, at: today }]
        : (data.pendingMilestones || [])

      updatedProfile = {
        ...updatedProfile,
        totalPoints: newTotalPoints,
        level: newLevel,
        streak: newStreak,
        lastCompletedDate: newLastDate,
      }

      persist({
        ...data,
        profiles: data.profiles.map(p => p.id === profileId ? updatedProfile : p),
        pendingMilestones: newPendingMilestones,
        adminLogs: newAdminLogs,
      })

      return { allDone, pointDelta, newLevel, wasLevelUp: newLevel > oldLevel, newStreak }
    } else {
      // 과거/미래 날짜는 완료 상태만 저장
      persist({
        ...data,
        profiles: data.profiles.map(p => p.id === profileId ? updatedProfile : p),
        adminLogs: newAdminLogs,
      })
      
      return { allDone: false, pointDelta: 0, newLevel: profile.level || 1, wasLevelUp: false, newStreak: profile.streak }
    }
  }, [data, today, persist, calculateStreak])

  const copyTask = useCallback((profileId, task) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return
    const newTask = { ...task, id: `task_${Date.now()}`, title: `${task.title} (복사)`, addedBy: undefined, addedDate: undefined }
    persist({
      ...data,
      profiles: data.profiles.map(p =>
        p.id === profileId ? { ...p, tasks: [...(p.tasks || []), newTask] } : p
      ),
    })
  }, [data, persist])

  const addTask = useCallback((profileId, task) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return
    const newTask = { ...task, id: `task_${Date.now()}` }
    persist({
      ...data,
      profiles: data.profiles.map(p =>
        p.id === profileId ? { ...p, tasks: [...(p.tasks||[]), newTask] } : p
      ),
    })
  }, [data, persist])

  const addStudentTask = useCallback((profileId, task) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: false, reason: 'no_profile' }
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const todayAdded = (profile.tasks || []).filter(
      t => t.addedBy === 'student' && t.addedDate === todayStr
    ).length
    if (todayAdded >= 3) return { ok: false, reason: 'limit' }
    const newTask = { ...task, id: `task_${Date.now()}`, addedBy: 'student', addedDate: todayStr }
    persist({
      ...data,
      profiles: data.profiles.map(p =>
        p.id === profileId ? { ...p, tasks: [...(p.tasks||[]), newTask] } : p
      ),
    })
    return { ok: true }
  }, [data, persist, today])

  const clearMilestone = useCallback((index) => {
    const updated = (data.pendingMilestones || []).filter((_, i) => i !== index)
    persist({ ...data, pendingMilestones: updated })
  }, [data, persist])

  const setProfilePin = useCallback(async (profileId, pin) => {
    const hash = await hashPin(pin + '_profile')
    persist({
      ...data,
      profiles: data.profiles.map(p => p.id === profileId ? { ...p, pinHash: hash } : p),
    })
  }, [data, persist])

  const clearProfilePin = useCallback((profileId) => {
    persist({
      ...data,
      profiles: data.profiles.map(p => p.id === profileId ? { ...p, pinHash: null } : p),
    })
  }, [data, persist])

  const verifyProfilePin = useCallback(async (profileId, pin) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile?.pinHash) return true
    const hash = await hashPin(pin + '_profile')
    return hash === profile.pinHash
  }, [data])

  const updateTask = useCallback((profileId, taskId, changes) => {
    persist({
      ...data,
      profiles: data.profiles.map(p =>
        p.id === profileId
          ? { ...p, tasks: (p.tasks||[]).map(t => t.id === taskId ? { ...t, ...changes } : t) }
          : p
      ),
    })
  }, [data, persist])

  const deleteTask = useCallback((profileId, taskId) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return
    const task = (profile.tasks || []).find(t => t.id === taskId)
    if (!task) return

    // 해당 목표의 모든 완료 기록에서 획득한 포인트 계산
    let pointsToDeduct = 0
    Object.values(profile.completions || {}).forEach(dayComp => {
      if (dayComp[taskId]) pointsToDeduct += (task.points || 0)
    })

    // 완료 기록에서도 해당 taskId 제거
    const newCompletions = {}
    Object.entries(profile.completions || {}).forEach(([date, dayComp]) => {
      const { [taskId]: _, ...rest } = dayComp
      if (Object.keys(rest).length > 0) newCompletions[date] = rest
    })

    const newTotalPoints = Math.max(0, (profile.totalPoints || 0) - pointsToDeduct)
    const newLevel = Math.floor(newTotalPoints / 100) + 1

    const trashItem = {
      ...task,
      _trashedAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
      _profileId: profileId,
      _profileName: profile.name,
    }

    persist({
      ...data,
      trash: [...(data.trash || []), trashItem],
      profiles: data.profiles.map(p =>
        p.id === profileId
          ? { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId), completions: newCompletions, totalPoints: newTotalPoints, level: newLevel }
          : p
      ),
    })
  }, [data, persist])

  const restoreTask = useCallback((taskId) => {
    const item = (data.trash || []).find(t => t.id === taskId)
    if (!item) return
    const { _trashedAt, _profileId, _profileName, ...task } = item
    const profile = data.profiles.find(p => p.id === _profileId)
    if (!profile) return
    persist({
      ...data,
      trash: (data.trash || []).filter(t => t.id !== taskId),
      profiles: data.profiles.map(p =>
        p.id === _profileId ? { ...p, tasks: [...(p.tasks || []), task] } : p
      ),
    })
  }, [data, persist])

  const emptyTrash = useCallback(() => {
    persist({ ...data, trash: [] })
  }, [data, persist])

  const deleteTrashItem = useCallback((taskId) => {
    persist({ ...data, trash: (data.trash || []).filter(t => t.id !== taskId) })
  }, [data, persist])

  const getWeeklyStats = useCallback((profileId) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return []
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = format(d, 'yyyy-MM-dd')
      const label = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
      const comp = profile.completions[dateStr] || {}
      const total = profile.tasks.length
      const done = Object.values(comp).filter(Boolean).length
      days.push({ date: dateStr, label, done, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 })
    }
    return days
  }, [data])

  const getMonthlyStats = useCallback((profileId) => {
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return []
    const stats = {}
    Object.entries(profile.completions || {}).forEach(([date, comp]) => {
      const month = date.substring(0, 7)
      if (!stats[month]) stats[month] = { total: 0, done: 0 }
      const t = profile.tasks.length
      const d = Object.values(comp).filter(Boolean).length
      stats[month].total += t
      stats[month].done += d
    })
    return Object.entries(stats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, s]) => ({
        month: month.replace('-', '년 ') + '월',
        rate: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
      }))
  }, [data])

  const isPinSet = !!data.adminPinHash
  const isAdminMode = !isPinSet || adminUnlocked

  const setPin = useCallback(async (pin) => {
    const hash = await hashPin(pin)
    persist({ ...data, adminPinHash: hash })
  }, [data, persist])

  const removePin = useCallback(() => {
    persist({ ...data, adminPinHash: null })
    setAdminUnlocked(false)
  }, [data, persist])

  const verifyPin = useCallback(async (pin) => {
    if (!data.adminPinHash) return true
    const hash = await hashPin(pin)
    if (hash === data.adminPinHash) {
      setAdminUnlocked(true)
      return true
    }
    return false
  }, [data])

  const lockAdmin = useCallback(() => {
    setAdminUnlocked(false)
  }, [])

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `열공체커_백업_${format(new Date(), 'yyyyMMdd_HHmm')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  const importData = useCallback((jsonText) => {
    try {
      const parsed = JSON.parse(jsonText)
      if (!parsed.profiles || !Array.isArray(parsed.profiles)) throw new Error('잘못된 형식')
      const migrated = migrateData(parsed)
      persist(migrated)
      setAdminUnlocked(false)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }, [persist])

  return {
    data,
    activeProfile,
    subjects: data.subjects,
    today,
    isPinSet,
    isAdminMode,
    adminUnlocked,
    addProfile,
    switchProfile,
    deleteProfile,
    updateProfile,
    getTodayCompletions,
    toggleTask,
    addTask,
    copyTask,
    addStudentTask,
    updateTask,
    deleteTask,
    restoreTask,
    emptyTrash,
    deleteTrashItem,
    trash: data.trash || [],
    getWeeklyStats,
    getMonthlyStats,
    setPin,
    removePin,
    verifyPin,
    lockAdmin,
    exportData,
    importData,
    syncStatus,
    manualSync: useCallback(() => {
      setSyncStatus('syncing')
      return supabase.from('app_data').select('data').eq('id', 'main').single()
        .then(({ data: row, error }) => {
          if (error || !row) { 
            setSyncStatus('error')
            return { success: false, error }
          }
          const remote = row.data
          const localRaw = localStorage.getItem(STORAGE_KEY)
          const local = localRaw ? JSON.parse(localRaw) : data
          
          if (remote && remote.profiles) {
            const localProfileIds = new Set((local.profiles || []).map(p => p.id))
            const remoteProfileIds = new Set(remote.profiles.map(p => p.id))
            
            const localOnlyProfiles = (local.profiles || []).filter(p => !remoteProfileIds.has(p.id))
            const remoteOnlyProfiles = remote.profiles.filter(p => !localProfileIds.has(p.id))
            
            const commonProfiles = (local.profiles || []).filter(p => remoteProfileIds.has(p.id)).map(localProfile => {
              const remoteProfile = remote.profiles.find(p => p.id === localProfile.id)
              const mergedCompletions = {
                ...(remoteProfile.completions || {}),
                ...(localProfile.completions || {})
              }
              return {
                ...remoteProfile,
                ...localProfile,
                completions: mergedCompletions,
                totalPoints: localProfile.totalPoints || remoteProfile.totalPoints,
                level: localProfile.level || remoteProfile.level,
                streak: localProfile.streak || remoteProfile.streak,
                lastCompletedDate: localProfile.lastCompletedDate || remoteProfile.lastCompletedDate
              }
            })
            
            const mergedProfiles = [...remoteOnlyProfiles, ...commonProfiles, ...localOnlyProfiles]
            
            const merged = migrateData({
              ...remote,
              profiles: mergedProfiles,
              activeProfileId: local.activeProfileId || null,
              trash: [...(remote.trash || []), ...(local.trash || [])]
            })
            
            setData(merged)
            saveData(merged)
          }
          setSyncStatus('synced')
          return { success: true }
        })
    }, [data]),
    setProfilePin,
    clearProfilePin,
    verifyProfilePin,
    pendingMilestones: data.pendingMilestones || [],
    clearMilestone,
  }
}
