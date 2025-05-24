"use client"

interface CallMessageProps {
  callDuration: string
  callTime: string
  onCallBack: () => void
  isOutgoing?: boolean
}

export const CallMessage = ({ callDuration, callTime, onCallBack, isOutgoing = true }: CallMessageProps) => {
  return (
    <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
      <div className="flex items-center mb-2">
        <svg className="h-4 w-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L8.5 10.5a11 11 0 004.5 4.5l1.113-1.724a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        <span className="font-medium text-gray-800">Cuộc gọi thoại</span>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <div>
          {callDuration}, {callTime}
        </div>
      </div>

      <button
        onClick={onCallBack}
        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 py-1.5 px-3 rounded-md text-sm flex items-center justify-center transition-colors"
      >
        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Gọi lại
      </button>
    </div>
  )
}
