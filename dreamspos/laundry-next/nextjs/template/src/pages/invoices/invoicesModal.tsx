import ImageWithBasePath from "../../components/image-with-base-path"


const InvoicesModal = () => {

    return (
        <>
            {/* View Invoices */}
            <div className="modal fade" id="view_invoices">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header border-0 p-4 pb-3">
                            <h5 className="modal-title fw-normal">Invoice</h5>
                            <button
                                type="button"
                                className="btn-close btn-close-modal"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="icon-x" />
                            </button>
                        </div>
                        <div className="modal-body p-4 pt-1">
                            <div className="card mb-3">
                                <div className="card-body">
                                    <div className="mb-4">
                                        <div className="row justify-content-between align-items-center border-bottom pb-4">
                                            <div className="col-md-4">
                                                <div className="mb-2 invoice-logo">
                                                    <ImageWithBasePath
                                                        src="assets/img/logo.svg"
                                                        width={130}
                                                        className="img-fluid logo"
                                                        alt="logo"
                                                    />
                                                    <ImageWithBasePath
                                                        src="assets/img/logo-white.svg"
                                                        width={130}
                                                        className="img-fluid logo-white d-none"
                                                        alt="logo"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <ImageWithBasePath
                                                        src="assets/img/invoices/paid-invoices.svg"
                                                        alt="paid-invoices-img"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4 text-end">
                                                <h6 className="mb-2">#INV5465</h6>
                                                <p className="mb-0 text-dark">GST / Tax ID:54665589</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="row align-items-center border-bottom pb-4">
                                            <div className="col-md-4">
                                                <h6 className="mb-2">Invoice From</h6>
                                                <p className="text-dark fw-semibold mb-2">DreamsPOS</p>
                                                <p className="mb-2">
                                                    15 Hodges Mews, <br /> High Wycombe HP12 3JL, <br />{" "}
                                                    United Kingdom
                                                </p>
                                                <p className="mb-0">Phone : +1 45659 96566</p>
                                            </div>
                                            <div className="col-md-4">
                                                <h6 className="mb-2">Bill To&nbsp;</h6>
                                                <p className="text-dark fw-semibold mb-2">
                                                    Andrew Fletcher
                                                </p>
                                                <p className="mb-2">
                                                    1147 Rohan Drive Suite,Burlington, VT / 8202115 <br />{" "}
                                                    United Kingdom
                                                </p>
                                                <p className="mb-0">Phone : +1 45659 96566</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <h6 className="mb-3">Order Details</h6>
                                        <div className="table-responsive table-nowrap border rounded">
                                            <table className="table mb-0">
                                                <thead className="thead-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Item Details</th>
                                                        <th>Quantity</th>
                                                        <th>Rate</th>
                                                        <th>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>1</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Evening Dress{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, ironed)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>2</td>
                                                        <td>$200.00</td>
                                                        <td>$396.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td>2</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Jumpsuit{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, ironed &amp; hung)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>1</td>
                                                        <td>$350.00</td>
                                                        <td>$365.75</td>
                                                    </tr>
                                                    <tr>
                                                        <td>3</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Dinner Suit{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, ironed)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>1</td>
                                                        <td>$399.00</td>
                                                        <td>$398.90</td>
                                                    </tr>
                                                    <tr>
                                                        <td>4</td>
                                                        <td>
                                                            <div>
                                                                <h6 className="fs-14 fw-semibold mb-1">
                                                                    Down Jacket{" "}
                                                                    <span className="fw-normal text-body">
                                                                        (Washed, tumble)
                                                                    </span>
                                                                </h6>
                                                                <p className="mb-0">Notes : Washed, ironed</p>
                                                            </div>
                                                        </td>
                                                        <td>4</td>
                                                        <td>$100.00</td>
                                                        <td>$396.00</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="mb-0">
                                        <div className="row justify-content-center align-items-center">
                                            <div className="col-md-6">
                                                <h6 className="mb-2">Terms and Conditions</h6>
                                                <div className="mb-4">
                                                    <p className="mb-0">
                                                        1. Goods once sold cannot be taken back or exchanged.
                                                    </p>
                                                    <p className="mb-0">
                                                        2. We are not the manufacturers the company provides
                                                        warranty
                                                    </p>
                                                </div>
                                                <div className="px-3 py-2 bg-light">
                                                    <p className="text-dark mb-0">
                                                        Note : Please ensure payment is made within 7 days of
                                                        invoice date.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <div className="row align-items-center pb-3 border-bottom">
                                                        <div className="col-md-6">
                                                            <p className="text-dark fw-semibold mb-3">Amount</p>
                                                            <p className="text-dark fw-semibold mb-3">
                                                                CGST (9%)
                                                            </p>
                                                            <p className="text-dark fw-semibold mb-3">
                                                                SGST (9%)
                                                            </p>
                                                            <p className="text-dark fw-semibold mb-3">
                                                                Discount (25%)
                                                            </p>
                                                        </div>
                                                        <div className="col-md-6 text-end">
                                                            <p className="text-dark fw-semibold mb-3">
                                                                $1,793.12
                                                            </p>
                                                            <p className="text-dark fw-semibold mb-3">$18</p>
                                                            <p className="text-dark fw-semibold mb-3">$18</p>
                                                            <p className="text-danger fw-semibold">- $18</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-flex justify-content-between algin-item-center">
                                                    <h6>Total ($)</h6>
                                                    <h6>$1,972.43</h6>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex justify-content-center algin-item-center">
                                <div className="d-flex justify-content-center algin-item-center gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-dark d-inline-flex align-items-center"
                                    >
                                        <i className="icon-download me-1" />
                                        Download PDF
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-white d-inline-flex align-items-center"
                                    >
                                        <i className="icon-printer me-1" />
                                        Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* View Invoices End */}
        </>


    )
}

export default InvoicesModal