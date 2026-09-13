"use client";
import Link from "next/link";
import ImageWithBasePath from "../../../components/image-with-base-path"
import { City, Country, Gender, State, Status_Inactive } from "../../../core/json/selectOption"
import CommonSelect from "../../../components/common-select/commonSelect"
import CommonDatePicker from "../../../components/common-date-picker/commonDatePicker"
import { useState } from "react"

const DriversModal = () => {
    
  const [showPassword, setShowPassword] = useState(false);

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
                                <Link href="#" className="btn btn-danger w-100">
                                    Delete
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Delete Modal  */}
            {/* Add drivers */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="add_driver">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Add New Driver</h4>
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
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Driver Name<span className="text-danger"> *</span>
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
                                        defaultValue={Gender[0]}
                                    />
                                </div>
                            </div>
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Address Line 1<span className="text-danger"> *</span>
                                    </label>
                                    <input type="text" className="form-control" />
                                </div>
                            </div>
                            <div className="col-lg-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Address Line 2<span className="text-danger"> *</span>
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
                                    <input
                                        type="text"
                                        className="form-control"
                                        defaultValue={""}
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
                                <div className="col-md-12">
                                    <div className="mb-0">
                                        <label className="form-label">About Driver</label>
                                        <textarea
                                            name="address_line_1"
                                            className="form-control rounded mb-2"
                                            id="about_driver"
                                            rows={4}
                                            defaultValue={""}
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
            {/* View Details */}
            <div className="offcanvas offcanvas-end" tabIndex={-1} id="view_details">
                <div className="offcanvas-header d-flex align-items-center justify-content-between">
                    <h4 className="offcanvas-title mb-0">Driver Details</h4>
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
                                            src="assets/img/drivers/driver-01.jpg"
                                            alt="customer"
                                            className="img-fluid"
                                        />
                                    </span>
                                    <div>
                                        <h6 className="fs-14 fw-semibold mb-1">Benjamin Scott</h6>
                                        <p className="fs-13 mb-1">DOB : 25 Jan 1991</p>
                                        <Link
                                            href="#"
                                            className="link-orange fw-semibold text-decoration-underline"
                                        >
                                            Change Password
                                        </Link>
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
                                    <span className=" text-dark">benjamin@example.com</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-phone text-gray-9 me-1" />
                                        Phone
                                    </span>
                                    <span className=" text-dark"> +1 33658 54589</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-map-pin-check-inside text-gray-9 me-1" />
                                        Address
                                    </span>
                                    <span className="text-wrap-1 text-dark">
                                        301 Market Street, Riverside Drive, FL 33128, USA
                                    </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="d-flex align-items-center">
                                        <i className="icon-user text-gray-9 me-1" />
                                        Gender
                                    </span>
                                    <span className=" text-dark">Male</span>
                                </div>
                            </div>
                        </div>
                        <div className="border-bottom p-4">
                            <h5 className="fw-bold mb-2">Driver Details</h5>
                            <div className="row">
                                <div className="col-lg-6">
                                    <div>
                                        <p className="fs-13 mb-1">License No</p>
                                        <p className="fs-14 text-dark fw-medium">DL56558</p>
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div>
                                        <p className="fs-13 mb-1">License Expiry Date</p>
                                        <p className="fs-14 text-dark fw-medium">25 May 2026</p>
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div>
                                        <p className="fs-13 mb-1">Insurance Policy No</p>
                                        <p className="fs-14 text-dark fw-medium">USPOL9834A72</p>
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div>
                                        <p className="fs-13 mb-1">Insurance Expiry Date</p>
                                        <p className="fs-14 text-dark fw-medium">22 Apr 2029</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <h6 className="fw-bold fs-16 mb-2">About Driver</h6>
                            <p className="mb-0">
                                Trained delivery driver known for fast, accurate, and safe
                                deliveries. With strong navigation skills and a customer first
                                attitude, he ensures every package reaches its destination on time.
                            </p>
                        </div>
                    </div>
                    <div className="offcanvas-footer d-flex align-items-center gap-2 pt-2">
                        <button
                            type="button"
                            className="btn btn-dark d-flex align-items-center w-100"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#edit_driver"
                        >
                            <i className="icon-pencil-line me-2" />
                            Edit Driver
                        </button>
                    </div>
                </form>
            </div>
            {/* View Details */}
        </>

    )
}

export default DriversModal