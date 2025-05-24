// In-memory token storage (more secure than localStorage)
let accessToken: string | null = null;
let tokenExpiration: number | null = null;
let tokenTimestamp: number | null = null;

// Token Management Service
export const tokenService = {
  // Get access token from memory
  getToken: (): string | null => {
    return accessToken;
  },

  // Set access token and expiration
  setToken: (token: string, expiresIn: number): void => {
    console.log(
      "Setting new access token with expiration:",
      expiresIn,
      "seconds"
    );
    accessToken = token;
    tokenExpiration = Date.now() + expiresIn * 1000;
    tokenTimestamp = Date.now();

    // Update lastTokenTime in user localStorage for tracking
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData._lastTokenTime = Date.now();
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Error updating token timestamp:", error);
    }
  },

  // Clear all tokens
  clearToken: (): void => {
    console.log("Clearing access token");
    accessToken = null;
    tokenExpiration = null;
    tokenTimestamp = null;
  },

  // Check if token is expired
  isTokenExpired: (): boolean => {
    if (!tokenExpiration) return true;
    return Date.now() >= tokenExpiration;
  },

  // Check if token exists and is not expired
  hasValidToken: (): boolean => {
    return !!accessToken && !tokenService.isTokenExpired();
  },

  // Calculate remaining time in seconds
  getRemainingTime: (): number => {
    if (!tokenExpiration) return 0;
    const remaining = tokenExpiration - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  },

  // Get time since token was refreshed (in seconds)
  getTokenAge: (): number => {
    if (!tokenTimestamp) return 0;
    return Math.floor((Date.now() - tokenTimestamp) / 1000);
  },

  // Initialize token from storage (for page reloads)
  initializeFromStorage: (): void => {
    try {
      // console.log("Initializing token from storage...");
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        if (userData.token && userData.expiresIn && userData._lastTokenTime) {
          console.log("Found token in storage, setting access token");

          // Calculate actual expiration time from stored data
          const tokenLifetime = userData.expiresIn * 1000; // Convert to milliseconds
          const tokenCreatedAt = userData._lastTokenTime;
          const calculatedExpiration = tokenCreatedAt + tokenLifetime;

          // Only set token if it's not expired
          if (calculatedExpiration > Date.now()) {
            accessToken = userData.token;
            tokenExpiration = calculatedExpiration;
            tokenTimestamp = tokenCreatedAt;
            console.log("✅ Token restored from storage, expires in", Math.floor((calculatedExpiration - Date.now()) / 1000), "seconds");
          } else {
            console.log("❌ Token in storage is expired, clearing");
            tokenService.clearToken();
          }
        } else {
          console.log("No valid token data found in storage");
        }
      } else {
        // console.log("No user found in storage");
      }
    } catch (error) {
      console.error("Failed to initialize token from storage:", error);
      tokenService.clearToken();
    }
  },
};

// Initialize on module load
tokenService.initializeFromStorage();
