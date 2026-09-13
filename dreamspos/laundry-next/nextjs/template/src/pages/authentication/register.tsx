"use client";

import ImageWithBasePath from "../../components/image-with-base-path";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { all_routes } from "../../routes/all_routes";
import Toast from "../../components/toast/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PasswordField = "password" | "confirmPassword";

// Dynamically import the auth context to avoid SSR issues
const useAuth = () => {
  if (typeof window === 'undefined') {
    return {
      register: () => ({}),
    };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return require('@/context/auth-context').useAuth();
};

const RegisterComponent = () => {
  const [isClient, setIsClient] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // For UI form
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("123456");
  const [confirmPassword, setConfirmPassword] = useState("123456");

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "danger" | "warning" | "info";
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (
    msg: string,
    type: "success" | "danger" | "warning" | "info"
  ) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!email.includes("@")) {
      return showToast("Invalid email address!", "danger");
    }

    if (password.length < 4) {
      return showToast("Password must be at least 4 characters", "warning");
    }

    if (password !== confirmPassword) {
      return showToast("Passwords do not match!", "danger");
    }

    // Save to localStorage (your authContext does this)
    register(email, password);

    showToast("Registered Successfully!", "success");

    // Optionally clear fields
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      router.push(all_routes.login);
    }, 400);
  };

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
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
                  <form onSubmit={handleSubmit}>
                    <div className="d-flex flex-column justify-content-between">
                      <div className="mb-5">
                        <Link href={all_routes.dashboard}>
                          <ImageWithBasePath
                            src="assets/img/logo.svg"
                            className="img-fluid"
                            alt="Logo"
                          />
                        </Link>
                      </div>

                      <div>
                        <div className="mb-4">
                          <h3 className="mb-2">Sign Up</h3>
                          <p className="mb-0">And lets get started with your free trial</p>
                        </div>

                        {/* Email */}
                        <div className="mb-3">
                          <label className="form-label">
                            Email <span className="text-danger">*</span>
                          </label>
                          <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        {/* Password */}
                        <div className="mb-3">
                          <label className="form-label">
                            Password <span className="text-danger">*</span>
                          </label>
                          <div className="input-group input-group-flat pass-group w-100">
                            <input type={passwordVisibility.password ? "text" : "password"} className="form-control pass-input" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
                            <span className={`ti toggle-password input-group-text toggle-password ${passwordVisibility.password ? "icon-eye" : "icon-eye-off"}`} onClick={() => togglePasswordVisibility("password")}></span>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="mb-3">
                          <label className="form-label">
                            Confirm Password{" "}
                            <span className="text-danger">*</span>
                          </label>
                          <div className="input-group input-group-flat pass-group w-100">
                            <input type={passwordVisibility.confirmPassword ? "text" : "password"} className="form-control pass-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} aria-label="Confirm Password" />
                            <span className={`ti toggle-password input-group-text toggle-password ${passwordVisibility.confirmPassword ? "icon-eye" : "icon-eye-off"}`} onClick={() => togglePasswordVisibility("confirmPassword")} ></span>
                          </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div className="form-check form-check-md mb-4">
                          <input className="form-check-input" id="remember_me" type="checkbox" />
                          <label htmlFor="remember_me" className="form-check-label text-dark mt-0">
                            Agree to <Link href="#">Terms</Link> &amp; <Link href="#">Privacy Policy</Link>
                          </label>
                        </div>


                        {/* Submit */}
                        <div className="mb-4">
                          <button
                            type="submit"
                            className="btn btn-primary w-100"
                          >
                            Sign Up
                          </button>
                        </div>

                        {/* Social Buttons */}
                        <div className="login-or position-relative mb-4 text-center">
                          <span className="position-relative bg-white px-2 z-2">
                            or continue with
                          </span>
                        </div>

                        <div className="d-flex align-items-center justify-content-center flex-wrap">
                          <div className="text-center me-2 flex-fill">
                            <Link href="#" className="btn btn-white d-flex align-items-center justify-content-center shadow" >
                              <ImageWithBasePath className="img-fluid me-2" src="assets/img/icons/google.svg" alt="google" />
                              Google
                            </Link>
                          </div>

                          <div className="text-center me-2 flex-fill">
                            <Link href="#" className="btn btn-white d-flex align-items-center justify-content-center shadow" >
                              <ImageWithBasePath className="img-fluid me-2" src="assets/img/icons/fb.svg" alt="facebook" />
                              Facebook
                            </Link>
                          </div>
                        </div>

                        {/* Login Link */}
                        <div className="text-center mt-4">
                          <p className="fw-normal mb-0">
                            Already have an account?{" "}
                            <Link href={all_routes.login} className="link-primary">
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
          <div
            className="alert alert-danger border-0 border-danger border-bottom alert-dismissible pe-5 d-none"
            role="alert"
          >
            <p className="fw-medium mb-0 d-inline-flex align-items-center">
              <span className="btn btn-icon btn-xs rounded-circle bg-danger d-flex align-items-center justify-content-center pe-none me-2 ">
                <i className="icon-x fs-16 text-white" />
              </span>
              Please enter your user name
            </p>
            <button
              type="button"
              className="btn-close btn-custom-close top-50 translate-middle-y link-danger"
              data-bs-dismiss="alert"
              aria-label="Close"
            >
              <i className="icon-x" />
            </button>
          </div>
        </div>
        {/* End Content */}
      </div>
      {/* ========================
			End Page Content
		========================= */}
    </>

  );
};

export default RegisterComponent;
