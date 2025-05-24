"use client"

interface ActiveCallInterfaceProps {
  isVisible: boolean
  contactName: string
  contactAvatar?: string
  callDuration: string
  isMuted: boolean
  onToggleMute: () => void
  onEndCall: () => void
  callStatus?: string
}

export const ActiveCallInterface = ({
  isVisible,
  contactName,
  contactAvatar,
  callDuration,
  isMuted,
  onToggleMute,
  onEndCall,
  callStatus = "Đang gọi...",
}: ActiveCallInterfaceProps) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-50 text-white">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="text-sm text-gray-300">{contactName}</div>
        <div className="flex space-x-2">
          <button className="text-gray-300 hover:text-white p-2 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-16 left-4 right-4 text-center">
        <p className="text-sm text-gray-400 flex items-center justify-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Được mã hóa đầu cuối
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-6">
          {contactAvatar ? (
            <img
              src={contactAvatar || "/placeholder.svg"}
              alt={contactName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
        </div>

        {/* Contact name and status */}
        <h2 className="text-2xl font-semibold mb-2">{contactName}</h2>
        <p className="text-gray-400 mb-8">{callStatus}</p>
      </div>

      {/* Control buttons */}
      <div className="absolute bottom-8 left-4 right-4">
        <div className="flex justify-center space-x-8">
          {/* Screen share button */}
          <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 p-0 flex items-center justify-center transition-colors">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
            </svg>
          </button>

          {/* Add participants button */}
          <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 p-0 flex items-center justify-center transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </button>

          {/* Camera toggle button */}
          <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 p-0 flex items-center justify-center transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full p-0 flex items-center justify-center transition-colors ${
              isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isMuted ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>

          {/* End call button */}
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 p-0 flex items-center justify-center transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.5 1.5M4.5 4.5l1.5 1.5M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
