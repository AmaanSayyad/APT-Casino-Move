"use client";

import { useState, useEffect } from "react";
import GameWheel, { wheelDataByRisk, getHighRiskMultiplier, getHighRiskProbability } from "../../../components/wheel/GameWheel";
import BettingPanel from "../../../components/wheel/BettingPanel";
import GameHistory from "../../../components/wheel/GameHistory";
import { calculateResult } from "../../../lib/gameLogic";
import Image from "next/image";
import coin from "../../../../public/coin.png";
import { motion } from "framer-motion";
import { FaHistory, FaTrophy, FaInfoCircle, FaChartLine, FaCoins, FaChevronDown, FaPercentage, FaBalanceScale } from "react-icons/fa";
import { GiCardRandom, GiWheelbarrow, GiSpinningBlades, GiTrophyCup } from "react-icons/gi";
import { HiOutlineTrendingUp, HiOutlineChartBar } from "react-icons/hi";
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSelector, useDispatch } from 'react-redux';
import { setBalance, setLoading, loadBalanceFromStorage } from '@/store/balanceSlice';
import { useNotification } from '@/components/NotificationSystem';
import { CasinoGames, parseAptAmount } from '@/lib/aptos';
import { InputTransactionData } from '@aptos-labs/ts-sdk';

// Import new components
import WheelVideo from "./components/WheelVideo";
import WheelDescription from "./components/WheelDescription";
import WheelStrategyGuide from "./components/WheelStrategyGuide";
import WheelProbability from "./components/WheelProbability";
import WheelPayouts from "./components/WheelPayouts";
import WheelHistory from "./components/WheelHistory";

export default function Home() {
  const [betAmount, setBetAmount] = useState(10);
  const [risk, setRisk] = useState("medium");
  const [noOfSegments, setSegments] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [gameMode, setGameMode] = useState("manual");
  const [currentMultiplier, setCurrentMultiplier] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [targetMultiplier, setTargetMultiplier] = useState(null);
  const [wheelPosition, setWheelPosition] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState('medium');
  const [result, setResult] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
  const dispatch = useDispatch();
  const { userBalance, isLoading: isLoadingBalance } = useSelector((state) => state.balance);
  const notification = useNotification();
  
  // Wallet connection
  const { connected: isConnected, account, signAndSubmitTransaction, wallet } = useWallet();
  const address = account?.address;
  
  // Check if wallet is ready
  const isWalletReady = isConnected && account && signAndSubmitTransaction && wallet;

  // Load balance when wallet connects
  useEffect(() => {
    if (isWalletReady && address) {
      // First try to load from localStorage
      const savedBalance = loadBalanceFromStorage();
      if (savedBalance && savedBalance !== "0") {
        console.log('Loading saved balance from localStorage:', savedBalance);
        dispatch(setBalance(savedBalance));
      } else {
        // Set initial balance to 0 if no saved balance
        console.log('No saved balance, setting to 0');
        dispatch(setBalance("0"));
      }
    }
  }, [isWalletReady, address]);

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Game modes
  const manulBet = async () => {
    if (!isWalletReady) {
      alert('Wallet not ready. Please connect your wallet first.');
      return;
    }
    if (betAmount <= 0 || isSpinning) return;

    try {
      setIsSpinning(true);
      setHasSpun(false);

      console.log('=== STARTING WHEEL BET ===');
      console.log('Bet amount (APT):', betAmount);
      console.log('Bet amount (octas):', parseAptAmount(String(betAmount)));
      console.log('Sectors:', noOfSegments);
      console.log('User wallet address:', address);
      
      // Create payload for direct bet (no deposit needed)
      const betPayload = CasinoGames.wheel.userSpin(parseAptAmount(String(betAmount)), Number(noOfSegments));
      console.log('Bet payload:', betPayload);
      
      if (!betPayload || !betPayload.data || !betPayload.data.function) {
        throw new Error('Invalid bet payload');
      }
      
      // Submit the bet transaction directly from user's wallet
      console.log('Submitting bet transaction...');
      const betTx = await signAndSubmitTransaction(betPayload);
      console.log('Bet transaction successful:', betTx);
      
      // Simulate game result (in real implementation, this would come from blockchain events)
      setTimeout(() => {
        // Random result for demo
        const result = Math.floor(Math.random() * noOfSegments);
        
        // Get the wheel data based on risk level to determine proper multipliers
        let wheelSegmentData;
        if (risk === "high") {
          const highRiskData = wheelDataByRisk.high(noOfSegments);
          const zeroSegments = Math.round((1 - getHighRiskProbability(noOfSegments)) * noOfSegments);
          wheelSegmentData = result < zeroSegments ? 
            { multiplier: 0.0, color: "#333947" } : 
            { multiplier: getHighRiskMultiplier(noOfSegments), color: "#D72E60" };
        } else if (risk === "medium") {
          // For medium risk, alternate between zero and non-zero multipliers
          if (result % 2 === 0) {
            wheelSegmentData = { multiplier: 0.0, color: "#333947" };
          } else {
            // Pick one of the non-zero multipliers based on result
            const nonZeroOptions = [
              { multiplier: 1.5, color: "#00E403" },
              { multiplier: 1.7, color: "#D9D9D9" },
              { multiplier: 2.0, color: "#FDE905" },
              { multiplier: 3.0, color: "#7F46FD" },
              { multiplier: 4.0, color: "#FCA32F" }
            ];
            const nonZeroIndex = Math.floor(result / 2) % nonZeroOptions.length;
            wheelSegmentData = nonZeroOptions[nonZeroIndex];
          }
        } else {
          // Low risk
          if (result % 2 === 0) {
            wheelSegmentData = { multiplier: 1.2, color: "#D9D9D9" };
          } else {
            wheelSegmentData = result % 4 === 1 ? 
              { multiplier: 0.0, color: "#333947" } : 
              { multiplier: 1.5, color: "#00E403" };
          }
        }
        
        // Use the actual multiplier from the wheel segment
        const actualMultiplier = wheelSegmentData.multiplier;
        const winAmount = betAmount * actualMultiplier;
        
        // Set the current multiplier and position
        setCurrentMultiplier(actualMultiplier);
        setWheelPosition(result);
        
        // Add to game history
        const newHistoryItem = {
          id: Date.now(),
          game: 'Wheel',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          betAmount: betAmount,
          multiplier: `${actualMultiplier.toFixed(2)}x`,
          payout: winAmount,
          result: result,
          color: wheelSegmentData.color
        };
        setGameHistory(prev => [newHistoryItem, ...prev]);
        
        setIsSpinning(false);
        setHasSpun(true);
        
        // Show result
        if (actualMultiplier > 0) {
          notification.success(`Congratulations! ${betAmount} APT × ${actualMultiplier.toFixed(2)} = ${winAmount.toFixed(8)} APT won!`);
          
          // Debug: Check current values
          console.log('=== BALANCE UPDATE DEBUG ===');
          console.log('userBalance from Redux:', userBalance);
          console.log('userBalance type:', typeof userBalance);
          console.log('winAmount:', winAmount);
          console.log('winAmount type:', typeof winAmount);
          console.log('actualMultiplier:', actualMultiplier);
          
          // Update local balance immediately with winnings
          const currentBalance = parseFloat(userBalance || "0") / 100000000; // Convert from octas to APT
          const newBalance = currentBalance + winAmount;
          const newBalanceOctas = Math.floor(newBalance * 100000000); // Convert back to octas
          
          console.log('Calculated values:', {
            currentBalance,
            newBalance,
            newBalanceOctas
          });
          
          console.log('Dispatching setBalance with:', newBalanceOctas.toString());
          dispatch(setBalance(newBalanceOctas.toString()));
          
          console.log('Local balance updated successfully!');
        } else {
          notification.info(`Game over. Result: ${result}, Multiplier: ${actualMultiplier.toFixed(2)}x`);
        }
      }, 1500);
      
    } catch (e) {
      console.error('Bet failed:', e);
      alert(`Bet failed: ${e?.message || e}`);
      setIsSpinning(false);
    }
  };

  const autoBet = async ({
    numberOfBets,
    winIncrease = 0,
    lossIncrease = 0,
    stopProfit = 0,
    stopLoss = 0,
    betAmount: initialBetAmount,
    risk,
    noOfSegments,
  }) => {
    if (isSpinning) return; // Prevent overlapping spins

    let currentBet = initialBetAmount;
    let totalProfit = 0;

    for (let i = 0; i < numberOfBets; i++) {
      setIsSpinning(true);
      setHasSpun(false);
      // setBalance(prev => prev - currentBet); // This line is no longer needed

      // Calculate result position
      const resultPosition = Math.floor(Math.random() * noOfSegments);
      
      // Get the wheel data based on risk level to determine proper multipliers
      let wheelSegmentData;
      if (risk === "high") {
        const highRiskData = wheelDataByRisk.high(noOfSegments);
        const zeroSegments = Math.round((1 - getHighRiskProbability(noOfSegments)) * noOfSegments);
        wheelSegmentData = resultPosition < zeroSegments ? 
          { multiplier: 0.0, color: "#333947" } : 
          { multiplier: getHighRiskMultiplier(noOfSegments), color: "#D72E60" };
      } else if (risk === "medium") {
        // For medium risk, alternate between zero and non-zero multipliers
        if (resultPosition % 2 === 0) {
          wheelSegmentData = { multiplier: 0.0, color: "#333947" };
        } else {
          // Pick one of the non-zero multipliers based on result
          const nonZeroOptions = [
            { multiplier: 1.5, color: "#00E403" },
            { multiplier: 1.7, color: "#D9D9D9" },
            { multiplier: 2.0, color: "#FDE905" },
            { multiplier: 3.0, color: "#7F46FD" },
            { multiplier: 4.0, color: "#FCA32F" }
          ];
          const nonZeroIndex = Math.floor(resultPosition / 2) % nonZeroOptions.length;
          wheelSegmentData = nonZeroOptions[nonZeroIndex];
        }
      } else {
        // Low risk
        if (resultPosition % 2 === 0) {
          wheelSegmentData = { multiplier: 1.2, color: "#D9D9D9" };
        } else {
          wheelSegmentData = resultPosition % 4 === 1 ? 
            { multiplier: 0.0, color: "#333947" } : 
            { multiplier: 1.5, color: "#00E403" };
        }
      }
      
      // Use the actual multiplier from the wheel segment
      const actualMultiplier = wheelSegmentData.multiplier;

      // Simulate spin delay
      await new Promise((r) => setTimeout(r, 3000)); // spin animation time

      setCurrentMultiplier(actualMultiplier);
      setWheelPosition(resultPosition);

      setIsSpinning(false);
      setHasSpun(true);

      // Wait 2 seconds to show the result
      await new Promise((r) => setTimeout(r, 2000));

      // Calculate win amount
      const winAmount = currentBet * actualMultiplier;

      // Update balance with win
      // setBalance(prev => prev + winAmount); // This line is no longer needed

      // Update total profit
      const profit = winAmount - currentBet;
      totalProfit += profit;
      
      // Show notification for win
      if (actualMultiplier > 0) {
        notification.success(`Congratulations! ${currentBet} APT × ${actualMultiplier.toFixed(2)} = ${winAmount.toFixed(8)} APT won!`);
      }

      // Store history entry
      const newHistoryItem = {
        id: Date.now() + i, // unique id per bet
        game: "Wheel",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        betAmount: currentBet,
        multiplier: `${actualMultiplier.toFixed(2)}x`,
        payout: winAmount,
        result: resultPosition,
        color: wheelSegmentData.color
      };

      setGameHistory(prev => [newHistoryItem, ...prev]);

      // Adjust bet for next round based on win/loss increase
      if (actualMultiplier > 1) {
        currentBet = currentBet + (currentBet * winIncrease);
      } else {
        currentBet = currentBet + (currentBet * lossIncrease);
      }

      // Clamp bet to balance
      // if (currentBet > balance) currentBet = balance; // This line is no longer needed
      if (currentBet <= 0) currentBet = initialBetAmount;

      // Stop conditions
      if (stopProfit > 0 && totalProfit >= stopProfit) break;
      if (stopLoss > 0 && totalProfit <= -stopLoss) break;
    }

    setIsSpinning(false);
    setBetAmount(currentBet); // update bet amount in panel
  };

  const handleSelectMultiplier = (value) => {
    setTargetMultiplier(value);
  };

  // Header Section
  const renderHeader = () => {
    // Sample statistics
    const gameStatistics = {
      totalBets: '1,856,342',
      totalVolume: '8.3M APTC',
      maxWin: '243,500 APTC'
    };
    
    return (
      <div className="relative text-white px-4 md:px-8 lg:px-20 mb-8 pt-20 md:pt-24 mt-4">
        {/* Background Elements */}
        <div className="absolute top-5 -right-32 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-28 left-1/3 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 left-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
            {/* Left Column - Game Info */}
            <div className="md:w-1/2">
              <div className="flex items-center">
                <div className="mr-3 p-3 bg-gradient-to-br from-red-900/40 to-red-700/10 rounded-lg shadow-lg shadow-red-900/10 border border-red-800/20">
                  <GiWheelbarrow className="text-3xl text-red-300" />
                </div>
                <div>
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm text-gray-400 font-sans">Games / Wheel</p>
                    <span className="text-xs px-2 py-0.5 bg-red-900/30 rounded-full text-red-300 font-display">Classic</span>
                    <span className="text-xs px-2 py-0.5 bg-green-900/30 rounded-full text-green-300 font-display">Live</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    Fortune Wheel
                  </motion.h1>
                </div>
              </div>
              <motion.p 
                className="text-white/70 mt-2 max-w-xl font-sans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Place your bets and experience the thrill of the spinning wheel. From simple risk levels to customizable segments, the choice is yours.
              </motion.p>
              
              {/* Game highlights */}
              <motion.div 
                className="flex flex-wrap gap-4 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center text-sm bg-gradient-to-r from-red-900/30 to-red-800/10 px-3 py-1.5 rounded-full">
                  <FaPercentage className="mr-1.5 text-amber-400" />
                  <span className="font-sans">2.7% house edge</span>
                </div>
                <div className="flex items-center text-sm bg-gradient-to-r from-red-900/30 to-red-800/10 px-3 py-1.5 rounded-full">
                  <GiSpinningBlades className="mr-1.5 text-blue-400" />
                  <span className="font-sans">Multiple risk levels</span>
                </div>
                <div className="flex items-center text-sm bg-gradient-to-r from-red-900/30 to-red-800/10 px-3 py-1.5 rounded-full">
                  <FaBalanceScale className="mr-1.5 text-green-400" />
                  <span className="font-sans">Provably fair gaming</span>
                </div>
              </motion.div>
            </div>
            
            {/* Right Column - Stats and Controls */}
            <div className="md:w-1/2">
              <div className="bg-gradient-to-br from-red-900/20 to-red-800/5 rounded-xl p-4 border border-red-800/20 shadow-lg shadow-red-900/10">
                {/* Quick stats in top row */}
                <motion.div 
                  className="grid grid-cols-3 gap-2 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 mb-1">
                      <FaChartLine className="text-blue-400" />
                    </div>
                    <div className="text-xs text-white/50 font-sans text-center">Total Bets</div>
                    <div className="text-white font-display text-sm md:text-base">{gameStatistics.totalBets}</div>
                  </div>
                  
                  <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600/20 mb-1">
                      <FaCoins className="text-yellow-400" />
                    </div>
                    <div className="text-xs text-white/50 font-sans text-center">Volume</div>
                    <div className="text-white font-display text-sm md:text-base">{gameStatistics.totalVolume}</div>
                  </div>
                  
                  <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 mb-1">
                      <FaTrophy className="text-yellow-500" />
                    </div>
                    <div className="text-xs text-white/50 font-sans text-center">Max Win</div>
                    <div className="text-white font-display text-sm md:text-base">{gameStatistics.maxWin}</div>
                  </div>
                </motion.div>
                
                {/* Quick actions */}
                <motion.div
                  className="flex flex-wrap justify-between gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <button 
                    onClick={() => scrollToSection('strategy-guide')}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-800/40 to-red-900/20 rounded-lg text-white font-medium text-sm hover:from-red-700/40 hover:to-red-800/20 transition-all duration-300"
                  >
                    <GiCardRandom className="mr-2" />
                    Strategy Guide
                  </button>
                  <button 
                    onClick={() => scrollToSection('probability')}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-800/40 to-blue-900/20 rounded-lg text-white font-medium text-sm hover:from-blue-700/40 hover:to-blue-800/20 transition-all duration-300"
                  >
                    <HiOutlineChartBar className="mr-2" />
                    Probabilities
                  </button>
                  <button 
                    onClick={() => scrollToSection('history')}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-800/40 to-purple-900/20 rounded-lg text-white font-medium text-sm hover:from-purple-700/40 hover:to-purple-800/20 transition-all duration-300"
                  >
                    <FaChartLine className="mr-2" />
                    Game History
                  </button>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="w-full h-0.5 bg-gradient-to-r from-red-600 via-blue-500/30 to-transparent mt-6"></div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-[#070005] text-white pb-20">
      {/* Header */}
      {renderHeader()}

      {/* Main Game Section */}
      <div className="px-4 md:px-8 lg:px-20">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/3">
            <GameWheel
              risk={risk}
              isSpinning={isSpinning}
              noOfSegments={noOfSegments}
              currentMultiplier={currentMultiplier}
              targetMultiplier={targetMultiplier}
              handleSelectMultiplier={handleSelectMultiplier}
              wheelPosition={wheelPosition}
              setWheelPosition={setWheelPosition}
              hasSpun={hasSpun}
            />
          </div>
          <div className="w-full lg:w-1/3">
            <BettingPanel
              gameMode={gameMode}
              setGameMode={setGameMode}
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              balance={999999} // High balance to allow betting
              manulBet={manulBet}
              risk={selectedRisk}
              setRisk={setSelectedRisk}
              noOfSegments={noOfSegments}
              setSegments={setSegments}
              autoBet={autoBet}
              isSpinning={isSpinning}
            />
          </div>
        </div>
      </div>
      
      {/* Video Section */}
      <WheelVideo />
      
      {/* Game Description */}
      <WheelDescription />
      
      {/* Strategy Guide */}
      <WheelStrategyGuide />
      
      {/* Win Probabilities */}
      <WheelProbability />
      
      {/* Payouts */}
      <WheelPayouts />
      
      {/* Game History */}
      <WheelHistory />
    </div>
  );
}



