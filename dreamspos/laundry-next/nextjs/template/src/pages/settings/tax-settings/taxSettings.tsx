"use client";

import Link from "next/link"
import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"
import TaxSettingsModal from "./modal/taxSettingsModal"

const TaxSettingsComponents = () => {
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
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <h4 className="d-inline-flex align-items-center mb-0">
                                                        <i className="icon-diamond-percent me-2" />
                                                        Tax
                                                    </h4>
                                                    <Link
                                                        href="#"
                                                        className="btn btn-primary d-inline-flex align-items-center"
                                                        data-bs-toggle="modal"
                                                        data-bs-target="#add_tax"
                                                    >
                                                        <i className="icon-circle-plus me-1" />
                                                        New Tax
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="card-body">
                                                {/* table start */}
                                                <div className="table-responsive table-nowrap">
                                                    <table className="table mb-0 border">
                                                        <thead>
                                                            <tr>
                                                                <th>Tax Name</th>
                                                                <th>Rate</th>
                                                                <th>Type</th>
                                                                <th />
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <h6 className="fs-14 fw-semibold">CGST</h6>
                                                                </td>
                                                                <td>9%</td>
                                                                <td>Inclusive / Exclusive</td>
                                                                <td className="text-end">
                                                                    <div className="dropstart">
                                                                        <button
                                                                            className="btn btn-icon btn-white"
                                                                            type="button"
                                                                            data-bs-toggle="dropdown"
                                                                            aria-haspopup="true"
                                                                            aria-expanded="false"
                                                                            aria-label="Actions"
                                                                        >
                                                                            <i className="icon-ellipsis-vertical" />
                                                                        </button>
                                                                        <ul className="dropdown-menu p-3">
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#edit_tax"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Tax
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#delete_modal"
                                                                                >
                                                                                    <i className="icon-trash-2 me-2" />
                                                                                    Delete Tax
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <h6 className="fs-14 fw-semibold">SGST</h6>
                                                                </td>
                                                                <td>9%</td>
                                                                <td>Inclusive / Exclusive</td>
                                                                <td className="text-end">
                                                                    <div className="dropstart">
                                                                        <button
                                                                            className="btn btn-icon btn-white"
                                                                            type="button"
                                                                            data-bs-toggle="dropdown"
                                                                            aria-haspopup="true"
                                                                            aria-expanded="false"
                                                                            aria-label="Actions"
                                                                        >
                                                                            <i className="icon-ellipsis-vertical" />
                                                                        </button>
                                                                        <ul className="dropdown-menu p-3">
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#edit_tax"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Tax
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#delete_modal"
                                                                                >
                                                                                    <i className="icon-trash-2 me-2" />
                                                                                    Delete Tax
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <h6 className="fs-14 fw-semibold">IGST</h6>
                                                                </td>
                                                                <td>18%</td>
                                                                <td>Inclusive / Exclusive</td>
                                                                <td className="text-end">
                                                                    <div className="dropstart">
                                                                        <button
                                                                            className="btn btn-icon btn-white"
                                                                            type="button"
                                                                            data-bs-toggle="dropdown"
                                                                            aria-haspopup="true"
                                                                            aria-expanded="false"
                                                                            aria-label="Actions"
                                                                        >
                                                                            <i className="icon-ellipsis-vertical" />
                                                                        </button>
                                                                        <ul className="dropdown-menu p-3">
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#edit_tax"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Tax
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#delete_modal"
                                                                                >
                                                                                    <i className="icon-trash-2 me-2" />
                                                                                    Delete Tax
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <h6 className="fs-14 fw-semibold">VAT</h6>
                                                                </td>
                                                                <td>10%</td>
                                                                <td>Type</td>
                                                                <td className="text-end">
                                                                    <div className="dropstart">
                                                                        <button
                                                                            className="btn btn-icon btn-white"
                                                                            type="button"
                                                                            data-bs-toggle="dropdown"
                                                                            aria-haspopup="true"
                                                                            aria-expanded="false"
                                                                            aria-label="Actions"
                                                                        >
                                                                            <i className="icon-ellipsis-vertical" />
                                                                        </button>
                                                                        <ul className="dropdown-menu p-3">
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#edit_tax"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Tax
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#delete_modal"
                                                                                >
                                                                                    <i className="icon-trash-2 me-2" />
                                                                                    Delete Tax
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <h6 className="fs-14 fw-semibold">Service Tax</h6>
                                                                </td>
                                                                <td>15%</td>
                                                                <td>Exclusive</td>
                                                                <td className="text-end">
                                                                    <div className="dropstart">
                                                                        <button
                                                                            className="btn btn-icon btn-white"
                                                                            type="button"
                                                                            data-bs-toggle="dropdown"
                                                                            aria-haspopup="true"
                                                                            aria-expanded="false"
                                                                            aria-label="Actions"
                                                                        >
                                                                            <i className="icon-ellipsis-vertical" />
                                                                        </button>
                                                                        <ul className="dropdown-menu p-3">
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#edit_tax"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Tax
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href="#"
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                    data-bs-toggle="modal"
                                                                                    data-bs-target="#delete_modal"
                                                                                >
                                                                                    <i className="icon-trash-2 me-2" />
                                                                                    Delete Tax
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {/* table end */}
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
            <TaxSettingsModal />
        </>

    )
}

export default TaxSettingsComponents