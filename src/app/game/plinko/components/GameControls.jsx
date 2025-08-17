"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";

export default function GameControls({ onBet }) {
  const [gameMode, setGameMode] = useState("manual");
  const [betAmount, setBetAmount] = useState("0.00");
  const [riskLevel, setRiskLevel] = useState("Medium");
  const [rows, setRows] = useState("3");
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);

  const riskLevels = ["Low", "Medium", "High"];
  const rowOptions = ["3", "5", "7", "9", "11", "13", "15", "17"];

  const handleBetAmountChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setBetAmount(numValue.toFixed(2));
  };

  const handleHalfBet = () => {
    const currentBet = parseFloat(betAmount) || 0;
    const newBet = (currentBet / 2).toFixed(2);
    setBetAmount(newBet);
  };

  const handleDoubleBet = () => {
    const currentBet = parseFloat(betAmount) || 0;
    const newBet = (currentBet * 2).toFixed(2);
    setBetAmount(newBet);
  };

  const handleBet = () => {
    if (parseFloat(betAmount) <= 0) {
      alert("Please enter a valid bet amount");
      return;
    }
    
    // Trigger the ball dropping animation in the parent component
    if (onBet) {
      onBet();
    }
  };

  return (
    <div className="bg-[#1A0015] rounded-xl border border-[#333947] p-6">
      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="flex bg-[#2A0025] rounded-lg p-1">
          <button
            onClick={() => setGameMode("manual")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              gameMode === "manual"
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setGameMode("auto")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              gameMode === "auto"
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Bet Amount */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Bet Amount
        </label>
        <div className="mb-2">
          <span className="text-2xl font-bold text-white">${betAmount}</span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => handleBetAmountChange(e.target.value)}
            className="w-full bg-[#2A0025] border border-[#333947] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            placeholder="0.00000000000"
            step="0.01"
            min="0"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col">
            <button
              onClick={() => handleBetAmountChange(parseFloat(betAmount || 0) + 0.01)}
              className="text-gray-400 hover:text-white p-1"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleBetAmountChange(parseFloat(betAmount || 0) - 0.01)}
              className="text-gray-400 hover:text-white p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleHalfBet}
            className="flex-1 bg-[#2A0025] border border-[#333947] rounded-lg py-2 text-sm text-white hover:bg-[#3A0035] transition-colors"
          >
            1/2
          </button>
          <button
            onClick={handleDoubleBet}
            className="flex-1 bg-[#2A0025] border border-[#333947] rounded-lg py-2 text-sm text-white hover:bg-[#3A0035] transition-colors"
          >
            2x
          </button>
        </div>
      </div>

      {/* Risk Level */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Risk
        </label>
        <div className="relative">
          <button
            onClick={() => setShowRiskDropdown(!showRiskDropdown)}
            className="w-full bg-[#2A0025] border border-[#333947] rounded-lg px-4 py-3 text-white text-left flex items-center justify-between hover:bg-[#3A0035] transition-colors"
          >
            <span>{riskLevel}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showRiskDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2A0025] border border-[#333947] rounded-lg overflow-hidden z-10">
              {riskLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setRiskLevel(level);
                    setShowRiskDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#3A0035] transition-colors"
                >
                  {level}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Rows
        </label>
        <div className="relative">
          <button
            onClick={() => setShowRowsDropdown(!showRowsDropdown)}
            className="w-full bg-[#2A0025] border border-[#333947] rounded-lg px-4 py-3 text-white text-left flex items-center justify-between hover:bg-[#3A0035] transition-colors"
          >
            <span>{rows}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showRowsDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2A0025] border border-[#333947] rounded-lg overflow-hidden z-10 max-h-40 overflow-y-auto">
              {rowOptions.map((row) => (
                <button
                  key={row}
                  onClick={() => {
                    setRows(row);
                    setShowRowsDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#3A0035] transition-colors"
                >
                  {row}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bet Button */}
      <button 
        onClick={handleBet}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-4 px-6 rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105"
      >
        Bet
      </button>
    </div>
  );
}
