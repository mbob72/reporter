import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { storyApi } from './services/storyApi';

const rootReducer = combineReducers({
  [storyApi.reducerPath]: storyApi.reducer,
});

export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(storyApi.middleware),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
