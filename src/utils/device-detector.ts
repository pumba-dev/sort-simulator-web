const MOBILE_MAX_WIDTH = 767;

export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth <= MOBILE_MAX_WIDTH;
};
