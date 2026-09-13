"use client";
import Link from "next/link";
import CommonSelect from "../../../../components/common-select/commonSelect"
import { Status_Inactive } from "../../../../core/json/selectOption"
import ImageWithBasePath from "../../../../components/image-with-base-path"

const AddonModal = () => {
    return (
        <>
            {/* Add Add On */}
            <div className="modal fade" id="add_addon">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 pb-1">
                            <h4 className="modal-title">Create Add On</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-modal position-relative"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-4 d-flex align-items-center flex-wrap gap-3">
                                            <div className="avatar avatar-3xl border bg-light">
                                                <i className="icon-images fs-28 text-dark" />
                                            </div>
                                            <div>
                                                <label className="form-label">Upload Product Image</label>
                                                <p className="fs-13 mb-3">Image should be with in 5 MB</p>
                                                <div className="d-flex align-items-center">
                                                    <div className="btn btn-icon btn-sm btn-white rounded-circle position-relative me-2">
                                                        <input
                                                            type="file"
                                                            className="form-control position-absolute w-100 h-100 top-0 start-0 opacity-0"
                                                        />
                                                        <i className="icon-upload" />
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
                                                Type<span className="text-danger"> *</span>
                                            </label>
                                            <div className="d-flex align-items-center flex-wrap gap-3">
                                                <div className="btn-radio position-relative">
                                                    <input
                                                        type="radio"
                                                        className="btn-check top-50 translate-middle-y form-check-input me-2"
                                                        name="type"
                                                        id="detergent"
                                                        defaultChecked
                                                    />
                                                    <label
                                                        className="btn btn-light rounded p-3 fs-16 fw-medium"
                                                        htmlFor="detergent"
                                                    >
                                                        Detergent
                                                    </label>
                                                </div>
                                                <div className="btn-radio position-relative">
                                                    <input
                                                        type="radio"
                                                        className="btn-check top-50 translate-middle-y form-check-input me-2"
                                                        name="type"
                                                        id="softener"
                                                    />
                                                    <label
                                                        className="btn btn-light rounded p-3 fs-16 fw-medium"
                                                        htmlFor="softener"
                                                    >
                                                        Softener
                                                    </label>
                                                </div>
                                                <div className="btn-radio position-relative">
                                                    <input
                                                        type="radio"
                                                        className="btn-check top-50 translate-middle-y form-check-input me-2"
                                                        name="type"
                                                        id="dry"
                                                    />
                                                    <label
                                                        className="btn btn-light rounded p-3 fs-16 fw-medium"
                                                        htmlFor="dry"
                                                    >
                                                        Dry
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Name<span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Status<span className="text-danger"> *</span>
                                            </label>
                                            <CommonSelect
                                                options={Status_Inactive}
                                                className="select"
                                                defaultValue={Status_Inactive[0]}
                                                />
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between gap-2 pt-1">
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
                                        Create New
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* Add Add On End */}
            {/* Edit Add On */}
            <div className="modal fade" id="edit_addon">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 pb-1">
                            <h4 className="modal-title">Edit Add On</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-modal position-relative"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-4 d-flex align-items-center flex-wrap gap-3">
                                            <div className="avatar avatar-3xl border bg-light">
                                                <ImageWithBasePath
                                                    src="assets/img/addon/addon-01.svg"
                                                    alt="add on"
                                                    className="img-fluid"
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Upload Product Image</label>
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
                                                Type<span className="text-danger"> *</span>
                                            </label>
                                            <div className="d-flex align-items-center flex-wrap gap-3">
                                                <div className="btn-radio position-relative">
                                                    <input
                                                        type="radio"
                                                        className="btn-check top-50 translate-middle-y form-check-input me-2"
                                                        name="type"
                                                        id="detergent1"
                                                        defaultChecked
                                                    />
                                                    <label
                                                        className="btn btn-light rounded p-3 fs-16 fw-medium"
                                                        htmlFor="detergent1"
                                                    >
                                                        Detergent
                                                    </label>
                                                </div>
                                                <div className="btn-radio position-relative">
                                                    <input
                                                        type="radio"
                                                        className="btn-check top-50 translate-middle-y form-check-input me-2"
                                                        name="type"
                                                        id="softener2"
                                                    />
                                                    <label
                                                        className="btn btn-light rounded p-3 fs-16 fw-medium"
                                                        htmlFor="softener2"
                                                    >
                                                        Softener
                                                    </label>
                                                </div>
                                                <div className="btn-radio position-relative">
                                                    <input
                                                        type="radio"
                                                        className="btn-check top-50 translate-middle-y form-check-input me-2"
                                                        name="type"
                                                        id="dry3"
                                                    />
                                                    <label
                                                        className="btn btn-light rounded p-3 fs-16 fw-medium"
                                                        htmlFor="dry3"
                                                    >
                                                        Dry
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Name<span className="text-danger"> *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue="Free"
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Status<span className="text-danger"> *</span>
                                            </label>
                                            <CommonSelect
                                                options={Status_Inactive}
                                                className="select"
                                                defaultValue={Status_Inactive[1]}
                                                />
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between gap-2 pt-1">
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
                                        Save
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* Edit Add On End */}
        </>

    )
}

export default AddonModal