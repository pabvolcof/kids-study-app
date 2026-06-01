import React, { useState } from 'react'
import { X, Search, BookOpen, CheckCircle } from 'lucide-react'

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

const SUGGESTIONS = {
  room: ['책상 정리하기', '옷 개어서 서랍 넣기', '바닥 청소기 돌리기', '침대 정리하기', '장난감 정리하기'],
  chores: ['설거지 돕기', '빨래 개기 도와주기', '식탁 닦기', '분리수거 하기', '강아지 밥 주기'],
}

export default function AddTaskModal({ store, profileId, isAdmin, onClose }) {
  const { subjects, addTask, addStudentTask } = store
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '')
  const [points, setPoints] = useState(10)
  const [coverUrl, setCoverUrl] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleSearch = async () => {
    if (!title.trim()) return
    setSearching(true)
    setShowSearch(true)
    setSearchError('')
    setSearchResults([])
    try {
      const results = await searchBooks(title.trim())
      setSearchResults(results)
      if (results.length === 0) setSearchError('표지 이미지가 있는 책을 찾지 못했어요. 다른 검색어를 써보세요.')
    } catch (e) {
      setSearchError(`검색 오류: ${e.message}. 인터넷 연결을 확인해주세요.`)
    }
    setSearching(false)
  }

  const [addError, setAddError] = useState('')

  const handleAdd = () => {
    if (!title.trim()) return
    if (isAdmin) {
      addTask(profileId, { title: title.trim(), subjectId, points, coverUrl })
      onClose()
    } else {
      const result = addStudentTask(profileId, { title: title.trim(), subjectId, points, coverUrl })
      if (result?.ok) {
        onClose()
      } else if (result?.reason === 'limit') {
        setAddError('오늘은 더 이상 추가할 수 없어요 (하루 3개 제한)')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">오늘의 목표 추가하기</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-2 block">공부</label>
          <div className="grid grid-cols-3 gap-2">
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => setSubjectId(s.id)}
                className={`py-2 px-3 rounded-xl border-2 text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  subjectId === s.id
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span>{s.emoji}</span>
                <span>{s.name}</span>
              </button>
            ))}
            <button
              onClick={() => setSubjectId('')}
              className={`py-2 px-3 rounded-xl border-2 text-sm font-semibold flex items-center gap-1.5 transition-all ${
                subjectId === ''
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span>📝</span>
              <span>기타</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-2 block">할 일</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setShowSearch(false) }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="예: 수학 문제집 5쪽 풀기"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-indigo-400"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={!title.trim() || searching}
              className="flex-shrink-0 px-3 py-3 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 disabled:opacity-40 transition-all"
              title="문제집 표지 검색"
            >
              {searching ? <BookOpen className="w-5 h-5 animate-pulse" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {SUGGESTIONS[subjectId] && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">추천 목표 <span className="text-gray-400 font-normal">(탭해서 선택)</span></div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS[subjectId].map(s => (
                <button key={s} onClick={() => setTitle(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    title === s ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {showSearch && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">표지 선택 <span className="text-gray-400 font-normal">(선택 안 해도 됩니다)</span></div>
            {searching && (
              <div className="text-sm text-gray-400 text-center py-3 flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4 animate-pulse text-orange-400" /> 검색 중...
              </div>
            )}
            {!searching && searchError && (
              <div className="text-sm text-orange-500 text-center py-2 px-2 bg-orange-50 rounded-xl">{searchError}</div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {searchResults.map(book => (
                <button
                  key={book.id}
                  onClick={() => { setCoverUrl(book.thumbnail); setShowSearch(false) }}
                  className="relative flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-400 active:scale-95 transition-all bg-gray-100"
                >
                  {book.thumbnail
                    ? <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 bg-indigo-50">
                        <span className="text-2xl">📚</span>
                        <span className="text-[8px] text-indigo-600 font-semibold text-center leading-tight line-clamp-4">{book.title}</span>
                      </div>
                  }
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 leading-tight line-clamp-2">{book.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {coverUrl && (
          <div className="flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2">
            <img src={coverUrl} alt="선택된 표지" className="w-10 h-14 object-cover rounded-lg shadow" />
            <div className="flex-1 text-sm font-semibold text-green-700">표지 선택됨</div>
            <button onClick={() => setCoverUrl(null)} className="text-gray-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-600 mb-2 block">포인트: <span className="text-indigo-600 font-bold">{points}점</span></label>
          <div className="flex gap-2">
            {[5, 10, 15, 20, 30].map(p => (
              <button
                key={p}
                onClick={() => setPoints(p)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  points === p
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >{p}</button>
            ))}
          </div>
        </div>

        {addError && (
          <div className="bg-red-50 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-xl text-center">
            {addError}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!title.trim()}
          className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 hover:bg-indigo-600 active:scale-95 transition-all"
        >
          {isAdmin ? '추가하기 ✅' : '내 목표 추가하기 ✅'}
        </button>
      </div>
    </div>
  )
}
