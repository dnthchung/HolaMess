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
                      isSentByMe
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    <div>{message.content}</div>
                    <div
                      className={`text-xs mt-1 flex justify-between ${
                        isSentByMe ? "text-indigo-200" : "text-gray-500"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {getReadStatus(message)}
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
