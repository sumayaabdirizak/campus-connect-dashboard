"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Select, Table, Spin } from "antd";
import type { DatatableProps } from "../../core/data/interface";
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { FixedSizeList as List } from 'react-window';
import type { TableRowSelection } from 'antd/es/table/interface';
import Link from "next/link";


const { Option } = Select;

const Datatable: React.FC<DatatableProps> = ({
  columns,
  dataSource,
  Selection,
  searchText,
  isLoading = false,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [Selections, setSelections] = useState<boolean>(!!Selection);
  const [pageSize, setPageSize] = useState(10);
  const [current, setCurrent] = useState(1);

  const listHeight = 600;
  const rowHeight = 60;

  const debouncedSearchText = useDebouncedValue(searchText, 300);

  useEffect(() => {
    setSelections(Boolean(Selection));
  }, [Selection]);

  // Memoize expensive filtering
  const filteredDataSource = useMemo(() => {
    if (!debouncedSearchText) return dataSource;
    return dataSource.filter((record) =>
      Object.values(record).some((field) =>
        String(field).toLowerCase().includes(debouncedSearchText.toLowerCase())
      )
    );
  }, [debouncedSearchText, dataSource]);

  useEffect(() => {
    setCurrent(1); // Reset to first page on search
  }, [debouncedSearchText, dataSource]);

  const onSelectChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const rowSelection: TableRowSelection<any> = useMemo(() => ({
    selectedRowKeys,
    onChange: onSelectChange,
  }), [selectedRowKeys, onSelectChange]);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
  }, []);

  const paginatedData = useMemo(() =>
    filteredDataSource.slice((current - 1) * pageSize, current * pageSize),
    [filteredDataSource, current, pageSize]
  );

  // Helper to render a single row for react-window
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = paginatedData[index];
    if (!record) return null;

    return (
      <div style={style} className="virtual-row d-flex">
        {Selections && (
          <div style={{ width: '50px', padding: '8px', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={selectedRowKeys.includes(record.key || index)}
              onChange={(e) => {
                const newKeys = e.target.checked
                  ? [...selectedRowKeys, record.key || index]
                  : selectedRowKeys.filter(key => key !== (record.key || index));
                onSelectChange(newKeys);
              }}
            />
          </div>
        )}
        {columns.map((column, colIndex) => (
          <div key={colIndex} style={{ padding: '8px', flex: 1 }}>
            {column.render
              ? column.render(record[column.dataIndex as string], record, index)
              : record[column.dataIndex as string]
            }
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="">
      {/* Table */}
      <div aria-busy={isLoading}>
        {isLoading ? (
          <div className="w-100 d-flex justify-content-center align-items-center" style={{ minHeight: 240 }}>
            <Spin size="large" tip="Loading data..." />
          </div>
        ) : (() => {
          const visibleCount = Math.floor(listHeight / rowHeight);
          const shouldVirtualize = paginatedData.length > visibleCount * 2;
          return shouldVirtualize ? (
            <div className="table-responsive">
              <div className="table table-nowrap mb-3" style={{ width: '100%' }}>
                {/* Header */}
                <div className="d-flex bg-light border-bottom" style={{ height: rowHeight }}>
                  {Selections && <div style={{ width: '50px', padding: '8px', flexShrink: 0 }}>Select</div>}
                  {columns.map((column, index) => (
                    <div key={index} style={{ padding: '8px', flex: 1, fontWeight: 'bold' }}>{column.title}</div>
                  ))}
                </div>
                {/* Virtual scrolling body */}
                <List
                  height={listHeight}
                  itemCount={paginatedData.length}
                  itemSize={rowHeight}
                  width="100%"
                >
                  {Row}
                </List>
              </div>
            </div>
          ) : (
            <Table
              className="table-nowrap mb-4"
              rowSelection={Selections ? rowSelection : undefined}
              columns={columns}
              rowHoverable={false}
              dataSource={paginatedData}
              pagination={false}
            />
          );
        })()}
      </div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-y-4">
        {/* Left side: show entries */}
        <div className="d-flex justify-content-sm-start justify-content-center">
          <div className="datatable-length">
            <label htmlFor="page-size-select" className="mb-2">
              <Select
                id="page-size-select"
                value={pageSize}
                onChange={(value) => handlePageChange(1, value)} // reset to page 1
                style={{ width: 70, margin: '0 8px' }}
                size="small"
                aria-label="Select number of results per page"
              >
                <Option value={10}>10</Option>
                <Option value={25}>25</Option>
                <Option value={50}>50</Option>
                <Option value={100}>100</Option>
              </Select>
              Entries
            </label>
          </div>
        </div>

        {/* Right side: pagination */}
        <div className="d-flex justify-content-sm-end justify-content-center align-items-center">
          {/* Custom Bootstrap-style Pagination */}
          <nav aria-label="Data table pagination">
            <ul className="pagination mb-0" role="list">
              
              {/* Page numbers */}
              {Array.from({ length: Math.ceil(filteredDataSource.length / pageSize) }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <li
                    key={pageNum}
                    className={`paginate_button me-2 page-item${current === pageNum ? ' active' : ''}`}
                    role="listitem"
                  >
                    <Link
                      href="#"
                      className="page-link page-number"
                      role="link"
                      aria-current={current === pageNum ? 'page' : undefined}
                      data-dt-idx={idx}
                      tabIndex={0}
                      onClick={e => {
                        e.preventDefault();
                        if (current !== pageNum) handlePageChange(pageNum, pageSize);
                      }}
                      aria-label={`Go to page ${pageNum}`}
                    >
                      {pageNum}
                    </Link>
                  </li>
                );
              })}
              {/* Prev button */}
              <li className={`paginate_button page-item previous${current === 1 ? ' disabled' : ''}`} id="DataTables_Table_0_previous">
                <Link
                  href="#"
                  className="page-link"
                  aria-disabled={current === 1}
                  role="link"
                  data-dt-idx="previous"
                  tabIndex={current === 1 ? -1 : 0}
                  onClick={() => current > 1 && handlePageChange(current - 1, pageSize)}
                  style={{ cursor: current === 1 ? 'not-allowed' : 'pointer' }}
                  aria-label="Go to previous page"
                >
                  <i className="icon-chevron-left me-1"></i>
                </Link>
              </li>
              {/* Next button */}
              <li className={`paginate_button page-item ms-2 next${current === Math.ceil(filteredDataSource.length / pageSize) || filteredDataSource.length === 0 ? ' disabled' : ''}`} id="DataTables_Table_0_next">
                <Link
                  href="#"
                  className="page-link"
                  aria-disabled={current === Math.ceil(filteredDataSource.length / pageSize) || filteredDataSource.length === 0}
                  role="link"
                  data-dt-idx="next"
                  tabIndex={current === Math.ceil(filteredDataSource.length / pageSize) || filteredDataSource.length === 0 ? -1 : 0}
                  onClick={e => {
                    e.preventDefault();
                    if (current < Math.ceil(filteredDataSource.length / pageSize)) handlePageChange(current + 1, pageSize);
                  }}
                  style={{ cursor: current === Math.ceil(filteredDataSource.length / pageSize) || filteredDataSource.length === 0 ? 'not-allowed' : 'pointer' }}
                  aria-label="Go to next page"
                >
                   <i className="icon-chevron-right ms-1"></i>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Datatable);
