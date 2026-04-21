import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { reportApi } from '../features/report-launcher-runtime/api/reportApi';
import { launcherReducer } from '../features/report-launcher-runtime/store/launcherSlice';
import { sessionReducer } from '../features/report-launcher-runtime/store/sessionSlice';

const rootReducer = combineReducers({
  session: sessionReducer,
  launcher: launcherReducer,
  [reportApi.reducerPath]: reportApi.reducer,
});

export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(reportApi.middleware),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
