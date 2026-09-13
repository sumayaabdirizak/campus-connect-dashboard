"use client";

import Link from "next/link"
import CommonSelect from "../../components/common-select/commonSelect"
import Header from "../../components/header/header"
import { City, Country, Currency, State } from "../../core/json/selectOption"
import SettingsSidebar from "./settingsSidebar"

const StoreSettingsComponents = () => {
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
                                                        <i className="icon-warehouse me-2" />
                                                        Store Settings
                                                    </h4>
                                                </div>
                                                <div className="card-body">
                                                    {/* start row */}
                                                    <div className="row">
                                                        <div className="col-xl-12">
                                                            <div className="mb-3 d-flex align-items-center flex-wrap gap-3">
                                                                <div className="avatar avatar-3xl border bg-light">
                                                                    <i className="icon-images fs-28 text-dark" />
                                                                </div>
                                                                <div>
                                                                    <label className="form-label mb-1">
                                                                        Upload Store Image
                                                                    </label>
                                                                    <p className="fs-13 mb-3">
                                                                        Image should be with in 5 MB
                                                                    </p>
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
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Store Name
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Address 1
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6">
                                                            <div className="mb-3">
                                                                <label className="form-label">Address 2</label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-3">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Country<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <CommonSelect
                                                                    options={Country}
                                                                    className="select"
                                                                    defaultValue={Country[0]}
                                                                />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-3">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    State<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <CommonSelect
                                                                    options={State}
                                                                    className="select"
                                                                    defaultValue={State[0]}
                                                                />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-3">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    City<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <CommonSelect
                                                                    options={City}
                                                                    className="select"
                                                                    defaultValue={City[0]}
                                                                />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-3">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Pincode<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="text" className="form-control" />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Email<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input type="email" className="form-control" />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Phone<span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <input
                                                                    type="tel"
                                                                    className="form-control"
                                                                    id="phone"
                                                                    name="phone"
                                                                />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">
                                                                    Currency
                                                                    <span className="text-danger ms-1">*</span>
                                                                </label>
                                                                <CommonSelect
                                                                    options={Currency}
                                                                    className="select"
                                                                    defaultValue={Currency[0]}
                                                                />
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6">
                                                            <div className="mb-3">
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
                                                                        Enable QR Menu
                                                                    </label>
                                                                </div>
                                                                <div className="form-check form-switch mb-3">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked1"
                                                                        defaultChecked
                                                                    />
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked1"
                                                                    >
                                                                        Enable Take Away
                                                                    </label>
                                                                </div>
                                                                <div className="form-check form-switch mb-3">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked2"
                                                                        defaultChecked
                                                                    />
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked2"
                                                                    >
                                                                        Enable Dine In
                                                                    </label>
                                                                </div>
                                                                <div className="form-check form-switch mb-0">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        id="switchCheckChecked3"
                                                                    />
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor="switchCheckChecked3"
                                                                    >
                                                                        Enable Reservation
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>{" "}
                                                        {/* end col */}
                                                        <div className="col-md-6">
                                                            <div className="mb-0">
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
                                                                        Enable Order Via QR Menu
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
                                                                        Enable Delivery
                                                                    </label>
                                                                </div>
                                                                <div className="form-check form-switch mb-0">
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
                                                                        Enable Table
                                                                    </label>
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

export default StoreSettingsComponents