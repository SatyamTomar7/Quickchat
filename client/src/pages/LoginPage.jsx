import React, { useContext, useState } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";
const LoginPage = () => {
  const [currentState, setCurrentState] = useState("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const { login } = useContext(AuthContext);

  const onSubmitHandler = (e) => {
    e.preventDefault();
    if (currentState === "signup" && !isChecked) {
      alert("Please agree to terms and conditions");
      return;
    }
    if (currentState === "signup" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }
    const state = currentState === "signup" ? "signup" : "login";
    const credentials =
      state === "signup"
        ? { fullName, email, password, bio }
        : { email, password };
    login(state, credentials);
  };
  return (
    <div className="min-h-screen w-full bg-cover bg-center flex items-center justify-center gap-8 px-4 py-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl">
      {/* left  */}
      <img src={assets.logo_big} alt="" className="w-[min(55vw,250px)] sm:w-[min(30vw,250px)]" />
      {/* right  */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-md border-2 bg-white/8 text-white border-gray-500 p-5 sm:p-6 flex flex-col gap-5 sm:gap-6 rounded-lg shadow-lg"
      >
        <h2 className="font-medium text-2xl flex justify-between items-center">
          {currentState === "signup" ? "Sign Up" : "Login"}

          {isDataSubmitted && (
            <img
              onClick={() => setIsDataSubmitted(false)}
              src={assets.arrow_icon}
              className="w-5 cursor-pointer"
            />
          )}
        </h2>
        {currentState === "signup" && !isDataSubmitted && (
          <input
            onChange={(e) => setFullName(e.target.value)}
            value={fullName}
            type="text"
            className="p-2 border border-gray-500 rounded-md focus:outline-none"
            placeholder="Full Name"
            required
          />
        )}
        {!isDataSubmitted && (
          <>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              placeholder="Email Address"
              required
              className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              type="password"
              placeholder="Password"
              required
              className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </>
        )}
        {currentState === "signup" && isDataSubmitted && (
          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            rows={4}
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring focus:ring-indigo-500"
            placeholder="provide a short bio..."
            required
          ></textarea>
        )}
        <button
          type="submit"
          className="py-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white rounded-md cursor-pointer"
        >
          {currentState === "signup" ? "Create Account" : "Login Now"}
        </button>
        {currentState === "signup" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
            />
            <p>Agree to the terms of use & privacy policy</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {currentState === "signup" ? (
            <p className="text-sm text-gray-600">
              Already have an account?
              <span
                onClick={() => {
                  setCurrentState("login");
                  setIsDataSubmitted(false);
                }}
                className="font-medium text-violet-500 cursor-pointer"
              >
                Login here
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Create an account
              <span
                onClick={() => {
                  setCurrentState("signup");
                  setIsDataSubmitted(false);
                }}
                className="font-medium text-violet-500 cursor-pointer"
              >
                Click here
              </span>
            </p>
          )}{" "}
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
