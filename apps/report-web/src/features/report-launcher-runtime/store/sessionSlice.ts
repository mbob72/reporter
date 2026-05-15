import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { MockUserId } from '@report-platform/auth';

type SessionState = {
  selectedMockUserId: MockUserId | null;
  accessToken: string | null;
  isBootstrapped: boolean;
};

const initialState: SessionState = {
  selectedMockUserId: null,
  accessToken: null,
  isBootstrapped: false,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    selectMockUser(state, action: PayloadAction<MockUserId | null>) {
      state.selectedMockUserId = action.payload;
      state.accessToken = null;
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    clearAccessToken(state) {
      state.accessToken = null;
    },
    clearSession(state) {
      state.selectedMockUserId = null;
      state.accessToken = null;
    },
    markSessionBootstrapped(state) {
      state.isBootstrapped = true;
    },
  },
});

export const {
  selectMockUser,
  setAccessToken,
  clearAccessToken,
  clearSession,
  markSessionBootstrapped,
} = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
