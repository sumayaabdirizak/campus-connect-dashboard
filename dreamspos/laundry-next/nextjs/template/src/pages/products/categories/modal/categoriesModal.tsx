import CommonSelect from "../../../../components/common-select/commonSelect"
import { Status_Inactive } from "../../../../core/json/selectOption"

const CategoriesModal = () => {
    return (
        <>
            {/* Add Category */}
            <div className="modal fade" id="add_category">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 pb-1">
                            <h4 className="modal-title">Create Category</h4>
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
            {/* Add Category End */}
            {/* Edit Category */}
            <div className="modal fade" id="edit_category">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 pb-1">
                            <h4 className="modal-title">Edit Category</h4>
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
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Name<span className="text-danger"> *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue="Accessories"
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
            {/* Edit Category End */}
        </>

    )
}

export default CategoriesModal