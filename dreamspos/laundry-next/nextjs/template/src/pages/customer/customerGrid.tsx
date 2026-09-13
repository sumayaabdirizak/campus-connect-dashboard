"use client";
import Header from "../../components/header/header"
import ImageWithBasePath from "../../components/image-with-base-path"
import CustomerModal from "./modal/customerModal"
import { all_routes } from "../../routes/all_routes"
import Link from "next/link";

const CustomerGridComponent = () => {
    return (
        <>
            {/* ========================
			Start Page Content
		    ========================= */}
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Customers" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* Start Content Wrap */}
                    <div className="content-wrap">
                        {/* Page Header */}
                        <div className="d-flex align-items-center flex-wrap gap-3 pb-4 mb-4">
                            <div className="flex-grow-1">
                                <div className="d-inline-flex align-items-center p-1 bg-light border rounded-pill">
                                    <Link
                                        href={all_routes.customers}
                                        className="px-3 py-1 fw-semibold d-inline-flex align-items-center rounded-pill"
                                    >
                                        <i className="icon-list me-2" />
                                        List View
                                    </Link>
                                    <Link
                                        href={all_routes.customersGrid}
                                        className="px-3 py-1 fw-semibold d-inline-flex align-items-center rounded-pill bg-white"
                                    >
                                        <i className="icon-layout-panel-left me-2" />
                                        Grid View
                                    </Link>
                                </div>
                            </div>
                            <div className="gap-3 d-flex align-items-center flex-wrap">
                                {/* sort by */}
                                <div className="dropdown">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        Sort by : Newest
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
                                {/* table search */}
                                <div className="search-input">
                                    <span className="btn-searchset">
                                        <i className="icon-search fs-14" />
                                    </span>
                                    <input
                                        type="search"
                                        className="form-control form-control-sm"
                                        id="dt-search-0"
                                        placeholder="Search"
                                        aria-controls="DataTables_Table_0"
                                    />
                                </div>
                                <div className="dropdown">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-dark d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        <i className="icon-arrow-down-to-line me-1" />
                                        Export
                                    </Link>
                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded"
                                            >
                                                Export as PDF
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded"
                                            >
                                                Export as Excel
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href="#"
                                    className="btn btn-primary d-inline-flex align-items-center"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#add_customer"
                                >
                                    <i className="icon-plus me-1" />
                                    New Customer
                                </Link>
                            </div>
                        </div>
                        {/* End Page Header */}
                        {/* Grid View */}
                        <div className="row">
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-01.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Adrian James</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : adrian@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 54544 54587
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                25 Dec 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-02.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Sue Allen</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : sue@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 45478 54588
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                12 Nov 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-03.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Frank Barrett</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : frank@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 33658 54589
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                03 Nov 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-04.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Kelley Davis</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : kelly@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 47854 54590
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                18 Oct 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-05.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Jim Vickers</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : jim@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 58974 54591
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                29 Sep 2025
                                            </span>
                                            <span className="badge badge-soft-danger">Inactive</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-soft-danger rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <span className=" text-danger rounded-circle">NC</span>
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Nancy Chapman</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : nancy@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 96587 54592
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                15 Sep 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-07.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Ron Jude</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : ron@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 31245 54593
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                07 Sep 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-08.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Andrea Aponte</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : andr@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 47854 54594
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                22 Aug 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-09.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">David Belcher</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : david@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 14524 54595
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                11 Aug 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-10.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Julie Kangas</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : julie@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 22145 54596
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                30 Aug 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-soft-info  rounded-circle flex-shrink-0"
                                                >
                                                    <span className="text-info rounded-circle flex-shrink-0">
                                                        MA
                                                    </span>
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Micheal Angela</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : mich@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 33658 54597
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                25 Dec 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-3 col-lg-4 col-md-6">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar avatar-md border bg-light rounded-circle flex-shrink-0"  data-bs-toggle="offcanvas" data-bs-target="#view_details"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-11.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <h6 className="fs-14 fw-semibold mb-0">
                                                    <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">Cameron Lee</Link>
                                                </h6>
                                            </div>
                                            <div className="dropstart">
                                                <button
                                                    className="btn btn-icon btn-white"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-haspopup="true"
                                                    aria-expanded="false"
                                                    aria-label="Actions"
                                                >
                                                    <i className="icon-ellipsis-vertical" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-right p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                        >
                                                            <i className="icon-users-round me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_customer"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Customer
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#delete_modal"
                                                        >
                                                            <i className="icon-trash-2 me-2" />
                                                            Delete Customer
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="pb-3 border-bottom mb-3">
                                            <span className="d-flex align-items-center mb-2">
                                                <i className="icon-mail text-gray-9 me-1" />
                                                Email : came@example.com
                                            </span>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-phone text-gray-9 me-1" />
                                                Phone : +1 33658 54598
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="d-flex align-items-center">
                                                <i className="icon-calendar-clock text-gray-9 me-1" />
                                                25 Dec 2025
                                            </span>
                                            <span className="badge badge-soft-success">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <Link href="#" className="btn btn-primary m-auto">
                                <i className="icon-loader me-1" />
                                Load More
                            </Link>
                        </div>
                        {/* Grid View End*/}
                    </div>
                    {/* End Content Wrap */}
                </div>
                {/* End Content */}
            </div>
            {/* ========================
			End Page Content
		    ========================= */}
        <CustomerModal />
        </>

    )
}

export default CustomerGridComponent