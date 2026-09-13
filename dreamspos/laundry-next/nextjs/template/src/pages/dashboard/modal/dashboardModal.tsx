
import Link from "next/link"
import ImageWithBasePath from "../../../components/image-with-base-path"

const DashboardModal = () => {
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
            {/* End View Order */}
        </>

    )
}

export default DashboardModal