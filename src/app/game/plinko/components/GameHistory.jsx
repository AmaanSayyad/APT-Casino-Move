"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function GameHistory({ history }) {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);

  const entryOptions = [5, 10, 25, 50, 100];

  return (
    <div>
      {/* Header with entries selector */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Game History</h3>
        <div className="relative">
          <button
            onClick={() => setShowEntriesDropdown(!showEntriesDropdown)}
            className="flex items-center gap-2 bg-[#2A0025] border border-[#333947] rounded-lg px-3 py-2 text-sm text-white hover:bg-[#3A0035] transition-colors"
          >
            <span>{entriesPerPage}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showEntriesDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-[#2A0025] border border-[#333947] rounded-lg overflow-hidden z-10 min-w-[80px]">
              {entryOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setEntriesPerPage(option);
                    setShowEntriesDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-white hover:bg-[#3A0035] transition-colors text-sm"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Game History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333947]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Game
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Title
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Bet amount
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Multiplier
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Payout
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((game) => (
              <tr key={game.id} className="border-b border-[#333947]/30 hover:bg-[#2A0025]/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">M</span>
                    </div>
                    <span className="text-white text-sm">{game.game}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.title}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.betAmount}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.multiplier}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.payout}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {history.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#2A0025] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">📊</span>
          </div>
          <p className="text-gray-400 text-sm">No games played yet</p>
          <p className="text-gray-500 text-xs mt-1">Start playing to see your game history</p>
        </div>
      )}

      {/* Pagination Info */}
      <div className="mt-4 text-center text-gray-400 text-sm">
        Showing {Math.min(entriesPerPage, history.length)} of {history.length} entries
      </div>
    </div>
  );
}
