import type { Socket } from 'socket.io-client';
import type { AudioDevice, AudioSettings } from '../types';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private currentCallId: string | null = null;
  private audioSettings: AudioSettings = {
    volume: 100,
    muted: false
  };

  // Configuration for STUN servers
  private readonly config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // Event handlers
  private onRemoteStreamHandler: ((stream: MediaStream) => void) | null = null;
  private onCallEndHandler: (() => void) | null = null;
  private onConnectionStateChangeHandler: ((state: RTCPeerConnectionState) => void) | null = null;
  private onIceConnectionStateChangeHandler: ((state: RTCIceConnectionState) => void) | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  // Setup socket event listeners for WebRTC signaling
  private setupSocketListeners() {
    if (!this.socket) return;

    // Handle call answered (for caller)
    this.socket.on('call_answered', async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      if (this.currentCallId === data.callId && this.peerConnection) {
        await this.handleAnswer(data.answer);
      }
    });

    // Handle ICE candidates
    this.socket.on('call_ice_candidate', async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      if (this.currentCallId === data.callId && this.peerConnection) {
        await this.handleIceCandidate(data.candidate);
      }
    });

    // Handle call ended
    this.socket.on('call_ended', (data: { callId: string }) => {
      if (this.currentCallId === data.callId) {
        this.endCall();
      }
    });

    // Handle call declined
    this.socket.on('call_declined', (data: { callId: string }) => {
      if (this.currentCallId === data.callId) {
        this.endCall();
      }
    });

    // Handle call errors
    this.socket.on('call_error', (data: { error: string }) => {
      console.error('Call error:', data.error);
      this.endCall();
    });
  }

  // Initialize peer connection
  private async initializePeerConnection(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.config);

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStream = remoteStream;
      if (this.onRemoteStreamHandler) {
        this.onRemoteStreamHandler(remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.currentCallId) {
        this.socket.emit('call_ice_candidate', {
          callId: this.currentCallId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChangeHandler) {
        this.onConnectionStateChangeHandler(this.peerConnection.connectionState);
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection && this.onIceConnectionStateChangeHandler) {
        this.onIceConnectionStateChangeHandler(this.peerConnection.iceConnectionState);
      }
    };
  }

  // Get user media (audio only for voice calls)
  async getUserMedia(): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: this.audioSettings.inputDeviceId ? { exact: this.audioSettings.inputDeviceId } : undefined
        },
        video: false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing user media:', error);
      throw new Error('Unable to access microphone');
    }
  }

  // Get available audio devices
  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${device.deviceId.slice(0, 5)}`,
          kind: device.kind as 'audioinput' | 'audiooutput'
        }));
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  // Initialize outgoing call
  async initiateCall(callId: string, calleeId: string): Promise<void> {
    try {
      this.currentCallId = callId;

      // Initialize peer connection
      await this.initializePeerConnection();

      // Get user media
      const stream = await this.getUserMedia();

      // Add local stream to peer connection
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, stream);
        });

        // Create offer
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });

        await this.peerConnection.setLocalDescription(offer);

        // Send offer through socket
        if (this.socket) {
          this.socket.emit('call_offer', {
            callId,
            callee: calleeId,
            offer
          });
        }
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      this.endCall();
      throw error;
    }
  }

  // Answer incoming call
  async answerCall(callId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.currentCallId = callId;

      // Initialize peer connection
      await this.initializePeerConnection();

      // Get user media
      const stream = await this.getUserMedia();

      // Add local stream to peer connection
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, stream);
        });

        // Set remote description
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Create answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Send answer through socket
        if (this.socket) {
          this.socket.emit('call_answer', {
            callId,
            answer
          });
        }
      }
    } catch (error) {
      console.error('Error answering call:', error);
      this.endCall();
      throw error;
    }
  }

  // Handle answer (for caller)
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // End call
  endCall(): void {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Notify socket if call is ending
    if (this.socket && this.currentCallId) {
      this.socket.emit('call_end', {
        callId: this.currentCallId
      });
    }

    // Clear call ID
    this.currentCallId = null;

    // Call end handler
    if (this.onCallEndHandler) {
      this.onCallEndHandler();
    }
  }

  // Decline call
  declineCall(callId: string): void {
    if (this.socket) {
      this.socket.emit('call_decline', { callId });
    }
    this.endCall();
  }

  // Audio controls
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      this.audioSettings.muted = !audioTracks[0]?.enabled;
      return this.audioSettings.muted;
    }
    return false;
  }

  setVolume(volume: number): void {
    this.audioSettings.volume = Math.max(0, Math.min(100, volume));
    // Note: Volume control for output is handled by the audio element in the UI
  }

  // Device controls
  async switchInputDevice(deviceId: string): Promise<void> {
    if (this.localStream && this.currentCallId) {
      // Stop current audio tracks
      this.localStream.getAudioTracks().forEach(track => track.stop());

      // Get new stream with different device
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };

      try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localStream = newStream;

        // Replace tracks in peer connection
        if (this.peerConnection) {
          const audioTrack = newStream.getAudioTracks()[0];
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'audio'
          );
          if (sender && audioTrack) {
            await sender.replaceTrack(audioTrack);
          }
        }

        this.audioSettings.inputDeviceId = deviceId;
      } catch (error) {
        console.error('Error switching input device:', error);
        throw error;
      }
    }
  }

  // Event handlers
  onRemoteStream(handler: (stream: MediaStream) => void): void {
    this.onRemoteStreamHandler = handler;
  }

  onCallEnd(handler: () => void): void {
    this.onCallEndHandler = handler;
  }

  onConnectionStateChange(handler: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeHandler = handler;
  }

  onIceConnectionStateChange(handler: (state: RTCIceConnectionState) => void): void {
    this.onIceConnectionStateChangeHandler = handler;
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getCurrentCallId(): string | null {
    return this.currentCallId;
  }

  isCallActive(): boolean {
    return this.currentCallId !== null;
  }

  getAudioSettings(): AudioSettings {
    return { ...this.audioSettings };
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  getIceConnectionState(): RTCIceConnectionState | null {
    return this.peerConnection?.iceConnectionState || null;
  }

  // Cleanup
  destroy(): void {
    this.endCall();
    if (this.socket) {
      this.socket.off('call_answered');
      this.socket.off('call_ice_candidate');
      this.socket.off('call_ended');
      this.socket.off('call_declined');
      this.socket.off('call_error');
    }
  }
}
