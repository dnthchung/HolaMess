import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useUser } from './UserContext';
import { WebRTCService } from '../services/webrtcService';
import type { VoiceCall, CallUIState, AudioDevice } from '../types';

interface VoiceCallContextType {
  // Call state
  currentCall: VoiceCall | null;
  callUIState: CallUIState;

  // Call actions
  initiateCall: (calleeId: string) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => void;
  endCall: () => void;

  // Audio controls
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  getAudioDevices: () => Promise<AudioDevice[]>;
  switchInputDevice: (deviceId: string) => Promise<void>;

  // UI controls
  openCallWindow: () => void;
  closeCallWindow: () => void;
  setCallStatus: (status: CallUIState['callStatus']) => void;

  // Remote audio stream
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
}

const VoiceCallContext = createContext<VoiceCallContextType | undefined>(undefined);

interface VoiceCallProviderProps {
  children: ReactNode;
}

export const VoiceCallProvider: React.FC<VoiceCallProviderProps> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useUser();

  // WebRTC service instance
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);

  // Call state
  const [currentCall, setCurrentCall] = useState<VoiceCall | null>(null);
  const [callUIState, setCallUIState] = useState<CallUIState>({
    isCallWindowOpen: false,
    currentCall: null,
    callStatus: 'idle',
    audioDevices: [],
    audioSettings: {
      volume: 100,
      muted: false
    },
    isAudioEnabled: true,
    callDuration: 0
  });

  // Audio elements
  const remoteAudioRef = React.useRef<HTMLAudioElement>(null);

  // Call duration timer
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [durationInterval, setDurationInterval] = useState<number | null>(null);

  // Initialize WebRTC service when socket is available
  useEffect(() => {
    if (socket && !webrtcService) {
      const service = new WebRTCService(socket);

      // Setup event handlers
      service.onRemoteStream((stream: MediaStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
      });

      service.onCallEnd(() => {
        handleCallEnd();
      });

      service.onConnectionStateChange((state: RTCPeerConnectionState) => {
        console.log('Connection state changed:', state);
        if (state === 'connected') {
          setCallStatus('connected');
          setCallStartTime(new Date());
          startDurationTimer();
        } else if (state === 'failed' || state === 'disconnected') {
          handleCallEnd();
        }
      });

      setWebrtcService(service);
    }

    return () => {
      if (webrtcService) {
        webrtcService.destroy();
      }
    };
  }, [socket]);

  // Update audio element volume when settings change
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = callUIState.audioSettings.volume / 100;
    }
  }, [callUIState.audioSettings.volume]);

  // Setup socket listeners for incoming calls
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: {
      callId: string;
      caller: string;
      callee: string;
      offer: RTCSessionDescriptionInit;
      timestamp: string;
    }) => {
      const incomingCall: VoiceCall = {
        _id: data.callId,
        caller: data.caller,
        callee: data.callee,
        status: 'ringing',
        startTime: data.timestamp,
        createdAt: data.timestamp,
        updatedAt: data.timestamp
      };

      setCurrentCall(incomingCall);
      setCallUIState(prev => ({
        ...prev,
        currentCall: incomingCall,
        callStatus: 'ringing',
        isCallWindowOpen: true
      }));

      // Store the offer for later use when answering
      (window as any).pendingCallOffer = data.offer;
    };

    const handleCallDeclined = () => {
      handleCallEnd();
    };

    const handleCallAnsweredElsewhere = () => {
      handleCallEnd();
    };

    const handleCallDeclinedElsewhere = () => {
      handleCallEnd();
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_declined', handleCallDeclined);
    socket.on('call_answered_elsewhere', handleCallAnsweredElsewhere);
    socket.on('call_declined_elsewhere', handleCallDeclinedElsewhere);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_declined', handleCallDeclined);
      socket.off('call_answered_elsewhere', handleCallAnsweredElsewhere);
      socket.off('call_declined_elsewhere', handleCallDeclinedElsewhere);
    };
  }, [socket]);

  // Duration timer functions
  const startDurationTimer = useCallback(() => {
    if (durationInterval) {
      clearInterval(durationInterval);
    }

    const interval = setInterval(() => {
      if (callStartTime) {
        const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        setCallUIState(prev => ({
          ...prev,
          callDuration: duration
        }));
      }
    }, 1000);

    setDurationInterval(interval);
  }, [callStartTime, durationInterval]);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval) {
      clearInterval(durationInterval);
      setDurationInterval(null);
    }
  }, [durationInterval]);

  // Call management functions
  const generateCallId = (): string => {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const initiateCall = useCallback(async (calleeId: string): Promise<void> => {
    if (!webrtcService || !user) {
      throw new Error('WebRTC service or user not available');
    }

    try {
      const callId = generateCallId();

      const newCall: VoiceCall = {
        _id: callId,
        caller: user.id,
        callee: calleeId,
        status: 'calling',
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentCall(newCall);
      setCallUIState(prev => ({
        ...prev,
        currentCall: newCall,
        callStatus: 'calling',
        isCallWindowOpen: true
      }));

      await webrtcService.initiateCall(callId, calleeId);
    } catch (error) {
      console.error('Error initiating call:', error);
      handleCallEnd();
      throw error;
    }
  }, [webrtcService, user]);

  const answerCall = useCallback(async (callId: string): Promise<void> => {
    if (!webrtcService || !currentCall) {
      throw new Error('WebRTC service or current call not available');
    }

    try {
      // Get the stored offer from the incoming call event
      const offer = (window as any).pendingCallOffer;

      if (!offer) {
        throw new Error('Call offer not found');
      }

      await webrtcService.answerCall(callId, offer);

      setCallUIState(prev => ({
        ...prev,
        callStatus: 'connected'
      }));
    } catch (error) {
      console.error('Error answering call:', error);
      handleCallEnd();
      throw error;
    }
  }, [webrtcService, currentCall]);

  const declineCall = useCallback((callId: string): void => {
    if (webrtcService) {
      webrtcService.declineCall(callId);
    }
    handleCallEnd();
  }, [webrtcService]);

  const endCall = useCallback((): void => {
    if (webrtcService) {
      webrtcService.endCall();
    }
    handleCallEnd();
  }, [webrtcService]);

  const handleCallEnd = useCallback((): void => {
    stopDurationTimer();
    setCallStartTime(null);
    setCurrentCall(null);
    setCallUIState(prev => ({
      ...prev,
      currentCall: null,
      callStatus: 'ended',
      callDuration: 0
    }));

    // Auto-close call window after a delay
    setTimeout(() => {
      setCallUIState(prev => ({
        ...prev,
        callStatus: 'idle',
        isCallWindowOpen: false
      }));
    }, 3000);
  }, [stopDurationTimer]);

  // Audio control functions
  const toggleMute = useCallback((): void => {
    if (webrtcService) {
      const isMuted = webrtcService.toggleMute();
      setCallUIState(prev => ({
        ...prev,
        audioSettings: {
          ...prev.audioSettings,
          muted: isMuted
        }
      }));
    }
  }, [webrtcService]);

  const setVolume = useCallback((volume: number): void => {
    if (webrtcService) {
      webrtcService.setVolume(volume);
      setCallUIState(prev => ({
        ...prev,
        audioSettings: {
          ...prev.audioSettings,
          volume
        }
      }));
    }
  }, [webrtcService]);

  const getAudioDevices = useCallback(async (): Promise<AudioDevice[]> => {
    if (webrtcService) {
      const devices = await webrtcService.getAudioDevices();
      setCallUIState(prev => ({
        ...prev,
        audioDevices: devices
      }));
      return devices;
    }
    return [];
  }, [webrtcService]);

  const switchInputDevice = useCallback(async (deviceId: string): Promise<void> => {
    if (webrtcService) {
      await webrtcService.switchInputDevice(deviceId);
      setCallUIState(prev => ({
        ...prev,
        audioSettings: {
          ...prev.audioSettings,
          inputDeviceId: deviceId
        }
      }));
    }
  }, [webrtcService]);

  // UI control functions
  const openCallWindow = useCallback((): void => {
    setCallUIState(prev => ({
      ...prev,
      isCallWindowOpen: true
    }));
  }, []);

  const closeCallWindow = useCallback((): void => {
    setCallUIState(prev => ({
      ...prev,
      isCallWindowOpen: false
    }));
  }, []);

  const setCallStatus = useCallback((status: CallUIState['callStatus']): void => {
    setCallUIState(prev => ({
      ...prev,
      callStatus: status
    }));
  }, []);

  const value: VoiceCallContextType = {
    currentCall,
    callUIState,
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    setVolume,
    getAudioDevices,
    switchInputDevice,
    openCallWindow,
    closeCallWindow,
    setCallStatus,
    remoteAudioRef
  };

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
      {/* Hidden audio element for remote stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCall = (): VoiceCallContextType => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within a VoiceCallProvider');
  }
  return context;
};
