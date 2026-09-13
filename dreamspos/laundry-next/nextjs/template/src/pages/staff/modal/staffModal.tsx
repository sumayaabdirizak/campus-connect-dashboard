"use client";
import Link from "next/link";
import ImageWithBasePath from "../../../components/image-with-base-path"
import CommonSelect from "../../../components/common-select/commonSelect"
import { City, Country, Gender, Role, State, Status_Inactive } from "../../../core/json/selectOption"

const StaffModal = () => {
    return (
        <>
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
                                <Link href="#" className="btn btn-danger w-100" data-bs-dismiss="modal">
                                    Delete
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Delete Modal  */}
            {/* Add staffs */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="add_staffs">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Add New Staff</h4>
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
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        First Name<span className="text-danger"> *</span>
                                    </label>
                                    <input type="text" className="form-control" />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Last Name<span className="text-danger"> *</span>
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
                            <div className="col-lg-12 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Role<span className="text-danger"> *</span>
                                    </label>
                                    <CommonSelect
                                        options={Role}
                                        className="select"
                                        defaultValue={Role[0]}
                                    />
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Phone Number<span className="text-danger"> *</span>
                                    </label>
                                    <input type="text" className="form-control" />
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
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue={""}
                                    />
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">About Staff</label>
                                    <textarea
                                        name="address_line_1"
                                        className="form-control rounded mb-2"
                                        id=""
                                        defaultValue={""}
                                    />
                                    <span>Add Minimum 200 Characters</span>
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
                            Submit
                        </button>
                    </div>
                </form>
            </div>
            {/* End Add staffs */}
            {/* Edit staffs */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="edit_staff">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Edit Staff</h4>
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
                                        <ImageWithBasePath src="assets/img/staffs/staff-02.jpg" alt="staff-01" />
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
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        First Name<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="Jason"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Last Name<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="Miller"
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
                            <div className="col-lg-12 col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Role<span className="text-danger"> *</span>
                                    </label>
                                    <CommonSelect
                                        options={Role}
                                        className="select"
                                        defaultValue={Role[1]}
                                    />
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Phone Number<span className="text-danger"> *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue="+1 54544 54587"
                                    />
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
                                    <input type="text" className="form-control" defaultValue={"Riverside Drive"} />
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
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">About Staff</label>
                                    <textarea
                                        name="address_line_1"
                                        className="form-control rounded mb-2"
                                        id=""
                                        defaultValue={"Reliable billing executive known for fast and error free transactions. Handles payments, discounts, refunds, and POS entries with precision while offering friendly, customer-first service at the counter."}
                                    />
                                    <span>Add Minimum 200 Characters</span>
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
            {/* End Edit staffs */}
            {/* View Details */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="view_details">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Staff Details</h4>
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
                                            src="assets/img/staffs/staff-02.jpg"
                                            alt="customer"
                                            className="img-fluid"
                                        />
                                    </span>
                                    <div>
                                        <h6 className="fs-14 fw-semibold mb-1">Sarah Thompson</h6>
                                        <p className="fs-13 mb-1">DOB : 25 Jan 1991</p>
                                    </div>
                                </div>
                                <span className="badge badge-white border-gray d-inline-flex align-items-center">
                                    <span className="badge-dot bg-warning me-1" /> Biller
                                </span>
                            </div>
                            <div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-mail text-gray-9 me-1" />
                                        Email
                                    </span>
                                    <span>sarah@example.com</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-phone text-gray-9 me-1" />
                                        Phone
                                    </span>
                                    <span>+1 98778 12388</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-map-pin-check-inside text-gray-9 me-1" />
                                        Address
                                    </span>
                                    <span className="text-wrap-1">
                                        123 Elm Road, Springfield, NY 12345, USA
                                    </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-user text-gray-9 me-1" />
                                        Gender
                                    </span>
                                    <span>Female</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <h6 className="fw-bold fs-16 mb-2">About Staff</h6>
                            <p className="mb-0">
                                Reliable billing executive known for fast and error free
                                transactions. Handles payments, discounts, refunds, and POS entries
                                with precision while offering friendly, customer-first service at
                                the counter.
                            </p>
                        </div>
                    </div>
                    <div className="offcanvas-footer d-flex align-items-center gap-2 pt-2">
                        <button
                            type="button"
                            className="btn btn-dark d-flex align-items-center w-100"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#edit_staff"
                        >
                            <i className="icon-pencil-line me-2" />
                            Edit Staff
                        </button>
                    </div>
                </form>
            </div>
            {/* View Details */}
        </>

    )
}

export default StaffModal