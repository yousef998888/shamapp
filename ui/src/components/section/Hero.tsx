import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slides = [
    {
      id: 1,
      image:
        "https://klbtheme.com/bevesi/wp-content/uploads/2024/04/slider-01.jpg",
      title: "Everyday Essentials, Exceptional Prices.",
      subtitle: "Bevesi Natural Foods",
      description:
        "We have prepared the most special discounts for you on the most popular products you need. Don't miss these opportunities...",
      textButton: "Shop Now",
      linkButton: "/products",
    },
    {
      id: 2,
      image:
        "https://klbtheme.com/bevesi/wp-content/uploads/2024/04/slider-01.jpg",
      title: "Everyday Essentials, Exceptional Prices.",
      subtitle: "Bevesi Natural Foods",
      description:
        "We have prepared the most special discounts for you on the most popular products you need. Don't miss these opportunities...",
      textButton: "Shop Now",
      linkButton: "/products",
    },
    {
      id: 3,
      image:
        "https://klbtheme.com/bevesi/wp-content/uploads/2024/04/slider-01.jpg",
      title: "Everyday Essentials, Exceptional Prices.",
      subtitle: "Bevesi Natural Foods",
      description:
        "We have prepared the most special discounts for you on the most popular products you need. Don't miss these opportunities...",
      textButton: "Shop Now",
      linkButton: "/products",
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length, isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section>
      <div className="max-w-[1641px] w-full mx-auto flex items-start justify-center gap-4">
        {/* السلايدر */}
        <div className="w-full">
          <div className="relative w-full h-96 md:h-[500px] lg:h-[600px] overflow-hidden rounded max-h-[512px] group">
            {slides.map((slide, index: number) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ${
                  index === currentSlide
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-105"
                }`}
              >
                <div
                  className="w-full h-full bg-cover bg-center bg-no-repeat transition-transform duration-[6000ms] hover:scale-110"
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  <div className="relative z-10 h-full flex items-center justify-start">
                    <div className="text-start p-2 md:p-[3.75rem] w-full md:max-w-5xl">
                      <p className="text-sm font-medium animate-slide-up leading-tight">
                        <span className="text-black">{slide.subtitle}</span>
                      </p>
                      <h1 className="text-xl my-5 animate-slide-up animation-delay-200 text-black md:text-[52px] leading-tight w-full md:w-3/5 font-semibold">
                        {slide.title}
                      </h1>
                      <p className="text-sm mb-5 font-medium animate-slide-up leading-tight w-full md:w-1/2">
                        <span className="text-black">{slide.description}</span>
                      </p>
                      <div>
                        <a
                          href={slide.linkButton}
                          className="bg-white hover:bg-white/30 text-black py-2 px-5 flex items-center gap-2 justify-start w-full max-w-[120px] rounded animate-slide-up animation-delay-400"
                        >
                          {slide.textButton}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* أزرار السلايدر */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white hover:bg-white/30 text-primary py-4 transition-all duration-300 backdrop-blur-md border border-white/20 hover:scale-110 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white hover:bg-white/30 text-primary py-4 transition-all duration-300 backdrop-blur-md border border-white/20 hover:scale-110 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-7 h-7" />
            </button>

            {/* النقاط */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
              {slides.map((_, index: number) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-500 rounded-full ${
                    index === currentSlide
                      ? "w-12 h-4 bg-white shadow-lg scale-110"
                      : "w-4 h-4 bg-white/50 hover:bg-white/75 hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* البلوكات تحت السلايدر */}
          <div className="w-full flex items-center text-center md:text-start justify-center flex-wrap md:flex-nowrap gap-4 mt-4">
            <div className="bg-[#F1F5E8] w-full min-h-[140px] px-[24px] py-[28px] rounded shadow flex items-center justify-center flex-wrap md:flex-nowrap text-white">
              <div>
                <h2 className="text-[18px] mb-[11px] text-[#047857] font-bold">
                  Visit us to get the best prices
                </h2>
                <p className="text-[13px] text-[#000000]">
                  Kontraliga igen i transsofi donas: portad och båvaktig. Oktigt
                  nusm nigon, i nyvement sare.
                </p>
              </div>
              <div className="w-1/2">
                <button className="bg-[#10b981] text-white px-[12px] my-4 md:my-0 py-[4px] w-full rounded hover:bg-green-600 transition-colors">
                  View More
                </button>
              </div>
            </div>
            <div className="bg-[#FCF0EB] w-full min-h-[140px] px-[24px] py-[28px] rounded shadow flex items-center justify-center flex-wrap md:flex-nowrap text-white">
              <div>
                <h2 className="text-[18px] mb-[11px] text-[#881337] font-bold">
                  Visit us to get the best prices
                </h2>
                <p className="text-[13px] text-[#000000]">
                  Kontraliga igen i transsofi donas: portad och båvaktig. Oktigt
                  nusm nigon, i nyvement sare.
                </p>
              </div>
              <div className="w-1/2">
                <button className="bg-[#e11d48] text-white px-[12px] my-4 md:my-0 py-[4px] w-full rounded hover:bg-red-600 transition-colors">
                  View More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* أنيميشن */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 1s ease-out forwards;
        }
        .animation-delay-200 {
          animation-delay: 0.3s;
          opacity: 0;
        }
        .animation-delay-400 {
          animation-delay: 0.6s;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
