const fs = require("fs");
const path = "F:\\Elshimaa.Store\\elshimaastorefront\\src\\pages\\ProductDetails.tsx";
let content = fs.readFileSync(path, 'utf8');

// 1. Add states
content = content.replace("const [activeVariantIndex, setActiveVariantIndex] = useState(0);", 
"const [activeVariantIndex, setActiveVariantIndex] = useState(0);\n    const [reviews, setReviews] = useState<ReviewItem[]>([]);\n    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);");

// 2. Add useEffects
const fetchEnd = "        fetchProduct();\n    }, [id]);\n";
const effectStr = `
    useEffect(() => {
        if (!id) return;
        ReviewsAPI.getByProduct(id)
            .then(res => setReviews(res.data ?? []))
            .catch(() => {});
    }, [id]);

    useEffect(() => {
        if (!lightboxUrl) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxUrl]);
`;
if (!content.includes("ReviewsAPI.getByProduct")) {
    content = content.replace(fetchEnd, fetchEnd + effectStr);
}

// 3. Add TSX
const jsxEnd = `                            {!!product.descriptionAr && (
                                <div className="product-description">
                                    <p>{product.descriptionAr}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>`;
const reviewsJsx = `                            {!!product.descriptionAr && (
                                <div className="product-description">
                                    <p>{product.descriptionAr}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== Reviews Section ====== */}
            <section className="reviews-section">
                <div className="reviews-header">
                    <span className="reviews-label">آراء العملاء</span>
                    <h2 className="reviews-title">ما قاله عملاؤنا</h2>
                </div>

                {reviews.length === 0 ? (
                    <div className="reviews-empty">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <p>لا توجد مراجعات لهذا المنتج بعد</p>
                    </div>
                ) : (
                    <div className="reviews-grid">
                        {reviews.map(review => (
                            <div key={review.id} className="review-card">
                                <div className="review-card-header">
                                    <div className="review-stars">
                                        {[1,2,3,4,5].map(i => (
                                            <svg key={i} className={\`review-star\${i <= review.rating ? ' filled' : ''}\`} viewBox="0 0 24 24" width="16" height="16">
                                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        ))}
                                    </div>
                                    <span className="review-author">{review.authorName}</span>
                                </div>
                                {review.comment && (
                                    <p className="review-comment">{review.comment}</p>
                                )}
                                {review.images.length > 0 && (
                                    <div className="review-images">
                                        {[...review.images]
                                            .sort((a, b) => a.displayOrder - b.displayOrder)
                                            .map(img => (
                                                <button
                                                    key={img.id}
                                                    type="button"
                                                    className="review-img-thumb"
                                                    onClick={() => setLightboxUrl(getImageUrl(img.imageUrl))}
                                                    aria-label="عرض الصورة"
                                                >
                                                    <img
                                                        src={getImageUrl(img.imageUrl)}
                                                        alt=""
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>`;
if (!content.includes("className=\"reviews-section\"")) {
    content = content.replace(jsxEnd, reviewsJsx);
}

// 4. Lightbox overlay
const finalEnd = `        </div>
    );
};`;
const lightboxJsx = `        </div>

        {/* ====== Lightbox Modal ====== */}
        {lightboxUrl && (
            <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)} role="dialog" aria-modal="true" aria-label="عرض الصورة">
                <button type="button" className="lightbox-close" onClick={() => setLightboxUrl(null)} aria-label="إغلاق">✕</button>
                <img src={lightboxUrl} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
            </div>
        )}
    );
};`;
if (!content.includes("className=\"lightbox-overlay\"")) {
    content = content.replace(finalEnd, lightboxJsx);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Patched successfully!");
