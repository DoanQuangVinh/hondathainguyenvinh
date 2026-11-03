import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Layout } from './layouts/Layout'
import { useCompare } from './hooks/useCompare'
import { business } from './data/business'
import { cars } from './data/cars'

const Home = lazy(() => import('./pages/Home'))
const CarsPage = lazy(() => import('./pages/Cars'))
const CarDetail = lazy(() => import('./pages/CarDetail'))
const Compare = lazy(() => import('./pages/Compare'))
const PriceList = lazy(() => import('./pages/PriceList'))
const Promotions = lazy(async () => ({ default: (await import('./pages/Content')).Promotions }))
const News = lazy(async () => ({ default: (await import('./pages/Content')).News }))
const NewsDetail = lazy(async () => ({ default: (await import('./pages/Content')).NewsDetail }))
const TestDrive = lazy(async () => ({ default: (await import('./pages/Content')).TestDrive }))
const Contact = lazy(async () => ({ default: (await import('./pages/Content')).Contact }))
const Admin = lazy(() => import('./pages/Admin'))
const seo: Record<string, [string, string]> = {
  '/': [business.websiteName, 'Tư vấn các dòng xe Honda, nhận báo giá, đăng ký lái thử và hỗ trợ mua xe tại Thái Nguyên. Liên hệ Vinh 0904 349 720.'],
  '/cars': ['Các dòng xe Honda | Tư vấn cùng Vinh', 'Tìm hiểu City, Civic, CR-V, HR-V, BR-V và Accord; xem giá tham khảo và liên hệ Vinh.'],
  '/price-list': ['Bảng giá Honda tham khảo | Vinh – Thái Nguyên', 'Giá niêm yết tham khảo Honda Việt Nam. Liên hệ Vinh 0904 349 720 để nhận báo giá mới nhất.'],
  '/compare': ['So sánh xe Honda | Tư vấn cùng Vinh', 'So sánh các dòng xe Honda và trao đổi với Vinh về lựa chọn phù hợp.'],
  '/promotions': ['Khuyến mãi Honda | Hỏi Vinh', 'Hỏi Vinh về chương trình ưu đãi Honda hiện hành tại Thái Nguyên.'],
  '/news': ['Tư vấn mua xe Honda | Góc thông tin cùng Vinh', 'Kinh nghiệm tìm hiểu xe, lái thử và chi phí mua ô tô Honda.'],
  '/test-drive': ['Đăng ký lái thử Honda | Vinh – Thái Nguyên', 'Gửi thời gian mong muốn lái thử Honda. Lịch hẹn được xác nhận trực tiếp cùng Vinh.'],
  '/contact': ['Liên hệ Vinh | Honda Ô tô Thái Nguyên', 'Tư vấn xe Honda, báo giá và lái thử tại Thái Nguyên. Gọi 0904 349 720 hoặc chat Zalo.']
}
function RouteLoading() { return <div className="route-loading" role="status"><span/>Đang mở nội dung…</div> }
export default function App() {
  const location = useLocation(); const compare = useCompare()
  useEffect(() => {
    const car = location.pathname.startsWith('/cars/') ? cars.find(item => item.slug === location.pathname.split('/').pop()) : undefined
    const [title, description] = seo[location.pathname] || (car ? [`${car.name} | Tư vấn cùng Vinh – Honda Ô tô Thái Nguyên`, `Xem phiên bản, giá tham khảo và thông tin ${car.name}. Liên hệ Vinh 0904 349 720 để được tư vấn.`] : location.pathname.startsWith('/news/') ? ['Góc tư vấn ô tô | Honda Ô tô Thái Nguyên – Vinh', 'Thông tin tham khảo trước khi chọn xe Honda.'] : seo['/'])
    document.title = title
    const setMeta = (selector: string, key: string, value: string) => { let tag = document.querySelector(selector); if (!tag) { tag = document.createElement('meta'); tag.setAttribute(key, selector.includes('og:') ? selector.match(/og:(title|description|url)/)?.[0] || '' : 'description'); document.head.append(tag) }; tag.setAttribute('content', value) }
    setMeta('meta[name="description"]', 'name', description); setMeta('meta[property="og:title"]', 'property', title); setMeta('meta[property="og:description"]', 'property', description); setMeta('meta[property="og:url"]', 'property', `${window.location.origin}${location.pathname}`)
  }, [location.pathname])
  return <Layout><AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><Suspense fallback={<RouteLoading/>}><Routes location={location}><Route path="/" element={<Home/>}/><Route path="/cars" element={<CarsPage ids={compare.ids} toggle={compare.toggle}/>}/><Route path="/cars/:slug" element={<CarDetail/>}/><Route path="/price-list" element={<PriceList/>}/><Route path="/compare" element={<Compare ids={compare.ids} remove={compare.remove} toggle={compare.toggle}/>}/><Route path="/promotions" element={<Promotions/>}/><Route path="/news" element={<News/>}/><Route path="/news/:slug" element={<NewsDetail/>}/><Route path="/test-drive" element={<TestDrive/>}/><Route path="/contact" element={<Contact/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense></motion.div></AnimatePresence></Layout>
}
