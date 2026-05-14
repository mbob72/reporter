import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_MOCK_USER_ID, type MockUserId } from '@report-platform/auth';

type SessionState = {
  selectedMockUserId: MockUserId;
  accessToken: string | null;
};

const initialState: SessionState = {
  selectedMockUserId: DEFAULT_MOCK_USER_ID,
  accessToken: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    selectMockUser(state, action: PayloadAction<MockUserId>) {
      state.selectedMockUserId = action.payload;
      state.accessToken = null;
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    clearAccessToken(state) {
      state.accessToken = null;
    },
  },
});

export const { selectMockUser, setAccessToken, clearAccessToken } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
