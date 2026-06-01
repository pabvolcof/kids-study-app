import React, { useEffect } from 'react'

const ALL_DONE_MESSAGES = [
  '🎉 완벽해! 오늘 목표 다 달성했어!',
  '🌟 최고야! 대단한 친구야!',
  '🏆 오늘도 완주! 너무 멋있어!',
  '⭐ 훌륭해! 계속 이렇게 해봐!',
]

export default function RewardModal({ info, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  if (info.type === 'all_done') {
    const msg = ALL_DONE_MESSAGES[Math.floor(Math.random() * ALL_DONE_MESSAGES.length)]
    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
        onClick={onClose}
      >
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl animate-bounce-in">
          <div className="text-7xl mb-4 animate-star-pop">🎊</div>
          <div className="text-2xl font-extrabold text-gray-800 mb-2">{info.name}아, 잘했어!</div>
          <div className="text-gray-600 text-lg">{msg}</div>
          <div className="mt-4 flex justify-center gap-2 text-3xl">
            {['⭐', '🌟', '✨', '💫', '⭐'].map((s, i) => (
              <span key={i} className="animate-confetti" style={{ animationDelay: `${i * 0.2}s` }}>{s}</span>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-400">탭해서 닫기</div>
        </div>
      </div>
    )
  }

  if (info.type === 'level_up') {
    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
        onClick={onClose}
      >
        <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl animate-bounce-in">
          <div className="text-7xl mb-4 animate-star-pop">🆙</div>
          <div className="text-white text-xl font-extrabold mb-1">레벨 업!</div>
          <div className="text-white text-5xl font-black mb-2">Lv.{info.level}</div>
          <div className="text-white/90 text-lg">{info.name}가 레벨이 올랐어요!</div>
          <div className="mt-4 text-white/70 text-sm">탭해서 닫기</div>
        </div>
      </div>
    )
  }

  return null
}
