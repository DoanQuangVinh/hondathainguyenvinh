import { Link } from 'react-router-dom'
import { ArrowRight, Tag } from 'lucide-react'
import { useCatalogArticles } from '../hooks/useCatalog'
import { EmptyState, PageIntro } from '../components/UI'

export default function Promotions() {
  const promotions = useCatalogArticles().filter(article => article.category === 'Khuyến mãi')

  return <>
    <PageIntro
      eyebrow="CHƯƠNG TRÌNH ĐANG HIỂN THỊ"
      title="Khuyến mãi Honda"
      description="Thông tin chương trình được cập nhật bởi đội ngũ tư vấn. Vui lòng liên hệ để xác nhận điều kiện và thời hạn áp dụng."
    />
    <section className="container promo-page">
      <p className="demo-note">Giá, quà tặng và điều kiện ưu đãi có thể thay đổi theo mẫu xe, phiên bản và thời điểm. Vinh sẽ xác nhận thông tin áp dụng trước khi bạn quyết định.</p>
      {promotions.length ? <div className="news-grid news-list">
        {promotions.map((promotion, index) => <Link
          to={`/news/${promotion.slug}`}
          className={`news-card ${index === 0 ? 'news-featured' : ''}`}
          key={promotion.slug}
        >
          <div className="news-image">{promotion.image && <img src={promotion.image} loading="lazy" alt={promotion.title}/>}</div>
          <div className="news-meta"><span><Tag size={14}/> Ưu đãi</span><span>{promotion.date}</span></div>
          <h3>{promotion.title}</h3>
          <p>{promotion.excerpt}</p>
          <span className="text-link">Xem điều kiện chương trình <ArrowRight size={15}/></span>
        </Link>)}
      </div> : <EmptyState
        title="Chưa có chương trình đang đăng"
        body="Khi có ưu đãi đã được xác nhận, thông tin sẽ xuất hiện tại đây. Liên hệ Vinh để hỏi chương trình hiện hành."
        action="Liên hệ tư vấn"
        to="/contact"
      />}
    </section>
  </>
}
