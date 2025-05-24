"use client";

import { useMemo } from "react";
import { useVoiceCall } from "../contexts/VoiceCallContext";
import type { User, RecentConversation } from "../types";

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  recentConversations: RecentConversation[];
  onlineUsers?: Set<string>;
}

const UserList = ({
  users,
  selectedUser,
  onSelectUser,
  recentConversations,
  onlineUsers = new Set(),
}: UserListProps) => {
  const { initiateCall, callUIState } = useVoiceCall();

  const enhancedUsers = useMemo(() => {
    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(user.id, user));

    const result = recentConversations.map((conv) => {
      const user = userMap.get(conv._id) || {
        id: conv._id,
        name: conv.userInfo?.name || "Unknown",
        phone: conv.userInfo?.phone || "",
      };

      return {
        ...user,
        lastMessage: conv.lastMessage?.content || "",
        unreadCount: conv.unreadCount || 0,
        updatedAt: conv.lastMessage?.createdAt || "",
        isRecent: true,
      };
    });

    const recentUserIds = recentConversations.map((conv) => conv._id);
    users.forEach((user) => {
      if (!recentUserIds.includes(user.id) && user.id) {
        result.push({
          ...user,
          lastMessage: "",
          unreadCount: 0,
          updatedAt: "",
          isRecent: false,
        });
      }
    });

    return result.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [users, recentConversations]);

  const formatTime = (dateString: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Within the last minute
    if (diff < 60 * 1000) {
      return "just now";
    }

    // Within the last hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m ago`;
    }

    // Within the last day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }

    // Otherwise show the date
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleUserClick = (user: any) => {
    if (user && user.id) {
      // console.log("Selected user:", user)
      onSelectUser(user);
    } else {
      console.error("Attempted to select user with invalid ID:", user);
    }
  };

  const handleCallUser = async (event: React.MouseEvent, user: any) => {
    event.stopPropagation(); // Prevent selecting the user

    if (!user.id || callUIState.callStatus !== 'idle') {
      return;
    }

    try {
      await initiateCall(user.id);
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  return (
    <div className="overflow-y-auto h-[calc(100vh-64px)]">
      {enhancedUsers.map((user) => {
        const isOnline = onlineUsers.has(user.id);
        const canCall = isOnline && callUIState.callStatus === 'idle';

        return (
          <div
            key={user.id || `temp-${user.name}`}
            className={`p-3 border-b border-gray-100 flex items-center cursor-pointer hover:bg-gray-50 ${
              selectedUser?.id === user.id ? "bg-indigo-50" : ""
            }`}
            onClick={() => handleUserClick(user)}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold mr-3">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div
                className={`absolute bottom-0 right-2 w-3 h-3 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </h3>
                <span className="text-xs text-gray-500">
                  {isOnline
                    ? "online"
                    : user.updatedAt
                    ? formatTime(user.updatedAt)
                    : "offline"}
                </span>
              </div>
              {user.lastMessage && (
                <p className="text-xs text-gray-500 truncate">
                  {user.lastMessage}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-2">
              {/* Call Button */}
              {canCall && (
                <button
                  onClick={(e) => handleCallUser(e, user)}
                  className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                  title="Gọi thoại"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </button>
              )}

              {/* Unread Count Badge */}
              {user.unreadCount > 0 && (
                <div className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {user.unreadCount}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserList;
