import type { Car } from '../types'

const hondaCdn = 'https://cdn.honda.com.vn/automobile-versions'
export const cars: Car[] = [
  {
    id: 'city', slug: 'honda-city', name: 'Honda City', category: 'Sedan hạng B', price: 539, priceLabel: 'Từ 539.000.000 ₫',
    image: `${hondaCdn}/October2024/T6kH6vvTvYJvZDo3ePqm.png`, secondaryImage: `${hondaCdn}/October2024/T6kH6vvTvYJvZDo3ePqm.png`,
    description: 'Mẫu sedan Honda có thiết kế thể thao, động cơ 1.5L và hộp số CVT. Giá và phiên bản hiển thị theo nguồn Honda Việt Nam; liên hệ Vinh để kiểm tra chương trình tại thời điểm mua.',
    powertrain: 'Xăng', seats: 5, fuel: 'Xăng', transmission: 'CVT', engine: '1.5L DOHC i-VTEC', dimensions: '4.577–4.594 × 1.748 × 1.467 mm',
    colors: [{ name: 'Đen', hex: '#202322' }, { name: 'Xám', hex: '#7c8080' }, { name: 'Xanh', hex: '#304b65' }, { name: 'Trắng', hex: '#eae9e5' }, { name: 'Đỏ', hex: '#9d2830' }, { name: 'Trắng ngọc', hex: '#f4f1eb' }],
    highlights: ['Honda SENSING', 'Động cơ 1.5L DOHC i-VTEC', 'Hộp số vô cấp CVT', '6 túi khí trên bản RS'],
    trim: [{ name: 'L', price: '539.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'RS', price: '569.000.000 ₫', description: 'Giá niêm yết tham khảo' }], featured: true,
    officialUrl: 'https://www.honda.com.vn/o-to/chi-tiet/2', officialPriceUrl: 'https://www.honda.com.vn/index.php/o-to/bang-gia-xe', verified: true,
    specs: [{ label: 'Động cơ', value: '1.5L DOHC i-VTEC, 4 xi-lanh' }, { label: 'Hộp số', value: 'Vô cấp CVT' }, { label: 'Công suất cực đại', value: '119 Hp / 6.600 rpm' }, { label: 'Số chỗ ngồi', value: '5' }, { label: 'Chiều dài cơ sở', value: '2.600 mm' }, { label: 'Tiêu thụ hỗn hợp', value: '5,6 lít/100 km' }]
  },
  {
    id: 'civic', slug: 'honda-civic', name: 'Honda Civic', category: 'Sedan hạng C', price: 789, priceLabel: 'Từ 789.000.000 ₫',
    image: `${hondaCdn}/April2025/uLbjihBNS2ewvIxgd6HQ.png`, secondaryImage: `${hondaCdn}/April2025/uLbjihBNS2ewvIxgd6HQ.png`,
    description: 'Sedan hạng C với lựa chọn động cơ tăng áp hoặc hệ truyền động hybrid e:HEV. Tên phiên bản và giá tham khảo lấy từ bảng giá Honda Việt Nam.',
    powertrain: 'Xăng / Hybrid', seats: 5, fuel: 'Xăng / Hybrid', transmission: 'CVT / E-CVT', engine: '1.5L Turbo / 2.0L Hybrid', dimensions: '4.681 × 1.802 × 1.415 mm',
    colors: [{ name: 'Đỏ', hex: '#9d2830' }, { name: 'Trắng ngọc', hex: '#f4f1eb' }, { name: 'Xám', hex: '#7c8080' }, { name: 'Đen', hex: '#202322' }, { name: 'Xanh', hex: '#304b65' }],
    highlights: ['Honda SENSING', 'Lựa chọn động cơ 1.5L Turbo hoặc e:HEV', 'Hộp số CVT / E-CVT theo phiên bản', 'Honda CONNECT'],
    trim: [{ name: 'G', price: '789.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'RS', price: '889.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'e:HEV RS', price: '999.000.000 ₫', description: 'Giá niêm yết tham khảo' }], featured: true,
    officialUrl: 'https://www.honda.com.vn/o-to/chi-tiet/19', officialPriceUrl: 'https://www.honda.com.vn/index.php/o-to/bang-gia-xe', verified: true,
    specs: [{ label: 'Động cơ xăng', value: '1.5L DOHC VTEC TURBO' }, { label: 'Động cơ Hybrid', value: '2.0L DOHC kết hợp mô-tơ điện' }, { label: 'Hộp số', value: 'CVT / E-CVT theo phiên bản' }, { label: 'Công suất kết hợp e:HEV', value: '200 Hp' }, { label: 'Số chỗ ngồi', value: '5' }, { label: 'Chiều dài cơ sở', value: '2.735 mm' }]
  },
  {
    id: 'crv', slug: 'honda-cr-v', name: 'Honda CR-V', category: 'SUV', price: 1039, priceLabel: 'Từ 1.039.000.000 ₫',
    image: `${hondaCdn}/October2024/V0WGoH9zExF4Ys9135xQ.png`, secondaryImage: `${hondaCdn}/October2024/V0WGoH9zExF4Ys9135xQ.png`,
    description: 'SUV Honda với cấu hình 5+2 chỗ ở các phiên bản xăng và cấu hình hybrid theo phiên bản. Giá tham khảo từ bảng niêm yết Honda Việt Nam.',
    powertrain: 'Xăng / Hybrid', seats: 7, fuel: 'Xăng / Hybrid', transmission: 'CVT / E-CVT', engine: '1.5L Turbo / 2.0L Hybrid', dimensions: '4.691 × 1.866 × 1.681 mm',
    colors: [{ name: 'Trắng ngà', hex: '#e7e5df' }, { name: 'Xám', hex: '#797e80' }, { name: 'Đen', hex: '#202322' }, { name: 'Xanh', hex: '#304b65' }, { name: 'Đỏ', hex: '#9d2830' }, { name: 'Trắng ngọc', hex: '#f4f1eb' }],
    highlights: ['Honda SENSING', 'Lựa chọn hệ truyền động e:HEV', 'Honda CONNECT One', 'Cấu hình 5 hoặc 7 chỗ theo phiên bản'],
    trim: [{ name: 'G', price: '1.039.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'L', price: '1.099.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'e:HEV L', price: '1.170.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'L AWD', price: '1.250.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'e:HEV RS', price: '1.250.000.000 ₫', description: 'Giá niêm yết tham khảo' }], featured: true,
    officialUrl: 'https://www.honda.com.vn/o-to/chi-tiet/17', officialPriceUrl: 'https://www.honda.com.vn/index.php/o-to/bang-gia-xe', verified: true,
    specs: [{ label: 'Động cơ xăng', value: '1.5L DOHC VTEC TURBO' }, { label: 'Động cơ Hybrid', value: '2.0L DOHC kết hợp mô-tơ điện' }, { label: 'Hộp số', value: 'CVT / E-CVT theo phiên bản' }, { label: 'Công suất động cơ xăng', value: '188 Hp / 6.000 rpm' }, { label: 'Số chỗ ngồi', value: '5 hoặc 7 theo phiên bản' }, { label: 'Chiều dài cơ sở', value: '2.701 mm' }]
  },
  {
    id: 'hrv', slug: 'honda-hr-v', name: 'Honda HR-V', category: 'SUV đô thị', price: 669, priceLabel: 'Từ 669.000.000 ₫',
    image: `${hondaCdn}/October2024/7Edm53lf81PwFNQ0Xyc1.png`, secondaryImage: `${hondaCdn}/October2024/7Edm53lf81PwFNQ0Xyc1.png`,
    description: 'SUV đô thị có các lựa chọn máy xăng và hybrid e:HEV. Bảng màu và giá dưới đây là tham khảo từ trang sản phẩm Honda Việt Nam.',
    powertrain: 'Xăng / Hybrid', seats: 5, fuel: 'Xăng / Hybrid', transmission: 'CVT / E-CVT', engine: '1.5L i-VTEC / 1.5L Hybrid', dimensions: '4.347–4.385 × 1.790 × 1.590 mm',
    colors: [{ name: 'Xám Phong Cách', hex: '#7c8080' }, { name: 'Đen Ánh Độc Tôn', hex: '#202322' }, { name: 'Trắng Ngọc Quý Phái', hex: '#f4f1eb' }, { name: 'Đỏ Cá Tính', hex: '#9d2830' }, { name: 'Vàng Cát Thời Thượng', hex: '#bea66e' }],
    highlights: ['Honda SENSING', 'Phiên bản e:HEV RS Hybrid', 'Hộp số CVT / E-CVT theo phiên bản', '5 chỗ ngồi'],
    trim: [{ name: 'G', price: '669.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'L', price: '750.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'e:HEV RS', price: '835.000.000 ₫', description: 'Giá niêm yết tham khảo' }], featured: true,
    officialUrl: 'https://www.honda.com.vn/o-to/chi-tiet/21', officialPriceUrl: 'https://www.honda.com.vn/index.php/o-to/bang-gia-xe', verified: true,
    specs: [{ label: 'Động cơ xăng', value: '1.5L DOHC i-VTEC' }, { label: 'Động cơ Hybrid', value: '1.5L DOHC Atkinson + mô-tơ điện' }, { label: 'Hộp số', value: 'CVT / E-CVT theo phiên bản' }, { label: 'Số chỗ ngồi', value: '5' }, { label: 'Chiều dài cơ sở', value: '2.610 mm' }, { label: 'Tiêu thụ hỗn hợp e:HEV RS', value: '4,30 lít/100 km' }]
  },
  {
    id: 'brv', slug: 'honda-br-v', name: 'Honda BR-V', category: 'MPV 7 chỗ', price: 629, priceLabel: 'Từ 629.000.000 ₫',
    image: `${hondaCdn}/October2024/igP60OaeB5IKz1K1COPR.png`, secondaryImage: `${hondaCdn}/October2024/igP60OaeB5IKz1K1COPR.png`,
    description: 'MPV 7 chỗ với hai phiên bản G và L. Giá tham khảo hiện có trên bảng giá sản phẩm Honda Việt Nam.',
    powertrain: 'Xăng', seats: 7, fuel: 'Xăng', transmission: 'CVT', engine: '1.5L DOHC i-VTEC', dimensions: '4.490 × 1.780 × 1.685 mm',
    colors: [{ name: 'Trắng ngà', hex: '#e7e5df' }, { name: 'Trắng bạc', hex: '#cfd1d0' }, { name: 'Xám', hex: '#797e80' }, { name: 'Đen ánh', hex: '#202322' }],
    highlights: ['Honda SENSING', '7 chỗ ngồi', 'Động cơ 1.5L DOHC i-VTEC', 'Hộp số vô cấp CVT'],
    trim: [{ name: 'G', price: '629.000.000 ₫', description: 'Giá niêm yết tham khảo' }, { name: 'L', price: '705.000.000 ₫', description: 'Giá niêm yết tham khảo' }], featured: false,
    officialUrl: 'https://www.honda.com.vn/o-to/chi-tiet/18', officialPriceUrl: 'https://www.honda.com.vn/index.php/o-to/bang-gia-xe', verified: true,
    specs: [{ label: 'Động cơ', value: '1.5L DOHC i-VTEC, 4 xi-lanh' }, { label: 'Hộp số', value: 'Vô cấp CVT' }, { label: 'Công suất cực đại', value: '119 Hp / 6.600 rpm' }, { label: 'Số chỗ ngồi', value: '7' }, { label: 'Chiều dài cơ sở', value: '2.700 mm' }, { label: 'Khoảng sáng gầm xe', value: '207 mm' }]
  },
  {
    id: 'accord', slug: 'honda-accord', name: 'Honda Accord', category: 'Sedan hạng D', price: null, priceLabel: 'Liên hệ Vinh để xác nhận',
    image: '', secondaryImage: '', description: 'Honda Accord chưa xuất hiện trong danh mục sản phẩm ô tô Honda Việt Nam tại thời điểm tra cứu. Vui lòng liên hệ Vinh để xác nhận tình trạng phân phối và thông tin phù hợp.',
    powertrain: 'Liên hệ xác nhận', seats: 0, fuel: 'Liên hệ xác nhận', transmission: 'Liên hệ xác nhận', engine: 'Liên hệ xác nhận', dimensions: 'Chưa xác minh',
    colors: [], highlights: [], trim: [], featured: false, officialUrl: 'https://www.honda.com.vn/o-to', officialPriceUrl: 'https://www.honda.com.vn/index.php/o-to/bang-gia-xe', verified: false, specs: []
  }
]
