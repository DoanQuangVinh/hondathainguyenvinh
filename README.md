# Honda Ô tô Thái Nguyên — tư vấn cùng Vinh

Website tư vấn bán hàng cá nhân xây trên React, Vite, TypeScript, Tailwind CSS, React Router, Framer Motion, Swiper và Lucide React. Trang không tự nhận là website chính thức của Honda Việt Nam hoặc đại lý được ủy quyền.

## Chạy tại máy

```bash
npm install
npm run dev
```

Kiểm tra TypeScript và tạo bản production:

```bash
npm run build
npm run preview
```

Build output nằm tại `dist/`.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- SPA rewrite: `public/_redirects` chuyển các URL ứng dụng về `index.html`.

Sau khi biết domain Pages/custom domain, thay `honda-thai-nguyen.example` trong `public/robots.txt` và `public/sitemap.xml` bằng domain thật. `og:url` được cập nhật theo host đang chạy.

## Lead Capture, D1 và quản trị

Popup chỉ xuất hiện ở trang chủ sau 3 giây. Đóng popup hoặc gửi thành công sẽ được ghi nhớ trong `sessionStorage` đến hết phiên; số điện thoại không được lưu trong trình duyệt hoặc URL. Form có checkbox đồng ý bắt buộc, kiểm tra số di động Việt Nam, trường honeypot và thông báo lỗi. API chỉ trả `201` sau khi D1 xác nhận đã thêm đúng một bản ghi. Chưa có binding D1/secret thì API trả `503`, không giả lập thành công.

### Tạo database và migration

1. Cài Wrangler khi chạy nhóm lệnh Cloudflare (các script dùng `npx wrangler@latest`) và đăng nhập: `npx wrangler login`.
2. Chạy `npm run d1:create`. Ghi lại `database_id` Cloudflare trả về.
3. Thay `REPLACE_WITH_D1_DATABASE_ID` trong `wrangler.jsonc` và `workers/lead-retention/wrangler.jsonc` bằng cùng `database_id`.
4. Chạy migration local: `npm run d1:migrate:local`.
5. Chạy migration production sau khi kiểm tra: `npm run d1:migrate:remote`.

Migration `migrations/0001_create_leads.sql` tạo bảng lead và bucket giới hạn tần suất. Trang Pages cần binding D1 tên `LEADS_DB`; cấu hình đã chuẩn bị trong `wrangler.jsonc`.

### Secrets và triển khai Pages Functions

- Tạo `RATE_LIMIT_SECRET` bí mật dài ít nhất 32 ký tự, khác nhau giữa môi trường preview/production. API dùng HMAC của IP do Cloudflare cung cấp để giới hạn 10 yêu cầu/phút và 30 yêu cầu/ngày; địa chỉ IP thô không được ghi vào D1.
- Trong Cloudflare Pages project, thêm `RATE_LIMIT_SECRET` ở **Settings → Variables and Secrets** dưới dạng secret. `LEADS_DB` được cấu hình bằng D1 binding ở **Settings → Bindings** hoặc từ Wrangler config; redeploy Pages sau khi thay binding.
- Đặt `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAIL` sau khi tạo ứng dụng Cloudflare Access. `ADMIN_EMAIL` là email đăng nhập thật của Vinh; không dùng email ví dụ trong `.dev.vars.example`.
- Pages Functions nằm trong `functions/`: `POST /api/leads` tạo lead; `GET/DELETE /api/admin/leads` yêu cầu JWT Cloudflare Access hợp lệ, đúng audience/issuer và email khớp `ADMIN_EMAIL`. API không có route đọc dữ liệu công khai.
- Trong Cloudflare Zero Trust, tạo self-hosted Access application bảo vệ path `/admin*` và `/api/admin/*`; policy chỉ cho phép email của Vinh. API vẫn tự xác thực chữ ký JWT, audience và email nên chỉ đặt lớp bảo vệ ở trình duyệt không đủ.
- Deploy Pages bằng build command `npm run build`, output `dist`. Để thử Pages Functions cục bộ: tạo D1 và local migration, sao chép `.dev.vars.example` thành `.dev.vars`, điền giá trị local rồi chạy `npm run build` và `npm run pages:dev`. `.dev.vars` bị gitignore.

### Quản trị, xóa dữ liệu và lưu giữ

`/admin` hiển thị tối đa 200 lead gần nhất sau khi xác thực. Nút xóa gọi API quản trị có xác thực. Không bật quản trị cho tới khi Access, AUD và email cho phép được cấu hình đồng thời.

Lead lưu số điện thoại, dòng xe, phiên bản đồng ý và thời điểm gửi. Dữ liệu được dùng để Vinh liên hệ tư vấn và tự xóa sau 180 ngày. Để yêu cầu xóa sớm, khách gọi `0904 349 720` hoặc nhắn [Zalo Vinh](https://zalo.me/0904349720). Bucket chống spam chỉ giữ IP đã băm và được xóa sau tối đa 48 giờ.

Để áp dụng chính sách lưu giữ thực tế, triển khai thêm Worker dọn dữ liệu theo lịch: sau khi thay D1 ID trong `workers/lead-retention/wrangler.jsonc`, chạy `npm run retention:deploy`. Cron chạy hằng ngày lúc 03:17 UTC và xóa lead quá 180 ngày cùng bucket chống spam đã cũ. Nếu chưa triển khai Worker này, thời hạn tự xóa chưa được đảm bảo; hãy bật Worker trước khi thu lead production.

API nhận lead mặc định đóng. Chỉ đặt biến môi trường `RETENTION_ENABLED=true` cho Pages sau khi Worker dọn dữ liệu đã deploy thành công và chạy migration D1 production; nếu thiếu biến này, API trả `503` và không lưu lead. Trong môi trường local, giữ `false` cho đến khi đã thiết lập lịch dọn dữ liệu tương ứng.

Nếu D1, secret, Access hoặc Worker dọn dữ liệu chưa được cấu hình thì không nên đưa popup/API vào hoạt động production; README và thông báo API không coi cấu hình thiếu là gửi thành công.

## Nội dung và liên hệ

- Điện thoại: `0904 349 720`, link gọi `tel:0904349720`.
- Zalo: `https://zalo.me/0904349720`.
- Địa chỉ showroom và Facebook chưa được cung cấp nên không hiển thị địa chỉ cụ thể hoặc nút Facebook.
- Form nhận báo giá gửi dữ liệu tới Pages Function và chỉ báo thành công sau khi D1 xác nhận lưu. Form khác không lưu thông tin cá nhân vào localStorage hoặc URL. Lịch lái thử chưa được xác nhận tự động.
- Giá tham khảo được tách tại `src/data/cars.ts`, dựa trên các trang sản phẩm/bảng giá Honda Việt Nam tại ngày 03/11/2026. Giá, màu, phiên bản và tình trạng cần kiểm tra lại với nguồn chính thức trước khi tư vấn.
- Accord được giữ làm trang tra cứu theo yêu cầu nhưng đánh dấu chưa xác minh trong danh mục hiện hành; không hiện giá/phiên bản suy đoán.
- Ảnh xe trỏ đến ảnh sản phẩm trên CDN Honda Việt Nam. Ảnh nội thất/góc nhìn không có nguồn xác minh được thay bằng placeholder ghi rõ. Kiểm tra quyền dùng tài sản thương hiệu trước khi triển khai thương mại.

## Nguồn đối chiếu

- [Danh mục ô tô Honda Việt Nam](https://www.honda.com.vn/o-to)
- [Bảng giá sản phẩm Honda Việt Nam](https://www.honda.com.vn/index.php/o-to/bang-gia-xe)
- [Honda City](https://www.honda.com.vn/o-to/chi-tiet/2)
- [Honda BR-V](https://www.honda.com.vn/o-to/chi-tiet/18)
- [Honda HR-V](https://www.honda.com.vn/o-to/chi-tiet/21)
- [Honda Civic](https://www.honda.com.vn/o-to/chi-tiet/19)
- [Honda CR-V](https://www.honda.com.vn/o-to/chi-tiet/17)
