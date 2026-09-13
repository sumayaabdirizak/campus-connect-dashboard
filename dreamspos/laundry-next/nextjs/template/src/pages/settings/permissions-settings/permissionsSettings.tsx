"use client";

import Header from "../../../components/header/header"
import SettingsSidebar from "../settingsSidebar"
import { all_routes } from "../../../routes/all_routes"
import PermissionsModal from "./modal/permissionsModal"
import Link from "next/link"

const PermissionsSettingsComponents = () => {
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
                                                {/* table start */}
                                                <div className="table-responsive table-nowrap">
                                                    <table className="table mb-0 border">
                                                        <thead className="thead-light">
                                                            <tr>
                                                                <th className="fs-16">Roles</th>
                                                                <th className="fs-16">Status</th>
                                                                <th className="fs-16" />
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Admin
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Billing
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Laundry Attendant
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Washer Operator
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-danger">Inactive</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Dryer Operator
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Ironing Staff
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Stain Removal Expert
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Quality Supervisor
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        {" "}
                                                                        Branch Manager
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
                                                                                </Link>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <Link href={all_routes.rolesPermissions} className="fs-14 fw-semibold">
                                                                        Technician
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-soft-success">Active</span>
                                                                </td>
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
                                                                                    data-bs-target="#edit_role"
                                                                                >
                                                                                    <i className="icon-pencil-line me-2" />
                                                                                    Edit Role
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
                                                                                    Delete Role
                                                                                </Link>
                                                                            </li>
                                                                            <li>
                                                                                <Link
                                                                                    href={all_routes.rolesPermissions}
                                                                                    className="dropdown-item rounded d-flex align-items-center"
                                                                                >
                                                                                    <i className="icon-shield me-2" />
                                                                                    View Permissions
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
            <PermissionsModal />
        </>

    )
}

export default PermissionsSettingsComponents