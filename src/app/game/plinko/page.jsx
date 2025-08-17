"use client";
import { useState, useRef } from "react";
import PlinkoGame from "./components/PlinkoGame";
import GameHistory from "./components/GameHistory";
import GameControls from "./components/GameControls";

export default function Plinko() {
  const [activeTab, setActiveTab] = useState("myBet");
  const [currentRows, setCurrentRows] = useState(16);
  const [currentRiskLevel, setCurrentRiskLevel] = useState("Medium");
  const [gameHistory, setGameHistory] = useState([
    {
      id: 1,
      game: "Mines",
      title: "4:43 am",
      betAmount: "0.00000000000",
      multiplier: "0.00x",
      payout: "0.00000000000"
    },
    {
      id: 2,
      game: "Mines",
      title: "4:42 am",
      betAmount: "0.00000000000",
      multiplier: "0.00x",
      payout: "0.00000000000"
    },
    {
      id: 3,
      game: "Mines",
      title: "4:41 am",
      betAmount: "0.00000000000",
      multiplier: "0.00x",
      payout: "0.00000000000"
    },
    {
      id: 4,
      game: "Mines",
      title: "4:40 am",
      betAmount: "0.00000000000",
      multiplier: "0.00x",
      payout: "0.00000000000"
    },
    {
      id: 5,
      game: "Mines",
      title: "4:39 am",
      betAmount: "0.00000000000",
      multiplier: "0.00x",
      payout: "0.00000000000"
    },
    {
      id: 6,
      game: "Mines",
      title: "4:38 am",
      betAmount: "0.00000000000",
      multiplier: "0.00x",
      payout: "0.00000000000"
    }
  ]);

  const plinkoGameRef = useRef(null);

  const handleBet = () => {
    // Trigger the ball dropping animation in PlinkoGame
    if (plinkoGameRef.current && plinkoGameRef.current.dropBall) {
      plinkoGameRef.current.dropBall();
    }
  };

  const handleRowChange = (newRows) => {
    console.log('Main page: Row change requested to:', newRows);
    setCurrentRows(newRows);
    // The PlinkoGame component will automatically update when the rowCount prop changes
  };

  const handleRiskLevelChange = (newRiskLevel) => {
    console.log('Main page: Risk level change requested to:', newRiskLevel);
    setCurrentRiskLevel(newRiskLevel);
    // The PlinkoGame component will automatically update when the riskLevel prop changes
  };

  return (
    <div className="min-h-screen bg-[#070005] text-white">
      {/* Header */}
      <div className="pt-32 pb-12 px-4 md:px-8 lg:px-20">
        <div className="mb-8">
          <p className="text-sm text-gray-400">Games / Plinko</p>
          <h1 className="text-3xl md:text-4xl font-semibold">Plinko</h1>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="px-4 md:px-8 lg:px-20 pb-12">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Left Panel - Game Controls */}
          <div className="w-full xl:w-1/4">
            <GameControls 
              onBet={handleBet} 
              onRowChange={handleRowChange}
              onRiskLevelChange={handleRiskLevelChange}
              initialRows={currentRows}
              initialRiskLevel={currentRiskLevel}
            />
          </div>

          {/* Right Panel - Plinko Board */}
          <div className="w-full xl:w-3/4">
            <PlinkoGame 
              key={`plinko-${currentRows}-${currentRiskLevel}`}
              ref={plinkoGameRef} 
              rowCount={currentRows}
              riskLevel={currentRiskLevel}
              onRowChange={handleRowChange}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Game History */}
      <div className="px-4 md:px-8 lg:px-20 pb-20">
        <div className="bg-[#1A0015] rounded-xl border border-[#333947] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#333947]">
            <button
              onClick={() => setActiveTab("myBet")}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "myBet"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-500"
              }`}
            >
              My Bet
            </button>
            <button
              onClick={() => setActiveTab("gameDescription")}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "gameDescription"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-500"
              }`}
            >
              Game description
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "myBet" ? (
              <GameHistory history={gameHistory} />
            ) : (
              <div className="text-gray-400">
                <h3 className="text-lg font-semibold text-white mb-4">How to Play Plinko</h3>
                <p className="mb-4">
                  Plinko is a game of chance where you drop a ball from the top of a triangular board 
                  filled with pegs. The ball bounces off the pegs as it falls, eventually landing in one 
                  of the multiplier slots at the bottom.
                </p>
                <p className="mb-4">
                  Choose your bet amount, risk level, and number of rows (8-16). Higher risk levels offer 
                  greater potential rewards but also higher chances of losing your bet. More rows create 
                  more complex gameplay with additional pin interactions.
                </p>
                <p className="mb-4">
                  The multiplier you land on determines your payout: Bet Amount × Multiplier = Payout
                </p>
                <p>
                  <strong>Row Configuration:</strong> You can adjust the number of rows from 8 to 16. 
                  The default is 16 rows, which provides the most complex and engaging gameplay experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
