import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Phone, RefreshCw, Trash2 } from 'lucide-react'
import { cars } from '../data/cars'

type Lead = { id: string; phone: string; car_id: string; consent_version: string; consent_at: string; created_at: string }
type Result = { ok?: boolean; leads?: Lead[]; message?: string }
export default function Admin() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/leads?limit=200', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const result = await response.json() as Result
      if (!response.ok || result.ok !== true) throw new Error(result.message || (response.status === 401 || response.status === 403 ? 'Đăng nhập bằng tài khoản được cấp quyền Cloudflare Access.' : 'Chưa tải được dữ liệu. Kiểm tra cấu hình Pages, D1 và Access.'))
      setLeads(result.leads || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không kết nối được API quản trị.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  const remove = async (lead: Lead) => {
    if (!window.confirm(`Xóa yêu cầu tư vấn từ ${lead.phone}?`)) return
    setActionId(lead.id); setError('')
    try {
      const response = await fetch(`/api/admin/leads?id=${encodeURIComponent(lead.id)}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
      const result = await response.json() as Result
      if (!response.ok || result.ok !== true) throw new Error(result.message || 'Không xóa được bản ghi.')
      setLeads(current => current.filter(item => item.id !== lead.id))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xóa được bản ghi.') }
    finally { setActionId('') }
  }

  return <section className="admin-page"><div className="container"><div className="admin-top"><div><Link to="/" className="back-link"><ArrowLeft size={15}/> Về website</Link><span className="eyebrow"><i/>KHU VỰC QUẢN TRỊ</span><h1>Khách hàng đăng ký tư vấn</h1><p>Trang này chỉ hiển thị dữ liệu sau khi xác thực Cloudflare Access và kiểm tra quyền của Vinh ở API.</p></div><button className="button button-dark" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15}/> Làm mới</button></div>{error && <div className="admin-message" role="alert">{error}</div>}{loading ? <div className="admin-empty">Đang tải danh sách…</div> : leads.length === 0 && !error ? <div className="admin-empty">Chưa có khách hàng đăng ký.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Số điện thoại</th><th>Dòng xe</th><th>Thời điểm đăng ký</th><th>Đồng ý tư vấn</th><th></th></tr></thead><tbody>{leads.map(lead => <tr key={lead.id}><td><a className="admin-phone" href={`tel:${lead.phone}` }><Phone size={14}/>{lead.phone}</a></td><td>{cars.find(car => car.id === lead.car_id)?.name || 'Dòng xe khác'}</td><td>{new Date(lead.created_at).toLocaleString('vi-VN')}</td><td>{lead.consent_version} · {new Date(lead.consent_at).toLocaleString('vi-VN')}</td><td><button className="admin-delete" aria-label={`Xóa lead ${lead.phone}`} disabled={actionId === lead.id} onClick={() => void remove(lead)}><Trash2 size={15}/> Xóa</button></td></tr>)}</tbody></table></div>}<p className="admin-footnote">Tối đa 200 yêu cầu mới nhất được hiển thị. Dữ liệu tự xóa sau 180 ngày; yêu cầu xóa sớm được xử lý từ nút Xóa.</p></div></section>
}
