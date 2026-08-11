import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import { all_routes } from "../../routes/all_routes";
import ImageWithBasePath from "../../components/image-with-base-path";
import Link from "next/link";

interface SlideItem {
  to: string;
  icon: string;
  label: string;
}

const slides: SlideItem[] = [
  { to: all_routes.orders, icon: "assets/img/icons/cart-icon-1.svg", label: "Orders" },
  { to: all_routes.products, icon: "assets/img/icons/cart-icon-2.svg", label: "Products" },
  { to: all_routes.invoices, icon: "assets/img/icons/cart-icon-3.svg", label: "Invoices" },
  { to: all_routes.customers, icon: "assets/img/icons/cart-icon-4.svg", label: "Customer" },
  { to: all_routes.driversList, icon: "assets/img/icons/cart-icon-5.svg", label: "Drivers" },
];

const CategorySlider: React.FC = () => {
  return (
    <div className="category-slider-wrapper position-relative">
      <Swiper
        spaceBetween={24}
        loop={true}
        breakpoints={{
          1400: { slidesPerView: 3 },
          1199: { slidesPerView: 3 },
          768: { slidesPerView: 2 },
          576: { slidesPerView: 1 },
        }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index} className="slide-item">
            <div className="card rounded-lg bg-light mb-0">
              <div className="card-body d-flex align-items-center justify-content-between p-3">
                <Link href={slide.to} className="d-flex align-items-center gap-3">
                  <span className="avatar avatar-md rounded-circle bg-white">
                    <ImageWithBasePath src={slide.icon} alt="icon" className="img-fluid cart-icon" />
                  </span>
                  <p className="fw-semibold text-dark mb-0">{slide.label}</p>
                </Link>
                <Link href={slide.to} className="link">
                  <i className="icon-chevron-right"></i>
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default CategorySlider;
