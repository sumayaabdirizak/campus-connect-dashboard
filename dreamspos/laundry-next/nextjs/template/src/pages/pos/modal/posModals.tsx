"use client";

import Link from "next/link";
import { City, Country, Customer, Gender, State, Status_Inactive } from "../../../core/json/selectOption"
import CommonSelect from "../../../components/common-select/commonSelect"
import ImageWithBasePath from "../../../components/image-with-base-path"
import { useEffect } from "react"
import CommonDatePicker from "../../../components/common-date-picker/commonDatePicker"
import CommonTimePicker from "../../../components/common-time-pickers/CommonTimePicker"

const PosModals = () => {

    // Plan card select
    useEffect(() => {
        const cards = document.querySelectorAll<HTMLElement>(".plan-card");

        const handleClick = (card: HTMLElement) => {
            cards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
        };

        cards.forEach(card => {
            card.addEventListener("click", () => handleClick(card));
        });

        // Cleanup listeners on unmount
        return () => {
            cards.forEach(card => {
                card.replaceWith(card.cloneNode(true));
            });
        };
    }, []);
    // Plan card select

    return (
        <>
            {/* Add Orders */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="add_order">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Customers</h4>
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
                            <ul className="nav nav-pills w-100 d-flex gap-3 align-items-center flex-sm-nowrap flex-wrap">
                                <li>
                                    <Link
                                        href="#"
                                        className="nav-link active d-flex align-items-center justify-content-center"
                                        data-bs-toggle="tab"
                                        data-bs-target="#driversTab"
                                    >
                                        <i className="icon-users-round me-2" />
                                        Existing Customer
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="#"
                                        className="nav-link d-flex align-items-center justify-content-center"
                                        data-bs-toggle="tab"
                                        data-bs-target="#add-new-driverTab"
                                    >
                                        <i className="icon-plus me-2" />
                                        Add New Customer
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="driversTab">
                                <div className="gx-3 p-3 mb-2 pt-0">
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
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom order-select-card">
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
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom order-select-card">
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
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom order-select-card">
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
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 border-bottom order-select-card">
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
                                <div className="d-flex justify-content-between pb-3 px-3 mb-3 order-select-card">
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
                                    <div className="row gx-3 p-3 pt-0">
                                        <div className="col-md-12">
                                            <div className="mb-3 d-flex align-items-center flex-wrap gap-3">
                                                <div className="avatar avatar-3xl border bg-light">
                                                    <i className="icon-images fs-28 text-dark" />
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
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
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
                                                <label className="form-label">Email</label>
                                                <input type="email" className="form-control" />
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
                                            <div className="mb-3">
                                                <label className="form-label">City</label>
                                                <CommonSelect
                                                    options={City}
                                                    className="select"
                                                    defaultValue={City[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Postal Code<span className="text-danger"> *</span>
                                                </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-0">
                                                <label className="form-label">Gender</label>
                                                <CommonSelect
                                                    options={Gender}
                                                    className="select"
                                                    defaultValue={Gender[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-lg-6 col-md-12">
                                            <div className="mb-0">
                                                <label className="form-label">Status</label>
                                                <CommonSelect
                                                    options={Status_Inactive}
                                                    className="select"
                                                    defaultValue={Status_Inactive[0]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="offcanvas-footer d-flex align-items-center gap-2 pt-0 px-3">
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
                </form>
            </div>
            {/* End Add Orders */}
            {/* Edit Orders */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="edit_order">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Customers</h4>
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
                        <div className="px-2">
                            <div className="row gx-3 p-3">
                                <div className="col-md-12">
                                    <div className="mb-3 d-flex align-items-center flex-wrap gap-3">
                                        <div className="avatar avatar-3xl border bg-light">
                                            <ImageWithBasePath
                                                src="assets/img/profiles/avatar-01.jpg"
                                                alt="item"
                                                className="img-fluid rounded"
                                            />
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
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#delete_modal"
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
                                        <input
                                            type="text"
                                            className="form-control"
                                            defaultValue="Adrian James"
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
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            defaultValue="adrian@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-12 col-md-12">
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
                                <div className="col-lg-12 col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">Address Line 2</label>
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
                                    <div className="mb-3">
                                        <label className="form-label">City</label>
                                        <CommonSelect
                                            options={City}
                                            className="select"
                                            defaultValue={City[1]}
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-3">
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
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-0">
                                        <label className="form-label">Gender</label>
                                        <CommonSelect
                                            options={Gender}
                                            className="select"
                                            defaultValue={Gender[1]}
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="mb-0">
                                        <label className="form-label">Status</label>
                                        <CommonSelect
                                            options={Status_Inactive}
                                            className="select"
                                            defaultValue={Status_Inactive[1]}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="offcanvas-footer d-flex align-items-center gap-2 pt-0 px-3">
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
                </form>
            </div>
            {/* End Edit Orders */}
            {/* Start Filter */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex={-1}
                id="filter-offcanvas-2"
            >
                <div className="offcanvas-header pb-0">
                    <div className="border-bottom d-flex align-items-center justify-content-between w-100 pb-3">
                        <h4 className="offcanvas-title mb-0">Update Bag - Dry Cleaning</h4>
                        <button
                            type="button"
                            className="btn-close btn-close-modal"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        >
                            <i className="icon-x" />
                        </button>
                    </div>
                </div>
                <div className="offcanvas-body d-flex flex-column pt-3 pb-2">
                    <h6 className="title mb-3 fw-bold">Detergent</h6>
                    {/* Item 1 */}
                    <div className="row mb-4 g-3">
                        <div className="col-lg-6">
                            <div className="plan-card active">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-1.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6>
                                    <Link href="#">Free</Link>
                                </h6>
                                <p className="price">$0</p>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="plan-card">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-2.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6>
                                    <Link href="">Premium</Link>
                                </h6>
                                <p className="price">$40</p>
                            </div>
                        </div>
                    </div>
                    <h6 className="title mb-3 fw-bold">Softener</h6>
                    {/* Item 2 */}
                    <div className="row g-3 mb-4">
                        <div className="col-lg-4">
                            <div className="plan-card">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-3.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6>
                                    <Link href="#">Free</Link>
                                </h6>
                                <p className="price">$50</p>
                            </div>
                        </div>
                        <div className="col-lg-4">
                            <div className="plan-card">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-4.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6>
                                    <Link href="">Premium</Link>
                                </h6>
                                <p className="price">$100</p>
                            </div>
                        </div>
                        <div className="col-lg-4">
                            <div className="plan-card">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-5.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6>
                                    <Link href="">No</Link>
                                </h6>
                                <p className="price">$0</p>
                            </div>
                        </div>
                    </div>
                    <h6 className="title mb-3 fw-bold">Dry</h6>
                    {/* Item 3 */}
                    <div className="row g-3 mb-4">
                        <div className="col-lg-4">
                            <div className="plan-card ">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-6.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6 className="mb-0">
                                    <Link href="#">High Hot</Link>
                                </h6>
                            </div>
                        </div>
                        <div className="col-lg-4">
                            <div className="plan-card">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-7.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6 className="mb-0">
                                    <Link href="#">Premium</Link>
                                </h6>
                            </div>
                        </div>
                        <div className="col-lg-4">
                            <div className="plan-card">
                                <ImageWithBasePath
                                    src="assets/img/icons/brand-icon-8.svg"
                                    alt="icon-1"
                                    className="img-fluid img-1"
                                />
                                <h6 className="mb-0">
                                    <Link href="#">No</Link>
                                </h6>
                            </div>
                        </div>
                    </div>
                    {/* DRY  */}
                    <div className="card mb-4">
                        <div className="card-body p-3">
                            {/* Item 1 */}
                            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3 pb-3 border-bottom">
                                <label
                                    className="mb-0 fs-14 fw-medium text-dark"
                                    htmlFor="switchCheckChecked"
                                >
                                    Dry Sheets
                                </label>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="switchCheckChecked"
                                        defaultChecked
                                    />
                                </div>
                            </div>
                            {/* Item 2 */}
                            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3 pb-3 border-bottom">
                                <label
                                    className="mb-0 fs-14 fw-medium text-dark"
                                    htmlFor="switchCheckChecked-1"
                                >
                                    Bleach
                                </label>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="switchCheckChecked-1"
                                    />
                                </div>
                            </div>
                            {/* Item 3 */}
                            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3 pb-3 border-bottom">
                                <label
                                    className="mb-0 fs-14 fw-medium text-dark"
                                    htmlFor="switchCheckChecked-2"
                                >
                                    Oxiclean
                                </label>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="switchCheckChecked-2"
                                    />
                                </div>
                            </div>
                            {/* Item 4 */}
                            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                <label
                                    className="mb-0 fs-14 fw-medium text-dark"
                                    htmlFor="switchCheckChecked-3"
                                >
                                    Wash Seperately
                                </label>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="switchCheckChecked-3"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* instructions  */}
                    <div className="mb-04">
                        <h6 className="title mb-2 fw-bold">Special instructions if any...</h6>
                        <textarea className="form-control rounded" rows={4} defaultValue={""} />
                        <span className="pt-1">Add Minimum 200 Characters</span>
                    </div>
                </div>
                <div className="offcanvas-footer d-flex align-items-center gap-2 mt-auto border-0">
                    <Link
                        href="#"
                        className="btn btn-dark w-100 d-flex align-items-center gap-2"
                        data-bs-dismiss="offcanvas"
                    >
                        <i className="icon-x" /> Cancel
                    </Link>
                    <Link
                        href="#"
                        className="btn btn-primary w-100 d-flex align-items-center gap-2"
                    >
                        <i className="icon-circle-check" />
                        Update
                    </Link>
                </div>
            </div>
            {/* End Filter */}
            {/* Start Order deatils */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex={-1}
                id="filter-offcanvas-3"
            >
                <div className="offcanvas-header pb-0">
                    <div className="border-bottom d-flex align-items-center justify-content-between w-100 pb-3">
                        <h4 className="offcanvas-title mb-0">Order Details</h4>
                        <button
                            type="button"
                            className="btn-close btn-close-modal"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        >
                            <i className="icon-x" />
                        </button>
                    </div>
                </div>
                <div className="offcanvas-body d-flex flex-column pt-3">
                    <div className="accordion pos-accordion" id="faq-details-1">
                        {/* FAQ Item */}
                        <div className="accordion-item">
                            <h3 className="accordion-header" id="heading-1">
                                <Link
                                    href="#"
                                    className="accordion-button collapsed"
                                    data-bs-toggle="collapse"
                                    data-bs-target="#collapse-1"
                                    aria-controls="collapse-1"
                                >
                                    Dry Cleaning
                                </Link>
                            </h3>
                            <div
                                id="collapse-1"
                                className="accordion-collapse collapse show"
                                data-bs-parent="#faq-details-1"
                            >
                                <div className="accordion-body">
                                    <div className="accordion-content">
                                        <div>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Evening Dress × 1 <span className="fw-semibold">$30</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Jumpsuit × 1 <span className="fw-semibold">$11</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Long Coat × 3 <span className="fw-semibold">$76</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Dinner Suit × 3 <span className="fw-semibold">$67</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-0 text-dark">
                                                Down Jacket × 1 <span className="fw-semibold">$37</span>
                                            </p>
                                            <h6 className="d-flex align-items-center justify-content-between mt-3">
                                                Subtotal <span className="fw-bold">$134</span>{" "}
                                            </h6>
                                        </div>
                                        {/* Add Ones */}
                                        <div className="mt-4 mb-4">
                                            <div>
                                                <h6 className="mb-2">Add ons</h6>
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Detergent : Free
                                                    </span>
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Softener : Free
                                                    </span>
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Dry : High Hot
                                                    </span>
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Dryer Sheet : Yes
                                                    </span>
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Bleach : Yes
                                                    </span>
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Oxyclean : Yes
                                                    </span>
                                                    <span className="badge bg-primary-1 text-dark">
                                                        Wash Seperately : Yes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h6 className="mb-2">Special Instruction</h6>
                                            <p className="mb-0">
                                                Wash cold on temprature Between 30F and 60F
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* /FAQ Item */}
                        {/* FAQ Item */}
                        <div className="accordion-item">
                            <h3 className="accordion-header" id="heading-2">
                                <Link
                                    href="#"
                                    className="accordion-button collapsed"
                                    data-bs-toggle="collapse"
                                    data-bs-target="#collapse-2"
                                    aria-controls="collapse-2"
                                >
                                    Laundry
                                </Link>
                            </h3>
                            <div
                                id="collapse-2"
                                className="accordion-collapse collapse show"
                                data-bs-parent="#faq-details-2"
                            >
                                <div className="accordion-body">
                                    <div className="accordion-content">
                                        <div>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Evening Dress × 1 <span className="fw-semibold">$30</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-0 text-dark">
                                                Down Jacket × 1 <span className="fw-semibold">$37</span>
                                            </p>
                                            <h6 className="d-flex align-items-center justify-content-between mt-3">
                                                Subtotal <span className="fw-bold text-dark">$134</span>{" "}
                                            </h6>
                                        </div>
                                        {/* Add Ones */}
                                        <div className="mt-4">
                                            <h6 className="mb-2">Add ons</h6>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="badge bg-primary-1 text-dark">
                                                    Detergent : Free
                                                </span>
                                                <span className="badge bg-primary-1 text-dark">
                                                    Softener : Free
                                                </span>
                                                <span className="badge bg-primary-1 text-dark">
                                                    Dry : High Hot
                                                </span>
                                                <span className="badge bg-primary-1 text-dark">
                                                    Dryer Sheet : Yes
                                                </span>
                                                <span className="badge bg-primary-1 text-dark">
                                                    Bleach : Yes
                                                </span>
                                                <span className="badge bg-primary-1 text-dark">
                                                    Oxyclean : Yes
                                                </span>
                                                <span className="badge bg-primary-1 text-dark">
                                                    Wash Seperately : Yes
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* /FAQ Item */}
                        {/* FAQ Item */}
                        <div className="accordion-item border-0 mb-0">
                            <h3 className="accordion-header" id="heading-3">
                                <Link
                                    href="#"
                                    className="accordion-button d-flex align-items-center justify-content-between"
                                    data-bs-toggle="collapse"
                                    data-bs-target="#collapse-3"
                                    aria-expanded="true"
                                >
                                    Payment Summary
                                </Link>
                            </h3>
                            <div
                                id="collapse-3"
                                className="accordion-collapse collapse show"
                                data-bs-parent="#faq-details-2"
                            >
                                <div className="accordion-body">
                                    <div className="accordion-content">
                                        <div>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Tax (10%) <span className="fw-semibold">$5</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-2 text-dark">
                                                Discount&nbsp;(12%){" "}
                                                <span className="fw-semibold text-danger">-$16</span>
                                            </p>
                                            <p className="d-flex align-items-center justify-content-between mb-0 text-dark">
                                                Coupon <span className="fw-semibold ">$0</span>
                                            </p>
                                            <h5 className="d-flex align-items-center justify-content-between mt-4 mb-0">
                                                Amount to be Paid{" "}
                                                <span className="fw-bold text-dark">$164</span>{" "}
                                            </h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* /FAQ Item */}
                    </div>
                </div>
            </div>
            {/* End  Order deatils */}
            {/* Start Add  */}
            <div className="modal fade" id="evening_dress">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-colored border-0 p-4 pb-3">
                            <ImageWithBasePath src="assets/img/icons/tax-modal-icon.svg" alt="modal-icon" />
                            <button
                                type="button"
                                className="btn-close btn-close-modal"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form>
                            <div className="modal-body">
                                <h4 className="modal-title mb-4">Edit Evening Dress</h4>
                                {/* start row */}
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div>
                                            <label className="form-label">
                                                Current Price <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" defaultValue={"30.00"} />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div>
                                            <label className="form-label">
                                                Name <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" defaultValue={"30.00"} />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div>
                                            <label className="form-label">Note</label>
                                            <textarea
                                                className="form-control rounded"
                                                rows={4}
                                                defaultValue={""}
                                            />
                                            <span className="d-block pt-1">
                                                Add Minimum 200 Characters
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center justify-content-between gap-2 pt-1 border-0 flex-nowrap">
                                <button
                                    type="button"
                                    className="btn btn-dark w-100"
                                    data-bs-dismiss="modal"
                                >
                                    <i className="icon-x me-1" />
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary w-100">
                                    <i className="icon-circle-check me-1" />
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* End Add */}
            {/* Start Add  */}
            <div className="modal fade" id="edit_evening_dress">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-colored border-0 p-4 pb-3">
                            <ImageWithBasePath src="assets/img/icons/tax-modal-icon.svg" alt="modal-icon" />
                            <button
                                type="button"
                                className="btn-close btn-close-modal"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form>
                            <div className="modal-body">
                                <h4 className="modal-title mb-4">Edit Evening Dress</h4>
                                {/* start row */}
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div>
                                            <label className="form-label">
                                                Current Price <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div>
                                            <label className="form-label">
                                                Name <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div>
                                            <label className="form-label">Note</label>
                                            <textarea
                                                className="form-control rounded"
                                                rows={4}
                                                defaultValue={""}
                                            />
                                            <span className="d-block pt-1">
                                                Add Minimum 200 Characters
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center justify-content-between gap-2 pt-1 border-0 flex-nowrap">
                                <button
                                    type="button"
                                    className="btn btn-dark w-100"
                                    data-bs-dismiss="modal"
                                >
                                    <i className="icon-x me-1" />
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary w-100">
                                    <i className="icon-circle-check me-1" />
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* End Add */}
            {/* Start Payment Method */}
            <div className="modal fade" id="select_payment">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-colored border-0 p-4 pb-3">
                            <ImageWithBasePath src="assets/img/icons/tax-modal-icon.svg" alt="modal-icon" />
                            <button
                                type="button"
                                className="btn-close btn-close-modal"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form>
                            <div className="modal-body">
                                <h4 className="modal-title mb-4">Select Payment Method</h4>
                                <div className="card select-payment-card">
                                    <label
                                        htmlFor="cash"
                                        className="d-flex align-items-center justify-content-between"
                                    >
                                        <h6 className="mb-0">
                                            {" "}
                                            <ImageWithBasePath
                                                src="assets/img/icons/pay-icon-1.svg"
                                                alt="icon-1"
                                                className="img-fluid img-1"
                                            />{" "}
                                            Cash
                                        </h6>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            id="cash"
                                            className="payment-radio"
                                            defaultChecked
                                        />
                                        <span className="custom-radio" />
                                    </label>
                                </div>
                                <div className="card select-payment-card">
                                    <label
                                        htmlFor="credit-card"
                                        className="d-flex align-items-center justify-content-between"
                                    >
                                        <h6 className="mb-0">
                                            {" "}
                                            <ImageWithBasePath
                                                src="assets/img/icons/pay-icon-2.svg"
                                                alt="icon-1"
                                                className="img-fluid img-1"
                                            />{" "}
                                            Credit Card
                                        </h6>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            id="credit-card"
                                            className="payment-radio"
                                        />
                                        <span className="custom-radio" />
                                    </label>
                                </div>
                                <div className="card select-payment-card">
                                    <label
                                        htmlFor="collect-delivery"
                                        className="d-flex align-items-center justify-content-between"
                                    >
                                        <h6 className="mb-0">
                                            {" "}
                                            <ImageWithBasePath
                                                src="assets/img/icons/pay-icon-3.svg"
                                                alt="icon-1"
                                                className="img-fluid img-1"
                                            />{" "}
                                            Collect / Delivery{" "}
                                        </h6>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            id="collect-delivery"
                                            className="payment-radio"
                                        />
                                        <span className="custom-radio" />
                                    </label>
                                </div>
                                <div className="card select-payment-card">
                                    <label
                                        htmlFor="bank"
                                        className="d-flex align-items-center justify-content-between"
                                    >
                                        <h6 className="mb-0">
                                            {" "}
                                            <ImageWithBasePath
                                                src="assets/img/icons/pay-icon-4.svg"
                                                alt="icon-1"
                                                className="img-fluid img-1"
                                            />{" "}
                                            Bank
                                        </h6>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            id="bank"
                                            className="payment-radio"
                                        />
                                        <span className="custom-radio" />
                                    </label>
                                </div>
                                <div className="card select-payment-card mb-0">
                                    <label
                                        htmlFor="cheque"
                                        className="d-flex align-items-center justify-content-between"
                                    >
                                        <h6 className="mb-0">
                                            {" "}
                                            <ImageWithBasePath
                                                src="assets/img/icons/pay-icon-5.svg"
                                                alt="icon-1"
                                                className="img-fluid img-1"
                                            />{" "}
                                            Cheque{" "}
                                        </h6>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            id="cheque"
                                            className="payment-radio"
                                        />
                                        <span className="custom-radio" />
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center justify-content-between gap-2 pt-1 border-0 flex-nowrap">
                                <button
                                    type="button"
                                    className="btn btn-dark w-100"
                                    data-bs-dismiss="modal"
                                >
                                    <i className="icon-x me-1" />
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary w-100">
                                    <i className="icon-circle-check me-1" />
                                    Create Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* End Payment Method */}
            {/* Start Pickup Delivery */}
            <div className="modal fade" id="pickup_delivery">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-colored border-0 p-4 pb-3">
                            <ImageWithBasePath
                                src="assets/img/addon/pos-header-img-3.png"
                                alt="modal-icon"
                                className=""
                            />
                            <button
                                type="button"
                                className="btn-close btn-close-modal"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form>
                            <div className="modal-body">
                                <h4 className="modal-title mb-4">Pickup and Delivery</h4>
                                {/* start row */}
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <div>
                                            <label className="form-label">
                                                Customer Address <span className="text-danger"> *</span>
                                            </label>
                                            <CommonSelect
                                                options={Customer}
                                                className="select"
                                                defaultValue={Customer[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div>
                                            <label className="form-label">
                                                Pickup Date and Time <span className="text-danger"> *</span>
                                            </label>
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <CommonDatePicker />
                                                <CommonTimePicker />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div>
                                            <label className="form-label">
                                                Delivery Date and Time{" "}
                                                <span className="text-danger"> *</span>
                                            </label>
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <CommonDatePicker />
                                                <CommonTimePicker />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div>
                                            <label className="form-label">
                                                Order / Delivery instructions if any...
                                            </label>
                                            <textarea
                                                className="form-control rounded"
                                                rows={4}
                                                defaultValue={""}
                                            />
                                            <span className="d-block pt-1">
                                                Add Minimum 200 Characters
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {/* end row */}
                            </div>
                            <div className="modal-footer d-flex align-items-center justify-content-between gap-2 pt-1 border-0 flex-nowrap">
                                <button
                                    type="button"
                                    className="btn btn-dark w-100"
                                    data-bs-dismiss="modal"
                                >
                                    <i className="icon-x me-1" />
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary w-100">
                                    <i className="icon-circle-check me-1" />
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* End Pickup Delivery */}
            {/* Start Order Created */}
            <div className="modal fade" id="order_created">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content select-order-item">
                        <form>
                            <div className="modal-body">
                                <div className="avatar">
                                    <ImageWithBasePath
                                        src="assets/img/icons/tick-circle.svg"
                                        alt="tick-circle"
                                        className="img-fluid img-1"
                                    />
                                </div>
                                <div className="mb-4 pb-4 border-bottom text-center">
                                    <h3 className="mb-2">Order Created</h3>
                                    <p className="mb-0">
                                        Order Created Successfully. Reference:{" "}
                                        <span className="text-dark">#OD2ED</span>{" "}
                                    </p>
                                </div>
                                <div className="mb-4 text-center">
                                    <p className="mb-2">Total Payment</p>
                                    <h4 className="mb-0">$164</h4>
                                </div>
                                <div className="row row-gap-3">
                                    {/* Item 1 */}
                                    <div className="col-sm-6">
                                        <div className="card mb-0">
                                            <div className="card-body text-center p-3">
                                                <p className="mb-1 fs-13">Ref Number</p>
                                                <h6 className="mb-0 fs-14 fw-semibold">000085752257</h6>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Item 2 */}
                                    <div className="col-sm-6">
                                        <div className="card mb-0">
                                            <div className="card-body text-center p-3">
                                                <p className="mb-1 fs-13">Payment Time</p>
                                                <h6 className="mb-0 fs-14 fw-semibold">
                                                    25 Feb 2026, 13:22
                                                </h6>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Item 3 */}
                                    <div className="col-sm-6">
                                        <div className="card mb-0">
                                            <div className="card-body text-center p-3">
                                                <p className="mb-1 fs-13">Payment Method</p>
                                                <h6 className="mb-0 fs-14 fw-semibold">Bank Transfer</h6>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Item 4 */}
                                    <div className="col-sm-6">
                                        <div className="card mb-0">
                                            <div className="card-body text-center p-3">
                                                <p className="mb-1 fs-13">Customer Name</p>
                                                <h6 className="mb-0 fs-14 fw-semibold">Antonio Roberto</h6>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="row row-gap-3 mt-4 pt-4 border-top">
                                    <div className="col-md-4 col-sm-6">
                                        <Link
                                            href="#"
                                            className="d-flex align-items-center gap-2 btn btn-outline-white"
                                        >
                                            {" "}
                                            <i className="icon-printer" /> Print Tags
                                        </Link>
                                    </div>
                                    <div className="col-md-4 col-sm-6">
                                        <Link
                                            href="#"
                                            className="d-flex align-items-center gap-2 btn btn-outline-white"
                                            data-bs-toggle="modal"
                                            data-bs-target="#view_invoices"
                                        >
                                            {" "}
                                            <i className="icon-file-chart-column" /> View Invoice
                                        </Link>
                                    </div>
                                    <div className="col-md-4 col-sm-6">
                                        <Link
                                            href="#"
                                            className="d-flex align-items-center gap-2 btn btn-outline-white"
                                        >
                                            {" "}
                                            <i className="icon-files" /> Download{" "}
                                        </Link>
                                    </div>
                                    <div className="col-md-4 col-sm-6">
                                        <Link
                                            href="#"
                                            className="d-flex align-items-center gap-2 btn btn-primary"
                                        >
                                            {" "}
                                            <i className="icon-users-round" /> Customer Copy
                                        </Link>
                                    </div>
                                    <div className="col-md-4 col-sm-6">
                                        <Link
                                            href="#"
                                            className="d-flex align-items-center gap-2 btn btn-secondary"
                                        >
                                            {" "}
                                            <i className="icon-ungroup" /> Main Copy
                                        </Link>
                                    </div>
                                    <div className="col-md-4 col-sm-6">
                                        <Link
                                            href="#"
                                            className="d-flex align-items-center gap-2 btn btn-dark"
                                            data-bs-dismiss="modal"
                                        >
                                            {" "}
                                            <i className="icon-x" /> Close
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* End Order Created */}
            {/* Delete Modal  */}
            <div className="modal fade" id="delete_modal">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                    <div className="modal-content">
                        <div className="modal-body text-center p-4">
                            <div className="mb-4">
                                <span className="avatar avatar-lg rounded-circle bg-danger">
                                    <i className="icon-trash fs-24" />
                                </span>
                            </div>
                            <h4 className="mb-1">Delete Confirmation</h4>
                            <p className="mb-4">Are you sure you want to delete?&nbsp;</p>
                            <div className="d-flex justify-content-center gap-2">
                                <Link href="#" className="btn btn-light w-100" data-bs-dismiss="modal">
                                    Close
                                </Link>
                                <Link href="#" className="btn btn-danger w-100">
                                    Delete
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Delete Modal  */}
            {/* View Invoices */}
            <div className="modal fade" id="view_invoices">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 p-4 pb-3">
                            <h5 className="modal-title fw-normal">Invoice</h5>
                            <button
                                type="button"
                                className="btn-close btn-close-modal"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <div className="modal-body p-4 pt-1">
                            <div className="card mb-3">
                                <div className="card-body">
                                    <div className="mb-4">
                                        <div className="row justify-content-between align-items-center border-bottom pb-4">
                                            <div className="col-md-4">
                                                <div className="mb-2 invoice-logo">
                                                    <ImageWithBasePath
                                                        src="assets/img/logo.svg"
                                                        width={130}
                                                        className="img-fluid logo"
                                                        alt="logo"
                                                    />
                                                    <ImageWithBasePath
                                                        src="assets/img/logo-white.svg"
                                                        width={130}
                                                        className="img-fluid logo-white d-none"
                                                        alt="logo"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <ImageWithBasePath
                                                        src="assets/img/invoices/paid-invoices.svg"
                                                        alt="paid-invoices-img"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4 text-end">
                                                <h6 className="mb-2">#INV5465</h6>
                                                <p className="mb-0 text-dark">GST / Tax ID:54665589</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="row align-items-center border-bottom pb-4">
                                            <div className="col-md-4">
                                                <h6 className="mb-2">Invoice From</h6>
                                                <p className="text-dark fw-semibold mb-2">DreamsPOS</p>
                                                <p className="mb-2">
                                                    15 Hodges Mews, <br /> High Wycombe HP12 3JL, <br />{" "}
                                                    United Kingdom
                                                </p>
                                                <p className="mb-0">Phone : +1 45659 96566</p>
                                            </div>
                                            <div className="col-md-4">
                                                <h6 className="mb-2">Bill To&nbsp;</h6>
                                                <p className="text-dark fw-semibold mb-2">
                                                    Andrew Fletcher
                                                </p>
                                                <p className="mb-2">
                                                    1147 Rohan Drive Suite,Burlington, VT / 8202115 <br />{" "}
                                                    United Kingdom
                                                </p>
                                                <p className="mb-0">Phone : +1 45659 96566</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <h6 className="mb-3">Order Details</h6>
                                        <div className="table-responsive table-nowrap border rounded">
                                            <table className="table mb-0">
                                                <thead className="thead-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Item Details</th>
                                                        <th>Quantity</th>
                                                        <th>Rate</th>
                                                        <th>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>1</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Evening Dress{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, ironed)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>2</td>
                                                        <td>$200.00</td>
                                                        <td>$396.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td>2</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Jumpsuit{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, ironed &amp; hung)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>1</td>
                                                        <td>$350.00</td>
                                                        <td>$365.75</td>
                                                    </tr>
                                                    <tr>
                                                        <td>3</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Dinner Suit{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, ironed)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>1</td>
                                                        <td>$399.00</td>
                                                        <td>$398.90</td>
                                                    </tr>
                                                    <tr>
                                                        <td>4</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Down Jacket{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, tumble)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>4</td>
                                                        <td>$100.00</td>
                                                        <td>$396.00</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="mb-0">
                                        <div className="row justify-content-center align-items-center">
                                            <div className="col-md-6">
                                                <h6 className="mb-2">Terms and Conditions</h6>
                                                <div className="mb-4">
                                                    <p className="mb-0">
                                                        1. Goods once sold cannot be taken back or exchanged.
                                                    </p>
                                                    <p className="mb-0">
                                                        2. We are not the manufacturers the company provides
                                                        warranty
                                                    </p>
                                                </div>
                                                <div className="px-3 py-2 bg-light">
                                                    <p className="text-dark mb-0">
                                                        Note : Please ensure payment is made within 7 days of
                                                        invoice date.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <div className="row align-items-center pb-3 border-bottom">
                                                        <div className="col-md-6">
                                                            <p className="text-dark fw-semibold mb-3">Amount</p>
                                                            <p className="text-dark fw-semibold mb-3">
                                                                CGST (9%)
                                                            </p>
                                                            <p className="text-dark fw-semibold mb-3">
                                                                SGST (9%)
                                                            </p>
                                                            <p className="text-dark fw-semibold mb-3">
                                                                Discount (25%)
                                                            </p>
                                                        </div>
                                                        <div className="col-md-6 text-end">
                                                            <p className="text-dark fw-semibold mb-3">
                                                                $1,793.12
                                                            </p>
                                                            <p className="text-dark fw-semibold mb-3">$18</p>
                                                            <p className="text-dark fw-semibold mb-3">$18</p>
                                                            <p className="text-danger fw-semibold">- $18</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-flex justify-content-between algin-item-center">
                                                    <h6>Total ($)</h6>
                                                    <h6>$1,972.43</h6>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex justify-content-center algin-item-center">
                                <div className="d-flex justify-content-center algin-item-center gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-dark d-inline-flex align-items-center"
                                    >
                                        <i className="icon-download me-1" />
                                        Download PDF
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-white d-inline-flex align-items-center"
                                    >
                                        <i className="icon-printer me-1" />
                                        Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* View Invoices End */}
            {/* Customer Details */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex={-1}
                id="customer_view_details"
            >
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Customer Details</h4>
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
                    <div className="offcanvas-body p-0">
                        <div className="border-bottom p-4">
                            <div className="mb-4 d-flex align-items-center justify-content-between gap-3">
                                <div className="d-flex align-items-center">
                                    <span className="avatar avatar-xxl border me-3 flex-shrink-0">
                                        <ImageWithBasePath
                                            src="assets/img/profiles/avatar-09.jpg"
                                            alt="customer"
                                            className="img-fluid"
                                        />
                                    </span>
                                    <div>
                                        <h6 className="fs-14 fw-semibold mb-0">David Belcher</h6>
                                        <p className="fs-13 mb-0">Last Login : 25 Jan 2025</p>
                                    </div>
                                </div>
                                <span className="badge badge-soft-success">Active</span>
                            </div>
                            <div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-mail text-gray-9 me-1" />
                                        Email
                                    </span>
                                    <span className="text-gray-9">david@example.com</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-phone text-gray-9 me-1" />
                                        Phone
                                    </span>
                                    <span className="text-gray-9">+1 14524 54595</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-map-pin-check-inside text-gray-9 me-1" />
                                        Address
                                    </span>
                                    <span className="text-wrap-1 text-gray-9">
                                        301 Market Street, Riverside Drive, FL 33128, USA
                                    </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-user text-gray-9 me-1" />
                                        Gender
                                    </span>
                                    <span className="text-gray-9">Male</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h5>Orders</h5>
                                <span className="badge bg-light text-gray-9 fw-semibold">
                                    No of Orders : 02
                                </span>
                            </div>
                            <div className="border p-3 rounded mb-3">
                                <div className="d-flex align-items-center justify-content-between border-bottom flex-wrap row-gap-3 pb-3 mb-3">
                                    <div>
                                        <h6 className="text-info fw-semibold mb-1">OD6EEG</h6>
                                        <span>Order On : 15 Sep 2025</span>
                                    </div>
                                    <div>
                                        <p className="mb-1">Order total</p>
                                        <span className="text-gray-9 fw-medium">$350</span>
                                    </div>
                                    <span className="badge bg-soft-info text-gray-9 fw-medium">
                                        Pending
                                    </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <p className="mb-1">Pickup Date &amp; Time</p>
                                        <span className="text-gray-9 fw-medium">
                                            17 Jun 2026, 11 AM - 12 PM
                                        </span>
                                    </div>
                                    <div>
                                        <p className="mb-1">Deliver Date &amp; Time</p>
                                        <span className="text-gray-9 fw-medium">
                                            19 Jun 2026, 05 AM - 06 PM
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="border p-3 rounded">
                                <div className="d-flex align-items-center justify-content-between border-bottom flex-wrap row-gap-3 pb-3 mb-3">
                                    <div>
                                        <h6 className="text-info fw-semibold mb-1">OD4567</h6>
                                        <span>Order On : 10 Sep 2025</span>
                                    </div>
                                    <div>
                                        <p className="mb-1">Order total</p>
                                        <span className="text-gray-9 fw-medium">$200</span>
                                    </div>
                                    <span className="badge bg-soft-success text-gray-9 fw-medium">
                                        Delivered
                                    </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <p className="mb-1">Pickup Date &amp; Time</p>
                                        <span className="text-gray-9 fw-medium">
                                            11 Jun 2026, 09 AM - 10 AM
                                        </span>
                                    </div>
                                    <div>
                                        <p className="mb-1">Deliver Date &amp; Time</p>
                                        <span className="text-gray-9 fw-medium">
                                            13 Jun 2026, 08 AM - 09 PM
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="offcanvas-footer d-flex align-items-center gap-2 pt-2">
                        <button
                            type="button"
                            className="btn btn-dark d-flex align-items-center w-100"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#edit_customer"
                        >
                            <i className="icon-pencil-line me-2" />
                            Edit Customer
                        </button>
                    </div>
                </form>
            </div>
            {/* End Customer Details */}
            {/* Edit Customer */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="edit_customer">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Edit Customer</h4>
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
                        <div className="row gx-3">
                            <div className="col-md-12">
                                <div className="mb-3 d-flex align-items-center flex-wrap gap-3">
                                    <div className="avatar avatar-3xl border bg-light flex-shrink-0">
                                        <ImageWithBasePath
                                            src="assets/img/profiles/avatar-01.jpg"
                                            alt="customer"
                                            className="img-fluid"
                                        />
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
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="Adrian James"
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
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        defaultValue="adrian@example.com"
                                    />
                                </div>
                            </div>
                            <div className="col-md-12">
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
                            <div className="col-md-12">
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
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Postal Code<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue={48104}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">Gender</label>
                                    <CommonSelect
                                        options={Gender}
                                        className="select"
                                        defaultValue={Gender[1]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
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
                    <div className="offcanvas-footer d-flex align-items-center gap-2 pt-2">
                        <button
                            type="button"
                            className="btn btn-dark d-flex align-items-center w-100"
                            data-bs-dismiss="offcanvas"
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
            {/* End Edit Customer */}
        </>

    )
}

export default PosModals