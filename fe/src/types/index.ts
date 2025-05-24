// Define types for the application

export interface User {
    id: string // API returns as id
    name: string
    phone: string
    token?: string // JWT token for authentication
    expiresIn?: number // Token expiration time in seconds
    _lastTokenTime?: number // Timestamp when token was created/refreshed
  }

  export interface Message {
    _id: string
    sender: string // userId
    receiver: string // userId
    content: string
    read: boolean
    createdAt: string // ISO
    messageType?: 'text' | 'voice_call' // Add message type
    callData?: VoiceCallData // Call information for voice call messages
  }

  export interface RecentConversation {
    _id: string // partner id
    userInfo: {
      name: string
      phone: string
    }
    lastMessage: {
      _id: string
      sender: string
      receiver: string
      content: string
      createdAt: string
      read: boolean
      messageType?: 'text' | 'voice_call'
      callData?: VoiceCallData
    }
    unreadCount: number
  }

  export interface TokenData {
    token: string // access token
    expiresIn: number // expiration time in seconds
    refreshToken?: string // refresh token may be sent only on login/signup
  }

  export interface AuthResponse {
    id: string
    name: string
    phone: string
    token: string
    expiresIn: number
  }

  export interface TokenRefreshResponse {
    token: string
    expiresIn: number
  }

  // Voice Call Types
  export interface VoiceCall {
    _id: string
    caller: string // userId
    callee: string // userId
    status: 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed' | 'failed'
    startTime: string // ISO
    endTime?: string // ISO
    duration?: number // in seconds
    createdAt: string // ISO
    updatedAt: string // ISO
  }

  export interface VoiceCallData {
    duration: number // in seconds
    startTime: string // ISO
    endTime: string // ISO
    status: 'completed' | 'missed' | 'declined'
  }

  export interface CallOffer {
    callId: string
    caller: string
    callee: string
    offer: RTCSessionDescriptionInit
    timestamp: string
  }

  export interface CallAnswer {
    callId: string
    answer: RTCSessionDescriptionInit
    timestamp: string
  }

  export interface CallIceCandidate {
    callId: string
    candidate: RTCIceCandidateInit
    timestamp: string
  }

  export interface CallSignal {
    callId: string
    type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended' | 'call-declined'
    data?: any
    timestamp: string
  }

  // Audio Device Types
  export interface AudioDevice {
    deviceId: string
    label: string
    kind: 'audioinput' | 'audiooutput'
  }

  export interface AudioSettings {
    inputDeviceId?: string
    outputDeviceId?: string
    volume: number
    muted: boolean
  }

  // Call UI State Types
  export interface CallUIState {
    isCallWindowOpen: boolean
    currentCall: VoiceCall | null
    callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
    audioDevices: AudioDevice[]
    audioSettings: AudioSettings
    isAudioEnabled: boolean
    callDuration: number
  }
