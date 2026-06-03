import React, { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Trash2, Star, Flame, Lock, Unlock, Home as HomeIcon, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import TaskItem from '../components/TaskItem'
import AddTaskModal from '../components/AddTaskModal'
import PinModal from '../components/PinModal'

const LEVEL_TITLES = ['새싹', '새싹', '새싹', '씩씩한 학생', '씩씩한 학생', '열공왕', '열공왕', '공부마스터', '공부마스터', '천재소년', '천재소년']

export default function Home({ store, onReward, onGoHome, onGoSettings }) {
  const { activeProfile, subjects, today, toggleTask, deleteTask, deleteTaskForDate, updateTask, isAdminMode, isPinSet, lockAdmin, verifyPin, addStudentTask, isLoading } = store
  const [showAddTask, setShowAddTask] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [showAdminPin, setShowAdminPin] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPoints, setEditPoints] = useState(10)

  // 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <div className="text-gray-600 font-medium">데이터 불러오는 중...</div>
        </div>
      </div>
    )
  }

  const handleAdminLogin = async (pin) => {
    const ok = await verifyPin(pin)
    if (ok) {
      setShowAdminPin(false)
      setPinError(false)
      return true
    }
    setPinError(true)
    return false
  }

  const [dayOffset, setDayOffset] = useState(0) // 0=오늘, -1=어제, +1=내일
  const viewDate = addDays(new Date(), dayOffset)
  const viewDateStr = format(viewDate, 'yyyy-MM-dd')
  const isToday = dayOffset === 0

  // getDay(): 0=일,1=월,2=화,3=수,4=목,5=금,6=토 → 1=월~7=일 로 변환
  const jsDay = viewDate.getDay() // 0=일~6=토
  const viewDow = jsDay === 0 ? 7 : jsDay // 1=월,2=화,...,6=토,7=일

  // 어제까지 기준 연속 일수 계산 (오늘 제외) - 표시되는 목표만 기준
  const calculateStreak = (profile) => {
    const completions = profile?.completions || {}
    const allTasks = profile?.tasks || []
    const hiddenTasksForDate = profile?.hiddenTasksForDate || {}
    if (!allTasks.length) return 0
    
    let streak = 0
    // 어제부터 거슬러 올라가며 계산
    let currentDate = new Date(Date.now() - 86400000) // 어제
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const dayComp = completions[dateStr] || {}
      const hiddenTasks = hiddenTasksForDate[dateStr] || []
      
      // 요일 계산 (1=월, 2=화, ..., 7=일)
      const jsDay = currentDate.getDay()
      const dow = jsDay === 0 ? 7 : jsDay
      
      // 달력 표시 기준과 동일한 필터링 적용
      const visibleTasks = allTasks.filter(t => {
        // 숨김 처리된 목표 제외
        if (hiddenTasks.includes(t.id)) return false
        
        // 일회성 목표는 해당 날짜에만 표시
        if (t.oneTime) {
          return t.oneTimeDate === dateStr
        }
        
        // 반복 목표는 요일 체크
        return !t.days || t.days.length === 0 || t.days.includes(dow)
      })
      
      // 표시되는 목표가 없으면 해당 날짜는 스킵 (시작 전)
      if (visibleTasks.length === 0) {
        currentDate = new Date(currentDate.getTime() - 86400000)
        continue
      }
      
      const allDone = visibleTasks.every(t => dayComp[t.id])
      
      if (allDone) {
        streak++
        currentDate = new Date(currentDate.getTime() - 86400000)
      } else {
        break
      }
    }
    return streak
  }
  
  const currentStreak = calculateStreak(activeProfile)

  const viewCompletions = (activeProfile.completions || {})[viewDateStr] || {}
  const allTasks = activeProfile.tasks || []
  const hiddenTasksForDate = activeProfile.hiddenTasksForDate || {}
  const hiddenTasks = hiddenTasksForDate[viewDateStr] || []
  
  // 목표 필터링: hiddenTasksForDate 제외, oneTimeDate 체크
  const tasks = allTasks.filter(t => {
    // 해당 날짜에 삭제된 목표 제외
    if (hiddenTasks.includes(t.id)) return false
    
    // 일회성 목표는 해당 날짜에만 표시
    if (t.oneTime) {
      return t.oneTimeDate === viewDateStr
    }
    
    // 반복 목표는 요일 체크
    return !t.days || t.days.length === 0 || t.days.includes(viewDow)
  })
  const todayStr = today
  const studentAddedToday = allTasks.filter(t => t.addedBy === 'student' && t.addedDate === todayStr).length
  const studentCanAdd = studentAddedToday < 3
  const doneTasks = tasks.filter(t => viewCompletions[t.id])
  const progress = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0
  const allDone = tasks.length > 0 && doneTasks.length === tasks.length

  // URL 파라미터로 백업/초기화 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    
    // 백업: ?backup=1
    if (params.get('backup') === '1') {
      const data = localStorage.getItem('kids_study_app_v1')
      if (data) {
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kids-study-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        alert('✅ 백업 파일이 다운로드되었습니다!')
      }
    }
    
    // 초기화: ?clear=1
    if (params.get('clear') === '1') {
      if (confirm('⚠️ 모든 데이터를 초기화하시겠습니까?\n\n이전: localStorage 데이터 삭제\n이후: Supabase에서 데이터 다시 로드\n\n계속하시겠습니까?')) {
        localStorage.removeItem('kids_study_app_v1')
        alert('✅ 초기화 완료! 페이지를 새로고침합니다.')
        window.location.href = window.location.pathname
      }
    }
  }, [])

  const levelTitle = LEVEL_TITLES[Math.min(activeProfile.level - 1, LEVEL_TITLES.length - 1)] || '새싹'
  const totalTaskPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0)
  const donePoints = doneTasks.reduce((sum, t) => sum + (t.points || 0), 0)
  const nextLevelPoints = totalTaskPoints > 0 ? totalTaskPoints : 100
  const levelProgress = Math.min(100, totalTaskPoints > 0 ? Math.round((donePoints / totalTaskPoints) * 100) : 0)

  const handleToggle = (taskId) => {
    // 관리자 모드이면 모든 날짜에서 포인트/레벨/스트릭 계산
    const result = toggleTask(activeProfile.id, taskId, viewDateStr, isAdminMode)
    if (!result) return
    // 오늘 날짜거나 관리자 모드에서만 축하 이펙트와 리워드 처리
    if (isToday || isAdminMode) {
      if (result.allDone && !allDone) {
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 2000)
        onReward({ type: 'all_done', name: activeProfile.name })
      } else if (result.wasLevelUp) {
        onReward({ type: 'level_up', level: result.newLevel, name: activeProfile.name })
      }
    }
  }

  const viewDateLabel = isToday ? format(viewDate, 'M월 d일 (eee)', { locale: ko }) + ' (오늘)'
    : format(viewDate, 'M월 d일 (eee)', { locale: ko })

  const groupedBySubject = subjects.map(subject => ({
    ...subject,
    tasks: tasks.filter(t => t.subjectId === subject.id),
  })).filter(s => s.tasks.length > 0)

  const ungroupedTasks = tasks.filter(t => !subjects.find(s => s.id === t.subjectId))

  // dateStr 삭제 - viewDateLabel 사용

  return (
    <div className="p-4 space-y-4">

      <div className="flex gap-2 items-center">
        <button
          onClick={onGoHome}
          className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow-sm text-gray-600 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
        >
          <HomeIcon className="w-4 h-4" />
          첫 화면
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setDayOffset(o => Math.max(o - 1, -3))}
            disabled={dayOffset <= -3}
            className="p-1.5 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:bg-gray-50 disabled:opacity-30 active:scale-95 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setDayOffset(0)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
              isToday ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            }`}>오늘</button>
          <button onClick={() => setDayOffset(o => Math.min(o + 1, 3))}
            disabled={dayOffset >= 3}
            className="p-1.5 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:bg-gray-50 disabled:opacity-30 active:scale-95 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {isToday && (
          <button
            onClick={onGoSettings}
            className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow-sm text-indigo-600 text-sm font-semibold hover:bg-indigo-50 active:scale-95 transition-all border border-indigo-100"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 오프라인 모드 - 로컬 저장 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400 font-medium">📱 오프라인 모드</div>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      <div className={`bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl p-5 text-white relative overflow-hidden ${celebrate ? 'animate-pulse' : ''}`}>
        {celebrate && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {['🎉', '⭐', '🌟', '✨', '🎊'].map((e, i) => (
              <span key={i} className="absolute text-2xl animate-confetti"
                style={{ left: `${10 + i * 18}%`, animationDelay: `${i * 0.15}s` }}>{e}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white/70 text-sm">{viewDateLabel}</div>
            <div className="text-2xl font-extrabold">
              {activeProfile.avatar} {activeProfile.name}
            </div>
            <div className="text-white/80 text-sm">{levelTitle} · Lv.{activeProfile.level}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-yellow-300">
              <Star className="w-4 h-4 fill-yellow-300" />
              <span className="font-bold text-lg">{activeProfile.totalPoints || 0}</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-orange-300 mt-1">
              <Flame className="w-4 h-4" />
              <span className="font-semibold">{currentStreak}일 연속</span>
            </div>
          </div>
        </div>

        <div className="mb-1 flex justify-between text-sm">
          <span>레벨 진행도</span>
          <span>{Math.min(donePoints, nextLevelPoints)}/{nextLevelPoints} XP</span>
        </div>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${levelProgress}%`, background: 'linear-gradient(90deg, #facc15, #fb923c, #f87171)' }}
          />
        </div>

        <div className="mb-1 flex justify-between text-sm">
          <span>{isToday ? '오늘 목표' : '해당 날 목표'}</span>
          <span className="font-bold">{doneTasks.length}/{tasks.length} 완료</span>
        </div>
        <div className="h-3 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: progress === 0 ? 'white'
                : progress < 30 ? 'linear-gradient(90deg, #f87171, #fb923c)'
                : progress < 60 ? 'linear-gradient(90deg, #fb923c, #facc15, #4ade80)'
                : progress < 100 ? 'linear-gradient(90deg, #4ade80, #34d399, #38bdf8, #818cf8)'
                : 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #38bdf8, #818cf8, #e879f9)'
            }}
          />
        </div>
        {allDone && (
          <div className="mt-2 text-center font-bold text-yellow-200 animate-bounce">
            🎉 오늘 모든 목표 달성! 최고야!
          </div>
        )}
      </div>

      {isPinSet && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-semibold ${
          isAdminMode ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-500'
        }`}>
          <div className="flex items-center gap-2">
            {isAdminMode
              ? <><Unlock className="w-4 h-4" /> 관리자 모드 활성화</>  
              : <><Lock className="w-4 h-4" /> 관리자 잠금 중</>}
          </div>
          {isAdminMode ? (
            <button
              onClick={lockAdmin}
              className="text-xs bg-indigo-500 text-white px-3 py-1 rounded-lg hover:bg-indigo-600 active:scale-95 transition-all"
            >잠그기</button>
          ) : (
            <button
              onClick={() => setShowAdminPin(true)}
              className="text-xs bg-gray-700 text-white px-3 py-1 rounded-lg hover:bg-gray-800 active:scale-95 transition-all"
            >로그인</button>
          )}
        </div>
      )}

      {groupedBySubject.map(subject => (
        <div key={subject.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${subject.color} border-opacity-50`}>
            <span className="text-xl">{subject.emoji}</span>
            <span className="font-bold text-sm">{subject.name}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {subject.tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                done={!!viewCompletions[task.id]}
                onToggle={isAdminMode ? () => handleToggle(task.id) : (isToday ? () => handleToggle(task.id) : null)}
                onDelete={isAdminMode ? () => deleteTaskForDate(activeProfile.id, task.id, viewDateStr) : null}
                onEdit={isAdminMode ? () => { setEditingTask(task); setEditTitle(task.title); setEditPoints(task.points) } : null}
              />
            ))}
          </div>
        </div>
      ))}

      {ungroupedTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2 border-b bg-gray-50 border-gray-100">
            <span className="text-xl">📝</span>
            <span className="font-bold text-sm text-gray-600">기타</span>
          </div>
          <div className="divide-y divide-gray-50">
            {ungroupedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                done={!!viewCompletions[task.id]}
                onToggle={isAdminMode ? () => handleToggle(task.id) : (isToday ? () => handleToggle(task.id) : null)}
                onDelete={isAdminMode ? () => deleteTaskForDate(activeProfile.id, task.id, viewDateStr) : null}
                onEdit={isAdminMode ? () => { setEditingTask(task); setEditTitle(task.title); setEditPoints(task.points) } : null}
              />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <div className="font-medium">{isToday ? '아직 학습 목표가 없어요' : '이 날은 목표가 없어요'}</div>
          {isToday && <div className="text-sm mt-1">{isAdminMode ? '아래 + 버튼을 눈러 추가해보세요!' : '설정에서 관리자 PIN을 입력하면 추가할 수 있어요'}</div>}
        </div>
      )}

      {!isToday && (
        <div className="text-center text-xs text-gray-400 py-1 bg-gray-50 rounded-xl px-3 py-2">
          📎 {dayOffset < 0 ? '과거' : '미래'} 날짜는 읽기 전용입니다
        </div>
      )}

      {isToday && isAdminMode && (
        <button
          onClick={() => setShowAddTask(true)}
          className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          학습 목표 추가 (관리자)
        </button>
      )}

      {isToday && !isAdminMode && (
        <div className="space-y-2">
          {studentCanAdd ? (
            <button
              onClick={() => setShowAddTask(true)}
              className="w-full bg-white border-2 border-indigo-300 text-indigo-600 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              오늘의 목표 추가 ({3 - studentAddedToday}개 더 추가 가능)
            </button>
          ) : (
            <div className="text-center text-sm text-gray-400 py-2">
              오늘은 목표를 더 추가할 수 없어요 (하루 3개 제한)
            </div>
          )}
        </div>
      )}

      {showAddTask && (
        <AddTaskModal
          store={store}
          profileId={activeProfile.id}
          isAdmin={isAdminMode}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {showAdminPin && (
        <PinModal
          mode="verify"
          title="관리자 로그인"
          onSuccess={handleAdminLogin}
          onCancel={() => { setShowAdminPin(false); setPinError(false) }}
        />
      )}

      {/* 수정 모달 */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] px-6">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="text-3xl mb-2">✏️</div>
              <div className="font-bold text-gray-800 text-base">목표 수정</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">목표 이름</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border-2 border-indigo-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">포인트</label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(Number(e.target.value))}
                  className="w-full border-2 border-indigo-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editTitle.trim()) {
                    updateTask(activeProfile.id, editingTask.id, { title: editTitle.trim(), points: editPoints })
                  }
                  setEditingTask(null)
                }}
                className="flex-1 bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600 active:scale-95 transition-all"
              >
                저장
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 active:scale-95 transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
