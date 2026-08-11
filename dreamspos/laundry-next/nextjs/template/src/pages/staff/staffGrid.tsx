"use client";
import Link from "next/link";
import Header from "../../components/header/header"
import ImageWithBasePath from "../../components/image-with-base-path"
import { all_routes } from "../../routes/all_routes"
import StaffModal from "./modal/staffModal"

const StaffGridComponent = () => {
    return (
        <>
            {/* ========================
			Start Page Content
		    ========================= */}
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Staff" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* Start Content Wrap */}
                    <div className="content-wrap">
                        {/* Page Header */}
                        <div className="d-flex align-items-center flex-wrap gap-3 border-bottom pb-4 mb-4">
                            <div className="flex-grow-1">
                                <div className="d-inline-flex align-items-center p-1 bg-light border rounded-pill">
                                    <Link
                                        href={all_routes.staffList}
                                        className="px-3 py-1 fw-semibold d-inline-flex align-items-center rounded-pill"
                                    >
                                        <i className="icon-list me-2" />
                                        List View
                                    </Link>
                                    <Link
                                        href={all_routes.staffGrid}
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
                                                <Link href="#" className="dropdown-item rounded">
                                                    Newest
                                                </Link>
                                            </li>
                                            <li>
                                                <Link href="#" className="dropdown-item rounded">
                                                    Oldest
                                                </Link>
                                            </li>
                                            <li>
                                                <Link href="#" className="dropdown-item rounded">
                                                    Ascending
                                                </Link>
                                            </li>
                                            <li>
                                                <Link href="#" className="dropdown-item rounded">
                                                    Descending
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                {/* table search */}
                                <div className="input-group w-auto input-group-flat">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search Keyword"
                                    />
                                    <span className="input-group-text">
                                        <i className="icon-search" />
                                    </span>
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
                                            <Link href="#" className="dropdown-item rounded">
                                                Export as PDF
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="#" className="dropdown-item rounded">
                                                Export as Excel
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href="#"
                                    className="btn btn-primary d-inline-flex align-items-center"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#add_staffs"
                                >
                                    <i className="icon-plus me-1" />
                                    New Staff
                                </Link>
                            </div>
                        </div>
                        {/* End Page Header */}
                        {/* Grid start */}
                        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4 row-gap-1 mb-4">
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-01.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Jason Miller
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 54544 54587</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-success me-1" /> Admin
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-02.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Sarah Thompson
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 98778 12388</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-warning me-1" />
                                                Billing
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-03.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Michael Roberts
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 65458 96389</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-info me-1" />
                                                Attendant
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-04.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Olivia Carter
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 12354 74190</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-orange me-1" />
                                                Operator
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-05.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Sophia Hayes
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 45674 85291</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-purple me-1" />
                                                Dryer Operator
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-06.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Hannah Lewis
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 78987 36992</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-indigo me-1" />
                                                Ironing Staff
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-07.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Charlotte Evans
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 32145 15993</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-cyan me-1" />
                                                Removal Expert
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-08.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Aiden Murphy
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 65454 75394</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-danger me-1" />
                                                Supervisor
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-09.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        David Harris
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 98724 84695</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-pink me-1" /> Branch Manager
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-10.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Micheal Stewart
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 25845 95196</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-success me-1" />
                                                Technician
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-11.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Emily Carter
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 65432 98765</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-danger me-1" />
                                                Operator
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-12.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Michael Johnson
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 78901 23456</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-indigo me-1" />
                                                Ironing Staff
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-13.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Sophia Turner
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 56789 12345</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-success me-1" />
                                                Marketing
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-14.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Daniel Brown
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 43210 67890</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-info me-1" />
                                                Attendant
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill my-0">
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom rounded">
                                            <div className="d-flex align-items-center gap-2 flex-wrap flex-xl-nowrap">
                                                <Link href="#" className="avatar avatar-rounded flex-shrink-0" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                    <ImageWithBasePath
                                                        src="assets/img/staffs/staff-15.jpg"
                                                        className="img-fluid"
                                                        alt="img"
                                                    />
                                                </Link>
                                                <div className="w-100">
                                                    <Link href="#" className="mb-1 fw-medium" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                        Olivia Smith
                                                    </Link>
                                                    <p className="mb-0 fs-13 text-body">+1 98765 43210</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                <span className="badge-dot bg-info me-1" />
                                                Removal Expert
                                            </span>
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
                                                <ul className="dropdown-menu p-3">
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#view_details"
                                                        >
                                                            <i className="icon-users me-2" />
                                                            View Details
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="#"
                                                            className="dropdown-item rounded d-flex align-items-center"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#edit_staff"
                                                        >
                                                            <i className="icon-pencil-line me-2" />
                                                            Edit Staff
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
                                                            Delete Staff{" "}
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex justify-content-center">
                            <button
                                type="button"
                                className="btn btn-primary d-flex align-items-center"
                            >
                                {" "}
                                <i className="icon-loader me-1" />
                                Load More
                            </button>
                        </div>
                        {/* Grid end */}
                    </div>
                    {/* End Content Wrap */}
                </div>
                {/* End Content */}
            </div>
            {/* ========================
			End Page Content
		    ========================= */}
            <StaffModal />
        </>

    )
}

export default StaffGridComponent