"use client"

import { useState } from "react"

interface CallRatingModalProps {
  isVisible: boolean
  onClose: () => void
  onCallBack: () => void
  onSubmitRating: (rating: number) => void
}

export const CallRatingModal = ({ isVisible, onClose, onCallBack, onSubmitRating }: CallRatingModalProps) => {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)

  if (!isVisible) return null

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  const handleSubmit = () => {
    onSubmitRating(rating)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-black text-white rounded-lg p-8 text-center max-w-sm w-full mx-4">
        <h2 className="text-lg font-medium mb-8">Bạn thấy chất lượng cuộc gọi như thế nào?</h2>

        {/* Star rating */}
        <div className="flex justify-center space-x-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1"
            >
              <svg
                className={`h-8 w-8 ${
                  star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          <button
            onClick={handleSubmit}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
          >
            Lúc khác
          </button>

          <div className="flex space-x-4">
            <button
              onClick={onCallBack}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L8.5 10.5a11 11 0 004.5 4.5l1.113-1.724a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Gọi lại
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
