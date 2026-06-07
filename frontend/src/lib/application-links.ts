export function applicationDetailHref(applicationId: string) {
  return `/applications/detail?id=${encodeURIComponent(applicationId)}`;
}

export function applicationMatchHref(applicationId: string) {
  return `/applications/match?id=${encodeURIComponent(applicationId)}`;
}
