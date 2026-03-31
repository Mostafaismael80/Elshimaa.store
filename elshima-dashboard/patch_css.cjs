const fs = require("fs");
const path = "F:\\Elshimaa.Store\\elshimaastorefront\\src\\pages\\product-details.css";
let content = fs.readFileSync(path, 'utf8');

const css = `
/* ==========================================================================
   Reviews Section
   ========================================================================== */
.reviews-section { margin-top: 80px; padding-top: 60px; border-top: 1px solid var(--color-border); }
.reviews-header { text-align: center; margin-bottom: 40px; }
.reviews-label { display: inline-block; font-size: 0.8rem; letter-spacing: 0.05em; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 8px; }
.reviews-title { font-family: var(--font-serif); font-size: 2rem; font-weight: 400; color: var(--color-text); }
.reviews-empty { text-align: center; padding: 60px 20px; background: #FAFAFA; border-radius: 8px; color: var(--color-text-muted); }
.reviews-empty svg { margin: 0 auto 16px; opacity: 0.3; }
.reviews-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; }
@media (max-width: 768px) { .reviews-grid { grid-template-columns: 1fr; } }
.review-card { background: #fff; border: 1px solid var(--color-border); padding: 24px; border-radius: 8px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.review-card-header { display: flex; align-items: center; justify-content: space-between; }
.review-stars { display: flex; gap: 2px; }
.review-star { fill: none; stroke: #D1D5DB; }
.review-star.filled { fill: #FBBF24; stroke: #FBBF24; }
.review-author { font-weight: 500; font-size: 0.95rem; color: var(--color-text); }
.review-comment { font-size: 0.95rem; line-height: 1.6; color: var(--color-text-muted); margin: 0; }
.review-images { display: flex; gap: 12px; margin-top: auto; border-top: 1px solid var(--color-border); padding-top: 16px;}
.review-img-thumb { width: 60px; height: 60px; border-radius: 6px; overflow: hidden; cursor: pointer; border: 1px solid var(--color-border); background: none; padding: 0; transition: opacity 0.2s; }
.review-img-thumb:hover { opacity: 0.8; }
.review-img-thumb img { width: 100%; height: 100%; object-fit: cover; }
/* Lightbox Modal */
.lightbox-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); cursor: zoom-out; }
.lightbox-close { position: absolute; top: 24px; right: 24px; background: rgba(255, 255, 255, 0.1); color: white; border: none; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; font-size: 1.2rem; }
.lightbox-close:hover { background: rgba(255, 255, 255, 0.2); }
.lightbox-img { max-width: 90vw; max-height: 90vh; object-fit: contain; cursor: default; user-select: none; }
`;

if (!content.includes("reviews-section")) {
    fs.writeFileSync(path, content + "\n" + css, 'utf8');
}
console.log("CSS Patched!");
