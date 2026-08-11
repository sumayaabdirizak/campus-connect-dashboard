"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"
import ImageWithBasePath from "../../../components/image-with-base-path"

const IntegrationsSettingsComponents = () => {
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
                                        {/* card start */}
                                        <div className="card mb-0">
                                            <div className="card-header">
                                                <h4 className="d-inline-flex align-items-center mb-0">
                                                    <i className="icon-pin me-2" />
                                                    Integrations / API
                                                </h4>
                                            </div>
                                            <div className="card-body">
                                                {/* start row */}
                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <div className="card payment-type flex-fill">
                                                            <div className="card-body">
                                                                <div className="w-100 d-flex justify-content-between align-items-center">
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="avatar avatar-lg bg-dark rounded-circle border p-2 me-2 flex-shrink-0">
                                                                            <ImageWithBasePath src="assets/img/icons/mail-icon.svg" alt="Img" />
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="fs-14 fw-semibold mb-1">Gmail</h6>
                                                                            <p className="mb-0">
                                                                                RESTful API you can use to send, receive, search, label,
                                                                                archive emails, <br /> manage settings in Gmail mailboxes.
                                                                            </p>
                                                                        </div>
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
                                                    <div className="col-md-12">
                                                        <div className="card payment-type flex-fill">
                                                            <div className="card-body">
                                                                <div className="w-100 d-flex justify-content-between align-items-center">
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="avatar avatar-lg bg-dark rounded-circle border p-2 me-2 flex-shrink-0">
                                                                            <ImageWithBasePath src="assets/img/icons/gupshup.svg" alt="Img" />
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="fs-14 fw-semibold mb-1">Gupshup</h6>
                                                                            <p className="mb-0">
                                                                                Messaging platform (SMS, WhatsApp, RCS) with presence
                                                                            </p>
                                                                        </div>
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
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>{" "}
                                                    {/* end col */}
                                                    <div className="col-md-12">
                                                        <div className="card payment-type flex-fill mb-0">
                                                            <div className="card-body">
                                                                <div className="w-100 d-flex justify-content-between align-items-center">
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="avatar avatar-lg bg-dark rounded-circle border p-2 me-2 flex-shrink-0">
                                                                            <ImageWithBasePath src="assets/img/icons/print-node.svg" alt="Img" />
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="fs-14 fw-semibold mb-1">PrintNode</h6>
                                                                            <p className="mb-0">
                                                                                Middleware agents for cloud-to-local printing.
                                                                            </p>
                                                                        </div>
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
                                                </div>
                                                {/* end row */}
                                            </div>{" "}
                                            {/* end card body */}
                                        </div>
                                        {/* card end */}
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

export default IntegrationsSettingsComponents