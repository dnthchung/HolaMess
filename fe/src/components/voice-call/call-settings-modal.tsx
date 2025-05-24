"use client"

interface CallSettingsModalProps {
  isVisible: boolean
  onClose: () => void
  onStartCall: () => void
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudioInput: string
  selectedAudioOutput: string
  selectedVideo: string
  onAudioInputChange: (deviceId: string) => void
  onAudioOutputChange: (deviceId: string) => void
  onVideoChange: (deviceId: string) => void
}

export const CallSettingsModal = ({
  isVisible,
  onClose,
  onStartCall,
  audioInputDevices,
  audioOutputDevices,
  videoDevices,
  selectedAudioInput,
  selectedAudioOutput,
  selectedVideo,
  onAudioInputChange,
  onAudioOutputChange,
  onVideoChange,
}: CallSettingsModalProps) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 text-white max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Cài đặt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Camera Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Camera</label>
            <select
              value={selectedVideo}
              onChange={(e) => onVideoChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="mt-3 bg-black rounded-lg h-32 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Microphone Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Micrô</label>
            <select
              value={selectedAudioInput}
              onChange={(e) => onAudioInputChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {audioInputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center">
              <div className="flex-1 bg-gray-600 rounded-full h-2 mr-3">
                <div className="bg-blue-500 h-2 rounded-full w-1/3"></div>
              </div>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
          </div>

          {/* Speaker Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Đầu ra âm thanh</label>
            <select
              value={selectedAudioOutput}
              onChange={(e) => onAudioOutputChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {audioOutputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center">
              <button className="bg-gray-600 text-white hover:bg-gray-500 mr-3 px-3 py-1 rounded-md text-sm flex items-center transition-colors">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
                12s
              </button>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 border border-gray-500 text-white hover:bg-gray-500 py-2 px-4 rounded-md transition-colors"
          >
            Nhận trợ giúp
          </button>
          <button
            onClick={onStartCall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  )
}
