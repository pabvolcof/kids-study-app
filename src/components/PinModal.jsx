import React, { useState, useRef, useEffect } from 'react'
import { Lock, X, Delete } from 'lucide-react'

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

const PIN_LENGTH = 6

export default function PinModal({ mode = 'verify', onSuccess, onCancel, title }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState('enter')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleDigit = async (d) => {
    if (d === '⌫') {
      if (step === 'confirm') setConfirmPin(p => p.slice(0, -1))
      else setPin(p => p.slice(0, -1))
      setError('')
      return
    }
    if (d === '') return

    if (step === 'confirm') {
      const next = confirmPin + d
      setConfirmPin(next)
      if (next.length === PIN_LENGTH) {
        if (next === pin) {
          onSuccess(pin)
        } else {
          setError('PIN이 일치하지 않아요. 다시 시도해주세요.')
          triggerShake()
          setConfirmPin('')
          setPin('')
          setStep('enter')
        }
      }
    } else {
      const next = pin + d
      setPin(next)
      if (next.length === PIN_LENGTH) {
        if (mode === 'set') {
          setStep('confirm')
        } else {
          const result = await onSuccess(next)
          if (result === false) {
            setError('PIN이 틀렸어요. 다시 시도해주세요.')
            triggerShake()
            setPin('')
          }
        }
      }
    }
  }

  const currentPin = step === 'confirm' ? confirmPin : pin
  const label = mode === 'set'
    ? (step === 'confirm' ? '한 번 더 입력해주세요' : `PIN ${PIN_LENGTH}자리를 설정하세요`)
    : (title || '관리자 PIN을 입력하세요')

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className={`bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl ${shake ? 'animate-bounce' : ''}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm">관리자 모드</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex justify-center gap-2 mb-5">
          {Array.from({length: PIN_LENGTH}, (_, i) => (
            <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
              i < currentPin.length
                ? 'bg-indigo-500 border-indigo-500'
                : 'border-gray-200 bg-gray-50'
            }`}>
              {i < currentPin.length && <div className="w-3 h-3 rounded-full bg-white" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="text-center text-sm text-red-500 font-medium mb-3">{error}</div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {DIGITS.map((d, i) => (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={d === ''}
              className={`h-14 rounded-2xl text-xl font-bold transition-all active:scale-90 ${
                d === '⌫'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : d === ''
                  ? 'invisible'
                  : 'bg-gray-100 text-gray-800 hover:bg-indigo-100 hover:text-indigo-700'
              }`}
            >
              {d === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : d}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
