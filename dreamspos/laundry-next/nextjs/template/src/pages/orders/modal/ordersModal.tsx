"use client";

import Link from "next/link";
import CommonSelect from "../../../components/common-select/commonSelect"
import ImageWithBasePath from "../../../components/image-with-base-path"
import { City, Country, Gender, State, Status_Inactive } from "../../../core/json/selectOption"
import { useState } from "react"
import CommonDatePicker from "../../../components/common-date-picker/commonDatePicker"

const OrdersModal = () => {

    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            {/* View Order */}
            <div className="modal fade" id="view_order">
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-bottom p-4 pb-3">
                            <h4 className="modal-title">Order Details</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-modal position-relative"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <div className="modal-body p-4">
                            <div className="mb-4">
                                <div className="row g-3">
                                    <div className="col-lg-2 col-sm-4">
                                        <span className="d-block fs-13 mb-1">Order ID</span>
                                        <p className="fw-medium text-dark mb-0">OD1245</p>
                                    </div>
                                    <div className="col-lg-2 col-sm-4">
                                        <span className="d-block fs-13 mb-1">Amount</span>
                                        <p className="fw-medium text-dark mb-0">$565</p>
                                    </div>
                                    <div className="col-lg-2 col-sm-4">
                                        <span className="d-block fs-13 mb-1">No of Items</span>
                                        <p className="fw-medium text-dark mb-0">20</p>
                                    </div>
                                    <div className="col-lg-2 col-sm-4">
                                        <span className="d-block fs-13 mb-1">Status</span>
                                        <span className="badge badge-soft-info">Collected</span>
                                    </div>
                                    <div className="col-lg-2 col-sm-4">
                                        <span className="d-block fs-13 mb-1">Order Date</span>
                                        <p className="fw-medium text-dark mb-0">
                                            Dec 08, 2025 09:28 AM
                                        </p>
                                    </div>
                                    <div className="col-lg-2 col-sm-4">
                                        <div className="text-lg-end">
                                            <ImageWithBasePath
                                                src="assets/img/icons/paid.svg"
                                                alt="paid"
                                                className="img-fluid"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-light border rounded p-3 mb-4">
                                <div className="order-wizard position-relative row g-3 g-lg-0 row-cols-1 row-cols-lg-5">
                                    <div className="order-item z-1 active text-center position-relative">
                                        <div className="order-icon avatar avatar-rounded mb-2">
                                            <i className="icon-check fs-24" />
                                        </div>
                                        <div>
                                            <h6 className="fs-14 fw-semibold mb-2">Pending</h6>
                                            <p className="fs-13 mb-0">2025-12-08 09:28:15</p>
                                        </div>
                                    </div>
                                    <div className="order-item z-1 active text-center position-relative">
                                        <div className="order-icon avatar avatar-rounded mb-2">
                                            <i className="icon-check fs-24" />
                                        </div>
                                        <div>
                                            <h6 className="fs-14 fw-semibold mb-2">Approved</h6>
                                            <p className="fs-13 mb-0">2025-12-08 09:28:15</p>
                                        </div>
                                    </div>
                                    <div className="order-item z-1 active text-center position-relative">
                                        <div className="order-icon avatar avatar-rounded mb-2">
                                            <i className="icon-check fs-24" />
                                        </div>
                                        <div>
                                            <h6 className="fs-14 fw-semibold mb-2">Collected</h6>
                                            <p className="fs-13 mb-0">2025-12-08 09:28:15</p>
                                        </div>
                                    </div>
                                    <div className="order-item z-1 text-center position-relative">
                                        <div className="order-icon avatar avatar-rounded mb-2">
                                            <i className="icon-check fs-24" />
                                        </div>
                                        <div>
                                            <h6 className="fs-14 fw-semibold mb-0">Verified and Paid</h6>
                                        </div>
                                    </div>
                                    <div className="order-item z-1 text-center position-relative">
                                        <div className="order-icon avatar avatar-rounded mb-2">
                                            <i className="icon-check fs-24" />
                                        </div>
                                        <div>
                                            <h6 className="fs-14 fw-semibold mb-0">Delivered</h6>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <h5 className="mb-3">Order Items</h5>
                            <div className="row g-4">
                                <div className="col-lg-6">
                                    <div className="accordion accordion-bordered" id="orderAccordion">
                                        <div className="accordion-item">
                                            <h2 className="accordion-header">
                                                <button
                                                    className="accordion-button bg-transparent fw-bold fs-16"
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target="#cleaning"
                                                    aria-expanded="true"
                                                >
                                                    Dry Cleaning
                                                </button>
                                            </h2>
                                            <div
                                                id="cleaning"
                                                className="accordion-collapse collapse show"
                                                data-bs-parent="#orderAccordion"
                                            >
                                                <div className="accordion-body border-0 pt-0">
                                                    <div className="mb-3">
                                                        <p className="mb-2">
                                                            Evening Dress × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $30
                                                            </span>
                                                        </p>
                                                        <p className="mb-2">
                                                            Jumpsuit × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $11
                                                            </span>
                                                        </p>
                                                        <p className="mb-2">
                                                            Long Coat × 3{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $11
                                                            </span>
                                                        </p>
                                                        <p className="mb-2">
                                                            Dinner Suit × 3{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $11
                                                            </span>
                                                        </p>
                                                        <p className="mb-2">
                                                            Down Jacket × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $11
                                                            </span>
                                                        </p>
                                                        <h6 className="mb-0">
                                                            Sub Total{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $164
                                                            </span>
                                                        </h6>
                                                    </div>
                                                    <div className="mb-3">
                                                        <h6 className="mb-3">Add Ons</h6>
                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                            <span className="badge badge-soft-primary">
                                                                Detergent : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Softener : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dry : High Hot
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dryer Sheet : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Bleach : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Oxyclean : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Wash Seperately : Yes
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mb-0">
                                                        <h6 className="mb-3">Special Instruction</h6>
                                                        <p className="mb-0">
                                                            Wash cold on temprature Between 30F and 60F
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="accordion-item">
                                            <h2 className="accordion-header">
                                                <button
                                                    className="accordion-button bg-transparent fw-bold fs-16"
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target="#laundry"
                                                    aria-expanded="true"
                                                >
                                                    Laundry
                                                </button>
                                            </h2>
                                            <div
                                                id="laundry"
                                                className="accordion-collapse collapse"
                                                data-bs-parent="#orderAccordion"
                                            >
                                                <div className="accordion-body border-0 pt-0">
                                                    <div className="mb-3">
                                                        <p className="mb-2">
                                                            Dress Shorten × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $30
                                                            </span>
                                                        </p>
                                                        <p className="mb-2">
                                                            Skirt × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $11
                                                            </span>
                                                        </p>
                                                        <h6 className="mb-0">
                                                            Sub Total{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $41
                                                            </span>
                                                        </h6>
                                                    </div>
                                                    <div className="mb-3">
                                                        <h6 className="mb-3">Add Ons</h6>
                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                            <span className="badge badge-soft-primary">
                                                                Detergent : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Softener : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dry : High Hot
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dryer Sheet : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Bleach : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Oxyclean : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Wash Seperately : Yes
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mb-0">
                                                        <h6 className="mb-3">Special Instruction</h6>
                                                        <p className="mb-0">
                                                            Wash cold on temprature Between 30F and 60F
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="accordion-item">
                                            <h2 className="accordion-header">
                                                <button
                                                    className="accordion-button bg-transparent fw-bold fs-16"
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target="#wet"
                                                    aria-expanded="true"
                                                >
                                                    Wet Cleaning
                                                </button>
                                            </h2>
                                            <div
                                                id="wet"
                                                className="accordion-collapse collapse"
                                                data-bs-parent="#orderAccordion"
                                            >
                                                <div className="accordion-body border-0 pt-0">
                                                    <div className="mb-3">
                                                        <p className="mb-2">
                                                            Pleated Skirt × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $20
                                                            </span>
                                                        </p>
                                                        <h6 className="mb-0">
                                                            Sub Total{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $20
                                                            </span>
                                                        </h6>
                                                    </div>
                                                    <div className="mb-3">
                                                        <h6 className="mb-3">Add Ons</h6>
                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                            <span className="badge badge-soft-primary">
                                                                Detergent : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Softener : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dry : High Hot
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dryer Sheet : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Bleach : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Oxyclean : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Wash Seperately : Yes
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mb-0">
                                                        <h6 className="mb-3">Special Instruction</h6>
                                                        <p className="mb-0">
                                                            Wash cold on temprature Between 30F and 60F
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="accordion-item">
                                            <h2 className="accordion-header">
                                                <button
                                                    className="accordion-button bg-transparent fw-bold fs-16"
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target="#wash"
                                                    aria-expanded="true"
                                                >
                                                    Wash &amp; Iron
                                                </button>
                                            </h2>
                                            <div
                                                id="wash"
                                                className="accordion-collapse collapse"
                                                data-bs-parent="#orderAccordion"
                                            >
                                                <div className="accordion-body border-0 pt-0">
                                                    <div className="mb-3">
                                                        <p className="mb-2">
                                                            Silk Trouser × 1{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $30
                                                            </span>
                                                        </p>
                                                        <h6 className="mb-0">
                                                            Sub Total{" "}
                                                            <span className="fw-medium text-dark float-end">
                                                                $30
                                                            </span>
                                                        </h6>
                                                    </div>
                                                    <div className="mb-3">
                                                        <h6 className="mb-3">Add Ons</h6>
                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                            <span className="badge badge-soft-primary">
                                                                Detergent : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Softener : Free
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dry : High Hot
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Dryer Sheet : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Bleach : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Oxyclean : Yes
                                                            </span>
                                                            <span className="badge badge-soft-primary">
                                                                Wash Seperately : Yes
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mb-0">
                                                        <h6 className="mb-3">Special Instruction</h6>
                                                        <p className="mb-0">
                                                            Wash cold on temprature Between 30F and 60F
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div className="bg-warning-subtle rounded border border-warning p-3 mb-4">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <h5 className="mb-0">Order Notes</h5>
                                            <Link href="#" className="btn btn-icon btn-md btn-white p-0">
                                                <i className="icon-pencil-line" />
                                            </Link>
                                        </div>
                                        <p className="mb-0">
                                            Use mild detergent only No bleach on any clothes &amp;
                                            Separate whites &amp; colored clothes, Steam press shirts
                                            only, Fold clothes, do not hang.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded border p-3 mb-4">
                                        <h5 className="mb-3">Customer</h5>
                                        <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom flex-wrap gap-3">
                                            <div className="d-flex align-items-center">
                                                <div className="avatar avatar-lg avatar-rounded me-2">
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-06.jpg"
                                                        alt="customer"
                                                        className="img-fluid"
                                                    />
                                                </div>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">Kelley Davis</h6>
                                                    <p className="fs-13 mb-0">No of Order : 12</p>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <span className="avatar avatar-sm avatar-rounded bg-light border text-dark me-2">
                                                    <i className="icon-phone fs-16" />
                                                </span>
                                                <p className="text-dark mb-0">+1 545698 54589</p>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h5 className="mb-0">Pickup / Delivery Address</h5>
                                            <Link href="#" className="btn btn-icon btn-md btn-white p-0">
                                                <i className="icon-pencil-line" />
                                            </Link>
                                        </div>
                                        <div className="row g-4">
                                            <div className="col-md-6">
                                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-2">
                                                    <h6 className="fs-14 fw-semibold mb-0">Pickup Address</h6>
                                                    <Link href="#" className="link-orange">
                                                        View Map
                                                    </Link>
                                                </div>
                                                <div className="mb-2">
                                                    <iframe
                                                        className="rounded w-100"
                                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2967.8862835683544!2d-73.98256668525309!3d41.93829486962529!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89dd0ee3286615b7%3A0x42bfa96cc2ce4381!2s132%20Kingston%20St%2C%20Kingston%2C%20NY%2012401%2C%20USA!5e0!3m2!1sen!2sin!4v1670922579281!5m2!1sen!2sin"
                                                        allowFullScreen
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                        title="Map"
                                                    />
                                                </div>
                                                <p className="text-dark mb-1">
                                                    742 Evergreen Terrace, IL 62704
                                                </p>
                                                <p className="mb-0">on Friday, Dec 2025, 11 AM - 12 PM </p>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-2">
                                                    <h6 className="fs-14 fw-semibold mb-0">
                                                        Delivery Address
                                                    </h6>
                                                    <Link href="#" className="link-orange">
                                                        View Map
                                                    </Link>
                                                </div>
                                                <div className="mb-2">
                                                    <iframe
                                                        className="rounded w-100"
                                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2967.8862835683544!2d-73.98256668525309!3d41.93829486962529!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89dd0ee3286615b7%3A0x42bfa96cc2ce4381!2s132%20Kingston%20St%2C%20Kingston%2C%20NY%2012401%2C%20USA!5e0!3m2!1sen!2sin!4v1670922579281!5m2!1sen!2sin"
                                                        allowFullScreen
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                        title="Map"
                                                    />
                                                </div>
                                                <p className="text-dark mb-1">
                                                    1600 Pennsylvania NW, DC 20500
                                                </p>
                                                <p className="mb-0">on Sunday, Dec 2025, 01 PM - 02 PM </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded border p-3 mb-0">
                                        <h5 className="mb-3">Payment Details</h5>
                                        <div className="row row-cols-lg-5 row-cols-2 g-2">
                                            <div>
                                                <p className="fs-13 mb-1">Payment Type</p>
                                                <p className="fw-medium text-dark mb-0">Card</p>
                                            </div>
                                            <div>
                                                <p className="fs-13 mb-1">Total</p>
                                                <p className="fw-medium text-dark mb-0">$164</p>
                                            </div>
                                            <div>
                                                <p className="fs-13 mb-1">Discount</p>
                                                <p className="fw-medium text-dark mb-0">$16</p>
                                            </div>
                                            <div>
                                                <p className="fs-13 mb-1">Tax</p>
                                                <p className="fw-medium text-dark mb-0">$5 (10%)</p>
                                            </div>
                                            <div>
                                                <p className="fs-13 mb-1">Coupon</p>
                                                <p className="fw-medium text-dark mb-0">$0</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Add drivers */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="add_driver">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Create Order</h4>
                    <button
                        type="button"
                        className="btn-close btn-close-modal"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    >
                        <i className="icon-x" />
                    </button>
                </div>
                <form
                    className="d-flex flex-column overflow-y-auto h-100"
                >
                    <div className="offcanvas-body pb-0 p-0">
                        <div className="orders-tab d-flex align-items-start p-3">
                            <ul className="nav nav-pills w-100 d-flex gap-3 align-items-center flex-nowrap">
                                <li>
                                    <Link
                                        href="#"
                                        className="nav-link active d-flex align-items-center justify-content-center mb-0"
                                        data-bs-toggle="tab"
                                        data-bs-target="#driversTab"
                                    >
                                        <i className="icon-bike me-2" />
                                        Drivers
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="nav-link d-flex align-items-center justify-content-center mb-0"
                                        data-bs-toggle="tab"
                                        data-bs-target="#add-new-driverTab"
                                    >
                                        <i className="icon-plus me-2" />
                                        Add New Driver
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="driversTab">
                                <div className="gx-3 p-3 mb-2">
                                    <div className="col-lg-12 col-md-12">
                                        <label className="form-label fw-bold">All Drivers </label>
                                        <div className="mb-0">
                                            <div className="page-search">
                                                <i className="icon-search fs-14" />
                                                <input
                                                    type="search"
                                                    className="form-control form-control-sm"
                                                    placeholder="Search by name/Phone Number"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between p-3 mb-3 border-top border-bottom order-select-card">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            name="customer"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar-rounded flex-shrink-0 me-2"
                                            >
                                                <ImageWithBasePath
                                                    src="assets/img/profiles/avatar-15.jpg"
                                                    alt="customer"
                                                    className="img-fluid rounded-circle"
                                                    width={40}
                                                />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-bold mb-1">David Belcher</h6>
                                                <p className="fs-14 text-dark mb-0">+1 23456 78901</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <span className="badge badge-soft-success">Available</span>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom order-select-card">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 bg-light text-body me-2"
                                            >
                                                <i className="icon-user fs-16" />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Daniel Brooks</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 14524 54595</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-success">Available</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom order-select-card">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 bg-light text-body me-2"
                                            >
                                                <i className="icon-user fs-16" />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Adrian James</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 42367 12345</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-success">Available</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                            defaultChecked
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 me-2"
                                            >
                                                <ImageWithBasePath
                                                    src="assets/img/profiles/avatar-19.jpg"
                                                    alt="customer"
                                                    className="img-fluid"
                                                />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Noah Sullivan</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 78901 45678</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-success">Available</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 me-2"
                                            >
                                                <ImageWithBasePath
                                                    src="assets/img/profiles/avatar-13.jpg"
                                                    alt="customer"
                                                    className="img-fluid"
                                                />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Mia Roberts</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 13579 24680</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-danger">Unavailable</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 me-2"
                                            >
                                                <ImageWithBasePath
                                                    src="assets/img/profiles/avatar-14.jpg"
                                                    alt="customer"
                                                    className="img-fluid"
                                                />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Ethan Hughes</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 24680 13579</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-danger">Unavailable</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 me-2"
                                            >
                                                <ImageWithBasePath
                                                    src="assets/img/profiles/avatar-15.jpg"
                                                    alt="customer"
                                                    className="img-fluid"
                                                />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Ava Martin</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 35791 86420</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-danger">Unavailable</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3">
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <input
                                            type="radio"
                                            className="form-check-input rounded-circle me-3"
                                        />
                                        <div className="d-flex align-items-center">
                                            <Link
                                                href="#"
                                                className="avatar avatar avatar-rounded flex-shrink-0 me-2"
                                            >
                                                <ImageWithBasePath
                                                    src="assets/img/profiles/avatar-16.jpg"
                                                    alt="customer"
                                                    className="img-fluid"
                                                />
                                            </Link>
                                            <div>
                                                <h6 className="fs-14 fw-semibold mb-0 mb-2">
                                                    <Link href="#">Oliver Evans</Link>
                                                </h6>
                                                <h6 className="fs-14 fw-normal mb-0">
                                                    <Link href="#">+1 86420 57913</Link>
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center customer-radio-input">
                                        <div>
                                            <span className="badge badge-soft-danger">Unavailable</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="offcanvas-footer d-flex align-items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-dark d-flex align-items-center w-100"
                                    >
                                        <i className="icon-x me-1" />
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary d-flex align-items-center w-100"
                                    >
                                        <i className="icon-circle-check me-1" />
                                        Submit
                                    </button>
                                </div>
                            </div>
                            <div className="tab-pane fade show" id="add-new-driverTab">
                                <div className="px-2">
                                    <div className="row gx-3 border-bottom pb-3 mb-3 p-3">
                                        <div className="col-md-12">
                                            <label className="form-label fw-bold">Personal Info </label>
                                            <div className="mb-3 d-flex align-items-center flex-wrap gap-3">
                                                <div className="avatar avatar-3xl border bg-light">
                                                    <i className="icon-images fs-28 text-dark" />
                                                </div>
                                                <div>
                                                    <label className="form-label">
                                                        Category Image<span className="text-danger"> *</span>
                                                    </label>
                                                    <p className="fs-13 mb-3">Image should be with in 5 MB</p>
                                                    <div className="d-flex align-items-center">
                                                        <div className="btn btn-icon btn-sm btn-white rounded-circle position-relative me-2">
                                                            <input
                                                                type="file"
                                                                className="form-control position-absolute w-100 h-100 top-0 start-0 opacity-0"
                                                            />
                                                            <i className="icon-pencil-line" />
                                                        </div>
                                                        <Link
                                                            href="#"
                                                            className="btn btn-icon btn-sm btn-white rounded-circle text-danger"
                                                        >
                                                            <i className="icon-trash-2" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Customer Name<span className="text-danger"> *</span>
                                                </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Phone</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Date of Birth</label>
                                                <CommonDatePicker />
                                            </div>
                                        </div>
                                        <div className="col-lg-12 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Gender</label>
                                                <CommonSelect
                                                    options={Gender}
                                                    className="select"
                                                    defaultValue={Gender[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-lg-12 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Address Line 1<span className="text-danger"> *</span>
                                                </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-12 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Address Line 2</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">County</label>
                                                <CommonSelect
                                                    options={Country}
                                                    className="select"
                                                    defaultValue={Country[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">State</label>
                                                <CommonSelect
                                                    options={State}
                                                    className="select"
                                                    defaultValue={State[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-0">
                                                <label className="form-label">City</label>
                                                <CommonSelect
                                                    options={City}
                                                    className="select"
                                                    defaultValue={City[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-0">
                                                <label className="form-label">
                                                    Postal Code<span className="text-danger"> *</span>
                                                </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row gx-3 border-bottom pb-3 mb-3 p-3">
                                        <label className="form-label mb-3 fw-bold">Driver Details </label>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">License No</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">License Expiry Date</label>
                                                <CommonDatePicker />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Insurance Policy No</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Insurance Expiry Date</label>
                                                <CommonDatePicker />
                                            </div>
                                        </div>
                                        <div className="col-lg-12 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Description</label>
                                                <textarea
                                                    className="form-control rounded"
                                                    defaultValue={""}
                                                />
                                                <p className="fs-14 mt-1 mt-3">Add Minimum 200 Characters</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row gx-3 mb-3 p-3">
                                        <label className="form-label mb-3 fw-bold">Login Details </label>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Email</label>
                                                <input type="email" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Password<span className="text-danger"> *</span>
                                                </label>
                                                <div className="input-group input-group-flat pass-group w-auto">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        className="form-control pass-input"
                                                    />

                                                    <span
                                                        className="input-group-text toggle-password"
                                                        onClick={() => setShowPassword(prev => !prev)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <i className={showPassword ? "icon-eye" : "icon-eye-off"} />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-lg-12 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Status</label>
                                                <CommonSelect
                                                    options={Status_Inactive}
                                                    className="select"
                                                    defaultValue={Status_Inactive[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="offcanvas-footer d-flex align-items-center gap-2 pb-0 px-0">
                                            <button
                                                type="button"
                                                className="btn btn-dark d-flex align-items-center w-100"
                                            >
                                                <i className="icon-x me-1" />
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary d-flex align-items-center w-100"
                                            >
                                                <i className="icon-circle-check me-1" />
                                                Submit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* End Add drivers */}
            {/* Edit drivers */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="edit_driver">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Edit Driver</h4>
                    <button
                        type="button"
                        className="btn-close btn-close-modal"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    >
                        <i className="icon-x" />
                    </button>
                </div>
                <form
                    className="d-flex flex-column overflow-y-auto h-100"
                >
                    <div className="offcanvas-body pb-0">
                        <div className="row gx-3 pb-4 border-bottom mb-4">
                            <div className="col-md-12">
                                <h5 className="mb-3">Personal Info</h5>
                                <div className="mb-3 d-flex align-items-center flex-wrap gap-3">
                                    <div className="avatar avatar-3xl border bg-light">
                                        <ImageWithBasePath src="assets/img/drivers/driver-01.jpg" alt="driver-01" />
                                    </div>
                                    <div>
                                        <label className="form-label">
                                            Profile Photo<span className="text-danger"> *</span>
                                        </label>
                                        <p className="fs-13 mb-3">Image should be with in 5 MB</p>
                                        <div className="d-flex align-items-center">
                                            <div className="btn btn-icon btn-sm btn-white rounded-circle position-relative me-2">
                                                <input
                                                    type="file"
                                                    className="form-control position-absolute w-100 h-100 top-0 start-0 opacity-0"
                                                />
                                                <i className="icon-pencil-line" />
                                            </div>
                                            <Link
                                                href="#"
                                                className="btn btn-icon btn-sm btn-white rounded-circle text-danger"
                                            >
                                                <i className="icon-trash-2" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Driver Name<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="Benjamin Scott"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="+1 54544 54587"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">Date Of Birth</label>
                                    <CommonDatePicker />
                                </div>
                            </div>
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">Gender</label>
                                    <CommonSelect
                                        options={Gender}
                                        className="select"
                                        defaultValue={Gender[1]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Address Line 1<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="301 Market Street"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Address Line 2<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="Riverside Drive"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">County</label>
                                    <CommonSelect
                                        options={Country}
                                        className="select"
                                        defaultValue={Country[1]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">State</label>
                                    <CommonSelect
                                        options={State}
                                        className="select"
                                        defaultValue={State[1]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-0">
                                    <label className="form-label">City</label>
                                    <CommonSelect
                                        options={City}
                                        className="select"
                                        defaultValue={City[1]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-0">
                                    <label className="form-label">
                                        Postal Code<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue={33128}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pb-3 border-bottom mb-3">
                            <h5 className="fs-18 fw-bold mb-3">Driver Details</h5>
                            <div className="row gx-3">
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">License No</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            defaultValue="DL56558"
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">License Expiry Date</label>
                                        <CommonDatePicker />
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">Insurance Policy No</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            defaultValue="USPOL9834A72"
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">Insurance Expiry Date</label>
                                        <CommonDatePicker />
                                    </div>
                                </div>
                                <div className="col-md-12">
                                    <div className="mb-0">
                                        <label className="form-label">About Driver</label>
                                        <textarea
                                            name="address_line_1"
                                            className="form-control rounded mb-2"
                                            id="about_driver"
                                            rows={4}
                                            defaultValue={
                                                "Trained delivery driver known for fast, accurate, and safe deliveries. With strong navigation skills and a customer first attitude, he ensures every package reaches its destination on time."
                                            }
                                        />
                                        <span>Add Minimum 200 Characters</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h5 className="fs-18 fw-bold mb-3">Login Details</h5>
                            <div className="row gx-3">
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Email<span className="text-danger"> *</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            defaultValue="benjamin@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Password<span className="text-danger"> *</span>
                                        </label>
                                        <div className="input-group input-group-flat pass-group w-auto">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control pass-input"
                                            />

                                            <span
                                                className="input-group-text toggle-password"
                                                onClick={() => setShowPassword(prev => !prev)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <i className={showPassword ? "icon-eye" : "icon-eye-off"} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-12">
                                    <div className="mb-3">
                                        <label className="form-label">Status</label>
                                        <CommonSelect
                                            options={Status_Inactive}
                                            className="select"
                                            defaultValue={Status_Inactive[1]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="offcanvas-footer d-flex align-items-center gap-2 pt-2">
                        <button
                            type="button"
                            className="btn btn-dark d-flex align-items-center w-100"
                        >
                            <i className="icon-x me-1" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary d-flex align-items-center w-100"
                        >
                            <i className="icon-circle-check me-1" />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
            {/* End Edit drivers */}
        </>

    )
}

export default OrdersModal