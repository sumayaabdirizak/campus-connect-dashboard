"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import type { TableData } from "../../core/data/interface";
import DataTable from "../../components/data-table";
import SearchInput from "../../components/data-table/dataTableSearch";
import Header from "../../components/header/header";
import ImageWithBasePath from "../../components/image-with-base-path";
import { all_routes } from "../../routes/all_routes";
import { DriversListData } from "../../core/json/driversListData";
import DriversModal from "./modal/driversModal";

type DataRow = TableData & {
    key: string;
    id?: string;
    Driver: string;
    mobile: string;
    email: string;
    Status: string;
    image?: string;
    Actions?: string;
};
const DriversListComponent = () => {
    const [rows, setRows] = useState<DataRow[]>(
        () =>
            (DriversListData as TableData[]).map((row, idx) => ({
                ...row,
                key: `${(row as { key?: string }).key ||
                    (row as { id?: string }).id ||
                    row.Invoice_ID ||
                    idx
                    }`,
            })) as DataRow[]
    );
    const [pendingDelete, setPendingDelete] = useState<DataRow | null>(null);
    const baseColumns = useMemo(
        () => [
            {
                title: "Driver",
                dataIndex: "Driver",
                render: (text: string, record: any) => (
                    <div className="d-flex align-items-center">
                        <Link href="#" className="avatar avatar-rounded online flex-shrink-0 me-2" data-bs-toggle="offcanvas" data-bs-target="#view_details">
                            <ImageWithBasePath src={`assets/img/drivers/${record.image}`} alt="category" className="img-fluid" />
                        </Link>
                        <h6 className="fs-14 fw-semibold mb-0">
                            <Link href="#" data-bs-toggle="offcanvas" data-bs-target="#view_details">{text}</Link>
                        </h6>
                    </div>
                ),
                sorter: (a: DataRow, b: DataRow) => a.Driver.length - b.Driver.length,
            },
            {
                title: "Email",
                dataIndex: "email",
                sorter: (a: DataRow, b: DataRow) => a.email.length - b.email.length,
            },
            {
                title: "Mobile",
                dataIndex: "mobile",
                sorter: (a: DataRow, b: DataRow) => a.mobile.length - b.mobile.length,
            },
            {
                title: "Status",
                dataIndex: "Status",
                render: (text: string) => (
                    <span
                        className={`badge ${text === "Active" ? "badge-soft-success" : "badge-soft-danger"
                            } `}
                    >
                        {text}
                    </span>
                ),
            },
            {
                title: "Actions",
                dataIndex: "Actions",
                render: (_: string, record: DataRow) => (
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

                            {/* Download */}
                            <li>
                                <Link
                                    href="#"
                                    className="dropdown-item rounded d-flex align-items-center"
                                    data-bs-toggle="offcanvas" data-bs-target="#view_details">
                                    <i className="icon-users-round me-2" />
                                    View Details
                                </Link>
                            </li>

                            {/* View Details Modal */}
                            <li>
                                <Link
                                    href="#"
                                    className="dropdown-item rounded d-flex align-items-center"
                                    data-bs-toggle="offcanvas" data-bs-target="#edit_driver">
                                    <i className="icon-pencil-line me-2" />
                                    Edit Driver
                                </Link>
                            </li>

                            {/* Delete Modal */}
                            <li>
                                <Link
                                    href="#"
                                    className="dropdown-item rounded d-flex align-items-center"
                                    data-bs-toggle="modal"
                                    data-bs-target="#delete_modal"
                                    onClick={() =>
                                        setPendingDelete({
                                            ...record,
                                            key:
                                                record.key ||
                                                record.Driver ||
                                                record.id ||
                                                "",
                                        })
                                    }
                                >
                                    <i className="icon-trash-2 me-2" />
                                    Delete Driver
                                </Link>
                            </li>
                        </ul>
                    </div>
                ),
            }

        ],
        []
    );
    const [columnOrder, setColumnOrder] = useState<string[]>(() =>
        baseColumns.map((c) => String(c.dataIndex || c.title))
    );
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
        columnOrder
    );

    const handleConfirmDelete = useCallback(() => {
        if (!pendingDelete?.key) return;
        setRows((prev) => prev.filter((row) => row.key !== pendingDelete.key));
        setPendingDelete(null);
    }, [pendingDelete]);
    const handleToggleColumn = useCallback((key: string) => {
        setVisibleColumnKeys((prev) =>
            prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
        );
    }, []);

    const handleColumnDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;

            setColumnOrder((prev) => {
                const next = [...prev];
                const [moved] = next.splice(result.source.index, 1);
                next.splice(result.destination!.index, 0, moved);
                return next;
            });
        },
        []
    );

    const orderedColumns = useMemo(() => {
        const columnMap = new Map(
            baseColumns.map((col) => [String(col.dataIndex || col.title), col])
        );
        return columnOrder
            .map((key) => columnMap.get(key))
            .filter(Boolean) as typeof baseColumns;
    }, [baseColumns, columnOrder]);

    const columns = orderedColumns;

    const [searchText, setSearchText] = useState<string>("");

    const handleSearch = useCallback((value: string) => {
        setSearchText(value);
    }, []);
    const mappedColumns = useMemo(
        () =>
            columns.map((col: any, idx: number) => ({
                ...col,
                ID: idx.toString(),
                key: (col as any).dataIndex || idx.toString(),
            })),
        [columns]
    );
    const visibleColumns = useMemo(
        () =>
            mappedColumns.filter((col) =>
                visibleColumnKeys.includes(String(col.dataIndex || col.key))
            ),
        [mappedColumns, visibleColumnKeys]
    );
    return (
        <>
            <div className="page-wrapper">
                {/* Start Content */}
                <div className="content">
                    {/* Page Header */}
                    <Header title="Driver" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* Page Header */}
                    <div className="d-flex align-items-center flex-wrap gap-3 border-bottom pb-4 mb-4">
                        <div className="flex-grow-1">
                            <div className="d-inline-flex align-items-center p-1 bg-light border rounded-pill">
                                <Link
                                    href={all_routes.driversList}
                                    className="px-3 py-1 fw-semibold d-inline-flex align-items-center rounded-pill bg-white"
                                >
                                    <i className="icon-list me-2" />
                                    List View
                                </Link>
                                <Link
                                    href={all_routes.driversGrid}
                                    className="px-3 py-1 fw-semibold d-inline-flex align-items-center rounded-pill"
                                >
                                    <i className="icon-layout-panel-left me-2" />
                                    Grid View
                                </Link>
                            </div>
                        </div>
                        <div className="gap-3 d-flex align-items-center flex-wrap">
                            <div className="dropdown">
                                <Link
                                    href="#"
                                    className="dropdown-toggle btn btn-dark d-inline-flex align-items-center"
                                    data-bs-toggle="dropdown"
                                >
                                    <i className="icon-arrow-down-to-line me-1" />
                                    Export
                                </Link>
                                <ul className="dropdown-menu dropdown-menu-end p-3">
                                    <li>
                                        <Link href="#" className="dropdown-item rounded">
                                            Export as PDF
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="dropdown-item rounded">
                                            Export as Excel
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {/* End Page Header */}

                    <div className="d-flex align-items-center flex-wrap gap-3 justify-content-between mb-4">
                        <div className="d-flex align-items-center gap-3 flex-wrap">

                            {/* Drivers dropdown */}
                            <div className="dropdown">
                                <Link
                                    href="#"
                                    className="dropdown-toggle btn btn-white d-flex align-items-center justify-content-between"
                                    data-bs-toggle="dropdown"
                                    data-bs-auto-close="outside"
                                >
                                    <i className="icon-user text-dark me-2" />
                                    All Drivers
                                </Link>
                                <div className="dropdown-menu dropdown-menu-lg p-3">
                                    <h6 className="fs-14 fw-semibold mb-3">Drivers</h6>
                                    <div className="input-icon-end input-icon position-relative mb-3">
                                        <span className="input-icon-addon">
                                            <i className="icon-search text-dark" />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control form-control-md"
                                            placeholder="Search"
                                        />
                                    </div>
                                    <ul className="list-unstyled mb-0">
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Benjamin Scott
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Matthew Parker
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Samuel Harris
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Olivia Carter
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Riley Cooper
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Avery Parker
                                            </label>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                        </div>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            {/* column */}
                            <div className="dropdown">
                                <Link
                                    href="#"
                                    className="btn btn-icon btn-white"
                                    data-bs-toggle="dropdown"
                                    data-bs-auto-close="outside"
                                    aria-label="column"
                                >
                                    <i className="icon-columns-3" />
                                </Link>
                                <div className="dropdown-menu dropdown-menu-start dropdown-menu-lg p-3">
                                    <h6 className="fs-14 fw-semibold mb-3">Column</h6>
                                    <div className="input-icon-end input-icon position-relative mb-3">
                                        <span className="input-icon-addon">
                                            <i className="icon-search text-dark" />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control form-control-md"
                                            placeholder="Search"
                                        />
                                    </div>
                                    <DragDropContext onDragEnd={handleColumnDragEnd}>
                                        <Droppable droppableId="column-list">
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {mappedColumns.map((col, index) => {
                                                        const key = String(col.dataIndex || col.key);
                                                        const checked = visibleColumnKeys.includes(key);
                                                        return (
                                                            <Draggable
                                                                key={key}
                                                                draggableId={key}
                                                                index={index}
                                                            >
                                                                {(dragProvided) => (
                                                                    <div
                                                                        className="mb-3"
                                                                        ref={dragProvided.innerRef}
                                                                        {...dragProvided.draggableProps}
                                                                    >
                                                                        <label className="d-flex align-items-center">
                                                                            <span
                                                                                className="me-2 d-flex align-items-center text-muted"
                                                                                {...dragProvided.dragHandleProps}
                                                                                aria-label={`Drag to reorder ${col.title}`}
                                                                            >
                                                                                <i className="icon-grip-vertical" />
                                                                            </span>
                                                                            <input
                                                                                className="form-check-input m-0 me-2"
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => handleToggleColumn(key)}
                                                                            />
                                                                            {col.title}
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                </div>
                            </div>
                            {/* sort by */}
                            <div className="dropdown">
                                <Link
                                    href="#"
                                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                                    data-bs-toggle="dropdown"
                                >
                                    Sort by : Newest
                                </Link>
                                <div className="dropdown-menu dropdown-menu-end p-3">
                                    <h6 className="fs-14 fw-semibold mb-3">Sort By</h6>
                                    <ul className="list-unstyled mb-0">
                                        <li>
                                            <Link href="#" className="dropdown-item rounded">
                                                Newest
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="#" className="dropdown-item rounded">
                                                Oldest
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="#" className="dropdown-item rounded">
                                                Ascending
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="#" className="dropdown-item rounded">
                                                Descending
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            {/* table search */}
                            <div className="search-input">
                                <SearchInput value={searchText} onChange={handleSearch} />
                            </div>
                            <Link href="#" className="btn btn-primary d-inline-flex align-items-center" data-bs-toggle="offcanvas" data-bs-target="#add_driver"><i className="icon-plus me-1"></i>New Driver</Link>
                        </div>
                    </div>

                    {/* table start */}
                    <div className="table-responsive table-nowrap">
                        <DataTable
                            columns={visibleColumns}
                            dataSource={rows}
                            Selection={false}
                            searchText={searchText}
                        />
                    </div>
                    {/* table end */}
                </div>
                {/* End Content */}
            </div>

            {/* Delete Modal  */}
            <div className="modal fade" id="delete_modal">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                    <div className="modal-content">
                        <div className="modal-body text-center p-4">
                            <div className="mb-4">
                                <span className="avatar avatar-lg rounded-circle bg-danger">
                                    <i className="icon-trash fs-24" />
                                </span>
                            </div>
                            <h4 className="mb-1">Delete Confirmation</h4>
                            <p className="mb-4">
                                {pendingDelete
                                    ? <>Are you sure you want to delete <br /> <span className="fw-semibold text-dark">{pendingDelete.Driver} ?</span></>
                                    : "Select a row to delete."}
                            </p>

                            <div className="d-flex justify-content-center gap-2">
                                <Link
                                    href="#"
                                    className="btn btn-light w-100"
                                    data-bs-dismiss="modal"
                                >
                                    Close
                                </Link>
                                <button
                                    type="button"
                                    className="btn btn-danger w-100"
                                    data-bs-dismiss="modal"
                                    onClick={handleConfirmDelete}
                                    disabled={!pendingDelete}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Delete Modal  */}
            <DriversModal />
        </>
    );
};

export default DriversListComponent;
