import React, { useState } from 'react'
import { useStore } from './store/useStore'
import ProfileSelect from './pages/ProfileSelect'
import Home from './pages/Home'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'
import RewardModal from './components/RewardModal'
import PinModal from './components/PinModal'

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState('home')
  const [reward, setReward] = useState(null)
  const [showPinVerify, setShowPinVerify] = useState(false)
  const [pendingSettings, setPendingSettings] = useState(false)

  if (!store.activeProfile && !pendingSettings) {
    return (
      <ProfileSelect
        store={store}
        onGoSettings={() => {
          if (store.isPinSet && !store.isAdminMode) {
            setShowPinVerify(true)
            setPendingSettings(true)
          } else {
            setPendingSettings(true)
          }
        }}
      />
    )
  }

  const handleReward = (info) => setReward(info)
  const clearReward = () => setReward(null)

  const handleTabChange = (t) => {
    if (t === 'settings' && store.isPinSet && !store.isAdminMode) {
      setShowPinVerify(true)
    } else {
      setTab(t)
    }
  }

  const handlePinSuccess = async (pin) => {
    const ok = await store.verifyPin(pin)
    if (ok) {
      setShowPinVerify(false)
      setTab('settings')
    } else {
      return false
    }
    return true
  }

  if (pendingSettings && !store.activeProfile) {
    if (store.isPinSet && !store.isAdminMode) {
      return (
        <>
          <ProfileSelect store={store} onGoSettings={() => {}} />
          {showPinVerify && (
            <PinModal
              mode="verify"
              title="관리자 설정"
              onSuccess={async (pin) => {
                const ok = await store.verifyPin(pin)
                if (ok) { setShowPinVerify(false); return true }
                return false
              }}
              onCancel={() => { setShowPinVerify(false); setPendingSettings(false) }}
            />
          )}
        </>
      )
    }
    return (
      <div className="flex flex-col min-h-dvh bg-slate-50 max-w-md mx-auto relative">
        <div className="flex-1 overflow-y-auto pb-4">
          <Settings store={store} onLock={() => { store.lockAdmin(); setPendingSettings(false) }} onBack={() => setPendingSettings(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 max-w-md mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && <Home store={store} onReward={handleReward} onGoHome={() => store.switchProfile(null)} onGoSettings={() => handleTabChange('settings')} />}
        {tab === 'stats' && <Stats store={store} />}
        {tab === 'settings' && <Settings store={store} onLock={() => { store.lockAdmin(); setTab('home') }} onBack={() => setTab('home')} />}
      </div>
      <BottomNav tab={tab} setTab={handleTabChange} />
      {reward && <RewardModal info={reward} onClose={clearReward} />}
      {showPinVerify && (
        <PinModal
          mode="verify"
          title="설정 잠금 해제"
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinVerify(false)}
        />
      )}
    </div>
  )
}
