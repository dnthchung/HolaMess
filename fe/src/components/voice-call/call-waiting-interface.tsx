"use client"

interface CallWaitingInterfaceProps {
  isVisible: boolean
  contactName: string
  contactAvatar?: string
  onEndCall: () => void
}

export const CallWaitingInterface = ({
  isVisible,
  contactName,
  contactAvatar,
  onEndCall,
}: CallWaitingInterfaceProps) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="text-sm text-gray-300">{contactName}</div>
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
        <p className="text-gray-400 mb-8">Đang gọi...</p>
      </div>

      {/* End call button */}
      <div className="absolute bottom-8 left-4 right-4">
        <div className="flex justify-center">
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
