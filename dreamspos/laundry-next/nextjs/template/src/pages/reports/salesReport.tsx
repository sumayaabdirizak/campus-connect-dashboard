"use client";

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
import CommonDatePicker from "../../components/common-date-picker/commonDatePicker";
import ReportsNavTabs from "./reportsTab";
import { SalesReportData } from "../../core/json/salesReportData";
import Link from "next/link";

type DataRow = TableData & {
    key: string;
    id?: string;
    Sales_ID: string;
    Category: string;
    Date: string;
    Payment_Method: string;
    Amount: string;
    Status: string;
    image?: string;
    Actions?: string;
};
const salesReportComponents = () => {
    const [rows] = useState<DataRow[]>(
        () =>
            (SalesReportData as TableData[]).map((row, idx) => ({
                ...row,
                key: `${(row as { key?: string }).key ||
                    (row as { id?: string }).id ||
                    row.Sales_ID ||
                    idx
                    }`,
            })) as DataRow[]
    );
    const baseColumns = useMemo(
        () => [
            {
                title: "Sale ID",
                dataIndex: "Sales_ID",
                render: (text: string) => <Link href="#" className="text-info">{text}</Link>,
            },
            {
                title: "Date",
                dataIndex: "Date",
                sorter: (a: DataRow, b: DataRow) => a.Date.length - b.Date.length,
            },
            {
                title: "Category",
                dataIndex: "Category",
                render: (text: string) => <p className="text-dark fw-medium mb-0">{text}</p>,
                sorter: (a: DataRow, b: DataRow) => a.Category.length - b.Category.length,
            },
            {
                title: "Items",
                dataIndex: "Items",
                render: (text: string) => <Link href="#">{text}</Link>,
            },
            {
                title: "Total Orders",
                dataIndex: "Total_Orders",
                render: (text: string) => <Link href="#">{text}</Link>,
            },
            {
                title: "Grand Total",
                dataIndex: "Amount",
                render: (text: string) => <p className="mb-0 fw-medium">{text}</p>,
                sorter: (a: DataRow, b: DataRow) => a.Amount.length - b.Amount.length,
            },
            {
                title: "Payment Method",
                dataIndex: "Payment_Method",
                sorter: (a: DataRow, b: DataRow) => a.Payment_Method.length - b.Payment_Method.length,
            },
            {
                title: "Status",
                dataIndex: "Status",
                render: (text: string) => (
                    <span
                        className={`badge ${text === "Completed" ? "badge-soft-success" : "badge-soft-danger"
                            } `}
                    >
                        {text}
                    </span>
                ),
            },

        ],
        []
    );
    const [columnOrder, setColumnOrder] = useState<string[]>(() =>
        baseColumns.map((c) => String(c.dataIndex || c.title))
    );
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
        columnOrder
    );

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
                    <Header title="Reports" ordersCount={15} showOrdersButton={false} />
                    {/* End Page Header */}
                    {/* Nav Tabs */}
                    <ReportsNavTabs />
                    {/* Nav Tabs */}
                    <div className="d-flex align-items-center flex-wrap gap-3 justify-content-between mb-4">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            {/* Date Picker */}
                            <CommonDatePicker />
                            {/* Category dropdown */}
                            <div className="dropdown">
                                <Link
                                    href="#"
                                    className="dropdown-toggle btn btn-white d-flex align-items-center justify-content-between"
                                    data-bs-toggle="dropdown"
                                    data-bs-auto-close="outside"
                                >
                                    <i className="icon-shopping-cart text-dark me-2" />
                                    All Category
                                </Link>
                                <div className="dropdown-menu dropdown-menu-lg p-3">
                                    <h6 className="fs-14 fw-semibold mb-3">Category</h6>
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
                                                Accessories
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input
                                                    className="form-check-input m-0 me-2"
                                                    type="checkbox"
                                                    defaultChecked
                                                />
                                                Dresses
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input
                                                    className="form-check-input m-0 me-2"
                                                    type="checkbox"
                                                    defaultChecked
                                                />
                                                Bedding
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Knitwear
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Suits
                                            </label>
                                        </li>
                                        <li className="dropdown-item rounded">
                                            <label className="d-flex align-items-center">
                                                <input className="form-check-input m-0 me-2" type="checkbox" />
                                                Bed Sets
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

        </>
    );
};

export default salesReportComponents;
