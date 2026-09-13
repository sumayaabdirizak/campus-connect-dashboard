import Link from "next/link"
import CommonSelect from "../../../../components/common-select/commonSelect"
import ImageWithBasePath from "../../../../components/image-with-base-path"
import { Status_Inactive } from "../../../../core/json/selectOption"

const PermissionsModal = () => {
    return (
        <>
            {/* Add Category */}
            <div className="modal fade" id="add_role">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-colored border-0 p-4 pb-3">
                            <ImageWithBasePath
                                src="assets/img/icons/tax-modal-icon.svg"
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
                                <div className="mb-3">
                                    <h4 className="modal-title">Create New Role</h4>
                                </div>
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Role Name<span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
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
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* Add Category End */}
            {/* Edit Category */}
            <div className="modal fade" id="edit_role">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-colored border-0 p-4 pb-3">
                            <ImageWithBasePath
                                src="assets/img/icons/tax-modal-icon.svg"
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
                                <div className="mb-3">
                                    <h4 className="modal-title">Edit Role</h4>
                                </div>
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Role Name<span className="text-danger"> *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue="Admin"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
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
            {/* Edit Category End */}
            {/* Start Modal  */}
            <div className="modal fade" id="delete_modal">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                    <div className="modal-content">
                        <div className="modal-body text-center p-4">
                            <div className="mb-4">
                                <span className="avatar avatar-xxl rounded-circle bg-danger-subtle">
                                    <ImageWithBasePath
                                        src="assets/img/icons/trash-icon.svg"
                                        alt="trash"
                                        className="img-fluid w-auto h-auto"
                                    />
                                </span>
                            </div>
                            <h4 className="mb-1">Delete Confirmation</h4>
                            <p className="mb-4">Are you sure you want to delete?</p>
                            <div className="d-flex justify-content-center gap-2">
                                <Link href="#" className="btn btn-dark w-100" data-bs-dismiss="modal">
                                    Close
                                </Link>
                                <Link
                                    href="#"
                                    className="btn btn-danger w-100"
                                >
                                    Delete
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Modal  */}
        </>

    )
}

export default PermissionsModal