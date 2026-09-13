"use client";
import ImageWithBasePath from "../../components/image-with-base-path";
import { useEffect, useRef, useState } from "react";
import { all_routes } from "../../routes/all_routes";
import Toast from "../../components/toast/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";


const OTPComponent = () => {
  const navigate = useRouter();


  // OTP state (4 digits)
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);

  // Toast state
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "danger" | "warning" | "info";
  } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (
    message: string,
    type: "success" | "danger" | "warning" | "info"
  ) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    setToast({ msg: message, type });
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // OTP input handler
  const handleOtpChange = (
    index: number,
    value: string,
    e: React.KeyboardEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>
  ) => {
    // Allow only digits
    if (!/^\d?$/.test(value)) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);

    // Move to next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`digit-${index + 2}`);
      nextInput?.focus();
    }

    // Backspace → move previous
    if (
      "key" in e &&
      e.key === "Backspace" &&
      !value &&
      index > 0
    ) {
      const prevInput = document.getElementById(`digit-${index}`);
      prevInput?.focus();
    }
  };

  // Verify OTP
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();

    // Check all OTP fields
    if (otp.some((digit) => digit === "")) {
      showToast("Please enter complete OTP", "danger");
      return;
    }

    const enteredOtp = otp.join("");
    console.log("Entered OTP:", enteredOtp);

    showToast("OTP verified successfully!", "success");

    navigate.push(all_routes.resetPassword);
  };

  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

  return (
    <>
      {/* Toast Notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ========================
			Start Page Content
		========================= */}
      <div className="container-fuild">
        {/* Start Content */}
        <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100 auth-page">
          {/* start row */}
          <div className="row g-2">
            <div className="col-lg-6">
              <div className="position-relative d-lg-flex align-items-center justify-content-center d-none flex-wrap vh-100 p-0 ps-0">
                <div className="w-100 position-relative h-100 bg-primary z-1 overflow-hidden">
                  <ImageWithBasePath
                    src="assets/img/authentication/authentication-bg-01.png"
                    className="img-fluid position-absolute end-0 z-n1 auth-bg-01"
                    alt="bg"
                  />
                  <ImageWithBasePath
                    src="assets/img/authentication/authentication-bg-01.png"
                    className="img-fluid position-absolute top-0 end-0 z-n1 auth-bg-02"
                    alt="bg"
                  />
                  <div className="px-4 rounded-3 h-100 d-flex flex-column align-items-center auth-wrap">
                    <div className="text-center z-2">
                      <h1 className="text-white mb-2">
                        Complete Control of your <br /> Laundry With Ease
                      </h1>
                      <p className="text-white mb-0">From billing to inventory access everything you need in a single powerful dashboard,<br/> Analyze sales, track your best-selling Clothes.</p>
                    </div>
                    <div className="text-center auth-img position-absolute bottom-0">
                      <ImageWithBasePath
                        src="assets/img/authentication/login.png"
                        className="img-fluid position-relative z-1"
                        alt="user"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>{" "}
            {/* end col */}
            <div className="col-lg-6 col-md-12 col-sm-12 p-3">
              {/* start row */}
              <div className="row justify-content-center align-items-center overflow-auto flex-wrap auth-vh vh-100">
                <div className="col-xl-8 col-lg-10 col-md-8 col-sm-10 mx-auto">
                <form onSubmit={handleVerify}>
                    <div className="d-flex flex-column justify-content-between">
                      <div className="mb-5">
                        <Link href="/">
                          <ImageWithBasePath
                            src="assets/img/logo.svg"
                            className="img-fluid"
                            alt="Logo"
                          />
                        </Link>
                      </div>

                      <div>
                        <div className="mb-4">
                          <h3 className="mb-2">Enter OTP</h3>
                          <p className="mb-0">
                            Enter OTP sent to the registered Email ID
                          </p>
                        </div>

                        {/* OTP Inputs */}
                        <div className="otp-input">
                          <div className="digit-group d-flex align-items-center mb-4">
                            {otp.map((digit, index) => (
                              <input
                                key={index}
                                id={`digit-${index + 1}`}
                                type="text"
                                className="rounded w-50 text-center fs-14 fw-medium me-3"
                                maxLength={1}
                                value={digit}
                                onChange={(e) =>
                                  handleOtpChange(index, e.target.value, e)
                                }
                                onKeyDown={(e) =>
                                  handleOtpChange(index, digit, e)
                                }
                              />
                            ))}
                          </div>

                          <div className="d-flex align-items-center justify-content-between mb-4">
                            <span className="badge badge-soft-danger">
                              {formatTime(timeLeft)}
                            </span>

                            <Link href="#" className={`text-dark ${timeLeft > 0 ? "disabled" : ""}`} onClick={() => timeLeft === 0 && setTimeLeft(120)} >
                              Resend OTP
                            </Link>

                          </div>
                        </div>

                        <div className="mb-4">
                          <button
                            type="submit"
                            className="btn btn-primary w-100"
                          >
                            Verify
                          </button>
                        </div>

                        <div className="text-center mt-4">
                          <p className="fw-normal mb-0">
                            Back to
                            <Link
                              href={all_routes.login}
                              className="link-primary ms-1"
                            >
                              Sign In
                            </Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>{" "}
                {/* end col */}
              </div>
              {/* end row */}
            </div>{" "}
            {/* end col */}
          </div>
          {/* end row */}
        </div>
        {/* End Content */}
      </div>
      {/* ========================
			End Page Content
		========================= */}
    </>

  );
};

export default OTPComponent;
