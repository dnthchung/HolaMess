import React, { useState, useEffect } from 'react';
import { useVoiceCall } from '../contexts/VoiceCallContext';
import { useUser } from '../contexts/UserContext';
import type { AudioDevice } from '../types';

interface VoiceCallWindowProps {
  callerName?: string;
  calleeName?: string;
}

const VoiceCallWindow: React.FC<VoiceCallWindowProps> = ({ callerName, calleeName }) => {
  const {
    currentCall,
    callUIState,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    setVolume,
    getAudioDevices,
    switchInputDevice,
    closeCallWindow
  } = useVoiceCall();

  const { user } = useUser();

  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [showCallBack, setShowCallBack] = useState(false);

  // Load audio devices when settings is opened
  useEffect(() => {
    if (showSettings) {
      loadAudioDevices();
    }
  }, [showSettings]);

  // Show call back option when call ends
  useEffect(() => {
    if (callUIState.callStatus === 'ended') {
      setShowCallBack(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowCallBack(false);
        closeCallWindow();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [callUIState.callStatus, closeCallWindow]);

  const loadAudioDevices = async () => {
    try {
      const devices = await getAudioDevices();
      setAudioDevices(devices);
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDisplayName = (): string => {
    if (!currentCall || !user) return 'Unknown';

    const isIncoming = currentCall.callee === user.id;
    if (isIncoming) {
      return callerName || currentCall.caller;
    } else {
      return calleeName || currentCall.callee;
    }
  };

  const getCallStatusText = (): string => {
    switch (callUIState.callStatus) {
      case 'calling':
        return 'Đang gọi...';
      case 'ringing':
        return 'Đang đổ chuông...';
      case 'connected':
        return 'Đang kết nối';
      case 'ended':
        return 'Cuộc gọi đã kết thúc';
      default:
        return '';
    }
  };

  const handleAnswerCall = () => {
    if (currentCall) {
      answerCall(currentCall._id);
    }
  };

  const handleDeclineCall = () => {
    if (currentCall) {
      declineCall(currentCall._id);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseInt(event.target.value);
    setVolume(volume);
  };

  const handleDeviceChange = async (deviceId: string) => {
    try {
      await switchInputDevice(deviceId);
    } catch (error) {
      console.error('Error switching input device:', error);
    }
  };

  const handleCallBack = () => {
    if (currentCall && user) {
      const otherUserId = currentCall.caller === user.id ? currentCall.callee : currentCall.caller;
      // This would need to be implemented to get user name
      // For now, we'll just use the ID
      window.location.hash = `call/${otherUserId}`;
    }
  };

  if (!callUIState.isCallWindowOpen || !currentCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-96 max-w-full mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114A4.369 4.369 0 005 11c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold">{getDisplayName()}</h3>
          <p className="text-blue-100">{getCallStatusText()}</p>
          {callUIState.callStatus === 'connected' && (
            <p className="text-blue-100 text-sm mt-1">
              {formatDuration(callUIState.callDuration)}
            </p>
          )}
        </div>

        {/* Call Controls */}
        <div className="p-6">
          {/* Audio Settings Toggle */}
          {(callUIState.callStatus === 'calling' || callUIState.callStatus === 'connected') && (
            <div className="mb-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full text-left text-gray-600 hover:text-gray-800 text-sm flex items-center justify-between"
              >
                <span>Cài đặt âm thanh</span>
                <svg
                  className={`w-4 h-4 transform transition-transform ${showSettings ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Audio Settings Panel */}
          {showSettings && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
              {/* Volume Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âm lượng ({callUIState.audioSettings.volume}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={callUIState.audioSettings.volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Input Device Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microphone
                </label>
                <select
                  value={callUIState.audioSettings.inputDeviceId || ''}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  {audioDevices
                    .filter(device => device.kind === 'audioinput')
                    .map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Output Device Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loa
                </label>
                <select
                  value={callUIState.audioSettings.outputDeviceId || ''}
                  onChange={(e) => {
                    // Output device switching requires different approach
                    console.log('Output device selected:', e.target.value);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  {audioDevices
                    .filter(device => device.kind === 'audiooutput')
                    .map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Call Action Buttons */}
          <div className="flex justify-center space-x-4">
            {callUIState.callStatus === 'ringing' && currentCall.callee === user?.id && (
              <>
                {/* Answer Button */}
                <button
                  onClick={handleAnswerCall}
                  className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </button>

                {/* Decline Button */}
                <button
                  onClick={handleDeclineCall}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114A4.369 4.369 0 005 11c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </button>
              </>
            )}

            {(callUIState.callStatus === 'calling' || callUIState.callStatus === 'connected') && (
              <>
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full shadow-lg transition-colors ${
                    callUIState.audioSettings.muted
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {callUIState.audioSettings.muted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.914 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.914l3.469-2.816a1 1 0 011.617.816zM16.707 9.293a1 1 0 010 1.414L15.414 12l1.293 1.293a1 1 0 01-1.414 1.414L14 13.414l-1.293 1.293a1 1 0 01-1.414-1.414L12.586 12l-1.293-1.293a1 1 0 011.414-1.414L14 10.586l1.293-1.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.914 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.914l3.469-2.816a1 1 0 011.617.816zM12 6a4 4 0 014 4v.6c0 .568.07 1.127.207 1.664a1 1 0 001.936-.512A8.96 8.96 0 0018 10.6V10a6 6 0 00-6-6 1 1 0 100 2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* End Call Button */}
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </button>
              </>
            )}

            {callUIState.callStatus === 'ended' && showCallBack && (
              <>
                {/* Call Back Button */}
                <button
                  onClick={handleCallBack}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Gọi lại
                </button>

                {/* Close Button */}
                <button
                  onClick={closeCallWindow}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallWindow;
