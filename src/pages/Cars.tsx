import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { useCatalogCars } from '../hooks/useCatalog'
import { CarCard, EmptyState, PageIntro } from '../components/UI'

export default function CarsPage({ ids, toggle }: { ids: string[]; toggle: (id: string) => void }) {
  const cars = useCatalogCars()
  const [category, setCategory] = useState('Tất cả')
  const [range, setRange] = useState('Mọi mức giá')
  const [sort, setSort] = useState('Danh mục Honda')
  const categories = ['Tất cả', ...Array.from(new Set(cars.map(c => c.category)))]
  const filtered = useMemo(() => cars.filter(c => (category === 'Tất cả' || c.category === category) && (range === 'Mọi mức giá' || range === 'Dưới 700 triệu' && c.price !== null && c.price < 700 || range === '700 triệu–1 tỷ' && c.price !== null && c.price >= 700 && c.price < 1000 || range === 'Trên 1 tỷ' && c.price !== null && c.price >= 1000 || range === 'Chưa xác minh' && c.price === null)).sort((a, b) => sort === 'Giá thấp đến cao' ? (a.price ?? Infinity) - (b.price ?? Infinity) : sort === 'Giá cao đến thấp' ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : Number(b.verified) - Number(a.verified)), [cars, category, range, sort])
  return <><PageIntro eyebrow="DẢI SẢN PHẨM HONDA" title="Chọn xe hợp với hành trình" description="Tìm hiểu các dòng xe trong danh mục Honda Việt Nam. Giá và cấu hình mang tính tham khảo, Vinh sẽ hỗ trợ xác nhận thông tin mới nhất."/><section className="container cars-page"><div className="filter-bar"><div className="filter-label"><SlidersHorizontal size={17}/> Lọc xe</div><div className="filter-group"><label htmlFor="category">Phân khúc</label><select id="category" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div><div className="filter-group"><label htmlFor="price">Mức giá niêm yết</label><select id="price" value={range} onChange={e => setRange(e.target.value)}>{['Mọi mức giá', 'Dưới 700 triệu', '700 triệu–1 tỷ', 'Trên 1 tỷ', 'Chưa xác minh'].map(c => <option key={c}>{c}</option>)}</select></div><div className="filter-group sort-group"><label htmlFor="sort"><ArrowUpDown size={13}/> Sắp xếp</label><select id="sort" value={sort} onChange={e => setSort(e.target.value)}>{['Danh mục Honda', 'Giá thấp đến cao', 'Giá cao đến thấp'].map(c => <option key={c}>{c}</option>)}</select></div></div><div className="result-row"><span>{filtered.length} mẫu xe · Giá tham khảo, chưa gồm chi phí lăn bánh</span><Link to="/compare" className="compare-counter">So sánh xe <span>{ids.length}</span></Link></div>{filtered.length ? <div className="car-grid">{filtered.map(car => <CarCard key={car.id} car={car} compare onCompare={toggle} selected={ids.includes(car.id)}/>)}</div> : <EmptyState title="Không tìm thấy xe trong bộ lọc" body="Hãy đổi phân khúc hoặc mức giá để xem lựa chọn khác." action="Xóa bộ lọc" to="/cars"/>}</section></>
}
