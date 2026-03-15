import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "關於我們",
  description: "霧抉茶源自嘉義阿里山梅山山區，一家三口在高山茶園耕耘超過40年。自產自銷、手工製作，每一泡茶都是我們用時間和心意累積的風味。",
  keywords: ["霧抉茶品牌故事", "嘉義梅山茶農", "台灣自產自銷茶", "40年製茶經驗"],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "關於霧抉茶 | 嘉義梅山一家三口的茶園故事",
    description: "霧抉茶源自嘉義阿里山梅山山區，一家三口在高山茶園耕耘超過40年。自產自銷、手工製作。",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-text py-16 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-tea-green/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tea-green/8 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">
            Our Story
          </p>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-tea-cream-light mb-6">
            關於霧抉茶
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-green-pale text-lg max-w-xl mx-auto leading-relaxed">
            一杯茶的背後，<br />
            是我們一家三口的真心與堅持
          </p>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Decorative visual */}
            <div className="relative">
              <div className="bg-tea-green-mist rounded-3xl aspect-square flex items-center justify-center">
                <svg width="260" height="260" viewBox="0 0 300 300" fill="none">
                  {/* Stylized mountain + tea */}
                  <circle cx="150" cy="150" r="120" fill="white" opacity="0.5" />
                  <path d="M60 220L150 80L240 220Z" fill="#C8DDD0" />
                  <path d="M90 220L150 120L210 220Z" fill="#A3BFA8" />
                  <path d="M110 220L150 150L190 220Z" fill="#7D9B84" />
                  {/* Tea cup */}
                  <rect x="120" y="230" width="60" height="35" rx="5" fill="#EDE8DC" />
                  <path d="M115 230Q150 215 185 230" stroke="#7D9B84" strokeWidth="2" fill="none" />
                  <line x1="180" y1="240" x2="195" y2="248" stroke="#A3BFA8" strokeWidth="8" strokeLinecap="round" />
                  {/* Steam */}
                  <path d="M135 225Q130 215 135 205" stroke="#C8DDD0" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M150 222Q145 212 150 202" stroke="#C8DDD0" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M165 225Q160 215 165 205" stroke="#C8DDD0" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-tea-green text-white px-6 py-4 rounded-2xl shadow-lg">
                <div className="font-serif text-3xl font-bold">40+</div>
                <div className="text-tea-green-pale text-xs mt-1">年製茶經驗</div>
              </div>
            </div>

            {/* Text */}
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-6">
                嘉義梅山，<br />一家三口的茶園故事
              </h2>
              <div className="w-10 h-0.5 bg-tea-green mb-7" />
              <p className="text-tea-text-light leading-relaxed mb-5">
                從爸爸媽媽年輕時踏入茶產業開始，我們在嘉義梅山的山區辛勤耕耘超過40年。因為熱愛，也因為責任，霧抉茶始終堅持自產自銷。
              </p>
              <p className="text-tea-text-light leading-relaxed mb-5">
                從茶園種植、茶葉製作、焙火烘焙、分裝包裝到出貨，每一道工序都由我們親手把關。你手上的每一泡茶，都是我們用時間和心意累積而成的風味。
              </p>
              <p className="text-tea-text-light leading-relaxed mb-8">
                只為讓你安心喝下這一口溫潤甘甜。
              </p>
              <Link
                href="/products"
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors"
              >
                探索我們的茶品
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-16 md:py-24 bg-tea-cream-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-tea-green text-xs tracking-[0.3em] uppercase font-medium mb-3">
              Our Farm &amp; Craft
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-tea-text mb-3">
              茶園與製茶記錄
            </h2>
            <div className="w-10 h-0.5 bg-tea-green mx-auto mb-4" />
            <p className="text-tea-text-light max-w-md mx-auto text-sm">
              從清晨採摘到夜晚焙火，記錄每一個讓茶葉蛻變的珍貴時刻
            </p>
          </div>

          {/* 主圖 + 兩格側欄 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 大圖：茶園全景 */}
            <div className="md:col-span-2 relative rounded-3xl overflow-hidden aspect-[4/3] md:aspect-auto md:min-h-[400px] group">
              <Image src="/images/gallery/farm.jpeg" alt="嘉義梅山高山茶園全景" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-6">
                <p className="text-white font-serif text-lg font-bold">嘉義梅山高山茶園</p>
                <p className="text-tea-green-pale text-sm mt-1">終年雲霧環繞的高山茶園</p>
              </div>
            </div>

            {/* 右側兩格 */}
            <div className="grid grid-rows-2 gap-4">
              <div className="relative rounded-3xl overflow-hidden group">
                <Image src="/images/gallery/picking2.jpg" alt="清晨手工採摘茶葉" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4">
                  <p className="text-white text-sm font-bold">清晨採摘嫩芽</p>
                  <p className="text-tea-green-pale text-xs mt-0.5">一心二葉，品質的起點</p>
                </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden group">
                <Image src="/images/gallery/wilting.jpg" alt="日光萎凋製程" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4">
                  <p className="text-white text-sm font-bold">日光萎凋</p>
                  <p className="text-tea-green-pale text-xs mt-0.5">讓茶葉在陽光中舒展</p>
                </div>
              </div>
            </div>
          </div>

          {/* 下排四格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="relative rounded-3xl overflow-hidden aspect-square group">
              <Image src="/images/gallery/wilting2.jpg" alt="室內萎凋製程" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4">
                <p className="text-white text-sm font-bold">室內萎凋</p>
                <p className="text-tea-green-pale text-xs mt-0.5">室內靜置，讓茶葉緩慢發酵</p>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-square group">
              <Image src="/images/gallery/rolling.jpg" alt="手工揉捻茶葉" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4">
                <p className="text-white text-sm font-bold">揉捻成形</p>
                <p className="text-tea-green-pale text-xs mt-0.5">手工揉出茶葉的形與韻</p>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-square group">
              <Image src="/images/gallery/roasting.jpg" alt="精控焙火烘焙" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4">
                <p className="text-white text-sm font-bold">精控焙火烘焙</p>
                <p className="text-tea-green-pale text-xs mt-0.5">40年累積的火候手感</p>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-square group">
              <Image src="/images/gallery/tea-cup.jpg" alt="沖泡完成的茶湯" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-tea-text/70 to-transparent p-4">
                <p className="text-white text-sm font-bold">一杯好茶</p>
                <p className="text-tea-green-pale text-xs mt-0.5">從茶園到您手中的完整旅程</p>
              </div>
            </div>
          </div>

          {/* 更多照片：六宮格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { src: "/images/gallery/farm2.jpg",     alt: "茶園景色" },
              { src: "/images/gallery/picking.jpeg",  alt: "採摘過程" },
              { src: "/images/gallery/wilting2.jpg",  alt: "室內萎凋" },
              { src: "/images/gallery/wilting3.jpg",  alt: "室內萎凋" },
              { src: "/images/gallery/rolling2.jpg",  alt: "揉捻細節" },
              { src: "/images/gallery/tea-cup2.jpg",  alt: "茶湯特寫" },
            ].map((photo) => (
              <div key={photo.src} className="relative rounded-2xl overflow-hidden aspect-square group">
                <Image src={photo.src} alt={photo.alt} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-tea-text/0 group-hover:bg-tea-text/20 transition-colors duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-tea-text mb-3">
              我們的核心價值
            </h2>
            <div className="w-10 h-0.5 bg-tea-green mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                number: "01",
                title: "自產自銷",
                desc: "從茶園種植到出貨配送，全程由我們一家三口親手把關，不假他人之手，確保每一包茶的品質與新鮮。",
              },
              {
                number: "02",
                title: "40年傳承工藝",
                desc: "從父母親踏入茶產業至今超過40年，焙火烘焙憑藉多年積累的經驗與手感掌控，每批茶都是職人心血。",
              },
              {
                number: "03",
                title: "嘉義梅山產區",
                desc: "茶園坐落於嘉義阿里山梅山山區，高山冷涼氣候、終年雲霧，造就茶葉清甜甘醇的獨特風味。",
              },
              {
                number: "04",
                title: "全台配送到府",
                desc: "全台配送，一包也出貨。歡迎來門市試喝，也歡迎線上下單，讓梅山好茶直接送到您手上。",
              },
            ].map((item) => (
              <div
                key={item.number}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-tea-green font-bold text-sm tracking-widest mb-3">
                  {item.number}
                </div>
                <h3 className="font-serif text-2xl font-bold text-tea-text mb-4">
                  {item.title}
                </h3>
                <p className="text-tea-text-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tea Varieties */}
      <section className="py-16 md:py-24 bg-tea-cream-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-tea-text mb-3">
              我們的茶，有故事，也有溫度
            </h2>
            <div className="w-10 h-0.5 bg-tea-green mx-auto mb-5" />
            <p className="text-tea-text-light max-w-md mx-auto">
              無論你偏好哪一種風味，我們都用最熟悉的味道陪你過每一個日常
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
            {[
              {
                name: "高山烏龍茶",
                tag: "清香風味",
                desc: "嘉義梅山高山茶園孕育，雲霧繚繞，茶湯清澈金黃，清香甘醇，回甘悠長。",
                color: "from-green-100 to-emerald-200",
              },
              {
                name: "金萱茶",
                tag: "柔滑奶香",
                desc: "天然奶香獨特迷人，口感柔滑細膩，茶湯淡黃清澈，入門台灣高山茶的最佳首選。",
                color: "from-yellow-100 to-amber-200",
              },
              {
                name: "紅茶",
                tag: "花果香迷人",
                desc: "全發酵製成，帶有迷人花果香氣，茶湯呈琥珀紅色，滋味醇厚甘甜，冷熱皆宜。",
                color: "from-amber-200 to-orange-300",
              },
              {
                name: "紅烏龍茶",
                tag: "焙火厚韻",
                desc: "重度發酵後精心焙火，融合烏龍香氣與紅茶甘醇，果香蜜韻交織，風味獨特耐人尋味。",
                color: "from-red-100 to-rose-200",
              },
              {
                name: "四季春",
                tag: "野花香四溢",
                desc: "清新野花香著稱，茶湯翠綠明亮，滋味鮮爽甘甜，花香持久，是日常品飲的絕佳良伴。",
                color: "from-lime-100 to-green-200",
              },
            ].map((tea) => (
              <div
                key={tea.name}
                className={`bg-gradient-to-br ${tea.color} rounded-2xl p-6 text-center`}
              >
                <span className="text-xs text-tea-green bg-white/70 px-3 py-1 rounded-full font-medium">
                  {tea.tag}
                </span>
                <h3 className="font-serif text-lg font-bold text-tea-text mt-4 mb-3">
                  {tea.name}
                </h3>
                <p className="text-tea-text-light text-xs leading-relaxed">
                  {tea.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-24 bg-tea-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl font-bold text-tea-cream-light mb-6">
            門市資訊與聯絡方式
          </h2>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <h3 className="font-serif text-lg font-bold text-tea-cream-light mb-5">聯絡資訊</h3>
              <div className="space-y-4 text-tea-green-pale text-sm">
                <p>
                  <span className="text-tea-green font-medium block mb-1">門市地址</span>
                  嘉義縣梅山鄉太興村8鄰溪頭19號之2
                </p>
                <p>
                  <span className="text-tea-green font-medium block mb-1">電話訂購</span>
                  0972-619-391
                </p>
                <p>
                  <span className="text-tea-green font-medium block mb-1">配送服務</span>
                  全台配送，一包也出貨
                </p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <h3 className="font-serif text-lg font-bold text-tea-cream-light mb-5">社群平台</h3>
              <div className="space-y-4 text-tea-green-pale text-sm">
                <p>
                  <span className="text-tea-green font-medium block mb-1">搜尋找到我們</span>
                  「霧抉茶」或「江寬育」
                </p>
                <p>IG・Threads・FB 同步更新中</p>
                <p className="pt-2 text-tea-green-pale/80 italic">
                  想喝哪一款？歡迎私訊我們聊聊茶！
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/products"
              className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors"
            >
              選購好茶
            </Link>
            <Link
              href="/process"
              className="border border-tea-green-light text-tea-green-light hover:bg-tea-green-light hover:text-tea-text px-8 py-3.5 rounded-full font-medium transition-colors"
            >
              了解製茶過程
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
