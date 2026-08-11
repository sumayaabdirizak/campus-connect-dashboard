"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"

const NotificationsSettingsComponents = () => {
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
                                                        <i className="icon-bell me-2" />
                                                        Notifications
                                                    </h4>
                                                </div>
                                                <div className="card-body">
                                                    <div className="card">
                                                        <div className="card-body">
                                                            <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0 pb-3 border-bottom">
                                                                <label
                                                                    className="form-check-label fw-medium text-dark"
                                                                    htmlFor="switchCheckChecked"
                                                                >
                                                                    Mobile Push Notifications
                                                                </label>
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    id="switchCheckChecked"
                                                                    defaultChecked
                                                                />
                                                            </div>
                                                            <div className="form-check form-switch d-flex align-items-center justify-content-between ps-0">
                                                                <label
                                                                    className="form-check-label fw-medium text-dark"
                                                                    htmlFor="switchCheckChecked2"
                                                                >
                                                                    Desktop Notifications
                                                                </label>
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    id="switchCheckChecked2"
                                                                    defaultChecked
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* card-body */}
                                                    </div>
                                                    {/* card end */}
                                                    <h6 className="mb-3">General Notification</h6>
                                                    <div className="card mb-0">
                                                        <div className="card-body">
                                                            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom">
                                                                <h6 className="fs-14 fw-medium mb-3">Payment</h6>
                                                                <div className="d-flex align-items-center gap-4">
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked3"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked3"
                                                                        >
                                                                            Push
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked4"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked4"
                                                                        >
                                                                            SMS
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked5"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked5"
                                                                        >
                                                                            Email
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom">
                                                                <h6 className="fs-14 fw-medium mb-3">Transaction</h6>
                                                                <div className="d-flex align-items-center gap-4">
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked6"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked6"
                                                                        >
                                                                            Push
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked7"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked7"
                                                                        >
                                                                            SMS
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked8"
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked8"
                                                                        >
                                                                            Email
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom">
                                                                <h6 className="fs-14 fw-medium mb-3">Activity</h6>
                                                                <div className="d-flex align-items-center gap-4">
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked9"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked9"
                                                                        >
                                                                            Push
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked10"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked10"
                                                                        >
                                                                            SMS
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch mb-3">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked11"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked11"
                                                                        >
                                                                            Email
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between">
                                                                <h6 className="fs-14 fw-medium">Account</h6>
                                                                <div className="d-flex align-items-center gap-4">
                                                                    <div className="form-check form-switch">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked12"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked12"
                                                                        >
                                                                            Push
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked13"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked13"
                                                                        >
                                                                            SMS
                                                                        </label>
                                                                    </div>
                                                                    <div className="form-check form-switch">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            id="switchCheckChecked14"
                                                                            defaultChecked
                                                                        />
                                                                        <label
                                                                            className="form-check-label"
                                                                            htmlFor="switchCheckChecked14"
                                                                        >
                                                                            Email
                                                                        </label>
                                                                    </div>
                                                                </div>
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

export default NotificationsSettingsComponents