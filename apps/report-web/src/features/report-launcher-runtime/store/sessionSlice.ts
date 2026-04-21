import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_MOCK_USER_ID, type MockUserId } from '@report-platform/auth';

type SessionState = {
  selectedMockUserId: MockUserId;
};

const initialState: SessionState = {
  selectedMockUserId: DEFAULT_MOCK_USER_ID,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    selectMockUser(state, action: PayloadAction<MockUserId>) {
      state.selectedMockUserId = action.payload;
    },
  },
});

export const { selectMockUser } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
