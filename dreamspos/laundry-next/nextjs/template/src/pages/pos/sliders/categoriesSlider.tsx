"use client";
import { type FC, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/swiper-bundle.css";
import Link from "next/link";

const CategorySlider: FC = () => {
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div>

      {/* --- Title + Arrows (unchanged) --- */}
      <div className="pos-title d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 className="mb-0 title">Categories</h5>

        <div className="d-flex align-items-center gap-2">
          <button type="button" className="slick-arrow category-prev" ref={prevRef}>
            <i className="icon-arrow-left" />
          </button>

          <button type="button" className="slick-arrow category-next" ref={nextRef}>
            <i className="icon-arrow-right" />
          </button>
        </div>
      </div>

      {/* --- Swiper Category Slider --- */}
      <Swiper
        modules={[Navigation]}
        loop={true}
        speed={2000}
        spaceBetween={8}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={(swiper) => {
          // @ts-ignore
          swiper.params.navigation.prevEl = prevRef.current;
          // @ts-ignore
          swiper.params.navigation.nextEl = nextRef.current;
          swiper.navigation.init();
          swiper.navigation.update();
        }}
        breakpoints={{
          1400: { slidesPerView: 4 },
          1199: { slidesPerView: 4 },
          768: { slidesPerView: 3 },
          576: { slidesPerView: 2 },
        }}
        className="nav nav-tabs nav-tabs-solid category-tab border-0 category-slider mb-4"
      >

        {/* --- Each <li> becomes SwiperSlide, design intact --- */}

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#all-menu" className="nav-link active" data-bs-toggle="tab">
              All <span className="badge">200</span>
            </Link>
          </li>
        </SwiperSlide>

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#accessories-menu" className="nav-link" data-bs-toggle="tab">
              Accessories <span className="badge">45</span>
            </Link>
          </li>
        </SwiperSlide>

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#scarf-menu" className="nav-link" data-bs-toggle="tab">
              Scarf <span className="badge">33</span>
            </Link>
          </li>
        </SwiperSlide>

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#dresses-menu" className="nav-link" data-bs-toggle="tab">
              Dresses <span className="badge">42</span>
            </Link>
          </li>
        </SwiperSlide>

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#coats-menu" className="nav-link" data-bs-toggle="tab">
              Coats <span className="badge">0</span>
            </Link>
          </li>
        </SwiperSlide>

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#suits-menu" className="nav-link" data-bs-toggle="tab">
              Suits <span className="badge">45</span>
            </Link>
          </li>
        </SwiperSlide>

        <SwiperSlide>
          <li className="nav-item">
            <Link href="#knitwear-menu" className="nav-link" data-bs-toggle="tab">
              Knitwear <span className="badge">75</span>
            </Link>
          </li>
        </SwiperSlide>

      </Swiper>
    </div>
  );
};

export default CategorySlider;
