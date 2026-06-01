import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UserPlus, LogOut, Trash2, Edit3, Check, X, Lock, Unlock, Download, Upload, ShieldCheck, ShieldOff, ArrowLeft, Plus, Search, BookOpen, Star, ChevronDown, ChevronUp, Copy, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import PinModal from '../components/PinModal'

async function searchBooks(query) {
  const q = encodeURIComponent(query)
  const res = await fetch(`/api/naver/v1/search/book.json?query=${q}&display=20`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return (json.items || []).map((item, i) => ({
    id: item.isbn || String(i),
    title: item.title?.replace(/<[^>]+>/g, '') || '',
    authors: item.author?.replace(/<[^>]+>/g, '') || '',
    thumbnail: item.image || null,
  }))
}

function ProfilePinSetup({ profileId, profileName, setProfilePin }) {
  const [pin, setPin] = useState('')
  const [done, setDone] = useState(false)

  const handleKey = (k) => {
    if (k === '←') { setPin(v => v.slice(0, -1)); return }
    if (pin.length >= 2 || k === '') return
    const next = pin + k
    setPin(next)
    if (next.length === 2) {
      setProfilePin(profileId, next)
      setDone(true)
    }
  }

  if (done) return (
    <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-3 text-green-700 font-semibold text-sm">
      <Check className="w-4 h-4" /> 비밀번호가 설정됐어요!
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">{profileName}의 2자리 숫자 비밀번호를 설정하세요</div>
      <div className="flex justify-center gap-3">
        {[0, 1].map(i => (
          <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
            pin.length > i ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50'
          }`}>{pin.length > i ? '●' : ''}</div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1,2,3,4,5,6,7,8,9,'',0,'←'].map((k, i) => (
          <button key={i} onClick={() => handleKey(String(k))}
            className={`py-2.5 rounded-xl text-base font-bold transition-all ${
              k === '' ? 'invisible' : 'bg-white border border-gray-200 hover:bg-purple-50 active:scale-95 text-gray-700'
            }`}>{k}</button>
        ))}
      </div>
    </div>
  )
}

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🦄', '🐧', '🐺']

export default function Settings({ store, onLock, onBack }) {
  const { data, activeProfile, addProfile, switchProfile, deleteProfile, updateProfile, isPinSet, setPin, removePin, exportData, importData, addTask, copyTask, deleteTask, updateTask, restoreTask, emptyTrash, deleteTrashItem, trash, subjects, setProfilePin, clearProfilePin } = store
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAvatar, setNewAvatar] = useState('🐶')
  const [showSetPin, setShowSetPin] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const fileRef = useRef(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubjectId, setTaskSubjectId] = useState('')
  const [taskPoints, setTaskPoints] = useState(10)
  const [taskCoverUrl, setTaskCoverUrl] = useState(null)
  const [showTaskAdd, setShowTaskAdd] = useState(false)
  const [bookResults, setBookResults] = useState([])
  const [bookSearching, setBookSearching] = useState(false)
  const [showBookResults, setShowBookResults] = useState(false)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null)
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)
  const [profileTab, setProfileTab] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskPoints, setEditTaskPoints] = useState(10)
  const [editTaskCoverUrl, setEditTaskCoverUrl] = useState(undefined)
  const [editBookResults, setEditBookResults] = useState([])
  const [editBookSearching, setEditBookSearching] = useState(false)
  const [showEditBookResults, setShowEditBookResults] = useState(false)
  const [editTaskDays, setEditTaskDays] = useState([])
  const [taskDays, setTaskDays] = useState([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null)
  const [showCalendarTaskModal, setShowCalendarTaskModal] = useState(false)
  const [showDataRecovery, setShowDataRecovery] = useState(false)
  const [recoveryData, setRecoveryData] = useState({ local: null, remote: null })

  const DOW = ['월', '화', '수', '목', '금', '토', '일']
  const dowLabel = (days) => !days || days.length === 0 ? '매일' : days.map(d => DOW[d-1]).join('·')

  const handleEditBookSearch = async () => {
    if (!editTaskTitle.trim()) return
    setEditBookSearching(true)
    setShowEditBookResults(true)
    setEditBookResults([])
    try { setEditBookResults(await searchBooks(editTaskTitle.trim())) }
    catch { setEditBookResults([]) }
    setEditBookSearching(false)
  }

  const selectedProfile = data.profiles.find(p => p.id === selectedProfileId)

  const handleBookSearch = async () => {
    if (!taskTitle.trim()) return
    setBookSearching(true)
    setShowBookResults(true)
    try { setBookResults(await searchBooks(taskTitle.trim())) }
    catch { setBookResults([]) }
    setBookSearching(false)
  }

  const handleAddTask = () => {
    if (!taskTitle.trim() || !selectedProfileId) return
    addTask(selectedProfileId, { title: taskTitle.trim(), subjectId: taskSubjectId, points: taskPoints, coverUrl: taskCoverUrl, days: taskDays })
    setTaskTitle(''); setTaskCoverUrl(null); setShowBookResults(false); setBookResults([]); setTaskDays([])
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    addProfile(newName.trim(), newAvatar)
    setNewName('')
    setNewAvatar('🐶')
    setShowAdd(false)
  }

  const handleEditSave = (id) => {
    if (!editName.trim()) return
    updateProfile(id, { name: editName.trim() })
    setEditingId(null)
  }

  const handleReset = () => {
    if (!activeProfile) return
    updateProfile(activeProfile.id, {
      totalPoints: 0,
      level: 1,
      streak: 0,
      lastCompletedDate: null,
      completions: {},
    })
    setConfirmReset(false)
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = importData(ev.target.result)
      setImportStatus(result.ok ? 'success' : `오류: ${result.error}`)
      setTimeout(() => setImportStatus(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-3xl p-5 text-white">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {activeProfile ? '돌아가기' : '첫 화면으로'}
          </button>
        )}
        <div className="text-xl font-extrabold">⚙️ 관리자 설정</div>
        <div className="text-white/70 text-sm mt-1">프로필 관리 및 앱 설정</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="font-bold text-gray-700 text-sm">학습자 프로필</span>
        </div>
        {data.profiles.map(profile => (
          <div key={profile.id} className="border-b border-gray-50 last:border-0">
            {/* 프로필 행 */}
            {editingId === profile.id ? (
              <div className="flex items-center gap-2 px-4 py-3.5">
                <span className="text-2xl">{profile.avatar}</span>
                <input type="text" value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditSave(profile.id)}
                  className="flex-1 border-2 border-indigo-300 rounded-xl px-3 py-1.5 text-sm font-semibold focus:outline-none" autoFocus />
                <button onClick={() => handleEditSave(profile.id)} className="p-1.5 bg-green-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${selectedProfileId === profile.id ? 'bg-indigo-50' : ''}`}>
                <button
                  onClick={() => { const next = selectedProfileId === profile.id ? null : profile.id; setSelectedProfileId(next); setProfileTab(null); setEditingTaskId(null); setTaskTitle(''); setTaskCoverUrl(null); setShowBookResults(false) }}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <span className="text-3xl">{profile.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{profile.name}</span>
                      {profile.id === data.activeProfileId && <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">현재</span>}
                    </div>
                    <div className="text-xs text-gray-500">Lv.{profile.level || 1} · {profile.totalPoints || 0}점</div>
                  </div>
                  <span className="ml-auto text-gray-300">{selectedProfileId === profile.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </button>
                <button onClick={() => { setEditingId(profile.id); setEditName(profile.name) }} className="p-2 text-gray-400 hover:text-indigo-500"><Edit3 className="w-4 h-4" /></button>
                {confirmDelete === profile.id ? (
                  <><button onClick={() => deleteProfile(profile.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg">삭제</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-lg">취소</button></>
                ) : (
                  <button onClick={() => setConfirmDelete(profile.id)} className="p-2 text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            )}

            {/* 선택된 프로필 인라인 패널 */}
            {selectedProfileId === profile.id && (
              <div className="bg-indigo-50/60 border-t border-indigo-100 px-4 py-4 space-y-4">

                {/* 탭 버튼 */}
                {!profileTab && <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setProfileTab('tasks')} className="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-100 transition-all">📋 목표 관리</button>
                  <button onClick={() => setProfileTab('calendar')} className="bg-white border border-green-200 text-green-700 text-xs font-bold py-2.5 rounded-xl hover:bg-green-50 transition-all">📅 달력</button>
                  <button onClick={() => setProfileTab('trash')} className="bg-white border border-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-xl hover:bg-gray-100 transition-all relative">
                    🗑️ 휴지통
                    {trash.filter(t => t._profileId === profile.id).length > 0 && <span className="absolute -top-1.5 -right-1 bg-red-400 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{trash.filter(t => t._profileId === profile.id).length}</span>}
                  </button>
                  <button onClick={() => setProfileTab('pin')} className="bg-white border border-purple-200 text-purple-600 text-xs font-bold py-2.5 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-1">
                    🔐 비밀번호 {profile.pinHash ? <span className="bg-purple-100 text-purple-600 text-[9px] px-1.5 py-0.5 rounded-full">설정됨</span> : <span className="text-gray-400 font-normal">미설정</span>}
                  </button>
                  <button onClick={() => setProfileTab('reset')} className="bg-white border border-red-200 text-red-500 text-xs font-bold py-2.5 rounded-xl hover:bg-red-50 transition-all col-span-2">↺ 초기화</button>
                </div>}

                {/* 목표 관리 탭 */}
                {profileTab === 'tasks' && (
                  <div className="space-y-3">
                    <button onClick={() => setProfileTab(null)} className="flex items-center gap-1 text-xs text-indigo-500 font-semibold"><ArrowLeft className="w-3 h-3" /> 뒤로</button>
                    <div className="text-xs font-semibold text-gray-500">{profile.name}의 현재 목표 ({(profile.tasks || []).length}개)</div>
                    {(profile.tasks || []).length === 0
                      ? <div className="text-sm text-gray-400 text-center py-3">아직 목표가 없어요</div>
                      : <div className="space-y-1">
                          {(profile.tasks || []).map(task => (
                            <div key={task.id} className="bg-white rounded-xl px-3 py-2">
                              {editingTaskId === task.id ? (
                                <div className="space-y-2">
                                  {(editTaskCoverUrl !== undefined ? editTaskCoverUrl : task.coverUrl) && (
                                    <div className="flex items-center gap-2">
                                      <img src={editTaskCoverUrl !== undefined ? editTaskCoverUrl : task.coverUrl} className="w-8 h-11 object-cover rounded shadow" />
                                      <button onClick={() => setEditTaskCoverUrl(null)} className="text-xs text-red-400">표지 제거</button>
                                    </div>
                                  )}
                                  <div className="flex gap-1.5">
                                    <input autoFocus value={editTaskTitle}
                                      onChange={e => { setEditTaskTitle(e.target.value); setShowEditBookResults(false) }}
                                      className="flex-1 border-2 border-indigo-300 rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none" />
                                    <button onClick={handleEditBookSearch} disabled={!editTaskTitle.trim() || editBookSearching}
                                      className="flex-shrink-0 px-2 py-1.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 disabled:opacity-40">
                                      {editBookSearching ? <BookOpen className="w-3.5 h-3.5 animate-pulse" /> : <Search className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                  {showEditBookResults && editBookResults.length > 0 && (
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                      {editBookResults.map(book => (
                                        <button key={book.id} onClick={() => { setEditTaskCoverUrl(book.thumbnail); setShowEditBookResults(false) }}
                                          className="relative flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-400 bg-gray-100">
                                          {book.thumbnail
                                            ? <><img src={book.thumbnail} className="w-full h-full object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] px-0.5 py-0.5 line-clamp-1">{book.title}</div></>
                                            : <div className="w-full h-full flex flex-col items-center justify-center p-0.5 bg-indigo-50"><span className="text-lg">📚</span><span className="text-[7px] text-indigo-600 text-center line-clamp-3">{book.title}</span></div>}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-1">
                                    {[5,10,15,20,30].map(p => (
                                      <button key={p} onClick={() => setEditTaskPoints(p)}
                                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${editTaskPoints === p ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 border'}`}>{p}</button>
                                    ))}
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">요일 <span className="text-gray-300">(미선택=매일)</span></div>
                                    <div className="flex gap-1">
                                      {DOW.map((d, i) => (
                                        <button key={i} onClick={() => setEditTaskDays(prev => prev.includes(i+1) ? prev.filter(x => x !== i+1) : [...prev, i+1])}
                                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${editTaskDays.includes(i+1) ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{d}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => {
                                      if (editTaskTitle.trim()) updateTask(selectedProfileId, task.id, { title: editTaskTitle.trim(), points: editTaskPoints, coverUrl: editTaskCoverUrl !== undefined ? editTaskCoverUrl : task.coverUrl, days: editTaskDays })
                                      setEditingTaskId(null); setEditTaskCoverUrl(undefined); setShowEditBookResults(false)
                                    }} className="flex-1 bg-indigo-500 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Check className="w-3 h-3" />저장</button>
                                    <button onClick={() => { setEditingTaskId(null); setEditTaskCoverUrl(undefined); setShowEditBookResults(false) }}
                                      className="flex-1 bg-gray-200 text-gray-600 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><X className="w-3 h-3" />취소</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {task.coverUrl && <img src={task.coverUrl} className="w-6 h-9 object-cover rounded flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-700 truncate">{task.title}</div>
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                      {subjects?.find(s => s.id === task.subjectId)?.emoji}
                                      <Star className="w-3 h-3" />{task.points}점
                                      <span className="text-indigo-300 font-semibold">· {dowLabel(task.days)}</span>
                                      {task.addedBy === 'student' && <span className="text-indigo-400 font-semibold ml-1">학습자 추가</span>}
                                    </div>
                                  </div>
                                  <button onClick={() => { setEditingTaskId(task.id); setEditTaskTitle(task.title); setEditTaskPoints(task.points); setEditTaskDays(task.days || []) }}
                                    className="p-1.5 text-gray-300 hover:text-indigo-500 transition-colors flex-shrink-0" title="수정"><Edit3 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => copyTask(selectedProfileId, task)}
                                    className="p-1.5 text-gray-300 hover:text-green-500 transition-colors flex-shrink-0" title="복사">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteTask({ taskId: task.id, title: task.title })}
                                    onTouchEnd={(e) => { e.preventDefault(); setConfirmDeleteTask({ taskId: task.id, title: task.title }) }}
                                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 active:bg-red-50 active:text-red-500"
                                    title="삭제">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                    }

                    {/* 새 목표 추가 */}
                    <div className="border-t border-indigo-100 pt-3 space-y-2">
                      <div className="text-xs font-semibold text-gray-500">새 목표 추가</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(subjects || []).map(s => (
                          <button key={s.id} onClick={() => setTaskSubjectId(s.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${taskSubjectId === s.id ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                            {s.emoji} {s.name}
                          </button>
                        ))}
                        <button onClick={() => setTaskSubjectId('')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${taskSubjectId === '' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>📝 기타</button>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={taskTitle}
                          onChange={e => { setTaskTitle(e.target.value); setShowBookResults(false); setTaskCoverUrl(null) }}
                          placeholder="예: 수학 문제집 1장"
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-indigo-400" />
                        <button onClick={handleBookSearch} disabled={!taskTitle.trim() || bookSearching}
                          className="flex-shrink-0 px-3 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 disabled:opacity-40">
                          {bookSearching ? <BookOpen className="w-4 h-4 animate-pulse" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                      {showBookResults && (
                        <div>{bookResults.length === 0 && !bookSearching
                          ? <div className="text-xs text-gray-400 text-center py-2">검색 결과 없음</div>
                          : <div className="flex gap-2 overflow-x-auto pb-1">
                              {bookResults.map(book => (
                                <button key={book.id} onClick={() => { setTaskCoverUrl(book.thumbnail); setShowBookResults(false) }}
                                  className="relative flex-shrink-0 w-16 h-[88px] rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-400 bg-gray-100">
                                  {book.thumbnail
                                    ? <><img src={book.thumbnail} className="w-full h-full object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] px-0.5 py-0.5 line-clamp-2">{book.title}</div></>
                                    : <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1 bg-indigo-50"><span className="text-xl">📚</span><span className="text-[7px] text-indigo-600 text-center line-clamp-3">{book.title}</span></div>}
                                </button>
                              ))}
                            </div>
                        }</div>
                      )}
                      {taskCoverUrl && (
                        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                          <img src={taskCoverUrl} className="w-8 h-11 object-cover rounded shadow" />
                          <div className="flex-1 text-xs font-semibold text-green-700">표지 선택됨</div>
                          <button onClick={() => setTaskCoverUrl(null)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        {[5,10,15,20,30].map(p => (
                          <button key={p} onClick={() => setTaskPoints(p)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${taskPoints === p ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 border'}`}>{p}</button>
                        ))}
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">요일 <span className="text-gray-300">(미선택=매일)</span></div>
                        <div className="flex gap-1">
                          {DOW.map((d, i) => (
                            <button key={i} onClick={() => setTaskDays(prev => prev.includes(i+1) ? prev.filter(x => x !== i+1) : [...prev, i+1])}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${taskDays.includes(i+1) ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 border'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleAddTask} disabled={!taskTitle.trim()}
                        className="w-full bg-indigo-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />{profile.name}에게 목표 추가
                      </button>
                    </div>
                  </div>
                )}

                {/* 휴지통 탭 */}
                {profileTab === 'trash' && (
                  <div className="space-y-2">
                    <button onClick={() => setProfileTab(null)} className="flex items-center gap-1 text-xs text-indigo-500 font-semibold"><ArrowLeft className="w-3 h-3" /> 뒤로</button>
                    {trash.filter(t => t._profileId === profile.id).length === 0
                      ? <div className="text-sm text-gray-400 text-center py-4">휴지통이 비어 있어요</div>
                      : <div className="space-y-1.5">
                          {[...trash].reverse().filter(t => t._profileId === profile.id).map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                              {item.coverUrl && <img src={item.coverUrl} className="w-6 h-9 object-cover rounded opacity-60 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-500 truncate">{item.title}</div>
                                <div className="text-xs text-gray-400">{item._trashedAt}</div>
                              </div>
                              <button onClick={() => restoreTask(item.id)} className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-1 rounded-lg flex-shrink-0">복원</button>
                              <button onClick={() => deleteTrashItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          {confirmEmptyTrash
                            ? <div className="space-y-2 pt-1">
                                <div className="text-xs text-red-600 font-semibold text-center">휴지통을 비울까요? 복원할 수 없습니다.</div>
                                <div className="flex gap-2">
                                  <button onClick={() => { emptyTrash(); setConfirmEmptyTrash(false) }} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-bold">네, 비우기</button>
                                  <button onClick={() => setConfirmEmptyTrash(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold">취소</button>
                                </div>
                              </div>
                            : <button onClick={() => setConfirmEmptyTrash(true)} className="w-full text-xs text-red-400 py-2 border border-red-200 rounded-xl hover:bg-red-50 font-semibold">해당 학습자 휴지통 비우기</button>
                          }
                        </div>
                    }
                  </div>
                )}

                {/* 달력 탭 */}
                {profileTab === 'calendar' && (
                  <div className="space-y-3">
                    <button onClick={() => setProfileTab(null)} className="flex items-center gap-1 text-xs text-indigo-500 font-semibold"><ArrowLeft className="w-3 h-3" /> 뒤로</button>
                    <div className="text-xs font-semibold text-gray-500">{profile.name}의 목표 달력</div>
                    
                    {/* 월 이동 */}
                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                      <button onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                        className="p-1 text-gray-400 hover:text-gray-600">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-sm font-bold text-gray-700">
                        {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                      </div>
                      <button onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                        className="p-1 text-gray-400 hover:text-gray-600">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 달력 그리드 */}
                    <div className="bg-white rounded-xl p-3">
                      {/* 요일 헤더 */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                          <div key={d} className="text-center text-xs font-bold text-gray-500 py-1">{d}</div>
                        ))}
                      </div>
                      
                      {/* 날짜 셀 */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = calendarMonth.getFullYear()
                          const month = calendarMonth.getMonth()
                          const firstDay = new Date(year, month, 1).getDay() // 0=일
                          const daysInMonth = new Date(year, month + 1, 0).getDate()
                          const today = new Date()
                          const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
                          const todayDate = today.getDate()
                          
                          const cells = []
                          // 빈 셀 채우기
                          for (let i = 0; i < firstDay; i++) {
                            cells.push(<div key={`empty-${i}`} className="aspect-square" />)
                          }
                          
                          // 날짜 셀
                          for (let date = 1; date <= daysInMonth; date++) {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
                            const dayOfWeek = new Date(year, month, date).getDay() // 0=일 ~ 6=토
                            const dowForTask = dayOfWeek === 0 ? 7 : dayOfWeek // 1=월 ~ 7=일
                            
                            // 해당 날짜에 할당된 목표들
                            const tasksForDate = (profile.tasks || []).filter(t => 
                              !t.days || t.days.length === 0 || t.days.includes(dowForTask)
                            )
                            
                            const isToday = isCurrentMonth && date === todayDate
                            const hasTasks = tasksForDate.length > 0
                            
                            cells.push(
                              <button
                                key={date}
                                onClick={() => {
                                  setCalendarSelectedDate(dateStr)
                                  setShowCalendarTaskModal(true)
                                }}
                                className={`aspect-square rounded-lg border text-xs font-medium transition-all relative ${
                                  isToday 
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold'
                                    : hasTasks
                                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <div className="p-1">
                                  <div>{date}</div>
                                  {hasTasks && (
                                    <div className="flex justify-center mt-0.5">
                                      <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            )
                          }
                          
                          return cells
                        })()}
                      </div>
                    </div>

                    {/* 범례 */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 px-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                        <span>목표 있음</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded"></div>
                        <span>오늘</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* PIN 탭 */}
                {profileTab === 'pin' && (
                  <div className="space-y-3">
                    <button onClick={() => setProfileTab(null)} className="flex items-center gap-1 text-xs text-indigo-500 font-semibold"><ArrowLeft className="w-3 h-3" /> 뒤로</button>
                    <div className="text-xs font-semibold text-gray-500">{profile.name}의 비밀번호</div>
                    {profile.pinHash ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2.5">
                          <span className="text-lg">🔐</span>
                          <span className="text-sm text-purple-700 font-semibold flex-1">비밀번호가 설정되어 있어요</span>
                        </div>
                        <button onClick={() => clearProfilePin(profile.id)}
                          className="w-full py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                          비밀번호 초기화 (잠금 해제)
                        </button>
                      </div>
                    ) : (
                      <ProfilePinSetup profileId={profile.id} profileName={profile.name} setProfilePin={setProfilePin} />
                    )}
                  </div>
                )}

                {/* 초기화 탭 */}
                {profileTab === 'reset' && (
                  <div className="space-y-2">
                    <button onClick={() => { setProfileTab(null); setConfirmReset(false) }} className="flex items-center gap-1 text-xs text-indigo-500 font-semibold"><ArrowLeft className="w-3 h-3" /> 뒤로</button>
                    {confirmReset
                      ? <div className="space-y-2">
                          <div className="text-sm text-gray-600 font-medium text-center">{profile.name}의 모든 학습 기록을 초기화할까요?</div>
                          <div className="flex gap-2">
                            <button onClick={() => { updateProfile(profile.id, { totalPoints: 0, level: 1, streak: 0, lastCompletedDate: null, completions: {} }); setConfirmReset(false); setProfileTab(null) }}
                              className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm">네, 초기화</button>
                            <button onClick={() => setConfirmReset(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">취소</button>
                          </div>
                        </div>
                      : <button onClick={() => setConfirmReset(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-semibold text-sm border border-red-200 rounded-xl hover:bg-red-50">
                          <LogOut className="w-4 h-4" />학습 기록 초기화
                        </button>
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {showAdd ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map(a => (
                <button key={a} onClick={() => setNewAvatar(a)}
                  className={`text-2xl p-2 rounded-xl transition-all ${newAvatar === a ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110' : 'hover:bg-gray-100'}`}
                >{a}</button>
              ))}
            </div>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="이름 입력"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!newName.trim()}
                className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold disabled:opacity-50">추가</button>
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium">취소</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            학습자 추가
          </button>
        )}
      </div>

      {/* 관리자 PIN 설정 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="font-bold text-gray-700 text-sm">관리자 잠금 (PIN)</span>
          {isPinSet && <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">설정됨</span>}
        </div>

        {isPinSet ? (
          <>
            {showRemoveConfirm ? (
              <div className="p-4 space-y-2">
                <div className="text-sm text-gray-600 font-medium">PIN을 해제하면 누구나 설정에 접근할 수 있어요. 정말 해제할까요?</div>
                <div className="flex gap-2">
                  <button onClick={() => { removePin(); setShowRemoveConfirm(false) }}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm">네, 해제</button>
                  <button onClick={() => setShowRemoveConfirm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">취소</button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                <button onClick={() => setShowSetPin(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                  PIN 변경
                </button>
                <button onClick={() => setShowRemoveConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500 font-semibold hover:bg-red-50 transition-colors">
                  <ShieldOff className="w-5 h-5" />
                  PIN 잠금 해제
                </button>
                <button onClick={() => {
                  // 로컬과 원격 데이터 확인
                  const localRaw = localStorage.getItem('kids_study_app_v1')
                  const localData = localRaw ? JSON.parse(localRaw) : null
                  setRecoveryData({ local: localData, remote: null })
                  setShowDataRecovery(true)
                }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-orange-600 font-semibold hover:bg-orange-50 transition-colors">
                  <Download className="w-5 h-5" />
                  데이터 복구
                </button>
                <button onClick={onLock}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                  <Lock className="w-5 h-5" />
                  지금 바로 잠그기
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="px-4 pt-3 pb-1 text-sm text-gray-500">
              PIN을 설정하면 설정 화면을 잠글 수 있어요. 학습 목표 수정은 PIN 입력 후에만 가능해집니다.
            </div>
            <button onClick={() => setShowSetPin(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors">
              <Lock className="w-5 h-5" />
              PIN 설정하기
            </button>
          </div>
        )}
      </div>

      {/* 데이터 내보내기/가져오기 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-gray-500" />
          <span className="font-bold text-gray-700 text-sm">데이터 백업 / 복원</span>
        </div>
        <div className="px-4 pt-3 pb-1 text-sm text-gray-500">
          JSON 파일로 내보내서 다른 기기나 새 버전에서 불러올 수 있어요.
        </div>
        <div className="divide-y divide-gray-50">
          <button onClick={exportData}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-green-600 font-semibold hover:bg-green-50 transition-colors">
            <Download className="w-5 h-5" />
            데이터 내보내기 (.json)
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-blue-600 font-semibold hover:bg-blue-50 transition-colors">
            <Upload className="w-5 h-5" />
            데이터 가져오기 (파일 선택)
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
        {importStatus && (
          <div className={`mx-4 mb-3 px-3 py-2 rounded-xl text-sm font-semibold ${
            importStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {importStatus === 'success' ? '✅ 데이터를 성공적으로 불러왔어요!' : importStatus}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 text-center text-xs text-gray-400 space-y-1">
        <div className="font-semibold text-gray-500">📚 오늘도 열공! v2.0</div>
        <div>모든 데이터는 이 기기에 저장됩니다</div>
        <div>PWA로 홈 화면에 추가하면 앱처럼 사용 가능해요</div>
      </div>
    </div>

    {showSetPin && (
      <PinModal
        mode="set"
        onSuccess={async (pin) => { await setPin(pin); setShowSetPin(false) }}
        onCancel={() => setShowSetPin(false)}
      />
    )}

    {/* 달력 날짜 클릭 모달 */}
    {showCalendarTaskModal && calendarSelectedDate && createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] px-6">
        <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
          <div className="text-center">
            <div className="text-3xl mb-2">📅</div>
            <div className="font-bold text-gray-800 text-base">{calendarSelectedDate} 목표 관리</div>
          </div>
          
          {/* 해당 날짜의 목표 목록 */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {(() => {
              const selectedDate = new Date(calendarSelectedDate)
              const dow = selectedDate.getDay() // 0=일 ~ 6=토
              const dowForTask = dow === 0 ? 7 : dow // 1=월 ~ 7=일
              const profile = data.profiles.find(p => p.id === selectedProfileId)
              const tasksForDate = (profile?.tasks || []).filter(t => 
                !t.days || t.days.length === 0 || t.days.includes(dowForTask)
              )
              
              if (tasksForDate.length === 0) {
                return <div className="text-sm text-gray-400 text-center py-2">이 날은 목표가 없어요</div>
              }
              
              return tasksForDate.map(task => (
                <div key={task.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  {task.coverUrl && <img src={task.coverUrl} className="w-6 h-8 object-cover rounded" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{task.title}</div>
                    <div className="text-xs text-gray-500">{task.points}점</div>
                  </div>
                </div>
              ))
            })()}
          </div>
          
          {/* 작업 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => {
              // 해당 날짜에 맞는 요일 자동 설정 후 목표 추가 모달 열기
              const selectedDate = new Date(calendarSelectedDate)
              const dow = selectedDate.getDay() // 0=일 ~ 6=토
              const dowForTask = dow === 0 ? 7 : dow // 1=월 ~ 7=일
              setTaskDays([dowForTask])
              setProfileTab('tasks')
              setShowCalendarTaskModal(false)
            }}
              className="bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600 active:scale-95 transition-all">
              목표 추가
            </button>
            <button onClick={() => setShowCalendarTaskModal(false)}
              className="bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 active:scale-95 transition-all">
              닫기
            </button>
          </div>
        </div>
      </div>
    , document.body)}

    {confirmDeleteTask && createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] px-6">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
          <div className="text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <div className="font-bold text-gray-800 text-base">목표를 삭제할까요?</div>
            <div className="text-sm text-gray-500 mt-1.5">
              <span className="font-semibold text-gray-700">"{confirmDeleteTask.title}"</span>
            </div>
            <div className="text-xs text-orange-500 mt-2 bg-orange-50 rounded-xl px-3 py-2">
              획득한 포인트가 차감되며, 목표는 휴지통으로 이동합니다.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                deleteTask(selectedProfileId, confirmDeleteTask.taskId)
                setConfirmDeleteTask(null)
              }}
              onTouchEnd={(e) => { e.preventDefault(); deleteTask(selectedProfileId, confirmDeleteTask.taskId); setConfirmDeleteTask(null) }}
              className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-red-600 active:scale-95 transition-all"
            >
              삭제하기
            </button>
            <button
              onClick={() => setConfirmDeleteTask(null)}
              onTouchEnd={(e) => { e.preventDefault(); setConfirmDeleteTask(null) }}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    , document.body)}
    </>
  )
}
