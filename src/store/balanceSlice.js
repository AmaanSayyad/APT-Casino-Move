import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userBalance: "0",
  isLoading: false,
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    setBalance(state, action) {
      state.userBalance = action.payload;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const { setBalance, setLoading } = balanceSlice.actions;
export default balanceSlice.reducer;
