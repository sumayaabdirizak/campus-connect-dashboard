"use client";
import { useRouter } from "next/navigation";
import ImageWithBasePath from "../../components/image-with-base-path";
import { all_routes } from "../../routes/all_routes";
import { useState } from "react";
import Link from "next/link";
type PasswordField = "password" | "confirmPassword";


const ResetPasswordComponent = () => {
  const navigate = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    navigate.push(all_routes.login);
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
                          <h3 className="mb-2">Reset Password</h3>
                          <p className="mb-0">
                            Your new password must be different from previous
                            used passwords.
                          </p>
                        </div>
                        {/* Password */}
                        <div className="mb-3">
                          <label className="form-label">
                            Password <span className="text-danger">*</span>
                          </label>
                          <div className="input-group input-group-flat pass-group w-100">
                            <input
                              type={
                                passwordVisibility.password
                                  ? "text"
                                  : "password"
                              }
                              className="form-control pass-input"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              aria-label="Password"
                            />
                            <span
                              className={`ti toggle-password input-group-text toggle-password ${passwordVisibility.password
                                  ? "icon-eye"
                                  : "icon-eye-off"
                                }`}
                              onClick={() =>
                                togglePasswordVisibility("password")
                              }
                            ></span>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="mb-3">
                          <label className="form-label">
                            Confirm Password{" "}
                            <span className="text-danger">*</span>
                          </label>
                          <div className="input-group input-group-flat pass-group w-100">
                            <input
                              type={
                                passwordVisibility.confirmPassword
                                  ? "text"
                                  : "password"
                              }
                              className="form-control pass-input"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              aria-label="Confirm Password"
                            />
                            <span
                              className={`ti toggle-password input-group-text toggle-password ${passwordVisibility.confirmPassword
                                  ? "icon-eye"
                                  : "icon-eye-off"
                                }`}
                              onClick={() =>
                                togglePasswordVisibility("confirmPassword")
                              }
                            ></span>
                          </div>
                        </div>
                        <div className="mb-4">
                          <button
                            type="submit"
                            className="btn btn-primary w-100"
                          >
                            Submit
                          </button>
                        </div>
                        <div className="text-center mt-4">
                          <p className="fw-normal mb-0">
                            Back to{" "}
                            <Link
                              href={all_routes.login}
                              className="link-primary"
                            >
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

export default ResetPasswordComponent;
