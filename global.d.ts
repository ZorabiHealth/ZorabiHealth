/* eslint-disable no-var */
declare var pendo: {
  initialize: (config: Record<string, unknown>) => void;
  identify: (visitor: Record<string, unknown>) => void;
  updateOptions: (options: Record<string, unknown>) => void;
  pageLoad: () => void;
  track: (event: string, metadata?: Record<string, unknown>) => void;
  clearSession: () => void;
  [key: string]: unknown;
};
