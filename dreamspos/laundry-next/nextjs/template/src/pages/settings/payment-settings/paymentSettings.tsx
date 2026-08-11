"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"

const PaymentSettingsComponents = () => {
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
                                                        <i className="icon-printer me-2" />
                                                        Payment Types
                                                    </h4>
                                                </div>
                                                <div className="card-body">
                                                    {/* start row */}
                                                    <div className="row">
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-badge-dollar-sign fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">Cash</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-credit-card fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">Card</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked1"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked1"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-wallet fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">Wallet</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked2"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked2"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-russian-ruble fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">PayPal</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked3"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked3"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-qr-code fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">QR Reader</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked4"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked4"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-receipt-text fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">Card Reader</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked5"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked5"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6 col-lg-4">
                                                            <div className="card flex-fill mb-0">
                                                                <div className="card-body">
                                                                    <div className="w-100 d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="avatar avatar-md bg-dark p-2 me-2 flex-shrink-0">
                                                                                <i className="icon-landmark fs-20 text-primary" />
                                                                            </div>
                                                                            <p className="mb-0 text-dark">Bank</p>
                                                                        </div>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <label
                                                                                    className="form-check-label"
                                                                                    htmlFor="switchCheckChecked6"
                                                                                />
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    id="switchCheckChecked6"
                                                                                    defaultChecked
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                    </div>
                                                    {/* end row */}
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

export default PaymentSettingsComponents