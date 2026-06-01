import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell
} from 'recharts'
import { Flame, Star, Trophy, TrendingUp } from 'lucide-react'

export default function Stats({ store }) {
  const { activeProfile, getWeeklyStats, getMonthlyStats } = store
  if (!activeProfile) return null

  const weekly = getWeeklyStats(activeProfile.id)
  const monthly = getMonthlyStats(activeProfile.id)

  const todayStats = weekly[weekly.length - 1] || { done: 0, total: 0, rate: 0 }
  const avgRate = weekly.length > 0
    ? Math.round(weekly.reduce((s, d) => s + d.rate, 0) / weekly.length)
    : 0

  const totalDaysStudied = Object.entries(activeProfile.completions || {}).filter(([, comp]) => {
    return Object.values(comp).some(Boolean)
  }).length

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">{activeProfile.avatar}</span>
          <span className="text-xl font-extrabold">{activeProfile.name}의 학습 통계</span>
        </div>
        <div className="text-white/70 text-sm">Lv.{activeProfile.level} · {activeProfile.totalPoints || 0}점 누적</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="연속 달성" value={`${activeProfile.streak || 0}일`} color="orange" />
        <StatCard icon={<Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />} label="총 포인트" value={`${activeProfile.totalPoints || 0}점`} color="yellow" />
        <StatCard icon={<Trophy className="w-5 h-5 text-purple-400" />} label="공부한 날" value={`${totalDaysStudied}일`} color="purple" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-green-400" />} label="이번주 평균" value={`${avgRate}%`} color="green" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-700 mb-4">📅 이번 주 완료율</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) => [`${v}%`, '완료율']}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
              {weekly.map((entry, i) => (
                <Cell key={i} fill={entry.rate === 100 ? '#22c55e' : entry.rate > 0 ? '#6366f1' : '#e2e8f0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-2 justify-center text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" />100% 완료</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" />진행중</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" />미완료</span>
        </div>
      </div>

      {monthly.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-700 mb-4">📊 월별 완료율</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`${v}%`, '완료율']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="rate" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-700 mb-3">📅 이번 주 달성 현황</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {weekly.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="text-xs text-gray-400 font-medium">{day.label}</div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                day.rate === 100 ? 'bg-green-100 text-green-600' :
                day.rate > 0 ? 'bg-indigo-100 text-indigo-600' :
                'bg-gray-100 text-gray-300'
              }`}>
                {day.rate === 100 ? '⭐' : day.rate > 0 ? day.done : '○'}
              </div>
              <div className="text-xs text-gray-400">{day.rate}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    orange: 'bg-orange-50 border-orange-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    purple: 'bg-purple-50 border-purple-100',
    green: 'bg-green-50 border-green-100',
  }
  return (
    <div className={`${colorMap[color]} border rounded-2xl p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-extrabold text-gray-800">{value}</div>
    </div>
  )
}
