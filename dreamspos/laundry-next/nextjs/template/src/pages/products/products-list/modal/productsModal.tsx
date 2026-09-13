"use client";

import Link from "next/link";
import CommonMultiSelect from "../../../../components/common-multiselect/commonMultiSelect"
import CommonSelect from "../../../../components/common-select/commonSelect"
import { Category, Services, Status_Inactive } from "../../../../core/json/selectOption"

const ProductsModal = () => {
    return (
        <>
            {/* Add Product */}
            <div className="modal fade" id="add_product">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 pb-1">
                            <h4 className="modal-title">Create Product</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-modal position-relative position-relative"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form action="products.html">
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
                                                Product Name<span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Services<span className="text-danger"> *</span>
                                            </label>
                                            <CommonMultiSelect
                                                options={Services}
                                                className="select"
                                                defaultValue={[Services[0]]}
                                            />

                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Category<span className="text-danger"> *</span>
                                            </label>
                                            <CommonMultiSelect
                                                options={Category}
                                                className="select"
                                                defaultValue={[Category[0]]}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Price<span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Offer Price<span className="text-danger"> *</span>
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
                                        <div className="form-check form-switch mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                id="switchCheckChecked"
                                                defaultChecked
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="switchCheckChecked"
                                            >
                                                Change Price on Add Producty
                                            </label>
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
            {/* Add Product End */}
            {/* Edit Product */}
            <div className="modal fade" id="edit_product">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 pb-1">
                            <h4 className="modal-title">Edit Product</h4>
                            <button
                                type="button"
                                className="btn-close btn-close-modal position-relative"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <form action="products.html">
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
                                                Product Name<span className="text-danger"> *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue="Waistcoat"
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Services<span className="text-danger"> *</span>
                                            </label>
                                            <CommonMultiSelect
                                                options={Services}
                                                className="select"
                                                defaultValue={[Services[1]]}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Category<span className="text-danger"> *</span>
                                            </label>
                                            <CommonMultiSelect
                                                options={Category}
                                                className="select"
                                                defaultValue={[Category[1]]}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Price<span className="text-danger"> *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue="$25"
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Offer Price<span className="text-danger"> *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue="$25"
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
                                        <div className="form-check form-switch mb-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                id="switchCheckChecked"
                                                defaultChecked
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="switchCheckChecked"
                                            >
                                                Change Price on Add Producty
                                            </label>
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
            {/* Edit Product End */}
        </>

    )
}

export default ProductsModal