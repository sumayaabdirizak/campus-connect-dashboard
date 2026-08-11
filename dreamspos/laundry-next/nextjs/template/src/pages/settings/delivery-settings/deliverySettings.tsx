"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"

const DeliverySettingsComponents = () => {
    return (
        <>
            {/* ========================
			Start Page Content
		    ========================= */}
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Settings" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* Start Content Wrap */}
                    <div className="content-wrap">
                        {/* row start */}
                        <div className="row justify-content-center">
                            <div className="col-xl-10">
                                {/* row start */}
                                <div className="row justify-content-center">
                                    <div className="col-lg-3">
                                        <SettingsSidebar />
                                    </div>
                                    <div className="col-lg-9">
                                        <form>
                                            {/* card start */}
                                            <div className="card mb-0">
                                                <div className="card-header">
                                                    <h4 className="d-inline-flex align-items-center mb-0">
                                                        <i className="icon-bike me-2" />
                                                        Delivery
                                                    </h4>
                                                </div>
                                                <div className="card-body">
                                                    <div className="card">
                                                        <div className="card-body">
                                                            <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0">
                                                                <label
                                                                    className="form-check-label fs-16 fw-bold text-dark"
                                                                    htmlFor="switchCheckChecked"
                                                                >
                                                                    Free Delivery
                                                                </label>
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    id="switchCheckChecked"
                                                                    defaultChecked
                                                                />
                                                            </div>
                                                            <div className="mb-0">
                                                                <label className="form-label">
                                                                    Free Delivery Over ($)
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>
                                                        {/* card-body */}
                                                    </div>
                                                    {/* card end */}
                                                    <div className="card">
                                                        <div className="card-body">
                                                            <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0">
                                                                <label
                                                                    className="form-check-label fs-16 fw-bold text-dark"
                                                                    htmlFor="switchCheckChecked1"
                                                                >
                                                                    Fixed Delivery Charges
                                                                </label>
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    id="switchCheckChecked1"
                                                                    defaultChecked
                                                                />
                                                            </div>
                                                            <div className="mb-0">
                                                                <label className="form-label">
                                                                    Fixed Delivery Amount ($)
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>
                                                        {/* card-body */}
                                                    </div>
                                                    {/* card end */}
                                                    <div className="card mb-0">
                                                        <div className="card-body">
                                                            <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0">
                                                                <label
                                                                    className="form-check-label fs-16 fw-bold text-dark"
                                                                    htmlFor="switchCheckChecked2"
                                                                >
                                                                    Kilometer Based Delivery Charges
                                                                </label>
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    id="switchCheckChecked2"
                                                                    defaultChecked
                                                                />
                                                            </div>
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Per KM Delivery Charge ($)
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Minimum Delivery Over ($)
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                            <div className="mb-0">
                                                                <label className="form-label">
                                                                    Minimum Distance for Free Delivery (KM)
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>
                                                        {/* card-body */}
                                                    </div>
                                                    {/* card end */}
                                                </div>{" "}
                                                {/* end card body */}
                                                <div className="card-footer">
                                                    <div className="d-flex align-items-center justify-content-end gap-2 pt-1">
                                                        <button type="button" className="btn btn-dark">
                                                            <i className="icon-x me-1" />
                                                            Cancel
                                                        </button>
                                                        <button type="submit" className="btn btn-primary">
                                                            <i className="icon-circle-check me-1" />
                                                            Submit
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* card end */}
                                        </form>
                                    </div>

                                </div>
                                {/* row end */}
                            </div>
                            {/* col end */}
                        </div>
                        {/* row end */}
                    </div>
                    {/* End Content Wrap */}
                </div>
                {/* End Content */}
            </div>
            {/* ========================
			End Page Content
		    ========================= */}
        </>

    )
}

export default DeliverySettingsComponents