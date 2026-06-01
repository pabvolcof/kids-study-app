import React from 'react'
import { CheckSquare, BarChart2, Settings } from 'lucide-react'

const tabs = [
  { id: 'home', label: '오늘 공부', Icon: CheckSquare },
  { id: 'stats', label: '통계', Icon: BarChart2 },
  { id: 'settings', label: '설정', Icon: Settings },
]

export default function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-lg z-40">
      <div className="flex">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              tab === id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className={`w-5 h-5 ${tab === id ? 'stroke-[2.5px]' : ''}`} />
            <span className={`text-xs font-semibold ${tab === id ? 'font-bold' : ''}`}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
