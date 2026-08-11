"use client";
import { City, Country, Gender, State, Status_Inactive } from "../../../core/json/selectOption"
import CommonSelect from "../../../components/common-select/commonSelect"
import ImageWithBasePath from "../../../components/image-with-base-path"
import Link from "next/link";

const CustomerModal = () => {
    return (
        <>
            {/* Add Customer */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="add_customer">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Create Customer</h4>
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
                                    <div className="avatar avatar-3xl border bg-light">
                                        <i className="icon-images fs-28 text-dark" />
                                    </div>
                                    <div>
                                        <label className="form-label">
                                            Profile Image<span className="text-danger"> *</span>
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
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-control" />
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Address Line 1<span className="text-danger"> *</span>
                                    </label>
                                    <input type="text" className="form-control" />
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Address Line 2
                                    </label>
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
                                <div className="mb-3">
                                    <label className="form-label">Gender</label>
                                    <CommonSelect
                                        options={Gender}
                                        className="select"
                                        defaultValue={Gender[0]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">Status</label>
                                    <CommonSelect
                                        options={Status_Inactive}
                                        className="select"
                                        defaultValue={Status_Inactive[0]}
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
                            SUbmit
                        </button>
                    </div>
                </form>
            </div>
            {/* End Add Customer */}
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
                                            Profile Image<span className="text-danger"> *</span>
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
                                        Address Line 2
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
                                    <input type="text" className="form-control" value={33128} />
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
            {/* End Add Customer */}
            {/* Customer Details */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="view_details">
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
                                <Link
                                    href="#"
                                    className="btn btn-light w-100"
                                    data-bs-dismiss="modal"
                                >
                                    Close
                                </Link>
                                <Link href="#" className="btn btn-danger w-100" data-bs-dismiss="modal">
                                    Delete
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Delete Modal  */}

        </>

    )
}

export default CustomerModal