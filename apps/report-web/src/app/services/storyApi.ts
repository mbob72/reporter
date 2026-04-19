import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export const storyApi = createApi({
  reducerPath: 'storyApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    ping: builder.query<{ ok: true }, void>({
      queryFn: async () => ({ data: { ok: true } }),
    }),
  }),
});
