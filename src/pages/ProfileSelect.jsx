import React, { useState } from 'react'
import { UserPlus, ChevronRight, Trash2, Star, Lock, Unlock, Settings } from 'lucide-react'
import PinModal from '../components/PinModal'

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🦄', '🐧', '🐺']

export default function ProfileSelect({ store, onGoSettings }) {
  const { data, addProfile, switchProfile, deleteProfile, isPinSet, isAdminMode, verifyPin, lockAdmin, verifyProfilePin, pendingMilestones, clearMilestone } = store
  const [showAdd, setShowAdd] = useState(!isPinSet && data.profiles.length === 0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🐶')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [profilePinTarget, setProfilePinTarget] = useState(null)
  const [profilePinInput, setProfilePinInput] = useState('')
  const [profilePinError, setProfilePinError] = useState(false)
  const [milestoneAlert, setMilestoneAlert] = useState(null) // { profileName, level, index }

  const handleAdd = () => {
    if (!name.trim()) return
    addProfile(name.trim(), avatar)
    setName('')
    setAvatar('🐶')
    setShowAdd(false)
  }

  const handlePinSuccess = async (pin) => {
    const ok = await verifyPin(pin)
    if (ok) {
      setShowPinModal(false)
      if (pendingMilestones.length > 0) {
        setMilestoneAlert({ ...pendingMilestones[0], index: 0 })
      }
      return true
    }
    return false
  }

  const handleProfileClick = (profile) => {
    if (profile.pinHash) {
      setProfilePinTarget(profile)
      setProfilePinInput('')
      setProfilePinError(false)
    } else {
      switchProfile(profile.id)
    }
  }

  const handleProfilePinSubmit = async () => {
    const ok = await verifyProfilePin(profilePinTarget.id, profilePinInput)
    if (ok) {
      setProfilePinTarget(null)
      switchProfile(profilePinTarget.id)
    } else {
      setProfilePinError(true)
      setProfilePinInput('')
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">📚</div>
          <h1 className="text-3xl font-extrabold text-white drop-shadow">오늘도 보람있는 하루!</h1>
          <p className="text-white/80 mt-1">누가 시작할 건가요?</p>
        </div>

        {isPinSet && (
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl mb-4 text-sm font-semibold ${
            isAdminMode ? 'bg-white/30 text-white' : 'bg-black/20 text-white/70'
          }`}>
            <div className="flex items-center gap-2">
              {isAdminMode
                ? <><Unlock className="w-4 h-4" /> 관리자 모드</>
                : <><Lock className="w-4 h-4" /> 관리자 잠금 중</>}
            </div>
            <div className="flex items-center gap-2">
              {isAdminMode ? (
                <>
                  {onGoSettings && (
                    <button onClick={onGoSettings}
                      className="text-xs bg-white text-indigo-600 font-bold px-3 py-1 rounded-lg hover:bg-white/90 transition-all flex items-center gap-1">
                      <Settings className="w-3 h-3" />설정
                    </button>
                  )}
                  <button onClick={lockAdmin}
                    className="text-xs bg-white/30 hover:bg-white/40 text-white px-3 py-1 rounded-lg transition-all">잠그기</button>
                </>
              ) : (
                <button onClick={() => setShowPinModal(true)}
                  className="text-xs bg-white text-indigo-600 font-bold px-3 py-1 rounded-lg hover:bg-white/90 transition-all">관리자 로그인</button>
              )}
            </div>
          </div>
        )}

        {data.profiles.length > 0 && (
          <div className="space-y-3 mb-4">
            {data.profiles.map(profile => (
              <div key={profile.id} className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
                <div className="text-4xl">{profile.avatar}</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-lg">{profile.name}</div>
                  {isAdminMode && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span>{profile.totalPoints || 0}점</span>
                      <span className="text-gray-300">|</span>
                      <span>Lv.{profile.level || 1}</span>
                      <span className="text-gray-300">|</span>
                      <span>🔥{profile.streak || 0}일 연속</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isAdminMode && (confirmDelete === profile.id ? (
                    <>
                      <button
                        onClick={() => deleteProfile(profile.id)}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg"
                      >삭제</button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-lg"
                      >취소</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(profile.id)}
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    ><Trash2 className="w-4 h-4" /></button>
                  ))}
                  <button
                    onClick={() => handleProfileClick(profile)}
                    className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-1"
                  >
                    {profile.pinHash && <Lock className="w-3 h-3" />}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAdd && isAdminMode ? (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <h2 className="font-bold text-gray-800 text-lg mb-4">새 학습자 추가</h2>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 mb-2 block">아바타 선택</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-2xl p-2 rounded-xl transition-all ${avatar === a ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110' : 'hover:bg-gray-100'}`}
                  >{a}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 mb-2 block">이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="예: 민준, 서연..."
                maxLength={10}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!name.trim()}
                className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-indigo-600 active:scale-95 transition-all"
              >추가하기</button>
              {data.profiles.length > 0 && (
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
                >취소</button>
              )}
            </div>
          </div>
        ) : isAdminMode ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full bg-white/20 border-2 border-white/50 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/30 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            학습자 추가
          </button>
        ) : (
          <div className="text-center text-white/60 text-sm py-3">
            학습자 추가는 관리자 로그인 후 가능해요
          </div>
        )}
      </div>

      {showPinModal && (
        <PinModal
          mode="verify"
          title="관리자 로그인"
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {/* 레벨 마일스톤 알림 */}
      {milestoneAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-3xl p-7 w-full max-w-xs shadow-2xl text-center">
            <div className="text-6xl mb-3 animate-bounce">🏆</div>
            <div className="text-white font-extrabold text-2xl mb-1">{milestoneAlert.profileName}</div>
            <div className="text-white/90 text-lg font-bold mb-2">레벨 {milestoneAlert.level} 달성!</div>
            <div className="bg-white/20 rounded-2xl px-4 py-3 mb-5">
              <div className="text-white font-semibold text-base">칭찬해 주세요 🌟</div>
              <div className="text-white/80 text-sm mt-1">{milestoneAlert.at} 달성</div>
            </div>
            <button
              onClick={() => {
                clearMilestone(milestoneAlert.index)
                const next = pendingMilestones[milestoneAlert.index + 1]
                setMilestoneAlert(next ? { ...next, index: milestoneAlert.index + 1 } : null)
              }}
              className="w-full bg-white text-orange-500 font-extrabold py-3 rounded-2xl text-base hover:bg-orange-50 active:scale-95 transition-all"
            >
              확인했어요! 👍
            </button>
            {pendingMilestones.length > milestoneAlert.index + 1 && (
              <div className="text-white/70 text-xs mt-2">+{pendingMilestones.length - milestoneAlert.index - 1}개 더 있어요</div>
            )}
          </div>
        </div>
      )}

      {/* 프로필 PIN 입력 모달 */}
      {profilePinTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center">
            <div className="text-5xl mb-2">{profilePinTarget.avatar}</div>
            <div className="font-extrabold text-gray-800 text-xl mb-1">{profilePinTarget.name}</div>
            <div className="text-sm text-gray-500 mb-4">비밀번호를 입력하세요</div>
            <div className="flex justify-center gap-3 mb-4">
              {[0,1].map(i => (
                <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  profilePinInput.length > i ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50'
                }`}>
                  {profilePinInput.length > i ? '●' : ''}
                </div>
              ))}
            </div>
            {profilePinError && <div className="text-red-500 text-sm font-semibold mb-2">비밀번호가 틀렸어요 😢</div>}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[1,2,3,4,5,6,7,8,9,'',0,'←'].map((k, i) => (
                <button key={i}
                  onClick={() => {
                    if (k === '←') { setProfilePinInput(v => v.slice(0,-1)); setProfilePinError(false) }
                    else if (k !== '' && profilePinInput.length < 2) {
                      const next = profilePinInput + k
                      setProfilePinInput(next)
                      setProfilePinError(false)
                      if (next.length === 2) setTimeout(() => {
                        verifyProfilePin(profilePinTarget.id, next).then(ok => {
                          if (ok) { setProfilePinTarget(null); switchProfile(profilePinTarget.id) }
                          else { setProfilePinError(true); setProfilePinInput('') }
                        })
                      }, 100)
                    }
                  }}
                  className={`py-3 rounded-xl text-lg font-bold transition-all ${
                    k === '' ? 'invisible' : 'bg-gray-100 hover:bg-indigo-100 active:scale-95 text-gray-700'
                  }`}
                >{k}</button>
              ))}
            </div>
            <button onClick={() => setProfilePinTarget(null)}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">취소</button>
          </div>
        </div>
      )}
    </div>
  )
}
