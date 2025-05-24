import type { RefObject } from "react";
import type { Message } from "../types";

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
}

const ChatWindow = ({
  messages,
  currentUserId,
  loading,
  messagesEndRef,
}: ChatWindowProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatCallDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getReadStatus = (message: Message) => {
    if (message.sender !== currentUserId) {
      return null;
    }

    return message.read ? (
      <span className="text-green-500">✓✓</span>
    ) : (
      <span className="text-gray-400">✓</span>
    );
  };

  const renderVoiceCallMessage = (message: Message) => {
    const callData = message.callData;

    if (!callData) return null;

    const getCallStatusText = () => {
      switch (callData.status) {
        case 'completed':
          return `Cuộc gọi thoại • ${formatCallDuration(callData.duration)}`;
        case 'missed':
          return 'Cuộc gọi nhỡ';
        case 'declined':
          return 'Cuộc gọi bị từ chối';
        default:
          return 'Cuộc gọi thoại';
      }
    };

    const getCallIcon = () => {
      if (callData.status === 'missed') {
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        );
      } else if (callData.status === 'declined') {
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114A4.369 4.369 0 005 11c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        );
      } else {
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        );
      }
    };

    return (
      <div className="flex items-center space-x-2">
        {getCallIcon()}
        <div className="flex-1">
          <div className="font-medium text-sm">{getCallStatusText()}</div>
          {callData.status === 'completed' && (
            <div className="text-xs opacity-75">
              {formatCallTime(callData.startTime)} - {formatCallTime(callData.endTime)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTextMessage = (message: Message) => {
    return <div>{message.content}</div>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isSentByMe = message.sender === currentUserId;
              const isVoiceCall = message.messageType === 'voice_call';
              const messageKey = `${message._id}-${message.content.substring(
                0,
                10
              )}-${message.createdAt}`;

              return (
                <div
                  key={messageKey}
                  className={`mb-4 flex ${
                    isSentByMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                      isVoiceCall
                        ? isSentByMe
                          ? "bg-blue-100 text-blue-800 border border-blue-200 rounded-br-none"
                          : "bg-green-100 text-green-800 border border-green-200 rounded-bl-none"
                        : isSentByMe
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    {isVoiceCall ? renderVoiceCallMessage(message) : renderTextMessage(message)}

                    <div
                      className={`text-xs mt-1 flex justify-between ${
                        isVoiceCall
                          ? "text-gray-600"
                          : isSentByMe
                          ? "text-indigo-200"
                          : "text-gray-500"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {!isVoiceCall && getReadStatus(message)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default ChatWindow;
