const GIFT_IMAGES: Record<string, string> = {
  '6': '/gifts/gift-6.webp',
  '9': '/gifts/gift-9.webp',
  '19': '/gifts/gift-19.webp',
  '22': '/gifts/gift-22.webp',
  '25': '/gifts/gift-25.webp',
  '26': '/gifts/gift-26.webp',
  '27': '/gifts/gift-27.webp',
  '28': '/gifts/gift-28.webp',
  '29': '/gifts/gift-29.webp',
  '30': '/gifts/gift-30.webp',
};

const CATEGORY_FALLBACK: Record<string, string> = {
  'Baño e Higiene': '/gifts/gift-6.webp',
  Alimentación: '/gifts/gift-9.webp',
  Ropa: '/gifts/gift-22.webp',
  Dormitorio: '/gifts/gift-25.webp',
  Cuidado: '/gifts/gift-27.webp',
  Estimulación: '/gifts/gift-29.webp',
};

export function GiftIdeaArt({ id, category }: { id: string; category: string }) {
  const src = GIFT_IMAGES[id] || CATEGORY_FALLBACK[category] || '/gifts/gift-default.webp';

  return (
    <div className="gift-art">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={210} height={210} loading="lazy" decoding="async" />
    </div>
  );
}
