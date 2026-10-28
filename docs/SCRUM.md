# BrewLite – Tài liệu Scrum

## 1. Product Vision & phạm vi MVP

**Vision:** BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.

**MVP:** từ lúc khách *chọn sản phẩm* đến lúc *thanh toán xong và nhận mã đơn*.
**Ngoài MVP (phần mở rộng đã làm):** màn hình *Quầy pha chế* cho barista, dùng để đi tiếp các trạng thái PAID → PREPARING → READY → COMPLETED.

### Stakeholders

| Bên liên quan | Mối quan tâm |
|---|---|
| Khách hàng | Đặt nhanh, chọn size/topping, trả không tiền mặt, theo dõi trạng thái đơn |
| Barista / nhân viên quầy | Nhận đơn đã thanh toán, cập nhật trạng thái pha chế (mở rộng) |
| Quản lý cửa hàng (Product Owner) | Ưu tiên backlog, nghiệm thu Increment |
| Giảng viên | Đánh giá quy trình, sản phẩm, tiêu chí chấp nhận |
| Nhóm phát triển | Phân tích, thiết kế, lập trình, kiểm thử, bàn giao |
| Đơn vị thanh toán | Được mô phỏng bằng Mock Payment Gateway |

### Vai trò Scrum (điền tên thành viên)

| Vai trò | Thành viên |
|---|---|
| Product Owner | … |
| Scrum Master | … |
| Development Team | … |

## 2. Yêu cầu

**Chức năng:**

- FR1: Menu có hình, tên, giá.
- FR2: Xem chi tiết, chọn size và topping.
- FR3: Giỏ hàng thêm/sửa/xóa, tự tính tổng.
- FR4: Đăng ký/đăng nhập bằng JWT.
- FR5: Tạo đơn và thanh toán không tiền mặt.
- FR6: Xác nhận đơn (mã đơn, trạng thái) và lịch sử đơn.

**Phi chức năng:**

- NFR1: API phản hồi dưới 500ms với dữ liệu mẫu (đo qua header `X-Response-Time`).
- NFR2: Mật khẩu băm bằng bcrypt, xác thực bằng JWT, validate mọi đầu vào.
- NFR3: Chạy tốt trên các trình duyệt phổ biến, responsive.

## 3. Product Backlog

Sắp xếp từ dễ đến khó. Mỗi task đạt DoD được 1 điểm.

| # | User Story | Sprint | SP | Trạng thái |
|---|---|---|---|---|
| 1 | Khởi tạo dự án và cấu trúc | 1 | 2 | ✅ Done |
| 2 | API danh sách sản phẩm | 1 | 2 | ✅ Done |
| 3 | Trang Menu (Frontend) | 1 | 3 | ✅ Done |
| 4 | Chi tiết và tùy chọn sản phẩm | 1 | 3 | ✅ Done |
| 5 | Giỏ hàng | 2 | 5 | ✅ Done |
| 6 | API tạo đơn hàng | 2 | 5 | ✅ Done |
| 7 | Đăng ký / Đăng nhập (JWT) | 2 | 5 | ✅ Done |
| 8 | Thanh toán không tiền mặt | 3 | 5 | ✅ Done |
| 9 | Xác nhận, lịch sử đơn & bàn giao | 3 | 5 | ✅ Done |
| 10 | Nghiệp vụ backend | 3 | 8 | ✅ Done |

SP = story points (ước lượng Planning Poker, thang Fibonacci).

## 4. User Stories & tiêu chí chấp nhận

### US-01 – Khởi tạo dự án
*Là* thành viên nhóm, *tôi muốn* có sẵn cấu trúc dự án chuẩn *để* mọi người cùng phát triển song song.
- [x] Monorepo có `frontend/` (Next.js) và `backend/` (NestJS).
- [x] `GET /` của backend trả “Hello”, frontend chạy được.
- [x] Có README, `.gitignore` và `.env.example` cho từng phần.

### US-02 – API danh sách sản phẩm
*Là* khách hàng, *tôi muốn* hệ thống cung cấp danh sách đồ uống *để* xem menu.
- [x] `GET /products` trả JSON gồm id, tên, giá, ảnh (kèm category, stock) từ PostgreSQL.
- [x] `GET /products/:id` trả chi tiết; id không tồn tại trả 404.

### US-03 – Trang Menu
*Là* khách hàng, *tôi muốn* xem menu dạng lưới có hình *để* chọn món nhanh.
- [x] Gọi `/products` và render lưới sản phẩm, có lọc theo danh mục.
- [x] Có skeleton khi đang tải, thông báo khi danh mục rỗng, nút thử lại khi lỗi mạng.
- [x] Hiện nhãn “Chỉ còn N ly” hoặc “Hết hàng”.

### US-04 – Chi tiết & tùy chọn sản phẩm
*Là* khách hàng, *tôi muốn* chọn size và topping *để* có ly đúng khẩu vị.
- [x] Chọn size S/M/L (cộng thêm 0 / 5.000 / 10.000đ) và nhiều topping.
- [x] Giá cập nhật ngay theo tùy chọn và số lượng.

### US-05 – Giỏ hàng
*Là* khách hàng, *tôi muốn* quản lý giỏ hàng *để* đặt nhiều món một lần.
- [x] Thêm/sửa số lượng/xóa món; cùng món, cùng size, cùng topping thì gộp thành một dòng.
- [x] Lưu state bằng Zustand (persist localStorage); tự tính tổng tiền.
- [x] Badge số lượng trên header.

### US-06 – API tạo đơn
*Là* khách hàng, *tôi muốn* gửi giỏ hàng thành đơn *để* chuẩn bị thanh toán.
- [x] `POST /orders` validate bằng class-validator (size hợp lệ, số lượng 1–20, giỏ không rỗng).
- [x] Server tự tính giá; lưu đơn trạng thái `PENDING`, trả mã đơn (#1001…).

### US-07 – Đăng ký / Đăng nhập
*Là* khách hàng, *tôi muốn* có tài khoản *để* đặt đơn và tích điểm.
- [x] `POST /auth/register` và `POST /auth/login`; mật khẩu băm bằng bcrypt; trả JWT.
- [x] Guard bảo vệ route đặt đơn và thanh toán; frontend chuyển sang trang đăng nhập rồi quay lại trang đang mở.

### US-08 – Thanh toán không tiền mặt
*Là* khách hàng, *tôi muốn* thanh toán đơn bằng ví điện tử hoặc thẻ *để* không cần mang tiền mặt.
- [x] Khi giỏ có ít nhất 1 sản phẩm, nút “Thanh toán” hiển thị tổng tiền.
- [x] Chọn Ví hoặc Thẻ rồi xác nhận: thành công thì đơn chuyển `PAID`.
- [x] Thanh toán lỗi thì đơn chuyển `PAYMENT_FAILED` và giỏ hàng giữ nguyên, có thể thử lại.
- [x] Thành công thì hiển thị mã đơn và màn hình xác nhận.

### US-09 – Xác nhận, lịch sử & bàn giao
*Là* khách hàng, *tôi muốn* xem lại đơn *để* biết khi nào tới quầy lấy nước.
- [x] Màn hình xác nhận có mã đơn, trạng thái và tiến trình; tự cập nhật mỗi 5 giây.
- [x] `GET /orders/me` và trang lịch sử đơn.
- [x] `docker compose up` chạy cả frontend, backend và DB; có README.

### US-10 – Nghiệp vụ backend
*Là* chủ cửa hàng, *tôi muốn* hệ thống xử lý đơn và tiền chính xác *để* không mất tiền, không bán quá số hàng.
- [x] State machine chặn mọi chuyển tiếp không hợp lệ (409).
- [x] Gửi 2 lần cùng Idempotency-Key chỉ tạo 1 đơn và 1 giao dịch.
- [x] Đặt đồng thời không vượt tồn kho (transaction + optimistic locking).
- [x] Áp mã giảm giá hợp lệ; cộng điểm sau khi đơn chuyển `PAID`.
- [x] Có unit test và integration test chứng minh các ý (a), (b), (c).

## 5. Kế hoạch Sprint

| Sprint | Sprint Goal | Task | SP |
|---|---|---|---|
| Sprint 1 | Nền tảng & hiển thị menu | 1, 2, 3, 4 | 10 |
| Sprint 2 | Giỏ hàng, đặt đơn & đăng nhập | 5, 6, 7 | 15 |
| Sprint 3 | Thanh toán, bàn giao & nghiệp vụ nâng cao | 8, 9, 10 | 18 |

**Sự kiện mỗi Sprint (1–2 tuần):** Sprint Planning (chọn task, chia sub-task) → Daily Scrum 15 phút (hôm qua làm gì / hôm nay làm gì / vướng gì; cập nhật burndown) → Sprint Review (demo Increment cho PO) → Sprint Retrospective.

### Mẫu Burndown (cập nhật cuối mỗi ngày)

| Ngày | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Lý tưởng | 18 | 16.2 | 14.4 | 12.6 | 10.8 | 9 | 7.2 | 5.4 | 3.6 | 1.8 | 0 |
| Thực tế | 18 | | | | | | | | | | |

## 6. Definition of Done

Một task chỉ được tính là Done khi:

- [ ] Code chạy được, build không lỗi (`npm run build` cho cả frontend và backend) và đáp ứng tiêu chí chấp nhận.
- [ ] Có commit Git với mô tả rõ ràng và đã được một thành viên khác review.
- [ ] API validate đầu vào; UI xử lý trạng thái loading, lỗi và rỗng.
- [ ] Test liên quan đều pass (`npm test`, `npm run test:int`).
- [ ] Hướng dẫn chạy trong README được cập nhật.

## 7. Kịch bản demo bàn giao (Sprint Review cuối)

1. `docker compose up --build` rồi mở http://localhost:3000.
2. Xem menu, mở **Cappuccino**, chọn size L + Kem cheese, số lượng 2, thêm vào giỏ.
3. Thêm **Trà đào**; trong giỏ áp mã **CHAOBAN** để thấy phần giảm giá.
4. Bấm *Thanh toán*: được chuyển sang trang đăng nhập (`demo@brewlite.vn` / `123456`), đăng nhập xong quay lại trang thanh toán.
5. Bật *Chế độ demo: mô phỏng thanh toán lỗi* rồi *Xác nhận trả*: đơn chuyển `PAYMENT_FAILED` và giỏ vẫn còn nguyên.
6. Tắt chế độ lỗi, chọn Thẻ `4242…`, trả tiền: màn hình xác nhận hiện mã đơn, con dấu “Đã thanh toán” và số điểm được cộng.
7. Mở tab ẩn danh, đăng nhập `barista@brewlite.vn`, vào *Quầy pha chế* và chuyển đơn qua *Nhận pha*, *Pha xong*, *Đã giao khách*. Trang của khách tự cập nhật theo.
8. Chạy `npm run test:int` để trình bày 3 tiêu chí (a), (b), (c).
9. Retrospective: điều làm tốt / cần cải thiện; ghi nhận backlog cho phiên bản sau.

## 8. Backlog cho phiên bản sau (gợi ý)

- Đổi điểm thưởng lấy giảm giá; hạng thành viên.
- Tự động hủy đơn `PENDING` hoặc `PAYMENT_FAILED` sau N phút để trả lại tồn kho.
- Đối soát các giao dịch `PROCESSING` bị treo (cổng thanh toán không phản hồi).
- Thông báo realtime (WebSocket) khi đơn chuyển `READY`.
- Trang quản trị menu, tồn kho, mã giảm giá.
