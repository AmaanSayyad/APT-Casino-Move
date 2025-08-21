"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaHistory, FaFilter, FaDownload, FaSearch, FaTrophy, FaChartLine } from "react-icons/fa";
import Image from "next/image";
import coin from "../../../../../public/coin.png";

const WheelHistory = ({ gameHistory = [] }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [entriesShown, setEntriesShown] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Use real game history data from props instead of sample data
  const historyData = gameHistory.length > 0 ? gameHistory : [];
  
  // Filter history based on active tab and search query
  const filteredHistory = historyData.filter(item => {
    const matchesSearch = 
      (item.game && item.game.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.multiplier && item.multiplier.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "high-risk") return item.multiplier && parseFloat(item.multiplier) >= 3.0 && matchesSearch;
    if (activeTab === "big-wins") return item.payout && item.payout >= 100 && matchesSearch;
    return matchesSearch;
  });
  
  // Stats calculation from real data
  const totalBets = historyData.length;
  const totalVolume = historyData.reduce((sum, item) => sum + (item.betAmount || 0), 0);
  const biggestWin = historyData.length > 0 ? Math.max(...historyData.map(item => item.payout || 0)) : 0;
  
  return (
    <div id="history" className="my-16 px-4 md:px-8 lg:px-20 scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <h2 className="text-2xl md:text-3xl font-bold font-display mb-6 bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">
          Game History
        </h2>
        
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/5 rounded-xl border border-purple-800/20 shadow-lg shadow-purple-900/10 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center mr-3">
                  <FaHistory className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Recent Spins</h3>
                  <p className="text-white/70 text-sm">View recent game results and player statistics</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/30 border border-purple-800/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-white/50 w-full md:w-auto"
                  />
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                </div>
                
                <select 
                  className="bg-black/30 border border-purple-800/20 rounded-lg py-2 px-3 text-white"
                  value={entriesShown}
                  onChange={(e) => setEntriesShown(Number(e.target.value))}
                >
                  <option value={10}>Show 10</option>
                  <option value={20}>Show 20</option>
                  <option value={50}>Show 50</option>
                </select>
                
                <button className="flex items-center justify-center bg-gradient-to-r from-purple-800/40 to-purple-900/20 rounded-lg py-2 px-4 text-white hover:from-purple-700/40 hover:to-purple-800/20 transition-all duration-300">
                  <FaDownload className="mr-2" />
                  Export
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-black/20 rounded-lg p-3 border border-purple-800/10">
                <div className="text-xs text-white/50 mb-1">Total Bets</div>
                <div className="text-xl font-bold text-white flex items-center">
                  {totalBets}
                  <FaChartLine className="ml-2 text-purple-400 text-sm" />
                </div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-purple-800/10">
                <div className="text-xs text-white/50 mb-1">Total Volume</div>
                <div className="text-xl font-bold text-white flex items-center">
                  {totalVolume} APT
                  <Image src={coin} width={20} height={20} alt="coin" className="ml-2" />
                </div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-purple-800/10">
                <div className="text-xs text-white/50 mb-1">Biggest Win</div>
                <div className="text-xl font-bold text-white flex items-center">
                  {biggestWin} APT
                  <FaTrophy className="ml-2 text-yellow-400 text-sm" />
                </div>
              </div>
            </div>
            
            <div className="flex border-b border-purple-800/20 mb-4">
              <button 
                className={`py-3 px-4 text-center font-medium transition-all duration-300 ${activeTab === 'all' ? 'border-b-2 border-purple-500 text-white' : 'text-white/70 hover:text-white'}`}
                onClick={() => setActiveTab('all')}
              >
                All Spins
              </button>
              <button 
                className={`py-3 px-4 text-center font-medium transition-all duration-300 ${activeTab === 'high-risk' ? 'border-b-2 border-purple-500 text-white' : 'text-white/70 hover:text-white'}`}
                onClick={() => setActiveTab('high-risk')}
              >
                High Risk
              </button>
              <button 
                className={`py-3 px-4 text-center font-medium transition-all duration-300 ${activeTab === 'big-wins' ? 'border-b-2 border-purple-500 text-white' : 'text-white/70 hover:text-white'}`}
                onClick={() => setActiveTab('big-wins')}
              >
                Big Wins
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="bg-black/30 border-b border-purple-800/20">
                    <th className="py-3 px-4 text-left">Game</th>
                    <th className="py-3 px-4 text-left">Time</th>
                    <th className="py-3 px-4 text-left">Bet Amount</th>
                    <th className="py-3 px-4 text-left">Multiplier</th>
                    <th className="py-3 px-4 text-left">Payout</th>
                    <th className="py-3 px-4 text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.slice(0, entriesShown).map((item, index) => (
                    <tr key={item.id} className={`border-b border-purple-800/10 ${index % 2 === 0 ? 'bg-black/10' : ''} hover:bg-purple-900/10 transition-colors duration-150`}>
                      <td className="py-3 px-4 font-medium">{item.game || 'Wheel'}</td>
                      <td className="py-3 px-4">{item.time}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {item.betAmount} APT
                          <Image src={coin} width={16} height={16} alt="coin" className="ml-1" />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{item.multiplier}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {item.payout} APT
                          <Image src={coin} width={16} height={16} alt="coin" className="ml-1" />
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-medium ${item.payout > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.payout > 0 ? `+${item.payout}` : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredHistory.length === 0 && (
              <div className="py-8 text-center text-white/50">
                No matching results found. Try adjusting your search or filter.
              </div>
            )}
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-white/50">
                Showing {Math.min(entriesShown, filteredHistory.length)} of {filteredHistory.length} results
              </div>
              
              <div className="flex items-center">
                <button className="px-3 py-1 bg-black/30 border border-purple-800/20 rounded-l-lg text-white/70 hover:text-white transition-colors disabled:opacity-50" disabled>
                  Previous
                </button>
                <button className="px-3 py-1 bg-black/30 border border-purple-800/20 border-l-0 rounded-r-lg text-white/70 hover:text-white transition-colors">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WheelHistory; 