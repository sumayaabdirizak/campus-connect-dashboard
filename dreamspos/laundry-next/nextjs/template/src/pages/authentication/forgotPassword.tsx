"use client";
import ImageWithBasePath from "../../components/image-with-base-path";
import { useEffect, useRef, useState } from "react";
import { all_routes } from "../../routes/all_routes";
import Toast from "../../components/toast/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";


const ForgotPasswordComponent = () => {
  const navigate = useRouter();

  // For UI form
  const [email, setEmail] = useState("admin@gmail.com");

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
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ msg: message, type });
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    showToast("Mail Sent successful!", "success");

    navigate.push(all_routes.emailVerification);
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
                  <form onSubmit={handleLogin}>
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
                          <h3 className="mb-2">Forgot Password</h3>
                          <p className="mb-0">
                            Please enter your email address to receive a verification code
                          </p>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">
                            Email<span className="text-danger"> *</span>
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>

                        <div className="mb-4">
                          <button
                            type="submit"
                            className="btn btn-primary w-100"
                          >
                            Send Email
                          </button>
                        </div>


                        <div className="text-center mt-4">
                          <p className="fw-normal mb-0">
                            Back to
                            <Link href={all_routes.login} className="link-primary">
                              {" "}
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

export default ForgotPasswordComponent;
