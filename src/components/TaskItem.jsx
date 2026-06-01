import React, { useState } from 'react'
import { Trash2, Star, Edit3 } from 'lucide-react'

export default function TaskItem({ task, done, onToggle, onDelete, onEdit }) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 md:py-2 lg:py-1.5 check-transition group ${done ? 'bg-green-50' : 'bg-white'}`}
    >
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
          done
            ? 'bg-green-500 border-green-500 text-white animate-bounce-in'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        {done && <span className="text-sm">✓</span>}
      </button>

      {task.coverUrl && (
        <img
          src={task.coverUrl}
          alt="표지"
          onClick={onToggle}
          className={`flex-shrink-0 w-8 h-11 md:w-12 md:h-16 lg:w-14 lg:h-20 object-cover rounded shadow-sm transition-opacity ${done ? 'opacity-40' : 'opacity-100'}`}
        />
      )}

      <div className="flex-1 min-w-0" onClick={onToggle}>
        <div className={`font-medium text-sm transition-all ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-0.5 text-xs font-semibold transition-colors ${done ? 'text-yellow-500' : 'text-gray-400'}`}>
          <Star className={`w-3 h-3 ${done ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {task.points}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 rounded-lg text-gray-300 hover:text-indigo-500 transition-all"
            title="수정"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              if (showDelete) { onDelete(); setShowDelete(false) }
              else setShowDelete(true)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              if (showDelete) { onDelete(); setShowDelete(false) }
              else setShowDelete(true)
            }}
            className={`p-1 rounded-lg transition-all ${showDelete ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
