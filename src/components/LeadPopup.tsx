import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, Phone, ShieldCheck, X } from 'lucide-react'
import { cars } from '../data/cars'
import { business } from '../data/business'

const DISMISSED_KEY = 'vinh-lead-popup-dismissed-v1'
const SUBMITTED_KEY = 'vinh-lead-popup-submitted-v1'
type ApiResponse = { ok?: boolean; message?: string; error?: string }

export default function LeadPopup() {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [phone, setPhone] = useState('')
  const [carId, setCarId] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const suppressedForVisit = useRef(false)

  useEffect(() => {
    if (pathname !== '/') { setVisible(false); return }
    if (suppressedForVisit.current) return
    try { if (sessionStorage.getItem(DISMISSED_KEY) || sessionStorage.getItem(SUBMITTED_KEY)) { suppressedForVisit.current = true; return } } catch { /* Session storage can be disabled; the in-memory flag still covers this SPA visit. */ }
    const timer = window.setTimeout(() => setVisible(true), 3000)
    return () => window.clearTimeout(timer)
  }, [pathname])

  const close = () => {
    suppressedForVisit.current = true
    try { sessionStorage.setItem(DISMISSED_KEY, '1') } catch { /* No customer data is stored here. */ }
    setVisible(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consent) { setError('Vui lòng đồng ý để Vinh liên hệ tư vấn.'); return }
    if (!carId) { setError('Vui lòng chọn dòng xe quan tâm.'); return }
    setSubmitting(true); setError('')
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ phone, carId, consent, website: '' })
      })
      const result = await response.json() as ApiResponse
      if (!response.ok || result.ok !== true) throw new Error(result.message || 'Chưa gửi được yêu cầu. Vui lòng gọi Vinh.')
      try { sessionStorage.setItem(SUBMITTED_KEY, '1') } catch { /* Server has stored the lead; session preference is optional. */ }
      suppressedForVisit.current = true
      setSuccess(true)
      window.setTimeout(() => setVisible(false), 4500)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kết nối chưa thành công. Vui lòng thử lại hoặc gọi Vinh.')
    } finally { setSubmitting(false) }
  }

  if (!visible) return null
  return <aside className="lead-popup" role="dialog" aria-modal="false" aria-labelledby="lead-popup-title" aria-describedby="lead-popup-description">
    <button type="button" className="lead-popup-close" aria-label="Đóng popup nhận báo giá" onClick={close}><X size={18}/></button>
    {success ? <div className="lead-popup-success" aria-live="polite"><span><CheckCircle2/></span><h2 id="lead-popup-title">Vinh đã nhận yêu cầu.</h2><p>Thông tin đã được lưu để Vinh liên hệ tư vấn. Cảm ơn bạn đã đồng ý nhận liên hệ.</p><a href={business.phoneHref}><Phone size={14}/> {business.phoneDisplay}</a></div> : <>
      <div className="lead-popup-heading"><span className="lead-popup-icon"><ShieldCheck size={19}/></span><span className="eyebrow">TƯ VẤN CÙNG VINH</span></div>
      <h2 id="lead-popup-title">Nhận báo giá Honda mới nhất</h2>
      <p id="lead-popup-description">Để lại số điện thoại, Vinh sẽ liên hệ tư vấn giá xe, ưu đãi và hỗ trợ trả góp.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="lead-phone">Số điện thoại <b>*</b></label>
        <input id="lead-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0904 349 720" value={phone} onChange={event => setPhone(event.target.value)} aria-invalid={Boolean(error && error.includes('số điện thoại'))} required/>
        <label htmlFor="lead-car">Dòng xe quan tâm <b>*</b></label>
        <select id="lead-car" value={carId} onChange={event => setCarId(event.target.value)} required>
          <option value="">Chọn dòng xe</option>
          {cars.map(car => <option value={car.id} key={car.id}>{car.name}</option>)}
        </select>
        <label className="lead-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/><span>Tôi đồng ý để Vinh liên hệ tư vấn qua số điện thoại đã cung cấp. <b>*</b></span></label>
        <p className="lead-privacy">Số điện thoại và dòng xe chỉ dùng để tư vấn, lưu tối đa 180 ngày rồi xóa. Dấu IP đã băm chỉ dùng chống spam, xóa sau tối đa 48 giờ. Muốn xóa sớm, gọi hoặc nhắn <a href={business.zalo} target="_blank" rel="noreferrer">Zalo Vinh</a>.</p>
        {error && <p className="lead-popup-error" role="alert">{error}</p>}
        <button type="submit" className="button button-red lead-submit" disabled={submitting}>{submitting ? 'Đang gửi yêu cầu…' : 'Nhận tư vấn miễn phí'} <Phone size={15}/></button>
        <input className="lead-honeypot" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value="" readOnly/>
        <small className="lead-no-send">Chỉ báo thành công sau khi hệ thống lưu được yêu cầu.</small>
      </form>
    </>}
  </aside>
}
