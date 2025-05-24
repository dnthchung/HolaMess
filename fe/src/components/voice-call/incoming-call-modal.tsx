"use client"

interface IncomingCallModalProps {
  callerName: string
  callerAvatar?: string
  onAccept: () => void
  onReject: () => void
  isVisible: boolean
}

export const IncomingCallModal = ({
  callerName,
  callerAvatar,
  onAccept,
  onReject,
  isVisible,
}: IncomingCallModalProps) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 text-center text-white max-w-sm w-full mx-4">
        <h2 className="text-xl font-semibold mb-2">Cuộc gọi điện</h2>

        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-4">
            {callerAvatar ? (
              <img
                src={callerAvatar || "/placeholder.svg"}
                alt={callerName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-medium mb-1">{callerName} đang</h3>
          <h3 className="text-lg font-medium mb-1">gọi cho bạn</h3>
          <p className="text-sm text-gray-400 flex items-center justify-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Được mã hóa đầu cuối
          </p>
        </div>

        <div className="flex justify-center space-x-8">
          <button
            onClick={onReject}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 p-0 flex items-center justify-center transition-colors"
          >
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.5 1.5M4.5 4.5l1.5 1.5M6 6l12 12"
              />
            </svg>
          </button>
          <button
            onClick={onAccept}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 p-0 flex items-center justify-center transition-colors"
          >
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L8.5 10.5a11 11 0 004.5 4.5l1.113-1.724a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>
        </div>

        <div className="flex justify-center space-x-8 mt-2">
          <span className="text-sm text-gray-400">Từ chối</span>
          <span className="text-sm text-gray-400">Chấp nhận</span>
        </div>
      </div>
    </div>
  )
}
