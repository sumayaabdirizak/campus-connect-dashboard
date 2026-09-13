"use client";
import Header from "../../components/header/header"
import ImageWithBasePath from "../../components/image-with-base-path"
import CategorySlider from "./sliders/categoriesSlider"
import ServicesSlider from "./sliders/servicesSlider"
import QuantityControl from "./quantity-control/quantityControl"
import { useEffect } from "react"
import { Client } from "../../core/json/selectOption"
import CommonSelect from "../../components/common-select/commonSelect"
import PosModals from "./modal/posModals"
import Link from "next/link";

const PosCreateComponent = () => {

    // Onclick Border
    useEffect(() => {
        const cards = document.querySelectorAll<HTMLElement>(".pos-card");

        const handleClick = (e: MouseEvent, card: HTMLElement) => {
            e.preventDefault();
            card.classList.toggle("active");
        };

        cards.forEach(card => {
            const listener = (e: MouseEvent) => handleClick(e, card);
            card.addEventListener("click", listener);

            (card as any)._listener = listener;
        });

        return () => {
            cards.forEach(card => {
                if ((card as any)._listener) {
                    card.removeEventListener("click", (card as any)._listener);
                    delete (card as any)._listener;
                }
            });
        };
    }, []);
    // Onclick Border

    // Show Hide Menu
    useEffect(() => {
        // Show menu
        const showButtons = document.querySelectorAll<HTMLElement>(".menu-option-show");
        const hideButtons = document.querySelectorAll<HTMLElement>(".hide-menu-option");

        const slideDown = (el: HTMLElement) => {
            el.style.display = "block";
            el.style.height = "0px";
            const fullHeight = el.scrollHeight;
            el.style.transition = "height 0.4s ease";
            requestAnimationFrame(() => {
                el.style.height = fullHeight + "px";
            });
            setTimeout(() => {
                el.style.height = "";
                el.style.transition = "";
            }, 400);
        };

        const slideUp = (el: HTMLElement) => {
            const fullHeight = el.scrollHeight;
            el.style.height = fullHeight + "px";
            requestAnimationFrame(() => {
                el.style.transition = "height 0.4s ease";
                el.style.height = "0px";
            });
            setTimeout(() => {
                el.style.transition = "";
                el.style.display = "none";
                el.style.height = "";
            }, 400);
        };

        const showHandler = (e: Event) => {
            const btn = e.currentTarget as HTMLElement;
            const menu = btn.closest(".pos-right")?.querySelector<HTMLElement>(".menu-option");
            if (menu) slideDown(menu);
        };

        const hideHandler = (e: Event) => {
            const btn = e.currentTarget as HTMLElement;
            const menu = btn.closest(".pos-right")?.querySelector<HTMLElement>(".menu-option");
            if (menu) slideUp(menu);
        };

        showButtons.forEach(btn => btn.addEventListener("click", showHandler));
        hideButtons.forEach(btn => btn.addEventListener("click", hideHandler));

        // Cleanup
        return () => {
            showButtons.forEach(btn => btn.removeEventListener("click", showHandler));
            hideButtons.forEach(btn => btn.removeEventListener("click", hideHandler));
        };
    }, []);

    // Show Hide Menu

    return (
        <>
            {/* ========================
                Start Page Content
            ========================= */}
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Create Order" ordersCount={15} showOrdersButton={true} />
                    {/* End Page Header */}
                    {/* Start Content Wrap */}
                    <div className="content-wrap pos-design">
                        {/* Start row */}
                        <div className="row g-4">
                            <div className="col-lg-7 pos-left">
                                {/* Start Search */}
                                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3 pb-3 border-bottom">
                                    <div className="input-group input-group-flat search-input">
                                        <span className="input-group-text">
                                            <i className="icon-search" />
                                        </span>
                                        <input type="text" className="form-control" placeholder="Search"/>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        {/* sort by */}
                                        <div className="dropdown">
                                            <Link
                                                href="#"
                                                className="dropdown-toggle btn btn-white d-inline-flex align-items-center fw-normal"
                                                data-bs-toggle="dropdown"
                                            >
                                                Sort by : Lowest Price
                                            </Link>
                                            <div className="dropdown-menu dropdown-menu-end p-3">
                                                <h6 className="fs-14 fw-semibold mb-3">Sort By</h6>
                                                <ul className="list-unstyled mb-0">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded"
                                                        >
                                                            Newest
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded"
                                                        >
                                                            Oldest
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded"
                                                        >
                                                            Ascending
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded"
                                                        >
                                                            Descending
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        {/* new order */}
                                    </div>
                                </div>
                                {/* End search */}
                                {/* Start Services */}
                                <div className="services mb-4">
                                    <div className="pos-title">
                                        <h5 className="mb-0 title">Choose Services</h5>
                                    </div>
                                    <ServicesSlider />
                                </div>
                                {/* End Services */}
                                {/* Start Categories */}
                                <div className="categories">
                                    <CategorySlider />
                                    <div className="tab-content">
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade show active" id="all-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-01.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#"> Waistcoat</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-02.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Evening Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $30
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-03.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $22
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-04.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-05.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse Iron Only</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $36
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-06.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Skirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $14
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-07.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress with Trims</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $12
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-08.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Shirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$5</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-09.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Jumpsuit</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $11
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-10.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress Shorten</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $10
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-11.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Skirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $16
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-12.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $12
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-13.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blazer</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$7</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-14.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Down Jacket</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$6</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-15.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Suit 2pc</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $14
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-16.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress Shorten</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $10
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade" id="accessories-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-02.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Evening Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $30
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-04.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-05.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse Iron Only</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $36
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-09.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Jumpsuit</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $11
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-07.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress with Trims</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $12
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-08.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Shirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$5</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-10.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress Shorten</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $10
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-12.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $12
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade" id="scarf-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-01.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#"> Waistcoat</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-02.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Evening Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $30
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-03.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $22
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-04.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-05.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse Iron Only</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $36
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-09.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Jumpsuit</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $11
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-13.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blazer</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$7</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-14.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Down Jacket</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$6</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade" id="dresses-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-02.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Evening Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $30
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-03.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $22
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-04.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Blouse</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-06.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Skirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $14
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-07.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress with Trims</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $12
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-11.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Skirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $16
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-12.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Silk Dress</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $12
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-13.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blazer</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$7</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade" id="coats-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-01.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#"> Waistcoat</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $15
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade" id="suits-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-15.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Suit 2pc</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $14
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-16.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress Shorten</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $10
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Tab Item  */}
                                        <div className="tab-pane fade" id="knitwear-menu">
                                            <div className="row g-3">
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-08.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Shirt</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">$5</p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-09.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Jumpsuit</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $11
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-10.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Dress Shorten</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $10
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Item */}
                                                <div className="col-xl-3 col-lg-4 col-md-4 col-sm-6">
                                                    <div className="pos-card">
                                                        <Link href="#" className="pos-img">
                                                            <ImageWithBasePath
                                                                src="assets/img/products/product-05.svg"
                                                                alt="pos"
                                                                className="img-fluid img-1"
                                                            />
                                                        </Link>
                                                        <div className="p-2 position-relative">
                                                            <h6 className="fs-12 fw-semibold mb-1">
                                                                <Link href="#">Blouse Iron Only</Link>
                                                            </h6>
                                                            <p className="fs-12 fw-medium text-orange mb-2">
                                                                $36
                                                            </p>
                                                            <QuantityControl />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* end categories */}
                            </div>
                            {/* Pos Right */}
                            <div className="col-lg-5 pos-right position-relative">
                                <div className="card mb-0 position-relative overflow-hidden">
                                    <div className="card-body p-3">
                                        {/* Start Order */}
                                        <div className="mb-4 pb-4 border-bottom">
                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <Link
                                                        href="#"
                                                        className="btn btn-icon bg-primary rounded-circle fw-medium flex-shrink-0"
                                                    >
                                                        <i className="icon-arrow-right-to-line text-white" />
                                                    </Link>
                                                    <div>
                                                        <h5 className="mb-1 d-flex align-items-center gap-2">
                                                            Order #56998{" "}
                                                            <span className="badge bg-soft-warning text-dark">
                                                                Inprogress
                                                            </span>
                                                        </h5>
                                                        <p className="mb-0">08 Oct, 2025, 12:44 PM</p>
                                                    </div>
                                                </div>
                                                <Link
                                                    href="#"
                                                    className="btn btn-white shadow d-flex align-items-center text-danger"
                                                >
                                                    <i className="icon-x me-1" /> Clear
                                                </Link>
                                            </div>
                                            <div className="select-input">
                                                <div className="input-item d-flex align-items-center gap-2 flex-grow-1">
                                                    <CommonSelect
                                                        options={Client}
                                                        className="select2"
                                                        defaultValue={Client[0]}
                                                    />
                                                    <button
                                                        className="btn btn-primary btn-icon"
                                                        data-bs-toggle="offcanvas"
                                                        data-bs-target="#add_order"
                                                    >
                                                        <i className="icon-plus" />
                                                    </button>
                                                </div>
                                                <button
                                                    className="btn btn-icon btn-dark fs-14 fw-normal"
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#edit_order"
                                                >
                                                    <i className="icon-pencil-line" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* End Order */}
                                        {/* Start Details */}
                                        <div className="details">
                                            <div className="pos-title d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                                <h5 className="mb-0 title d-flex align-items-center gap-2">
                                                    Order Details
                                                </h5>
                                                <p className="d-flex align-items-center gap-1 text-dark mb-0">
                                                    Total Items : <span className="badge bg-light rounded-icon">0</span>
                                                </p>
                                            </div>
                                            <div className="border rounded text-center p-5 mb-3">
                                                <div className="mb-2">
                                                    <ImageWithBasePath
                                                        src="assets/img/icons/empty-cart.svg"
                                                        alt="empty"
                                                        className="img-fluid"
                                                    />
                                                </div>
                                                <p className="fw-semibold mb-0">No Items Added to the Cart</p>
                                            </div>
                                            <div className="accordion pos-accordion" id="faq-details">
                                                {/* FAQ Item */}
                                                <div className="accordion-item bg-light border-0">
                                                    <h3 className="accordion-header" id="headingTen">
                                                        <Link
                                                            href="#"
                                                            className="accordion-button d-flex align-items-center justify-content-between"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target="#collapseSix"
                                                            aria-expanded="true"
                                                        >
                                                            Payment Summary
                                                        </Link>
                                                    </h3>
                                                    <div
                                                        id="collapseSix"
                                                        className="accordion-collapse collapse show"
                                                        data-bs-parent="#faq-details"
                                                    >
                                                        <div className="accordion-body">
                                                            <div className="accordion-content">
                                                                <h6 className="mb-3 d-flex align-items-center justify-content-between gap-1 fs-14 fw-semibold text-body">
                                                                    {" "}
                                                                    <span className="d-flex align-items-center"> Sub Total</span>{" "}
                                                                    <span className="text-dark">$0</span>{" "}
                                                                </h6>
                                                                <h6 className="mb-3 d-flex align-items-center justify-content-between gap-1 fs-14 fw-semibold text-body">
                                                                    {" "}
                                                                    <span className="d-flex align-items-center">
                                                                        {" "}
                                                                        Tax (10%){" "}
                                                                        <button className="text-dark fs-14 fw-normal p-0 border-0 bg-transparent ms-1">
                                                                            <i className="icon-pencil-line" />
                                                                        </button>{" "}
                                                                    </span>{" "}
                                                                    <span className="text-dark">$0</span>{" "}
                                                                </h6>
                                                                <h6 className="mb-3 d-flex align-items-center justify-content-between gap-1 fs-14 fw-semibold text-body">
                                                                    {" "}
                                                                    <span className="d-flex align-items-center">
                                                                        {" "}
                                                                        Discount&nbsp;(12%){" "}
                                                                        <button className="text-dark fs-14 fw-normal p-0 border-0 bg-transparent ms-1">
                                                                            <i className="icon-pencil-line" />
                                                                        </button>{" "}
                                                                    </span>{" "}
                                                                    <span className="text-danger">$0</span>{" "}
                                                                </h6>
                                                                <h6 className="mb-3 d-flex align-items-center justify-content-between gap-1 fs-14 fw-semibold text-body">
                                                                    {" "}
                                                                    <span className="d-flex align-items-center">
                                                                        {" "}
                                                                        Coupoun{" "}
                                                                        <button className="text-dark fs-14 fw-normal p-0 border-0 bg-transparent ms-1">
                                                                            <i className="icon-pencil-line" />
                                                                        </button>{" "}
                                                                    </span>{" "}
                                                                    <span className="text-dark">$0</span>{" "}
                                                                </h6>
                                                                <div className="pt-3 mt-3 border-top">
                                                                    <h5 className="d-flex align-items-center justify-content-between gap-1 fs-18 fw-bold mb-0">
                                                                        Amount to be Paid <span>$0</span>
                                                                    </h5>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* /FAQ Item */}
                                            </div>
                                        </div>

                                        {/* End Details */}
                                        {/* Start Delivery */}
                                        <div className="delivery-item">
                                            <div className="delivery-wrap flex-grow-1">
                                                <span className="d-flex align-items-center gap-2 time">
                                                    <i className="icon-clock" /> Pickup and Delivery
                                                </span>
                                                <div className="select-item">
                                                    <Link
                                                        href="#"
                                                        data-bs-toggle="modal"
                                                        data-bs-target="#pickup_delivery"
                                                        className="d-flex align-items-center"
                                                    >
                                                        {" "}
                                                        <span className="text-decoration-underline">
                                                            Select
                                                        </span>{" "}
                                                        <i className="icon-chevron-right ms-1" />
                                                    </Link>
                                                </div>
                                            </div>
                                            <button className="btn btn-icon btn-dark menu-option-show p-0 border-0">
                                                {" "}
                                                <i className="icon-settings-2" />
                                            </button>
                                        </div>
                                        {/* End Delivery */}
                                        {/* Start Creadit */}
                                        <div className="credit-item">
                                            <div className="credit-wrap">
                                                <span className="d-flex align-items-center justify-content-center gap-1 text-white fw-semibold">
                                                    <i className="icon-badge-dollar-sign text-secondary" />{" "}
                                                    Credit Card
                                                </span>
                                                <Link
                                                    href="#"
                                                    className="text-white link d-flex align-items-center gap-1"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#select_payment"
                                                >
                                                    {" "}
                                                    <span className="text-decoration-underline">
                                                        Change
                                                    </span>{" "}
                                                    <i className="icon-chevron-right" />
                                                </Link>
                                            </div>
                                            <Link
                                                href="#"
                                                className="btn btn-light w-100"
                                                data-bs-toggle="modal"
                                                data-bs-target="#order_created"
                                            >
                                                Pay Now $0
                                            </Link>
                                        </div>
                                        {/* End Creadit */}
                                    </div>
                                    {/* Start Menu  */}
                                    <div className="menu-option">
                                        <h5 className="d-flex align-items-center justify-content-between mb-4 fs-20">
                                            Options <button className="hide-menu-option">Hide</button>
                                        </h5>
                                        <div className="row row-gap-3">
                                            <div className="col-sm-4">
                                                <Link
                                                    href="#"
                                                    className="d-flex align-items-center gap-2 btn btn-dark"
                                                >
                                                    {" "}
                                                    <i className="icon-printer" /> Print
                                                </Link>
                                            </div>
                                            <div className="col-sm-4">
                                                <Link
                                                    href="#"
                                                    className="d-flex align-items-center gap-2 btn btn-dark"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#view_invoices"
                                                >
                                                    {" "}
                                                    <i className="icon-file-chart-column" />
                                                    Invoice
                                                </Link>
                                            </div>
                                            <div className="col-sm-4">
                                                <Link
                                                    href="#"
                                                    className="d-flex align-items-center gap-2 btn btn-dark"
                                                >
                                                    {" "}
                                                    <i className="icon-files" /> Draft{" "}
                                                </Link>
                                            </div>
                                            <div className="col-sm-4">
                                                <Link
                                                    href="#"
                                                    className="d-flex align-items-center gap-2 btn btn-dark"
                                                >
                                                    {" "}
                                                    <i className="icon-x" /> Cancel
                                                </Link>
                                            </div>
                                            <div className="col-sm-4">
                                                <Link
                                                    href="#"
                                                    className="d-flex align-items-center gap-2 btn btn-dark"
                                                >
                                                    {" "}
                                                    <i className="icon-zap" />
                                                    Void
                                                </Link>
                                            </div>
                                            <div className="col-sm-4">
                                                <Link
                                                    href="#"
                                                    className="d-flex align-items-center gap-2 btn btn-dark"
                                                >
                                                    {" "}
                                                    <i className="icon-file-chart-line" /> Transactions
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                    {/* End Menu  */}
                                </div>
                            </div>
                        </div>
                        {/* end row */}
                    </div>
                </div>
                {/* End Content Wrap */}
            </div>
            {/* End Content */}
            {/* ========================
                End Page Content
            ========================= */}
            <PosModals />
        </>

    )
}

export default PosCreateComponent