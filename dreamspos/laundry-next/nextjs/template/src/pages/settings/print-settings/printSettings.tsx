"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"
import { Page_Size } from "../../../core/json/selectOption"
import CommonSelect from "../../../components/common-select/commonSelect"

const PrintSettingsComponents = () => {
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
                                                        Print Settings
                                                    </h4>
                                                </div>
                                                <div className="card-body">
                                                    {/* start row */}
                                                    <div className="row">
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0">
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked"
                                                                    >
                                                                        Enable Print
                                                                    </label>
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked"
                                                                        defaultChecked
                                                                    />
                                                                </div>
                                                                <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0">
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked2"
                                                                    >
                                                                        Show Store Details
                                                                    </label>
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked2"
                                                                        defaultChecked
                                                                    />
                                                                </div>
                                                                <div className="form-check form-switch mb-3 d-flex align-items-center justify-content-between ps-0">
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked3"
                                                                    >
                                                                        Show Customer Details
                                                                    </label>
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked3"
                                                                        defaultChecked
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Format (Page Sizes)<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <CommonSelect
                                                                    options={Page_Size}
                                                                    className="select"
                                                                    defaultValue={Page_Size[0]}
                                                                />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <label className="form-label">Header</label>
                                                                <textarea className="form-control rounded" defaultValue={""} />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <label className="form-label">Footer</label>
                                                                <textarea className="form-control rounded" defaultValue={""} />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <div className="form-check form-switch d-flex align-items-center justify-content-between mb-3 ps-0">
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked4"
                                                                    >
                                                                        Show Notes
                                                                    </label>
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked4"
                                                                        defaultChecked
                                                                    />
                                                                </div>
                                                                <div className="form-check form-switch d-flex align-items-center justify-content-between mb-3 ps-0">
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked5"
                                                                    >
                                                                        Print Tokens
                                                                    </label>
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked5"
                                                                        defaultChecked
                                                                    />
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

export default PrintSettingsComponents