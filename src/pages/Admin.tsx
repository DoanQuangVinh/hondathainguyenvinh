import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, CarFront, Download, LayoutDashboard, MessageSquare, RefreshCw, Save, Search, Settings, Trash2, Upload } from 'lucide-react'
import { cars as seedCars } from '../data/cars'
import { business } from '../data/business'

type Lead = { id: string; phone: string; car_id: string; customer_name: string | null; source: string; status: string; notes: string | null; appointment_at: string | null; assigned_to: string | null; created_at: string }
type Spec = { label: string; value: string }
type Trim = { name: string; price: string; description: string }
type Color = { name: string; hex: string }
type CarForm = { id?: string; name: string; slug: string; category: string; list_price: number | string | null; on_road_price: string; status: string; featured: boolean; sort_order: number; description: string; image: string; priceLabel: string; verified: boolean; engine: string; seats: number | string; specs: Spec[]; highlights: string[]; colors: Color[]; trim: Trim[]; seo_title: string; seo_description: string }
type CmsCar = CarForm & { id: string }
type Article = { id: string; title: string; slug: string; type: 'news' | 'promotion'; excerpt: string; body: string; cover_image: string | null; status: 'draft' | 'published'; published_at: string | null; seo_title: string | null; seo_description: string | null }
type ArticleForm = { id?: string; title: string; slug: string; type: Article['type']; excerpt: string; body: string; cover_image: string; status: Article['status']; seo_title: string; seo_description: string }
type Stats = { total: number; new_today: number; contacted: number; test_drive: number; closed: number; conversion: number }
type MediaAsset = { id: string; object_key: string; url: string; alt_text: string; car_id: string | null; sort_order: number; is_cover: number; created_at: string }
type Tab = 'overview' | 'leads' | 'cars' | 'articles' | 'settings'
type ApiResult = { ok?: boolean; message?: string }

const statuses: Record<string, string> = { new: 'Mới', contacted: 'Đã tư vấn', test_drive: 'Hẹn lái thử', closed: 'Đã chốt', lost: 'Không tiếp tục' }
const LEAD_PAGE_SIZE = 50
const initialCar: CarForm = { name: '', slug: '', category: '', list_price: '', on_road_price: '', status: 'draft', featured: false, sort_order: 0, description: '', image: '', priceLabel: '', verified: false, engine: '', seats: '', specs: [], highlights: [], colors: [], trim: [], seo_title: '', seo_description: '' }
const initialArticle: ArticleForm = { title: '', slug: '', type: 'news', excerpt: '', body: '', cover_image: '', status: 'draft', seo_title: '', seo_description: '' }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init?.headers },
    cache: 'no-store'
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const result = isJson ? await response.json() as T & ApiResult : null
  if (!response.ok || !result || result.ok === false) throw new Error(result?.message || `Yêu cầu thất bại (${response.status}).`)
  return result
}

function errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback }
function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function updateItem<T>(items: T[], index: number, changes: Partial<T>) { return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }

export default function Admin() {
  const [tab, setTab] = useState<Tab>('overview')
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats>()
  const [cmsCars, setCmsCars] = useState<CmsCar[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [leadOffset, setLeadOffset] = useState(0)
  const [leadTotal, setLeadTotal] = useState(0)
  const [leadLoading, setLeadLoading] = useState(false)
  const [carForm, setCarForm] = useState<CarForm>(initialCar)
  const [articleForm, setArticleForm] = useState<ArticleForm | null>(null)
  const [editLead, setEditLead] = useState<Record<string, Partial<Lead>>>({})

  const loadLeads = useCallback(async () => {
    setLeadLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LEAD_PAGE_SIZE), offset: String(leadOffset) })
      if (statusFilter) params.set('status', statusFilter)
      if (query.trim()) params.set('q', query.trim())
      const result = await api<{ leads: Lead[]; total: number }>(`/api/admin/leads?${params}`)
      setLeads(result.leads); setLeadTotal(result.total)
      if (leadOffset >= result.total && leadOffset > 0) setLeadOffset(Math.max(0, Math.floor((result.total - 1) / LEAD_PAGE_SIZE) * LEAD_PAGE_SIZE))
    } catch (cause) {
      setError(errorMessage(cause, 'Không tải được danh sách khách hàng.'))
    } finally { setLeadLoading(false) }
  }, [leadOffset, query, statusFilter])

  const refreshStats = useCallback(async () => {
    try {
      const result = await api<{ stats: Stats }>('/api/admin/stats')
      setStats(result.stats)
    } catch { /* The shared page error is reported by the next full refresh. */ }
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [statResult, carResult, contentResult, mediaResult] = await Promise.all([
        api<{ stats: Stats }>('/api/admin/stats'),
        api<{ cars: CmsCar[] }>('/api/admin/cars'),
        api<{ articles: Article[]; settings: Record<string, any> }>('/api/admin/content'),
        api<{ assets: MediaAsset[] }>('/api/admin/media')
      ])
      setStats(statResult.stats); setCmsCars(carResult.cars)
      setArticles(contentResult.articles); setSettings(contentResult.settings); setAssets(mediaResult.assets)
    } catch (cause) {
      setError(errorMessage(cause, 'Không tải được dữ liệu. Hãy đăng nhập Cloudflare Access và kiểm tra cấu hình.'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadLeads() }, 250)
    return () => window.clearTimeout(timer)
  }, [loadLeads])

  function announce(message: string) { setNotice(message); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  async function saveLead(id: string) {
    const lead = leads.find(item => item.id === id)
    if (!lead) return
    const changes = editLead[id] || {}
    try {
      await api(`/api/admin/leads?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({
        status: changes.status ?? lead.status, notes: changes.notes ?? lead.notes,
        appointment_at: changes.appointment_at ?? lead.appointment_at, assigned_to: changes.assigned_to ?? lead.assigned_to
      }) })
      announce('Đã lưu cập nhật khách hàng.'); await Promise.all([loadLeads(), refreshStats()])
    } catch (cause) { setError(errorMessage(cause, 'Không cập nhật được khách hàng.')) }
  }

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`Xóa yêu cầu tư vấn của ${lead.customer_name || lead.phone}? Thao tác này không thể hoàn tác.`)) return
    try { await api(`/api/admin/leads?id=${encodeURIComponent(lead.id)}`, { method: 'DELETE' }); announce('Đã xóa yêu cầu tư vấn.'); await Promise.all([loadLeads(), refreshStats()]) }
    catch (cause) { setError(errorMessage(cause, 'Không xóa được khách hàng.')) }
  }

  async function saveCar(event: FormEvent) {
    event.preventDefault()
    const listPrice = carForm.list_price === '' || carForm.list_price == null ? null : Number(carForm.list_price)
    if (listPrice !== null && (!Number.isSafeInteger(listPrice) || listPrice < 0)) { setError('Giá niêm yết phải là số nguyên không âm tính bằng đồng.'); return }
    try {
      const displayPrice = listPrice == null ? null : Math.round(listPrice / 1_000_000)
      const priceLabel = carForm.priceLabel || (listPrice == null ? 'Liên hệ xác nhận' : `${(listPrice / 1_000_000).toLocaleString('vi-VN')} ₫`)
      await api('/api/admin/cars', { method: 'POST', body: JSON.stringify({ ...carForm, id: carForm.id || crypto.randomUUID(), list_price: listPrice, price: displayPrice, priceLabel, seats: Number(carForm.seats) || 0 }) })
      announce(carForm.id ? 'Đã cập nhật mẫu xe.' : 'Đã thêm mẫu xe.'); setCarForm(initialCar); await load()
    } catch (cause) { setError(errorMessage(cause, 'Không lưu được xe. Hãy kiểm tra slug có bị trùng không.')) }
  }

  async function uploadImage(file: File | undefined, ownerId: string | undefined, setUrl: (url: string) => void) {
    if (!file) return
    const form = new FormData(); form.set('file', file); form.set('alt', carForm.name || articleForm?.title || 'Ảnh Honda')
    if (ownerId) form.set('carId', ownerId)
    try {
      const result = await api<{ asset: MediaAsset }>('/api/admin/media', { method: 'POST', body: form })
      setAssets(current => [result.asset, ...current]); setUrl(result.asset.url); setNotice('Đã tải ảnh lên R2. Nhớ lưu nội dung để áp dụng ảnh.'); setError('')
    } catch (cause) { setError(errorMessage(cause, 'Không tải được ảnh. Kiểm tra cấu hình R2.')) }
  }

  async function deleteAsset(asset: MediaAsset, clear: () => void) {
    if (!window.confirm('Xóa ảnh khỏi R2? Nội dung đang dùng URL ảnh này sẽ không còn hiển thị ảnh.')) return
    try {
      await api(`/api/admin/media?id=${encodeURIComponent(asset.id)}`, { method: 'DELETE' })
      setAssets(current => current.filter(item => item.id !== asset.id)); clear(); announce('Đã xóa ảnh khỏi thư viện.')
    } catch (cause) { setError(errorMessage(cause, 'Không xóa được ảnh.')) }
  }

  async function deleteCar(car: CmsCar) {
    if (!window.confirm(`Xóa mẫu xe “${car.name}”? Dữ liệu ảnh đã tải lên vẫn còn trong thư viện.`)) return
    try { await api(`/api/admin/cars?id=${encodeURIComponent(car.id)}`, { method: 'DELETE' }); announce('Đã xóa mẫu xe.'); await load() }
    catch (cause) { setError(errorMessage(cause, 'Không xóa được mẫu xe.')) }
  }

  async function saveArticle(event: FormEvent) {
    event.preventDefault()
    if (!articleForm) return
    try {
      await api('/api/admin/content', { method: 'POST', body: JSON.stringify(articleForm) })
      announce(articleForm.id ? 'Đã cập nhật bài viết.' : 'Đã thêm bài viết.'); setArticleForm(null); await load()
    } catch (cause) { setError(errorMessage(cause, 'Không lưu được bài viết. Hãy kiểm tra slug có bị trùng không.')) }
  }

  async function deleteArticle(article: Article) {
    if (!window.confirm(`Xóa “${article.title}”? Thao tác này không thể hoàn tác.`)) return
    try { await api(`/api/admin/content?id=${encodeURIComponent(article.id)}`, { method: 'DELETE' }); announce('Đã xóa bài viết.'); await load() }
    catch (cause) { setError(errorMessage(cause, 'Không xóa được bài viết.')) }
  }

  async function saveSettings() {
    try { await api('/api/admin/content', { method: 'POST', body: JSON.stringify({ kind: 'settings', values: settings }) }); window.dispatchEvent(new Event('cms-settings-updated')); announce('Đã lưu cài đặt website.') }
    catch (cause) { setError(errorMessage(cause, 'Không lưu được cài đặt.')) }
  }

  async function importSeedCars() {
    if (!window.confirm('Nhập các mẫu xe mẫu hiện tại vào CMS? Xe trùng ID sẽ được cập nhật.')) return
    setLoading(true); setError('')
    try {
      for (const [index, car] of seedCars.entries()) await api('/api/admin/cars', { method: 'POST', body: JSON.stringify({
        ...car, id: car.id, list_price: car.price == null ? null : car.price * 1_000_000, status: 'published', sort_order: index
      }) })
      announce('Đã nhập danh mục xe mẫu vào D1.'); await load()
    } catch (cause) { setError(errorMessage(cause, 'Không nhập được danh mục xe.')); setLoading(false) }
  }

  const menu: [Tab, string, typeof LayoutDashboard][] = [
    ['overview', 'Tổng quan', LayoutDashboard], ['leads', 'Khách hàng', MessageSquare],
    ['cars', 'Mẫu xe', CarFront], ['articles', 'Bài viết & khuyến mãi', BookOpen], ['settings', 'Cài đặt', Settings]
  ]
  const titles: Record<Tab, string> = { overview: 'Tổng quan', leads: 'Khách hàng đăng ký tư vấn', cars: 'Quản lý mẫu xe', articles: 'Tin tức & khuyến mãi', settings: 'Cài đặt website' }

  return <section className="admin-shell">
    <aside className="admin-sidebar">
      <Link to="/" className="admin-brand"><span>H</span><b>HONDA<small>QUẢN TRỊ WEBSITE</small></b></Link>
      <nav aria-label="Khu vực quản trị">{menu.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={17}/>{label}</button>)}</nav>
      <Link to="/" className="admin-back">← Về website</Link>
    </aside>
    <main className="admin-main">
      <header className="admin-toolbar"><div><span className="eyebrow"><i/>QUẢN TRỊ NỘI DUNG & KHÁCH HÀNG</span><h1>{titles[tab]}</h1></div><button className="button button-dark" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Làm mới</button></header>
      {error && <div className="admin-message" role="alert">{error}</div>}
      {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button></div>}
      {loading ? <div className="admin-empty" role="status">Đang tải dữ liệu từ Cloudflare D1…</div> : <>
        {tab === 'overview' && <>
          <div className="admin-stats">{[
            ['Khách hàng', stats?.total ?? 0], ['Khách mới hôm nay', stats?.new_today ?? 0], ['Đã tư vấn', stats?.contacted ?? 0],
            ['Hẹn lái thử', stats?.test_drive ?? 0], ['Đã chốt', stats?.closed ?? 0], ['Tỷ lệ chuyển đổi', `${stats?.conversion ?? 0}%`]
          ].map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div>
          <section className="admin-panel"><PanelTitle icon={BarChart3} title="Khách hàng gần đây" action={<button className="text-link" onClick={() => setTab('leads')}>Mở danh sách →</button>}/><LeadTable rows={leads.slice(0, 8)} edits={editLead} setEdits={setEditLead} save={saveLead} remove={deleteLead}/></section>
          <div className="admin-shortcuts"><button onClick={() => { setCarForm(initialCar); setTab('cars') }}><CarFront/> Thêm mẫu xe</button><button onClick={() => { setArticleForm({ ...initialArticle, type: 'news' }); setTab('articles') }}><BookOpen/> Viết bài mới</button><button onClick={() => setTab('settings')}><Settings/> Cài đặt website</button></div>
        </>}

        {tab === 'leads' && <section className="admin-panel">
          <div className="admin-filters"><label><Search size={16}/><input value={query} onChange={event => { setLeadOffset(0); setQuery(event.target.value) }} placeholder="Tìm tên, số điện thoại, dòng xe…" aria-label="Tìm khách hàng"/></label><select value={statusFilter} onChange={event => { setLeadOffset(0); setStatusFilter(event.target.value) }} aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>{Object.entries(statuses).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><button className="button button-outline-dark" onClick={() => downloadCsv(leads)} disabled={!leads.length}><Download size={15}/> Xuất trang này</button></div>
          <p className="admin-help">{leadLoading ? 'Đang tải khách hàng… ' : ''}Đang hiển thị {leadTotal ? leadOffset + 1 : 0}–{Math.min(leadOffset + leads.length, leadTotal)} trong {leadTotal} khách hàng phù hợp. CSV xuất trang hiện tại.</p>
          <LeadTable rows={leads} edits={editLead} setEdits={setEditLead} save={saveLead} remove={deleteLead}/>
          {leadTotal > LEAD_PAGE_SIZE && <div className="admin-pagination"><button className="button button-outline-dark" disabled={leadOffset === 0 || leadLoading} onClick={() => setLeadOffset(Math.max(0, leadOffset - LEAD_PAGE_SIZE))}>Khách hàng mới hơn</button><span>Trang {Math.floor(leadOffset / LEAD_PAGE_SIZE) + 1} / {Math.ceil(leadTotal / LEAD_PAGE_SIZE)}</span><button className="button button-outline-dark" disabled={leadOffset + LEAD_PAGE_SIZE >= leadTotal || leadLoading} onClick={() => setLeadOffset(leadOffset + LEAD_PAGE_SIZE)}>Khách hàng cũ hơn</button></div>}
        </section>}

        {tab === 'cars' && <div className="admin-columns">
          <section className="admin-panel"><PanelTitle icon={CarFront} title={`Danh mục xe (${cmsCars.length})`}/>
          {cmsCars.length ? cmsCars.map(car => <div className="admin-list-row" key={car.id}><div><b>{car.name}</b><small>/{car.slug} · {car.status === 'draft' ? 'Bản nháp' : 'Đang hiển thị'} · {car.list_price ? `${Number(car.list_price).toLocaleString('vi-VN')} ₫` : 'Chưa nhập giá'}</small></div><button onClick={() => setCarForm({ ...initialCar, ...car, featured: Boolean(car.featured), list_price: car.list_price ?? '' })}>Sửa</button><button className="admin-delete" onClick={() => void deleteCar(car)} aria-label={`Xóa ${car.name}`}><Trash2 size={15}/></button></div>) : <div className="admin-empty admin-inline-empty">Chưa có xe trong CMS. Nhập danh mục mẫu hoặc thêm xe mới ở biểu mẫu bên cạnh.</div>}
            {!cmsCars.length && <button className="button button-outline-dark" onClick={() => void importSeedCars()}>Nhập danh mục xe mẫu</button>}
            <MediaLibrary assets={assets} onDelete={asset => void deleteAsset(asset, () => {
              if (carForm.image === asset.url) setCarForm(current => ({ ...current, image: '' }))
              if (articleForm?.cover_image === asset.url) setArticleForm(current => current ? { ...current, cover_image: '' } : current)
            })}/>
          </section>
          <form className="admin-panel admin-form" onSubmit={event => void saveCar(event)}>
            <h2>{carForm.id ? 'Sửa thông tin xe' : 'Thêm xe vào danh mục'}</h2>
            <p className="admin-help">Thông tin lưu vào D1. Chọn “Đang hiển thị” để đưa xe lên website.</p>
            <div className="admin-form-grid"><Field label="Tên xe *" value={carForm.name} onChange={value => setCarForm({ ...carForm, name: value, slug: carForm.id ? carForm.slug : slugify(value) })} required/><Field label="Đường dẫn (slug) *" value={carForm.slug} onChange={value => setCarForm({ ...carForm, slug: slugify(value) })} required/><Field label="Phân khúc" value={carForm.category} onChange={value => setCarForm({ ...carForm, category: value })}/><Field label="Giá niêm yết (VND)" type="number" min="0" step="1000000" value={carForm.list_price ?? ''} onChange={value => setCarForm({ ...carForm, list_price: value, priceLabel: value ? `${(Number(value) / 1_000_000).toLocaleString('vi-VN')} ₫` : 'Liên hệ xác nhận' })}/><Field label="Giá lăn bánh tham khảo" value={carForm.on_road_price} onChange={value => setCarForm({ ...carForm, on_road_price: value })}/><Field label="Dòng giá hiển thị" value={carForm.priceLabel} onChange={value => setCarForm({ ...carForm, priceLabel: value })}/><Field label="Thứ tự sắp xếp" type="number" value={carForm.sort_order} onChange={value => setCarForm({ ...carForm, sort_order: Number(value) || 0 })}/><Field label="Động cơ" value={carForm.engine} onChange={value => setCarForm({ ...carForm, engine: value })}/><Field label="Số chỗ" type="number" min="0" value={carForm.seats} onChange={value => setCarForm({ ...carForm, seats: value })}/></div>
            <label>Mô tả xe<textarea rows={4} value={carForm.description} onChange={event => setCarForm({ ...carForm, description: event.target.value })}/></label>
            <ImageField label="Ảnh đại diện" value={carForm.image} assets={assets} onChange={image => setCarForm({ ...carForm, image })} onUpload={file => {
              const id = carForm.id || crypto.randomUUID(); setCarForm(current => ({ ...current, id }))
              void uploadImage(file, id, image => setCarForm(current => ({ ...current, image })))
            }} onDelete={asset => void deleteAsset(asset, () => { if (carForm.image === asset.url) setCarForm(current => ({ ...current, image: '' })) })}/>
            <SpecEditor specs={carForm.specs} onChange={specs => setCarForm({ ...carForm, specs })}/>
            <StringListEditor label="Điểm nổi bật" values={carForm.highlights} onChange={highlights => setCarForm({ ...carForm, highlights })}/>
            <TrimEditor values={carForm.trim} onChange={trim => setCarForm({ ...carForm, trim })}/>
            <ColorEditor values={carForm.colors} onChange={colors => setCarForm({ ...carForm, colors })}/>
            <div className="admin-form-grid"><Field label="SEO title" value={carForm.seo_title} onChange={value => setCarForm({ ...carForm, seo_title: value })}/><Field label="SEO description" value={carForm.seo_description} onChange={value => setCarForm({ ...carForm, seo_description: value })}/></div>
            <label className="admin-select-label">Trạng thái hiển thị<select value={carForm.status} onChange={event => setCarForm({ ...carForm, status: event.target.value })}><option value="draft">Bản nháp — ẩn khỏi website</option><option value="published">Đang hiển thị</option></select></label>
            <label className="admin-check"><input type="checkbox" checked={carForm.featured} onChange={event => setCarForm({ ...carForm, featured: event.target.checked })}/> Đưa vào khu vực xe nổi bật</label>
            <div className="admin-form-actions"><button type="button" className="button button-outline-dark" onClick={() => setCarForm(initialCar)}>Làm mới</button><button className="button button-red"><Save size={15}/> Lưu xe</button></div>
          </form>
        </div>}

        {tab === 'articles' && <div className="admin-columns">
          <section className="admin-panel"><PanelTitle icon={BookOpen} title={`Bài viết & khuyến mãi (${articles.length})`} action={<button className="button button-outline-dark" onClick={() => setArticleForm({ ...initialArticle, type: 'news' })}>Viết bài mới</button>}/>
          {articles.map(article => <div className="admin-list-row" key={article.id}><div><b>{article.title}</b><small>{article.type === 'promotion' ? 'Khuyến mãi' : 'Tin tức'} · {article.status === 'published' ? 'Đang đăng' : 'Bản nháp'} · /news/{article.slug}</small></div><button onClick={() => setArticleForm({ id: article.id, title: article.title, slug: article.slug, type: article.type, excerpt: article.excerpt, body: article.body, cover_image: article.cover_image || '', status: article.status, seo_title: article.seo_title || '', seo_description: article.seo_description || '' })}>Sửa</button><button className="admin-delete" onClick={() => void deleteArticle(article)} aria-label={`Xóa ${article.title}`}><Trash2 size={15}/></button></div>)}
            {!articles.length && <div className="admin-empty admin-inline-empty">Chưa có bài viết. Tạo bài mới rồi chọn loại tin tức hoặc khuyến mãi.</div>}
          </section>
          {articleForm && <form className="admin-panel admin-form" onSubmit={event => void saveArticle(event)}>
            <h2>{articleForm.id ? 'Sửa bài viết' : 'Viết bài mới'}</h2>
            <div className="admin-form-grid"><Field label="Tiêu đề *" value={articleForm.title} onChange={value => setArticleForm({ ...articleForm, title: value, slug: articleForm.id ? articleForm.slug : slugify(value) })} required/><Field label="Đường dẫn (slug) *" value={articleForm.slug} onChange={value => setArticleForm({ ...articleForm, slug: slugify(value) })} required/><label className="admin-select-label">Loại nội dung<select value={articleForm.type} onChange={event => setArticleForm({ ...articleForm, type: event.target.value as Article['type'] })}><option value="news">Tin tức / tư vấn</option><option value="promotion">Khuyến mãi</option></select></label><label className="admin-select-label">Trạng thái<select value={articleForm.status} onChange={event => setArticleForm({ ...articleForm, status: event.target.value as Article['status'] })}><option value="draft">Bản nháp</option><option value="published">Đăng trên website</option></select></label></div>
            <Field label="Mô tả ngắn" value={articleForm.excerpt} onChange={value => setArticleForm({ ...articleForm, excerpt: value })}/>
            <label>Nội dung bài viết<textarea rows={9} value={articleForm.body} onChange={event => setArticleForm({ ...articleForm, body: event.target.value })} placeholder="Mỗi đoạn văn cách nhau một dòng trống."/></label>
            <ImageField label="Ảnh bìa" value={articleForm.cover_image || ''} assets={assets} onChange={cover_image => setArticleForm({ ...articleForm, cover_image })} onUpload={file => void uploadImage(file, undefined, cover_image => setArticleForm(current => current ? { ...current, cover_image } : current))} onDelete={asset => void deleteAsset(asset, () => { if (articleForm.cover_image === asset.url) setArticleForm(current => current ? { ...current, cover_image: '' } : current) })}/>
            <div className="admin-form-grid"><Field label="SEO title" value={articleForm.seo_title || ''} onChange={value => setArticleForm({ ...articleForm, seo_title: value })}/><Field label="SEO description" value={articleForm.seo_description || ''} onChange={value => setArticleForm({ ...articleForm, seo_description: value })}/></div>
            <div className="admin-form-actions"><button type="button" className="button button-outline-dark" onClick={() => setArticleForm(null)}>Đóng biểu mẫu</button><button className="button button-red"><Save size={15}/> Lưu bài viết</button></div>
          </form>}
        </div>}

        {tab === 'settings' && <section className="admin-panel admin-form admin-settings"><h2><Settings size={18}/> Thông tin liên hệ & popup</h2><p className="admin-help">Các nội dung này được lưu trong bảng cài đặt D1. Không nhập mật khẩu hoặc khóa truy cập vào đây.</p>
          <h3>Thông tin tư vấn</h3><div className="admin-form-grid"><Field label="Số điện thoại" value={settings.business?.phone ?? business.phone} onChange={value => setSettings({ ...settings, business: { ...settings.business, phone: value } })}/><Field label="Đường dẫn Zalo" value={settings.business?.zalo ?? business.zalo} onChange={value => setSettings({ ...settings, business: { ...settings.business, zalo: value } })}/><Field label="Địa chỉ hiển thị" value={settings.business?.address ?? business.address} onChange={value => setSettings({ ...settings, business: { ...settings.business, address: value } })}/></div>
          <h3>Popup nhận báo giá</h3><label className="admin-check"><input type="checkbox" checked={settings.popup?.enabled !== false} onChange={event => setSettings({ ...settings, popup: { ...settings.popup, enabled: event.target.checked } })}/> Bật popup trên website</label><Field label="Tiêu đề popup" value={settings.popup?.title || ''} onChange={value => setSettings({ ...settings, popup: { ...settings.popup, title: value } })}/><label>Mô tả popup<textarea rows={3} value={settings.popup?.description || ''} onChange={event => setSettings({ ...settings, popup: { ...settings.popup, description: event.target.value } })}/></label><div className="admin-form-grid"><Field label="Thời gian chờ (giây)" type="number" min="0" max="30" value={settings.popup?.delay_seconds ?? 1.5} onChange={value => setSettings({ ...settings, popup: { ...settings.popup, delay_seconds: Number(value) } })}/><Field label="Nội dung nút" value={settings.popup?.button_text || ''} onChange={value => setSettings({ ...settings, popup: { ...settings.popup, button_text: value } })}/><Field label="Ảnh popup (URL)" value={settings.popup?.image || ''} onChange={value => setSettings({ ...settings, popup: { ...settings.popup, image: value } })}/></div><div><button className="button button-red" onClick={() => void saveSettings()}><Save size={15}/> Lưu cài đặt</button></div>
        </section>}
      </>}
    </main>
  </section>
}

function downloadCsv(rows: Lead[]) {
  const quote = (value: unknown) => {
    const text = String(value ?? '')
    const safe = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = ['Số điện thoại,Tên,Dòng xe,Nguồn,Trạng thái,Ngày đăng ký,Ghi chú', ...rows.map(lead => [lead.phone, lead.customer_name, lead.car_id, lead.source, statuses[lead.status] || lead.status, lead.created_at, lead.notes].map(quote).join(','))].join('\r\n')
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); link.download = 'khach-hang-honda.csv'; link.click(); URL.revokeObjectURL(link.href)
}

function PanelTitle({ icon: Icon, title, action }: { icon: typeof BarChart3; title: string; action?: ReactNode }) { return <div className="admin-panel-title"><h2><Icon size={18}/>{title}</h2>{action}</div> }
function Field({ label, value, onChange, required = false, type = 'text', min, max, step }: { label: string; value: unknown; onChange: (value: string) => void; required?: boolean; type?: string; min?: string; max?: string; step?: string }) { return <label>{label}<input type={type} min={min} max={max} step={step} value={value == null ? '' : String(value)} onChange={event => onChange(event.target.value)} required={required}/></label> }

function LeadTable({ rows, edits, setEdits, save, remove }: { rows: Lead[]; edits: Record<string, Partial<Lead>>; setEdits: (value: (current: Record<string, Partial<Lead>>) => Record<string, Partial<Lead>>) => void; save: (id: string) => void; remove: (lead: Lead) => void }) {
  if (!rows.length) return <div className="admin-empty admin-inline-empty">Chưa có khách hàng phù hợp với bộ lọc.</div>
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Khách hàng</th><th>Xe / nguồn</th><th>Thời gian đăng ký</th><th>Trạng thái</th><th>Ghi chú, lịch hẹn, người phụ trách</th><th>Thao tác</th></tr></thead><tbody>
    {rows.map(lead => { const edit = edits[lead.id] || {}; const update = (changes: Partial<Lead>) => setEdits(current => ({ ...current, [lead.id]: { ...current[lead.id], ...changes } })); return <tr key={lead.id}>
      <td><a className="admin-phone" href={`tel:${lead.phone}`}>{lead.phone}</a><small>{lead.customer_name || 'Chưa nhập tên'}</small></td>
      <td>{lead.car_id}<small>{lead.source}</small></td><td>{new Date(lead.created_at).toLocaleString('vi-VN')}</td>
      <td><select value={edit.status ?? lead.status} onChange={event => update({ status: event.target.value })} aria-label={`Trạng thái của ${lead.phone}`}>{Object.entries(statuses).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></td>
      <td><input className="admin-note-input" placeholder="Ghi chú" value={edit.notes ?? lead.notes ?? ''} onChange={event => update({ notes: event.target.value })}/><input type="datetime-local" aria-label="Lịch hẹn" value={(edit.appointment_at ?? lead.appointment_at ?? '').slice(0, 16)} onChange={event => update({ appointment_at: event.target.value })}/><input className="admin-note-input" placeholder="Người phụ trách" value={edit.assigned_to ?? lead.assigned_to ?? ''} onChange={event => update({ assigned_to: event.target.value })}/></td>
      <td className="admin-row-actions"><button className="admin-save-row" onClick={() => save(lead.id)} aria-label={`Lưu ${lead.phone}`}><Save size={15}/></button><button className="admin-delete" onClick={() => remove(lead)} aria-label={`Xóa ${lead.phone}`}><Trash2 size={14}/></button></td>
    </tr> })}
  </tbody></table></div>
}

function ImageField({ label, value, assets, onChange, onUpload, onDelete }: { label: string; value: string; assets: MediaAsset[]; onChange: (url: string) => void; onUpload: (file?: File) => void; onDelete: (asset: MediaAsset) => void }) {
  const selectedAsset = assets.find(asset => asset.url === value)
  return <div className="admin-image-field"><label>{label} — URL ảnh<input value={value} onChange={event => onChange(event.target.value)} placeholder="Dán URL ảnh hoặc tải ảnh lên R2"/></label><div className="admin-image-actions"><label className="button button-outline-dark"><Upload size={15}/> Tải ảnh lên<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event: ChangeEvent<HTMLInputElement>) => { onUpload(event.target.files?.[0]); event.target.value = '' }}/></label><select value={value} onChange={event => onChange(event.target.value)} aria-label="Chọn ảnh đã tải lên"><option value="">Chọn ảnh trong thư viện…</option>{assets.map(asset => <option value={asset.url} key={asset.id}>{asset.alt_text || asset.object_key}</option>)}</select>{selectedAsset && <button type="button" className="admin-delete" onClick={() => onDelete(selectedAsset)}><Trash2 size={14}/> Xóa ảnh</button>}</div>{value && <img className="admin-image-preview" src={value} alt={`Xem trước ${label.toLowerCase()}`}/>}<small className="admin-help">Ảnh tải lên được lưu trong Cloudflare R2; URL ảnh được lưu cùng nội dung trong D1.</small></div>
}

function MediaLibrary({ assets, onDelete }: { assets: MediaAsset[]; onDelete: (asset: MediaAsset) => void }) { return <details className="admin-media-library"><summary>Thư viện ảnh ({assets.length})</summary>{assets.length ? <div className="admin-media-grid">{assets.map(asset => <figure key={asset.id}><img src={asset.url} alt={asset.alt_text || 'Ảnh đã tải lên'}/><figcaption>{asset.alt_text || asset.object_key}<button className="admin-delete" onClick={() => onDelete(asset)} aria-label={`Xóa ảnh ${asset.alt_text}`}><Trash2 size={14}/></button></figcaption></figure>)}</div> : <p>Chưa có ảnh tải lên.</p>}</details> }

function SpecEditor({ specs, onChange }: { specs: Spec[]; onChange: (value: Spec[]) => void }) { return <fieldset className="admin-array-editor"><legend>Thông số kỹ thuật</legend>{specs.map((spec, index) => <div className="admin-array-row" key={index}><input aria-label="Tên thông số" placeholder="Tên thông số" value={spec.label} onChange={event => onChange(updateItem(specs, index, { label: event.target.value }))}/><input aria-label="Giá trị thông số" placeholder="Giá trị" value={spec.value} onChange={event => onChange(updateItem(specs, index, { value: event.target.value }))}/><button type="button" className="admin-delete" onClick={() => onChange(specs.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa thông số"><Trash2 size={14}/></button></div>)}<button type="button" className="button button-outline-dark" onClick={() => onChange([...specs, { label: '', value: '' }])}>Thêm thông số</button></fieldset> }
function StringListEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (value: string[]) => void }) { return <fieldset className="admin-array-editor"><legend>{label}</legend>{values.map((value, index) => <div className="admin-array-row" key={index}><input aria-label={label} value={value} onChange={event => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}/><button type="button" className="admin-delete" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Xóa ${label.toLowerCase()}`}><Trash2 size={14}/></button></div>)}<button type="button" className="button button-outline-dark" onClick={() => onChange([...values, ''])}>Thêm nội dung</button></fieldset> }
function TrimEditor({ values, onChange }: { values: Trim[]; onChange: (value: Trim[]) => void }) { return <fieldset className="admin-array-editor"><legend>Phiên bản và giá</legend>{values.map((trim, index) => <div className="admin-array-card" key={index}><div className="admin-form-grid"><Field label="Tên phiên bản" value={trim.name} onChange={value => onChange(updateItem(values, index, { name: value }))}/><Field label="Giá hiển thị" value={trim.price} onChange={value => onChange(updateItem(values, index, { price: value }))}/></div><Field label="Mô tả phiên bản" value={trim.description} onChange={value => onChange(updateItem(values, index, { description: value }))}/><button type="button" className="admin-delete" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>Xóa phiên bản</button></div>)}<button type="button" className="button button-outline-dark" onClick={() => onChange([...values, { name: '', price: '', description: '' }])}>Thêm phiên bản</button></fieldset> }
function ColorEditor({ values, onChange }: { values: Color[]; onChange: (value: Color[]) => void }) { return <fieldset className="admin-array-editor"><legend>Màu xe</legend>{values.map((color, index) => <div className="admin-array-row" key={index}><input aria-label="Tên màu" placeholder="Tên màu" value={color.name} onChange={event => onChange(updateItem(values, index, { name: event.target.value }))}/><input aria-label="Mã màu" placeholder="#ffffff" value={color.hex} onChange={event => onChange(updateItem(values, index, { hex: event.target.value }))}/><button type="button" className="admin-delete" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label="Xóa màu"><Trash2 size={14}/></button></div>)}<button type="button" className="button button-outline-dark" onClick={() => onChange([...values, { name: '', hex: '#ffffff' }])}>Thêm màu</button></fieldset> }
