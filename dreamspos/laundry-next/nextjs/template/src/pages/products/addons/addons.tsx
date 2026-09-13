"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import type { TableData } from "../../../core/data/interface";
import DataTable from "../../../components/data-table";
import SearchInput from "../../../components/data-table/dataTableSearch";
import Header from "../../../components/header/header";
import ImageWithBasePath from "../../../components/image-with-base-path";
import ProductsNavTabs from "../productsTabs";
import { AddonsData } from "../../../core/json/addonsData";
import AddonModal from "./modal/addonModal";

type DataRow = TableData & {
    key: string;
    id?: string;
    Addon: string;
    Type: string;
    price: string;
    Status: string;
    image?: string;
    Actions?: string;
};
const AddonsComponent = () => {
    const [rows, setRows] = useState<DataRow[]>(
        () =>
            (AddonsData as TableData[]).map((row, idx) => ({
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
                title: "Add On",
                dataIndex: "Addon",
                render: (text: string, record: any) => (
                    <div className="d-flex align-items-center">
                        <Link href="#" className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2">
                            <ImageWithBasePath src={`assets/img/addon/${record.image}`} alt="category" className="img-fluid" />
                        </Link>
                        <h6 className="fs-14 fw-semibold mb-0">
                            <Link href="#">{text}</Link>
                        </h6>
                    </div>
                ),
                sorter: (a: DataRow, b: DataRow) => a.Addon.length - b.Addon.length,
            },
            {
                title: "Price",
                dataIndex: "price",
                render: (text: string) => (
                    <p className="fw-semibold text-dark mb-0">{text}</p>
                ),
                sorter: (a: DataRow, b: DataRow) => a.price.length - b.price.length,
            },
            {
                title: "Type",
                dataIndex: "Type",
                render: (text: string) => (
                    <p className="fw-semibold text-dark mb-0">{text}</p>
                ),
                sorter: (a: DataRow, b: DataRow) => a.Type.length - b.Type.length,
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

                            {/* View Details Modal */}
                            <li>
                                <Link
                                    href="#"
                                    className="dropdown-item rounded d-flex align-items-center"
                                    data-bs-toggle="modal" data-bs-target="#edit_addon">
                                    <i className="icon-pencil-line me-2" />
                                    Edit Add On
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
                                                record.Addon ||
                                                record.id ||
                                                "",
                                        })
                                    }
                                >
                                    <i className="icon-trash-2 me-2" />
                                    Delete Add On
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
                    <Header title="Products" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* nav Tabs */}
                    <ProductsNavTabs />
                    {/* End Nav Tabs */}

                    <div className="d-flex align-items-center flex-wrap gap-3 justify-content-between mb-4">
                        <div className="d-flex align-items-center gap-3 flex-wrap">

                            {/* addons dropdown */}
                            <div className="dropdown">
                                <Link
                                    href="#"
                                    className="dropdown-toggle btn btn-white d-flex align-items-center justify-content-between"
                                    data-bs-toggle="dropdown"
                                    data-bs-auto-close="outside"
                                >
                                    <i className="icon-washing-machine text-dark me-2" />
                                    Type
                                </Link>
                                <div className="dropdown-menu dropdown-menu-lg p-3">
                                    <h6 className="fs-14 fw-semibold mb-3">Type</h6>
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
                                                <input
                                                    className="form-check-input m-0 me-2"
                                                    type="checkbox"
                                                    defaultChecked
                                                />
                                                Softner
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input
                                                    className="form-check-input m-0 me-2"
                                                    type="checkbox"
                                                    defaultChecked
                                                />
                                                Detergent
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Dry
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

                            <Link
                                href="#"
                                data-bs-toggle="modal"
                                data-bs-target="#add_addon"
                                className="btn btn-primary d-inline-flex align-items-center"
                            >
                                <i className="icon-plus me-2" />
                                New Add on
                            </Link>
                            {/* export dropdown */}
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
                                    ? <>Are you sure you want to delete <br /> <span className="fw-semibold text-dark">{pendingDelete.Addon} ?</span></>
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
            <AddonModal />
        </>
    );
};

export default AddonsComponent;
