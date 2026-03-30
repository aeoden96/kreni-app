export const queryKeys = {
  nextbike: {
    all: ['nextbike'] as const,
  },
  realtime: {
    all: ['realtime'] as const,
  },
  roadClosures: {
    all: ['roadClosures'] as const,
  },
  routeData: {
    all: ['routeData'] as const,
    detail: (dataDir: string, routeId: string) =>
      [...queryKeys.routeData.all, dataDir, routeId] as const,
  },
} as const;
