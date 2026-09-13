"use client";
import { type FC, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import ImageWithBasePath from "../../../components/image-with-base-path";

const ServicesSliderOne: FC = () => {

  // 👇 slide 3 active by default
  const [activeIndex, setActiveIndex] = useState<number>(2);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="services-slider-wrapper">

      <Swiper
        speed={2000}
        loop={true}
        spaceBetween={24}
        breakpoints={{
          1400: { slidesPerView: 3 },
          992: { slidesPerView: 3 },
          768: { slidesPerView: 2 },
          576: { slidesPerView: 1 },
        }}
        className="services-slider"
      >

        {/* --- Slide 1 --- */}
        <SwiperSlide>
          <div className="slide-item" onClick={() => handleSelect(0)}>
            <div className={`services-card bg-soft-secondary ${activeIndex === 0 ? "active" : ""}`}>
              <ImageWithBasePath src="assets/img/icons/pos-icon-1.svg" alt="icon" className="img-fluid icon-1" />
              <h6>Ironing</h6>
              <span className="bg-secondary-3 circle"></span>
              <span className="bg-secondary-3 circle two"></span>
            </div>
          </div>
        </SwiperSlide>

        {/* --- Slide 2 --- */}
        <SwiperSlide>
          <div className="slide-item" onClick={() => handleSelect(1)}>
            <div className={`services-card bg-soft-info ${activeIndex === 1 ? "active" : ""}`}>
              <ImageWithBasePath src="assets/img/icons/pos-icon-2.svg" alt="icon" className="img-fluid icon-1" />
              <h6>Laundry</h6>
              <span className="bg-info-3 circle"></span>
              <span className="bg-info-3 circle two"></span>
            </div>
          </div>
        </SwiperSlide>

        {/* --- Slide 3 (default active) --- */}
        <SwiperSlide>
          <div className="slide-item" onClick={() => handleSelect(2)}>
            <div className={`services-card bg-soft-primary ${activeIndex === 2 ? "active" : ""}`}>
              <ImageWithBasePath src="assets/img/icons/pos-icon-3.svg" alt="icon" className="img-fluid icon-1" />
              <h6>Dry Cleaning</h6>
              <span className="bg-primary-3 circle"></span>
              <span className="bg-primary-3 circle two"></span>
            </div>
          </div>
        </SwiperSlide>

        {/* --- Slide 4 --- */}
        <SwiperSlide>
          <div className="slide-item" onClick={() => handleSelect(3)}>
            <div className={`services-card bg-soft-orange ${activeIndex === 3 ? "active" : ""}`}>
              <ImageWithBasePath src="assets/img/icons/pos-icon-4.svg" alt="icon" className="img-fluid icon-1" />
              <h6>Wet Cleaning</h6>
              <span className="bg-orange-3 circle"></span>
              <span className="bg-orange-3 circle two"></span>
            </div>
          </div>
        </SwiperSlide>

        {/* --- Slide 5 --- */}
        <SwiperSlide>
          <div className="slide-item" onClick={() => handleSelect(4)}>
            <div className={`services-card bg-soft-success ${activeIndex === 4 ? "active" : ""}`}>
              <ImageWithBasePath src="assets/img/icons/pos-icon-5.svg" alt="icon" className="img-fluid icon-1" />
              <h6>Wash & Fold</h6>
              <span className="bg-success-3 circle"></span>
              <span className="bg-success-3 circle two"></span>
            </div>
          </div>
        </SwiperSlide>

        {/* --- Slide 6 --- */}
        <SwiperSlide>
          <div className="slide-item" onClick={() => handleSelect(5)}>
            <div className={`services-card bg-soft-purple ${activeIndex === 5 ? "active" : ""}`}>
              <ImageWithBasePath src="assets/img/icons/pos-icon-6.svg" alt="icon" className="img-fluid icon-1" />
              <h6>Clothing</h6>
              <span className="bg-purple-3 circle"></span>
              <span className="bg-purple-3 circle two"></span>
            </div>
          </div>
        </SwiperSlide>

      </Swiper>
    </div>
  );
};

export default ServicesSliderOne;
