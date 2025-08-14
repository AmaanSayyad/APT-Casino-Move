import { createSlice } from '@reduxjs/toolkit';

// Load initial state from localStorage
const loadInitialState = () => {
  if (typeof window !== 'undefined') {
    const savedBalance = localStorage.getItem('userBalance');
    const savedLoading = localStorage.getItem('isLoading');
    
    // Normal balance validation (restored)
    let cleanBalance = "0";
    if (savedBalance && !isNaN(savedBalance) && parseFloat(savedBalance) >= 0) {
      cleanBalance = savedBalance;
    } else {
      // Reset invalid balance to 0
      localStorage.setItem('userBalance', "0");
    }
    
    return {
      userBalance: cleanBalance,
      isLoading: savedLoading === 'true' || false,
    };
  }
  return {
    userBalance: "0",
    isLoading: false,
  };
};

const initialState = loadInitialState();

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    setBalance(state, action) {
      state.userBalance = action.payload;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userBalance', action.payload);
      }
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('isLoading', action.payload.toString());
      }
    },
  },
});

export const { setBalance, setLoading } = balanceSlice.actions;

// Utility functions for localStorage operations
export const loadBalanceFromStorage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userBalance') || "0";
  }
  return "0";
};

export const saveBalanceToStorage = (balance) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userBalance', balance);
  }
};

export default balanceSlice.reducer;
