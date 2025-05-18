// export const logger = {
//     info: (message: string, data?: any) => {
//       console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
//     },
    
//     error: (message: string, error?: any, data?: any) => {
//       console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
//       if (error) {
//         console.error('Error details:', {
//           message: error instanceof Error ? error.message : error,
//           stack: error instanceof Error ? error.stack : undefined,
//           ...data
//         });
//       }
//     },
    
//     warn: (message: string, data?: any) => {
//       console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
//     },
    
//     debug: (message: string, data?: any) => {
//       console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
//     }
//   };

// src/utils/logger.ts (Ví dụ)
export const logger = {
  info: (message: string, data?: any) => {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any, data?: any) => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
      if (error) {
          // Log thông tin chi tiết về lỗi
          console.error('Error details:', {
              message: error instanceof Error ? error.message : error,
              stack: error instanceof Error && error.stack ? error.stack : 'No stack trace available', // Kiểm tra stack trace
              ...data // Thêm dữ liệu ngữ cảnh nếu có
          });
      } else if (data) {
           // Log dữ liệu ngữ cảnh nếu không có đối tượng lỗi
           console.error('Context data:', data);
      }
  },
  warn: (message: string, data?: any) => {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};