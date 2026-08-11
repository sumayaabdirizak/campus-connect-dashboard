"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"
import { all_routes } from "../../../routes/all_routes"
import PermissionsModal from "./modal/permissionsModal"
import Link from "next/link"

const RolesPermissionsSettingsComponents = () => {
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
                                                        <i className="icon-user-cog me-2" />
                                                        Roles &amp; Permissions
                                                    </h4>
                                                    <Link
                                                        href="#"
                                                        className="btn btn-primary d-inline-flex align-items-center"
                                                        data-bs-toggle="modal"
                                                        data-bs-target="#add_role"
                                                    >
                                                        <i className="icon-plus me-1" />
                                                        New Role
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="card-body">
                                                <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-4">
                                                    <div className="flex-grow-1">
                                                        <h5 className="fs-16 fw-bold mb-0">
                                                            <Link
                                                                href={all_routes.permissionsSettings}
                                                                className="d-inline-flex align-items-center"
                                                            >
                                                                <i className="icon-arrow-left me-2" />
                                                                Role : Admin
                                                            </Link>
                                                        </h5>
                                                    </div>
                                                    <div className="form-check form-check-md">
                                                        <input className="form-check-input" type="checkbox" id="select-all" />
                                                        <label htmlFor="select-all">Revert All</label>
                                                    </div>
                                                </div>
                                                <div className="card">
                                                    <div className="card-body">
                                                        {/* table start */}
                                                        <div className="table-responsive">
                                                            <table className="table m-0 table-nowrap bg-white">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Module</th>
                                                                        <th>View</th>
                                                                        <th>Add</th>
                                                                        <th>Edit</th>
                                                                        <th>Delete</th>
                                                                        <th>Export</th>
                                                                        <th>Approved/Void</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Dashboard</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">POS</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Orders</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Drivers</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Staffs</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Customers</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Reports</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-dark fw-medium">Settings</td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="form-check form-check-md">
                                                                                <input className="form-check-input" type="checkbox" />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {/* table end */}
                                                    </div>
                                                    {/* card body */}
                                                </div>
                                                {/* card*/}
                                                <div className="d-flex align-items-center justify-content-end gap-2 pt-1">
                                                    <button type="button" className="btn btn-dark">
                                                        <i className="icon-x me-1" />
                                                        Cancel
                                                    </button>
                                                    <button type="submit" className="btn btn-primary">
                                                        <i className="icon-circle-check me-1" />
                                                        Save Changes
                                                    </button>
                                                </div>
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
            <PermissionsModal />
        </>

    )
}

export default RolesPermissionsSettingsComponents