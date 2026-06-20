import { HELP_CATEGORIES, getCategory } from '../helpContent';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return HELP_CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }) {
  const cat = getCategory(params.category);
  return { title: cat ? cat.title : 'Help' };
}

export default function HelpCategory({ params }) {
  const cat = getCategory(params.category);
  if (!cat) notFound();

  return (
    <main className="sp-main">
      <div className="sp-shell">
        <a className="sp-back" href="/help">← All topics</a>
        <h1 className="sp-h1">{cat.emoji} {cat.title}</h1>
        <p className="sp-sub">{cat.desc}</p>

        <div className="sp-faq">
          {cat.articles.map((a, i) => (
            <div className="sp-faq-item" key={i}>
              <div className="sp-faq-q">{a.q}</div>
              <div className="sp-faq-a"><p>{a.a}</p></div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 28, color: 'rgba(255,255,255,0.6)', fontSize: 14.5 }}>
          Didn’t find your answer? <a href="/contact">Contact us</a>.
        </p>
      </div>
    </main>
  );
}
