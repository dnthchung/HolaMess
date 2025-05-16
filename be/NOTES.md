Okay, dựa trên file `tsconfig.json` bạn cung cấp và lỗi bạn gặp phải trước đó (đặc biệt là lỗi `esModuleInterop`), bạn cần sửa như sau:

Thêm **`"esModuleInterop": true`** vào trong `compilerOptions`.

Đây là file `tsconfig.json` sau khi sửa:

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "CommonJS",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true, // <--- THÊM DÒNG NÀY
    "skipLibCheck": true    // <--- Thêm dòng này cũng là một ý hay (xem giải thích bên dưới)
  }
  // Bạn có thể cần thêm "include" hoặc "exclude" nếu chưa có
  // Ví dụ:
  // "include": ["src/**/*"],
  // "exclude": ["node_modules", "**/*.spec.ts"]
}
```

**Giải thích các thay đổi và gợi ý:**

1.  **`"esModuleInterop": true` (Quan trọng nhất):**

      * Như đã giải thích ở trên, tùy chọn này cho phép TypeScript xử lý tốt hơn việc import các module CommonJS (như Express, vốn sử dụng `export =`) bằng cú pháp ES Module (như `import express from 'express';`). Đây là thay đổi chính để sửa lỗi `ts(1259)`.

2.  **`"skipLibCheck": true` (Khuyến nghị):**

      * Tùy chọn này yêu cầu TypeScript bỏ qua việc kiểm tra kiểu cho tất cả các file khai báo (file `.d.ts`, thường nằm trong `node_modules`).
      * Điều này có thể giúp tăng tốc độ biên dịch và tránh các lỗi không liên quan đến code của bạn mà đến từ các thư viện bên thứ ba (đôi khi các thư viện có file `.d.ts` không hoàn toàn tương thích với cấu hình `strict` của bạn).
      * Nó không ảnh hưởng đến việc kiểm tra kiểu cho code của chính bạn.

**Sau khi sửa file `tsconfig.json`:**

  * **Lưu file.**
  * **Khởi động lại TypeScript Server:** Trong VS Code, bạn có thể mở Command Palette (Ctrl+Shift+P hoặc Cmd+Shift+P trên Mac) và gõ "TypeScript: Restart TS server" rồi chọn lệnh đó. Hoặc đơn giản là đóng và mở lại VS Code.
  * **Kiểm tra lại code:** Lỗi `ts(1259)` liên quan đến `esModuleInterop` sẽ biến mất. Lỗi `'express' is declared but its value is never read.ts(6133)` cũng sẽ biến mất NẾU bạn thực sự đã sử dụng biến `express` sau khi import, ví dụ:
    ```typescript
    import express from 'express';

    const app = express(); // Sử dụng 'express'

    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
    ```

Nếu bạn vẫn còn lỗi `ts(6133)` sau khi đã thêm `esModuleInterop` và khởi động lại TS server, điều đó có nghĩa là bạn thực sự chưa sử dụng biến `express` ở đâu cả trong file đó.