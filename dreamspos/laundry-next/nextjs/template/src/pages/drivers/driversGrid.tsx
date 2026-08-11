"use client";
import Link from "next/link";
import Header from "../../components/header/header"
import { all_routes } from "../../routes/all_routes"
import ImageWithBasePath from "../../components/image-with-base-path"
import DriversModal from "./modal/driversModal"

const DriversGridComponent = () => {
    return (
        <>
            {/* ========================
			Start Page Content
		    ========================= */}
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Drivers" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* Start Content Wrap */}
                    <div className="content-wrap">
                        {/* Page Header */}
                        <div className="d-flex align-items-center flex-wrap gap-3 border-bottom pb-4 mb-4">
                            <div className="flex-grow-1">
                                <div className="d-inline-flex align-items-center p-1 bg-light border rounded-pill">
                                    <Link
                                        href={all_routes.driversList}
                                        className="px-3 py-1 fw-semibold d-inline-flex align-items-center rounded-pill"
                                    >
                                        <i className="icon-list me-2" />
                                        List View
                                    </Link>
                                    <Link
                                        href={all_routes.driversGrid}
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
                                    data-bs-target="#add_driver"
                                >
                                    <i className="icon-plus me-1" />
                                    New Driver
                                </Link>
                            </div>
                        </div>
                        {/* End Page Header */}
                        {/* Grid start */}
                        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 row-cols-xxl-5">
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-01.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Benjamin Scott
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 54544 54587
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-02.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Matthew Parker
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 45478 54588
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-03.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Samuel Harris
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 33658 54589
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-04.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Riley Cooper
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 47854 54590
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-05.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Avery Parker
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 58974 54591
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-danger me-1" />
                                                    Offline
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-06.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Quinn Bailey
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 96587 54592
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-07.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Cameron Lee
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 31245 54593
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-08.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Jamie Brooks
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 47854 54594
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-09.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Alex Campbell
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 14524 54595
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Online
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="card flex-fill">
                                    <div className="card-body p-0">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap">
                                            <ImageWithBasePath
                                                src="assets/img/drivers/driver-10.jpg"
                                                className="img-fluid rounded w-100"
                                                alt="img"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-3 d-flex align-items-center justify-content-between">
                                                <div className="ms-2">
                                                    <h6 className="fw-semibold mb-1 fs-14">
                                                        <Link href="#" className="text-dark" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                                            Casey Adams
                                                        </Link>
                                                    </h6>
                                                    <p className="fs-13 mb-0 d-flex align-items-center">
                                                        <i className="icon-phone me-1" />
                                                        +1 22145 54596
                                                    </p>
                                                </div>
                                                <span className="badge badge-soft-success">Active</span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                                    <span className="badge-dot bg-success me-1" />
                                                    Offline
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
                                                                data-bs-target="#edit_driver"
                                                            >
                                                                <i className="icon-pencil-line me-2" />
                                                                Edit Driver
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
                                                                Delete Driver{" "}
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
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
            <DriversModal />
        </>
    )
}

export default DriversGridComponent