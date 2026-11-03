# Honda Ô tô Thái Nguyên — tư vấn cùng Vinh

React, Vite, TypeScript, Cloudflare Pages Functions, D1 và R2. Đây là website tư vấn bán hàng cá nhân; không tự nhận là website chính thức của Honda Việt Nam hoặc đại lý được ủy quyền.

## Chạy và build

```bash
npm install
npm run dev
npm run build
```

Cloudflare Pages build command: `npm run build`; output: `dist`. `public/_redirects` hỗ trợ SPA routes. Các lệnh dưới đây không được chạy tự động trong build.

## D1 hiện có và migration

`wrangler.jsonc` dùng database `honda-thai-nguyen-leads`, ID `217539f7-61db-4441-a9f6-1ab5ef51d177`, binding `LEADS_DB`. Không tạo database mới.

- `0001_create_leads.sql` tạo schema lead ban đầu.
- `0002_cms_crm.sql` chỉ thêm trường CRM, index và các bảng `cars`, `articles`, `site_settings`, `media_assets`; không xóa hay tái tạo dữ liệu.
- Cloudflare D1 Production đã ghi nhận cả `0001_create_leads.sql` và `0002_cms_crm.sql`; đã đối chiếu schema thực tế. Không chạy lại hai migration này.
- Backup production trước khi cập nhật: `npx wrangler d1 export honda-thai-nguyen-leads --remote --output=backup-honda-leads.sql`.
- Chỉ chạy migration mới khi đã rà backup, đối chiếu trạng thái D1 và được duyệt. Migration Production là bước riêng, không chạy tự động trong Pages build/deploy.

## Cấu hình Cloudflare Pages

Trong **Pages → Settings → Bindings**, xác nhận D1 binding `LEADS_DB` trỏ đến đúng database ở trên. Thêm các biến trong **Settings → Variables and Secrets** cho cả Production và Preview khi cần:

- `RATE_LIMIT_SECRET`: secret ngẫu nhiên riêng cho từng môi trường, tối thiểu 32 ký tự.
- `RETENTION_ENABLED=true`: chỉ bật sau khi migration production đã chạy và Worker lưu giữ dữ liệu đã được triển khai, kiểm tra. Worker xóa lead cũ sau 180 ngày; nếu chưa bật Worker, API gửi lead vẫn nên đóng.
- `CF_ACCESS_TEAM_DOMAIN`: issuer HTTPS dạng `https://<team>.cloudflareaccess.com`.
- `CF_ACCESS_AUD`: Audience Tag của ứng dụng Access.
- `ADMIN_EMAIL`: email duy nhất được phép quản trị.
- `MEDIA_PUBLIC_URL`: domain công khai đã gắn với R2 bucket, không kết thúc bằng `/`.

Tạo Cloudflare Access self-hosted application cho `hondathainguyenvinh.pages.dev/admin*` và `hondathainguyenvinh.pages.dev/api/admin/*`; policy chỉ cho phép email quản trị. API vẫn tự xác thực chữ ký JWT, issuer, audience và email ở server trên từng endpoint. Không có mật khẩu admin trong mã nguồn. Người quản trị đăng nhập qua Cloudflare Access.

## R2 upload ảnh

`wrangler.jsonc` khai báo binding `MEDIA_BUCKET` và bucket đã tồn tại `hondathainguyen-media`; không tạo bucket mới. Gắn custom domain/public delivery cho bucket, sau đó đặt `MEDIA_PUBLIC_URL` bằng domain ảnh đó. Ảnh tải lên được ghi vào R2, metadata vào D1; Pages không lưu file upload trong `dist`. API chỉ nhận JPEG, PNG, WebP, AVIF tối đa 8 MB và yêu cầu Access.

## CRM, CMS và popup

- `POST /api/leads`: xác thực nguồn, kiểm tra số di động và consent, honeypot, giới hạn tần suất bằng IP đã HMAC, chống bản ghi trùng trong 10 phút. Dữ liệu số điện thoại không đi vào analytics.
- `/admin`: dashboard và CRM có tìm kiếm phía server, phân trang, trạng thái, ghi chú, lịch hẹn, xác nhận xóa và CSV cho trang hiện tại. Các API quản trị `leads`, `stats`, `cars`, `content`, `media` đều xác thực Cloudflare Access phía server.
- CMS xe hỗ trợ thêm/sửa/xóa, giá, mô tả, thông số, phiên bản, màu, ảnh, SEO, trạng thái nháp/đăng và đánh dấu xe nổi bật. Form có các trường riêng; không cần sửa JSON. Có thể nhập danh mục xe mẫu để khởi tạo.
- CMS bài viết và khuyến mãi hỗ trợ thêm/sửa/xóa, ảnh bìa, slug, nội dung, SEO và trạng thái nháp/đăng. Tin tức và khuyến mãi đã đăng lấy từ catalog D1; dữ liệu tĩnh chỉ dùng khi D1 chưa được cấu hình hoặc API catalog gặp lỗi.
- Thư viện ảnh quản lý file tải lên R2 và metadata trong D1. Mỗi xe/bài viết hiện dùng một ảnh bìa; album nhiều ảnh và sắp xếp thứ tự ảnh chưa có.
- Popup hiện sau khoảng 1,5 giây, tối đa một lần mỗi phiên, có thể bỏ qua, lựa chọn xe tùy chọn và checkbox consent bắt buộc. Các form liên hệ/lái thử và popup gửi lead qua Pages Functions.

### Chạy Pages cục bộ

```bash
npm run d1:migrate:local
Copy-Item .dev.vars.example .dev.vars
npm run build
npm run pages:dev
```

Điền giá trị local vào `.dev.vars`; không commit file này. Local không có phiên Cloudflare Access hợp lệ mặc định, nên API admin trả lỗi cấu hình/xác thực cho đến khi môi trường kiểm thử có Access tương ứng.

## Backup, GitHub và deploy

Tải backup D1 ra nơi lưu trữ riêng có kiểm soát quyền truy cập. Không đưa SQL backup hoặc dữ liệu lead vào GitHub. Migration production là bước riêng sau backup và duyệt. Push tới `DoanQuangVinh/hondathainguyenvinh` hoặc deploy Pages chỉ thực hiện khi được yêu cầu; repository hiện có thể kết nối GitHub Pages project với build command `npm run build` và output `dist`.

## Còn giới hạn

- Cần duy trì cấu hình Access, biến môi trường và domain phân phối R2 trong tài khoản Cloudflare; repo không thể tự tạo/triển khai các tài nguyên này.
- CMS có giao diện tải/chọn/xóa ảnh R2; album nhiều ảnh trên trang chi tiết xe và sắp xếp ảnh chưa hoàn thiện.
- Nội dung CMS xe và bài viết hiển thị sau khi khởi tạo/đăng bản ghi. Hero/banner trang chủ, menu/footer, logo, favicon, màu theme và toàn bộ khối nội dung chưa có trình dựng CMS.
- Các trường SEO CMS được lưu; trang hiện dùng SEO mặc định theo route, chưa áp dụng đầy đủ SEO title/description riêng từ CMS cho mọi route.
- Hotline, Zalo và địa chỉ chỉnh được trong CMS; website kiểm tra định dạng số điện thoại và chỉ chấp nhận URL Zalo HTTPS trước khi dùng.

Giá và phiên bản là thông tin tham khảo, cần xác nhận lại trước khi tư vấn. Thông tin liên hệ: Vinh · `0904 349 720` · https://zalo.me/0904349720.
