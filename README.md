# ☕ BrewLite – Đặt cà phê không tiền mặt

> “BrewLite giúp khách hàng đặt và thanh toán đồ uống **không dùng tiền mặt** chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.”

Bài tập lớn môn **Công nghệ Phần mềm** – HK I, 2026–2027. Phát triển theo **Agile Scrum** (3 Sprint, 10 task).
Tài liệu Scrum (backlog, user story, sprint, DoD): [`docs/SCRUM.md`](docs/SCRUM.md).

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (App Router, React 19, TypeScript), TailwindCSS 4, React Query, Zustand, lucide-react |
| Backend | NestJS 11 (TypeScript), REST, class-validator, JWT (Passport), bcrypt |
| CSDL | PostgreSQL 16 + Prisma 6 |
| Thanh toán | Mock Payment Gateway (mô phỏng MoMo / VNPay / thẻ) |
| DevOps | Docker Compose, Git |

```
brewlite/
├── backend/            NestJS API  (src/, prisma/, test/)
├── frontend/           Next.js app (src/app, src/components, src/store)
├── docs/SCRUM.md       Product Backlog, User Stories, Sprint plan, DoD
└── docker-compose.yml  db + backend + frontend
```

---

## 1. Chạy nhanh bằng Docker (khuyến nghị)

Yêu cầu: Docker Desktop.

```bash
docker compose up --build
```

| Dịch vụ | Địa chỉ |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:4000 |
| PostgreSQL | `localhost:5433` (user/pass/db: `brewlite`) |

Backend tự chạy migration + seed dữ liệu mẫu khi khởi động.

**Tài khoản demo** (mật khẩu `123456`):

- Khách hàng: `demo@brewlite.vn`
- Barista (trang *Quầy pha chế*): `barista@brewlite.vn`

## 2. Chạy ở chế độ phát triển

Yêu cầu: Node.js ≥ 20, Docker (chỉ để chạy PostgreSQL).

```bash
# 1) CSDL
docker compose up -d db

# 2) Backend  →  http://localhost:4000
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev

# 3) Frontend →  http://localhost:3000   (terminal khác)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

> Cổng host của PostgreSQL là **5433** để không đụng PostgreSQL có sẵn trên máy. Có thể đổi trong `docker-compose.yml` và `backend/.env`.

## 3. Kiểm thử

```bash
cd backend
npm test           # unit test: state machine, tính giá, mã giảm giá
npm run test:int   # integration test với PostgreSQL thật (CSDL brewlite_test, tự tạo)
```

Integration test tự tạo CSDL `brewlite_test` (nếu chưa có), áp migration rồi tự xóa dữ liệu trước mỗi test. Dữ liệu dev không bị ảnh hưởng.

Tiêu chí chấm Task 10 ↔ file test:

| Tiêu chí | Test |
|---|---|
| (a) Chặn chuyển trạng thái sai | `src/orders/order-state-machine.spec.ts`, `test/order-state-machine.int-spec.ts` |
| (b) Gửi 2 lần cùng Idempotency-Key chỉ tạo 1 đơn / 1 giao dịch | `test/idempotency.int-spec.ts` (gửi tuần tự và gửi song song) |
| (c) Đặt đồng thời không vượt tồn kho | `test/inventory-concurrency.int-spec.ts` (12 khách cùng tranh 5 ly) |
| Luồng end-to-end, validate, phân quyền | `test/orders-flow.int-spec.ts` |
| Mã giảm giá không vượt số lượt khi đặt đồng thời; hủy đơn trả lại lượt | `test/coupon-limit.int-spec.ts` (8 khách tranh 3 lượt) |

## 4. API

| Endpoint | Auth | Chức năng |
|---|---|---|
| `GET /` · `GET /health` | – | Hello / kiểm tra kết nối DB |
| `GET /products` (`?category=`) | – | Danh sách sản phẩm (menu) |
| `GET /products/:id` | – | Chi tiết + các size + topping |
| `GET /toppings` | – | Danh sách topping |
| `POST /auth/register` | – | Đăng ký, trả JWT |
| `POST /auth/login` | – | Đăng nhập, trả JWT |
| `GET /auth/me` | JWT | Hồ sơ + điểm tích lũy |
| `GET /promotions` · `GET /promotions/validate?code=&subtotal=` | – | Mã giảm giá đang chạy / kiểm tra mã |
| `POST /orders` | JWT | Tạo đơn `PENDING` (header `Idempotency-Key` tùy chọn) |
| `GET /orders/me` | JWT | Lịch sử đơn của user |
| `GET /orders/:id` | JWT | Chi tiết đơn (chủ đơn hoặc STAFF) |
| `POST /orders/:id/cancel` | JWT | Hủy đơn, hoàn tồn kho |
| `POST /payments` | JWT | Thanh toán **idempotent** (header `Idempotency-Key` **bắt buộc**) |
| `GET /orders?status=PAID,PREPARING` | STAFF | Bảng điều phối barista |
| `PATCH /orders/:id/status` | STAFF | Chuyển `PREPARING` / `READY` / `COMPLETED` |

Ví dụ:

```bash
TOKEN=$(curl -s -X POST localhost:4000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@brewlite.vn","password":"123456"}' | jq -r .accessToken)

curl -X POST localhost:4000/orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7b0c1d2e-order-1' \
  -d '{"items":[{"productId":5,"size":"M","toppingIds":[2],"qty":1}],"couponCode":"CHAOBAN"}'

curl -X POST localhost:4000/payments -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7b0c1d2e-pay-1' -d '{"orderId":1001,"method":"WALLET"}'
```

**Cổng thanh toán giả lập:** thẻ kết thúc `0002` bị từ chối, `9995` không đủ số dư. Ví bị từ chối khi giao dịch vượt 2.000.000đ. Gửi `simulateFailure: true` luôn cho kết quả lỗi (trên giao diện là ô *Chế độ demo*).

**Mã giảm giá mẫu:** `CHAOBAN` (−10%, tối đa 20k), `GIAM20K` (−20k cho đơn từ 100k), `BREW50` (−50%, tối đa 30k, giới hạn 100 lượt), `HETHAN` (đã hết hạn, dùng để thử lỗi).

## 5. Nghiệp vụ backend (Task 10)

```
start → PENDING ──thanh toán OK──▶ PAID ──barista nhận──▶ PREPARING ──pha xong──▶ READY ──giao khách──▶ COMPLETED
          │  ▲                      │
   lỗi    ▼  │ thử lại              │ hủy
   PAYMENT_FAILED ──hủy──▶ CANCELLED ◀──hủy── PENDING
```

1. **Order State Machine** (`orders/order-state-machine.ts`). Bảng `ORDER_TRANSITIONS` liệt kê các chuyển tiếp hợp lệ, `assertTransition()` ném lỗi 409 cho mọi chuyển tiếp khác. Câu lệnh UPDATE có điều kiện `WHERE status = <from>` để hai request song song không cùng chuyển trạng thái được.
2. **Thanh toán idempotent** (`payments/payments.service.ts`). Request đầu tiên với một key ghi một bản ghi `Payment(PROCESSING)`; cột `idempotencyKey` là UNIQUE nên request trùng key bị chặn ngay ở CSDL. Dòng `Order` được khóa (`FOR UPDATE`) để hai key khác nhau không cùng trả tiền cho một đơn. Gửi lại cùng key sẽ nhận lại kết quả cũ (header `Idempotent-Replayed: true`) mà không gọi cổng thanh toán lần nữa. `POST /orders` cũng hỗ trợ `Idempotency-Key` để không tạo đơn hai lần.
3. **Tồn kho khi đặt đồng thời** (`inventory/inventory.service.ts`). Kho được trừ trong transaction bằng optimistic locking: `UPDATE product SET stock = stock - n, version = version + 1 WHERE id = ? AND version = ?`. Nếu không cập nhật được dòng nào (do xung đột), transaction rollback và chạy lại với backoff ngẫu nhiên. Khi không đủ hàng, API trả 409 `OutOfStock`. Hủy đơn sẽ hoàn lại tồn kho.
4. **Khuyến mãi & điểm thưởng** (`promotions/`). Mã giảm giá được kiểm tra hiệu lực, hạn dùng, số lượt và giá trị đơn tối thiểu. Lượt dùng mã được giữ ngay lúc tạo đơn, trong cùng transaction với phần trừ kho, bằng một câu `UPDATE ... WHERE "usedCount" < "usageLimit"` nguyên tử. Nhờ vậy nhiều khách đặt cùng lúc cũng không vượt số lượt. Hủy đơn (từ `PENDING`, `PAYMENT_FAILED` hoặc `PAID`) sẽ trả lại lượt dùng. Khi đơn chuyển sang `PAID`, khách được cộng 1 điểm cho mỗi 1.000đ thực trả. Hủy một đơn đã `PAID` sẽ thu hồi điểm đã cộng.

## 6. Yêu cầu phi chức năng

- **Hiệu năng:** mọi response có header `X-Response-Time`; các truy vấn với dữ liệu mẫu đều dưới 50ms.
- **Bảo mật:** mật khẩu được băm bằng bcrypt và không bao giờ trả về trong response. Route đặt đơn và thanh toán được bảo vệ bằng JWT guard; phân quyền STAFF dùng `RolesGuard`. `ValidationPipe` bật `whitelist` + `forbidNonWhitelisted`. Giá luôn được tính lại ở server, và khách chỉ xem được đơn của chính mình.
- **Giao diện:** responsive (mobile → desktop), tông nâu amber, font Plus Jakarta Sans; chi tiết món và đăng nhập/đăng ký mở dạng popup; có trạng thái loading/skeleton, lỗi và rỗng ở mọi màn hình. Ảnh sản phẩm lấy từ Unsplash nên máy demo cần có internet.
