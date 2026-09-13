"use client";
import ImageWithBasePath from "../../components/image-with-base-path"
import Header from "../../components/header/header"
import { all_routes } from "../../routes/all_routes"
import RevenueBarMiniChart from "./charts/totalRevenueChart"
import RevenueBarMiniChart3 from "./charts/totalOrdersChart"
import RevenueChart from "./charts/orderStatistics"
import StatisticChart from "./charts/timeRevenueChart"
import OrderChart from "./charts/orderOverviewChart"
import BarChart1 from "./charts/orderedProductChart"
import RevenueChart1 from "./charts/categoriesChart"
import CategorySlider from "./linksSlider"
import PredefinedDatePicker from "../../components/common-date-range-picker/PredefinedDatePicker"
import DashboardModal from "./modal/dashboardModal"
import Link from "next/link";

const DashboardComponent = () => {
    return (
        <>
            {/* ========================
			Start Page Content
		    ========================= */}
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Dashboard" ordersCount={15} showOrdersButton={true} />
                    {/* End Page Header */}
                    {/* Start Content Wrap */}
                    <div className="content-wrap">
                        {/* Start Order */}
                        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
                            <PredefinedDatePicker />
                            <div className="d-flex align-items-center gap-3">
                                <div className="dropdown">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-dark d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        <i className="icon-arrow-down-to-line me-2" />
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
                                    href={all_routes.posCreate}
                                    className="btn btn-primary d-inline-flex align-items-center"
                                >
                                    <i className="icon-plus me-2 fw-semibold" />
                                    New Order
                                </Link>
                            </div>
                        </div>
                        {/* End Order */}
                        {/* Start Total */}
                        <div className="row mb-4 g-4">
                            <div className="col-xxl-8 col-xl-8">
                                {/* start row */}
                                <div className="row mb-3 g-3">
                                    {/* Item 1 */}
                                    <div className="col-lg-6 col-md-6 col-sm-6">
                                        <div className="card dash-card mb-0">
                                            <div className="card-body d-flex align-items-center justify-content-between gap-2 flex-wrap pe-1">
                                                <div>
                                                    <h6 className="mb-3">Total Revenue</h6>
                                                    <h2 className="mb-2">$48,574</h2>
                                                    <span className="badge bg-soft-success text-dark">
                                                        32%
                                                    </span>
                                                </div>
                                                <div className="d-flex align-items-center flex-column gap-2">
                                                    <div className="avatar avatar-lg rounded-circle bg-primary">
                                                        <i className="icon-badge-dollar-sign" />
                                                    </div>
                                                    <RevenueBarMiniChart />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* <div id="chart-bar-stacked" class="chart-set"></div> */}
                                    {/* Item 2 */}
                                    <div className="col-lg-6 col-md-6 col-sm-6">
                                        <div className="card dash-card mb-0">
                                            <div className="card-body d-flex align-items-center justify-content-between gap-2 flex-wrap pe-1">
                                                <div>
                                                    <h6 className="mb-3">Total Orders</h6>
                                                    <h2 className="mb-2">2,152</h2>
                                                    <span className="badge bg-soft-success text-dark">
                                                        12%
                                                    </span>
                                                </div>
                                                <div className="d-flex align-items-center flex-column gap-2">
                                                    <div className="avatar avatar-lg rounded-circle bg-warning">
                                                        <i className="icon-box" />
                                                    </div>
                                                    <RevenueBarMiniChart3 />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Item 3 */}
                                    <div className="col-lg-4 d-none">
                                        <div className="card dash-card mb-0">
                                            <div className="card-body d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                                <div>
                                                    <h6 className="mb-3">Total Products</h6>
                                                    <h2 className="mb-2">459</h2>
                                                    <span className="badge bg-soft-success text-dark">
                                                        -21%
                                                    </span>
                                                </div>
                                                <div className="d-lg-flex align-items-end flex-column gap-2">
                                                    <div className="avatar avatar-lg rounded-circle bg-success">
                                                        <i className="icon-award" />
                                                    </div>
                                                    <div id="bar-chart-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* end row */}
                                {/* start row */}
                                <div className="card mb-0 flex-fill">
                                    <div className="card-header pb-0 border-0">
                                        <h5 className="mb-0">Quick Links</h5>
                                    </div>
                                    <div className="card-body">
                                        {/* start row */}
                                        <CategorySlider />
                                        {/* end row */}
                                    </div>
                                </div>
                                {/* end row */}
                            </div>
                            <div className="col-xl-4 col-lg-12">
                                <div className="card customer-item mb-0">
                                    <div className="card-body">
                                        <h5 className="mb-4 d-flex align-items-center justify-content-between title">
                                            Top Customers
                                            <Link href={all_routes.customers} className="text-white text-decoration-underline">
                                                View All
                                            </Link>
                                        </h5>
                                        <div className="avatar-list-stacked avatar-group-sm mb-4">
                                            <span className="avatar avatar-rounded one">
                                                <ImageWithBasePath
                                                    className="border border-white"
                                                    src="assets/img/profiles/avatar-01.jpg"
                                                    alt="user"
                                                />
                                            </span>
                                            <span className="avatar avatar-rounded two">
                                                <ImageWithBasePath
                                                    className="border border-white"
                                                    src="assets/img/profiles/avatar-02.jpg"
                                                    alt="user"
                                                />
                                            </span>
                                            <span className="avatar avatar-rounded three">
                                                <ImageWithBasePath
                                                    className="border border-white"
                                                    src="assets/img/profiles/avatar-04.jpg"
                                                    alt="user"
                                                />
                                            </span>
                                            <span className="avatar avatar-rounded four">
                                                <ImageWithBasePath
                                                    className="border border-white"
                                                    src="assets/img/profiles/avatar-03.jpg"
                                                    alt="user"
                                                />
                                            </span>
                                            <span className="avatar avatar-rounded five">
                                                <ImageWithBasePath
                                                    className="border border-white"
                                                    src="assets/img/profiles/avatar-05.jpg"
                                                    alt="user"
                                                />
                                            </span>
                                        </div>
                                        <div className="user-details mb-3">
                                            <span>Anastasia Yesenenko</span>
                                            <h4 className="my-1">$459</h4>
                                            <p className="mb-0">15+ Orders</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-center gap-2 text-white position-relative z-1">
                                            <span className="badge bg-white text-dark">12%</span>{" "}
                                            Increased from last month
                                        </div>
                                    </div>
                                    <ImageWithBasePath
                                        src="assets/img/icons/rounded-icon.svg"
                                        alt="rounded-icon"
                                        className="img-fluid element-1"
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Start Total */}
                        {/* Start Graph */}
                        <div className="row">
                            <div className="col-xl-7 col-lg-7">
                                <div className="card flex-fill">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                            <h5 className="mb-0">Order Statistics</h5>
                                            <div className="dropdown">
                                                <Link
                                                    href="#"
                                                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center fw-medium"
                                                    data-bs-toggle="dropdown"
                                                >
                                                    Weekly
                                                </Link>
                                                <div className="dropdown-menu dropdown-menu-end p-3">
                                                    <ul className="list-unstyled mb-0">
                                                        <li>
                                                            <Link
                                                                href="#"
                                                                className="dropdown-item rounded"
                                                            >
                                                                Weekly
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="#"
                                                                className="dropdown-item rounded"
                                                            >
                                                                Monthly
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="#"
                                                                className="dropdown-item rounded"
                                                            >
                                                                Yearly
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                            <div className="order-graph d-flex align-items-center gap-3">
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-primary" /> Completed
                                                </p>
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-secondary" /> Pending
                                                </p>
                                            </div>
                                            <span className="badge bg-white text-dark border fw-medium">
                                                Total Orders : 4145
                                            </span>
                                        </div>
                                        <RevenueChart />
                                    </div>
                                </div>
                            </div>
                            {/* end col */}
                            <div className="col-xl-5 col-lg-5">
                                <div className="card flex-fill">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                            <h5 className="mb-0">Real Time Reveue</h5>
                                            <div className="dropdown">
                                                <Link
                                                    href="#"
                                                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center fw-medium"
                                                    data-bs-toggle="dropdown"
                                                >
                                                    Today
                                                </Link>
                                                <div className="dropdown-menu dropdown-menu-end p-3">
                                                    <ul className="list-unstyled mb-0">
                                                        <li>
                                                            <Link
                                                                href="#"
                                                                className="dropdown-item rounded"
                                                            >
                                                                Monthly
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="#"
                                                                className="dropdown-item rounded"
                                                            >
                                                                Weekly
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                href="#"
                                                                className="dropdown-item rounded"
                                                            >
                                                                Today
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <StatisticChart />
                                    </div>
                                </div>
                            </div>
                            {/* end col */}
                            <div className="col-xl-4 col-lg-6 d-flex">
                                <div className="card flex-fill">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                            <h5 className="mb-0">Order Overview</h5>
                                            <Link
                                                href={all_routes.orderReport}
                                                className="link text-decoration-underline fw-semibold"
                                            >
                                                {" "}
                                                View All{" "}
                                            </Link>
                                        </div>
                                        <div className="mb-2">
                                            <OrderChart />
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 order-graph">
                                            <p className="order-color d-flex align-items-center gap-2">
                                                {" "}
                                                <span className="bg-primary round" /> Approved
                                            </p>
                                            <p className="order-color d-flex align-items-center gap-2">
                                                {" "}
                                                <span className="bg-info round" /> Pending
                                            </p>
                                            <p className="order-color d-flex align-items-center gap-2">
                                                {" "}
                                                <span className="bg-pink round" /> Verified
                                            </p>
                                            <p className="order-color d-flex align-items-center gap-2">
                                                {" "}
                                                <span className="bg-orange round" /> Delivered
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* end col */}
                            <div className="col-xl-4 col-lg-6 d-flex">
                                <div className="card flex-fill">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                            <h5 className="mb-0">Most Ordered Products</h5>
                                            <Link
                                                href={all_routes.products}
                                                className="link text-decoration-underline fw-semibold"
                                            >
                                                {" "}
                                                View All{" "}
                                            </Link>
                                        </div>
                                        <div className="mb-2">
                                            <BarChart1 />
                                        </div>
                                        <div className="product-graph">
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-primary round" /> Evening Dress{" "}
                                                </p>{" "}
                                                214{" "}
                                            </h6>
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-primary-7 round" /> Blouse{" "}
                                                </p>{" "}
                                                192{" "}
                                            </h6>
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-primary-5 round" /> Dress Shorten{" "}
                                                </p>{" "}
                                                151{" "}
                                            </h6>
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-primary-3 round" /> Long Coat{" "}
                                                </p>{" "}
                                                120{" "}
                                            </h6>
                                            <h6 className="mb-0">
                                                {" "}
                                                <p className="order-color d-flex align-items-center gap-2">
                                                    {" "}
                                                    <span className="bg-primary-1 round" /> Suit 2pc
                                                </p>{" "}
                                                98{" "}
                                            </h6>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* end col */}
                            <div className="col-xl-4 d-flex">
                                <div className="card flex-fill">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                            <h5 className="mb-0">Top Categories</h5>
                                            <Link
                                                href="#"
                                                className="link text-decoration-underline fw-semibold"
                                            >
                                                {" "}
                                                View All{" "}
                                            </Link>
                                        </div>
                                        <RevenueChart1 />
                                        <div className="product-graph bar-graph d-flex align-items-center justify-content-between flex-wrap gap-2">
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-start gap-1 flex-column">
                                                    {" "}
                                                    Evening Dress{" "}
                                                    <span className="badge bg-white text-primary border border-primary">
                                                        {" "}
                                                        60%
                                                    </span>
                                                </p>
                                            </h6>
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-start gap-1 flex-column">
                                                    {" "}
                                                    Laundry{" "}
                                                    <span className="badge bg-white text-warning border border-warning">
                                                        {" "}
                                                        20%
                                                    </span>
                                                </p>
                                            </h6>
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-start gap-1 flex-column">
                                                    {" "}
                                                    Dry Cleaning{" "}
                                                    <span className="badge bg-white text-info border border-info">
                                                        {" "}
                                                        30%
                                                    </span>
                                                </p>
                                            </h6>
                                            <h6>
                                                {" "}
                                                <p className="order-color d-flex align-items-start gap-1 flex-column">
                                                    {" "}
                                                    Wash &amp; Fold{" "}
                                                    <span className="badge bg-white text-success border border-success">
                                                        {" "}
                                                        20%
                                                    </span>
                                                </p>
                                            </h6>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* end col */}
                        </div>
                        {/* End Graph */}
                        {/* Start Table */}
                        <div className="row row-gap-4">
                            <div className="col-xxl-8 col-xl-7 col-lg-7 d-flex">
                                <div className="card flex-fill mb-0">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4">
                                            <h5 className="mb-0 d-flex align-items-center justify-content-between w-100">
                                                Recent Orders
                                                <Link
                                                    href={all_routes.orders}
                                                    className="text-decoration-underline fs-14 fw-semibold"
                                                >
                                                    View All
                                                </Link>{" "}
                                            </h5>
                                        </div>
                                        {/* table start */}
                                        <div className="table-responsive table-nowrap">
                                            <table className="table mb-0 border">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Order ID</th>
                                                        <th>Order Date</th>
                                                        <th className="no-sort">Customer</th>
                                                        <th>Pickup</th>
                                                        <th>Delivery</th>
                                                        <th>Price</th>
                                                        <th className="no-sort">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <Link
                                                                href="#"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#view_order"
                                                                className="text-dark fw-semibold"
                                                            >
                                                                OD1245
                                                            </Link>
                                                        </td>
                                                        <td>25 Dec 2025</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <Link
                                                                    href="#"
                                                                    className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
                                                                >
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-01.jpg"
                                                                        alt="orders"
                                                                        className="img-fluid"
                                                                    />
                                                                </Link>
                                                                <h6 className="fs-14 fw-semibold mb-0">
                                                                    <Link href="#">Adrian James</Link>
                                                                </h6>
                                                            </div>
                                                        </td>
                                                        <td>12 Jan 2026</td>
                                                        <td>14 Jan 2026</td>
                                                        <td>$350</td>
                                                        <td>
                                                            <span className="badge badge-soft-success text-dark">
                                                                Approved
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <Link
                                                                href="#"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#view_order"
                                                                className="text-dark fw-semibold"
                                                            >
                                                                OD5678
                                                            </Link>
                                                        </td>
                                                        <td>12 Nov 2025</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <Link
                                                                    href="#"
                                                                    className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
                                                                >
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-02.jpg"
                                                                        alt="orders"
                                                                        className="img-fluid"
                                                                    />
                                                                </Link>
                                                                <h6 className="fs-14 fw-semibold mb-0">
                                                                    <Link href="#">Sue Allen</Link>
                                                                </h6>
                                                            </div>
                                                        </td>
                                                        <td>03 Feb 2026</td>
                                                        <td>06 Feb 2026</td>
                                                        <td>$420</td>
                                                        <td>
                                                            <span className="badge badge-soft-success text-dark">
                                                                Approved
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <Link
                                                                href="#"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#view_order"
                                                                className="text-dark fw-semibold"
                                                            >
                                                                OD9012
                                                            </Link>
                                                        </td>
                                                        <td>03 Nov 2025</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <Link
                                                                    href="#"
                                                                    className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
                                                                >
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-03.jpg"
                                                                        alt="orders"
                                                                        className="img-fluid"
                                                                    />
                                                                </Link>
                                                                <h6 className="fs-14 fw-semibold mb-0">
                                                                    <Link href="#">Frank Barrett</Link>
                                                                </h6>
                                                            </div>
                                                        </td>
                                                        <td>14 Mar 2026</td>
                                                        <td>16 Mar 2026</td>
                                                        <td>$965</td>
                                                        <td>
                                                            <span className="badge badge-soft-purple text-dark">
                                                                Verified
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <Link
                                                                href="#"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#view_order"
                                                                className="text-dark fw-semibold"
                                                            >
                                                                OD3456
                                                            </Link>
                                                        </td>
                                                        <td>18 Oct 2025</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <Link
                                                                    href="#"
                                                                    className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
                                                                >
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-04.jpg"
                                                                        alt="customer"
                                                                        className="img-fluid"
                                                                    />
                                                                </Link>
                                                                <h6 className="fs-14 fw-semibold mb-0">
                                                                    <Link href="#">Kelley Davis</Link>
                                                                </h6>
                                                            </div>
                                                        </td>
                                                        <td>25 Apr 2026</td>
                                                        <td>28 Apr 2026</td>
                                                        <td>$458</td>
                                                        <td>
                                                            <span className="badge badge-soft-cyan text-dark">
                                                                Delivered
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <Link
                                                                href="#"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#view_order"
                                                                className="text-dark fw-semibold"
                                                            >
                                                                OD7789
                                                            </Link>
                                                        </td>
                                                        <td>07 Sep 2025</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <Link
                                                                    href="#"
                                                                    className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
                                                                >
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-05.jpg"
                                                                        alt="orders"
                                                                        className="img-fluid"
                                                                    />
                                                                </Link>
                                                                <h6 className="fs-14 fw-semibold mb-0">
                                                                    <Link href="#">
                                                                    Ron Jude</Link>
                                                                </h6>
                                                            </div>
                                                        </td>
                                                        <td>28 Jul 2026</td>
                                                        <td>29 Jul 2026	</td>
                                                        <td>$365</td>
                                                        <td>
                                                            <span className="badge badge-soft-danger text-dark">
                                                                Rejected
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <Link
                                                                href="#"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#view_order"
                                                                className="text-dark fw-semibold"
                                                            >
                                                                OD7890
                                                            </Link>
                                                        </td>
                                                        <td>29 Sep 2025</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <Link
                                                                    href="#"
                                                                    className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
                                                                >
                                                                    <ImageWithBasePath
                                                                        src="assets/img/profiles/avatar-05.jpg"
                                                                        alt="orders"
                                                                        className="img-fluid"
                                                                    />
                                                                </Link>
                                                                <h6 className="fs-14 fw-semibold mb-0">
                                                                    <Link href="#">Jim Vickers</Link>
                                                                </h6>
                                                            </div>
                                                        </td>
                                                        <td>06 May 2026</td>
                                                        <td>08 May 2026</td>
                                                        <td>$320</td>
                                                        <td>
                                                            <span className="badge badge-soft-danger text-dark">
                                                                Rejected
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* table end */}
                                    </div>
                                </div>
                            </div>
                            <div className="col-xxl-4 col-xl-5 col-lg-5 d-flex">
                                <div className="card flex-fill mb-0">
                                    <div className="card-body">
                                        <div className="card-header pt-0 ps-0 pe-0 mb-4">
                                            <h5 className="mb-0 d-flex align-items-center justify-content-between w-100">
                                                Drivers
                                                <Link
                                                    href={all_routes.driversList}
                                                    className="text-decoration-underline fs-14 fw-semibold"
                                                >
                                                    View All
                                                </Link>{" "}
                                            </h5>
                                        </div>
                                        {/* Item 1 */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar border bg-light rounded-circle flex-shrink-0"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-02.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">
                                                        <Link href="#">Sue Allen</Link>
                                                    </h6>
                                                    <span className="d-flex align-items-center">
                                                        <i className="icon-phone me-1 fs-13" />
                                                        Phone : +1 54544 54587
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="badge badge-white border text-dark d-inline-flex align-items-center gap-1">
                                                {" "}
                                                <span className="dot bg-success" /> Online
                                            </span>
                                        </div>
                                        {/* Item 2 */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar border bg-light rounded-circle flex-shrink-0"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-03.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">
                                                        <Link href="#">Matthew Parker</Link>
                                                    </h6>
                                                    <span className="d-flex align-items-center">
                                                        <i className="icon-phone me-1 fs-13" />
                                                        Phone : +1 45478 54588
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="badge badge-white border text-dark d-inline-flex align-items-center gap-1">
                                                {" "}
                                                <span className="dot bg-success" /> Online
                                            </span>
                                        </div>
                                        {/* Item 3 */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar border bg-light rounded-circle flex-shrink-0"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-04.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">
                                                        <Link href="#">Samuel Harris</Link>
                                                    </h6>
                                                    <span className="d-flex align-items-center">
                                                        <i className="icon-phone me-1 fs-13" />
                                                        Phone : +1 33658 54589
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="badge badge-white border text-dark d-inline-flex align-items-center gap-1">
                                                {" "}
                                                <span className="dot bg-success" /> Online
                                            </span>
                                        </div>
                                        {/* Item 4 */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar border bg-light rounded-circle flex-shrink-0"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-05.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">
                                                        <Link href="#">Riley Cooper</Link>
                                                    </h6>
                                                    <span className="d-flex align-items-center">
                                                        <i className="icon-phone me-1 fs-13" />
                                                        Phone : +1 47854 54590
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="badge badge-white border text-dark d-inline-flex align-items-center gap-1">
                                                {" "}
                                                <span className="dot bg-success" /> Online
                                            </span>
                                        </div>
                                        {/* Item 5 */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar border bg-light rounded-circle flex-shrink-0"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-07.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">
                                                        <Link href="#">Avery Parker</Link>
                                                    </h6>
                                                    <span className="d-flex align-items-center">
                                                        <i className="icon-phone me-1 fs-13" />
                                                        Phone : +1 58974 54591
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="badge badge-white border text-dark d-inline-flex align-items-center gap-1">
                                                {" "}
                                                <span className="dot bg-success" /> Online
                                            </span>
                                        </div>
                                        {/* Item 6 */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link
                                                    href="#"
                                                    className="avatar border bg-light rounded-circle flex-shrink-0"
                                                >
                                                    <ImageWithBasePath
                                                        src="assets/img/profiles/avatar-08.jpg"
                                                        alt="customer"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                </Link>
                                                <div>
                                                    <h6 className="fs-14 fw-semibold mb-1">
                                                        <Link href="#">John Smith</Link>
                                                    </h6>
                                                    <span className="d-flex align-items-center">
                                                        <i className="icon-phone me-1 fs-13" />
                                                        Phone : +1 542344 5587
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="badge badge-white border text-dark d-inline-flex align-items-center gap-1">
                                                {" "}
                                                <span className="dot bg-danger" /> Offline
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* End Table */}
                    </div>
                    {/* End Content Wrap */}
                </div>
                {/* End Content */}
            </div>
            {/* ========================
			End Page Content
	        ========================= */}
            <DashboardModal />
        </>
    )
}

export default DashboardComponent