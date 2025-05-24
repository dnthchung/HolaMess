# 🎤 Voice Call Feature - HolaMess

## Tổng quan

Tính năng **Voice Call** đã được triển khai thành công cho ứng dụng HolaMess, cho phép người dùng thực hiện cuộc gọi thoại real-time sử dụng công nghệ WebRTC. Tính năng này được xây dựng theo chuẩn enterprise với clean code và architecture hoàn chỉnh.

## ✨ Tính năng chính

### 🔥 Core Features
- **Cuộc gọi thoại real-time**: Sử dụng WebRTC với chất lượng âm thanh cao
- **Multi-device support**: Đồng bộ cuộc gọi trên nhiều thiết bị
- **Call history**: Lưu trữ và hiển thị lịch sử cuộc gọi trong chat
- **Audio controls**: Điều khiển âm thanh chi tiết (mute, volume, device switching)
- **Call status tracking**: Theo dõi trạng thái cuộc gọi (calling, ringing, connected, ended)

### 🎛️ Audio Controls
- **Mute/Unmute**: Tắt/bật microphone trong cuộc gọi
- **Volume control**: Điều chỉnh âm lượng đầu ra (0-100%)
- **Input device switching**: Chuyển đổi microphone
- **Output device switching**: Chuyển đổi loa/tai nghe
- **Audio quality optimization**: Tự động noise suppression, echo cancellation

### 📱 UI/UX Features
- **Call window**: Giao diện cuộc gọi đẹp và hiện đại
- **Settings panel**: Panel cài đặt âm thanh chi tiết
- **Call duration timer**: Hiển thị thời gian cuộc gọi real-time
- **Call back option**: Tùy chọn gọi lại sau khi kết thúc
- **Responsive design**: Tương thích mobile và desktop

## 🏗️ Architecture

### Frontend Structure
```
fe/src/
├── contexts/
│   └── VoiceCallContext.tsx     # Voice call state management
├── services/
│   └── webrtcService.ts         # WebRTC service implementation
├── components/
│   ├── VoiceCallWindow.tsx      # Main call UI component
│   ├── ChatWindow.tsx           # Updated with call message display
│   └── UserList.tsx             # Updated with call buttons
└── types/
    └── index.ts                 # Voice call type definitions
```

### Backend Structure
```
be/src/
├── models/
│   ├── Call.ts                  # Call history model
│   └── Message.ts               # Updated for call messages
└── socket/
    └── handlers.ts              # Voice call socket handlers
```

## 🚀 Cách sử dụng

### 1. Bắt đầu cuộc gọi
- Trong danh sách người dùng, click vào icon phone (📞) bên cạnh user online
- Hoặc sử dụng shortcut trong chat conversation

### 2. Nhận cuộc gọi
- Khi có cuộc gọi đến, window sẽ tự động mở
- Click **"Chấp nhận"** (màu xanh) để trả lời
- Click **"Từ chối"** (màu đỏ) để từ chối

### 3. Trong cuộc gọi
- **Mute/Unmute**: Click icon microphone
- **End call**: Click nút màu đỏ
- **Settings**: Click "Cài đặt âm thanh" để mở panel

### 4. Cài đặt âm thanh
- **Volume slider**: Điều chỉnh âm lượng đầu ra
- **Microphone dropdown**: Chọn thiết bị input
- **Speaker dropdown**: Chọn thiết bị output

### 5. Sau cuộc gọi
- Hiển thị options "Gọi lại" hoặc "Đóng"
- Call history tự động xuất hiện trong chat với format: "Cuộc gọi thoại • MM:SS"

## 📋 Call Message Format

Trong chat window, voice call messages được hiển thị với định dạng đặc biệt:

### Cuộc gọi thành công
```
🟢 Cuộc gọi thoại • 02:30
   16:05 - 16:07
```

### Cuộc gọi nhỡ
```
🔴 Cuộc gọi nhỡ
   16:05
```

### Cuộc gọi bị từ chối
```
🔴 Cuộc gọi bị từ chối
   16:05
```

## 🛠️ Technical Implementation

### WebRTC Configuration
- **STUN servers**: Google STUN servers cho NAT traversal
- **Audio constraints**: Echo cancellation, noise suppression, auto gain control
- **ICE candidates**: Automatic handling và forwarding
- **Connection monitoring**: Real-time connection state tracking

### Socket Events

#### Client to Server
- `call_offer`: Khởi tạo cuộc gọi
- `call_answer`: Trả lời cuộc gọi
- `call_ice_candidate`: Gửi ICE candidates
- `call_end`: Kết thúc cuộc gọi
- `call_decline`: Từ chối cuộc gọi

#### Server to Client
- `incoming_call`: Thông báo cuộc gọi đến
- `call_answered`: Cuộc gọi được trả lời
- `call_declined`: Cuộc gọi bị từ chối
- `call_ended`: Cuộc gọi kết thúc
- `call_ice_candidate`: Nhận ICE candidates

### Database Schema

#### Call Model
```typescript
{
  _id: string,           // Unique call ID
  caller: string,        // Caller user ID
  callee: string,        // Callee user ID
  status: enum,          // calling, ringing, connected, ended, declined, missed, failed
  startTime: Date,       // Call start time
  endTime?: Date,        // Call end time
  duration?: number,     // Duration in seconds
  createdAt: Date,       // Record creation time
  updatedAt: Date        // Record update time
}
```

#### Message Model (Updated)
```typescript
{
  // ... existing fields
  messageType: 'text' | 'voice_call',
  callData?: {
    duration: number,
    startTime: string,
    endTime: string,
    status: 'completed' | 'missed' | 'declined'
  }
}
```

## 🔐 Security Features

- **Token validation**: Mọi socket operations đều được authenticate
- **User verification**: Verify caller/callee identity
- **Permission checks**: Chỉ participants mới có thể control cuộc gọi
- **Session management**: Automatic cleanup khi token expire

## 🎯 Performance Optimizations

- **Lazy loading**: Audio devices chỉ load khi cần
- **Memory management**: Proper cleanup của streams và connections
- **Debounced operations**: Tránh spam socket events
- **Efficient rendering**: Optimized React components với useCallback và useMemo

## 🔄 Future Enhancements

### Phase 2 (Video Chat)
- Video call functionality
- Screen sharing
- Camera controls
- Video quality settings

### Phase 3 (Advanced Features)
- Group voice calls
- Call recording
- Voice messages
- Push notifications

## 🐛 Troubleshooting

### Common Issues

#### 1. Microphone không hoạt động
- Check browser permissions
- Verify microphone device trong settings
- Refresh page và cho phép lại permissions

#### 2. Không nghe được âm thanh
- Check volume settings
- Verify output device
- Check browser audio settings

#### 3. Cuộc gọi không kết nối
- Check internet connection
- Verify STUN server accessibility
- Check firewall settings

#### 4. Echo hoặc feedback
- Sử dụng headphones
- Giảm volume
- Check echo cancellation settings

### Debug Mode
Mở browser console để xem detailed logs về WebRTC connection status.

## 📱 Browser Compatibility

- ✅ Chrome 70+
- ✅ Firefox 65+
- ✅ Safari 12+
- ✅ Edge 79+
- ⚠️ Mobile browsers (partial support)

## 🔧 Development Setup

1. Install dependencies đã có trong package.json
2. Start backend: `yarn dev` trong folder `be`
3. Start frontend: `yarn dev` trong folder `fe`
4. Mở 2 browser tabs với users khác nhau để test

## 📝 Code Examples

### Initiating a Call
```typescript
const { initiateCall } = useVoiceCall();

const handleCallUser = async (userId: string) => {
  try {
    await initiateCall(userId);
  } catch (error) {
    console.error('Failed to initiate call:', error);
  }
};
```

### Managing Audio Settings
```typescript
const { toggleMute, setVolume, switchInputDevice } = useVoiceCall();

// Mute/unmute
const handleMute = () => {
  toggleMute();
};

// Change volume
const handleVolumeChange = (volume: number) => {
  setVolume(volume);
};

// Switch microphone
const handleDeviceChange = async (deviceId: string) => {
  await switchInputDevice(deviceId);
};
```

---

## 🎉 Kết luận

Tính năng Voice Call đã được triển khai hoàn chỉnh với:
- ✅ Clean, enterprise-grade code
- ✅ Comprehensive error handling
- ✅ Modern UI/UX design
- ✅ Real-time audio communication
- ✅ Multi-device support
- ✅ Call history tracking
- ✅ Advanced audio controls

Hệ thống sẵn sàng cho production và có thể mở rộng cho video chat và screen sharing trong tương lai.

**Happy Calling! 📞**
