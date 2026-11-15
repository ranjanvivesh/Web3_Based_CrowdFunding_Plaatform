import React from "react";
import { Route, Routes } from "react-router-dom";
import { CampaignDetails, CreateCampaign, Home, Profile, About, NotFound, Login, Register, RegisterVerify, CreatorProfile } from "./pages";
import { Navbar, Sidebar, ErrorBoundary } from "./components";
import { useStateContext } from "./context";

const App = () => {
  const { isDarkMode } = useStateContext() || { isDarkMode: true };
  
  return (
    <ErrorBoundary>
      <div className="cozy-shell relative min-h-screen flex flex-row p-4 transition-colors duration-300">
        <div className="sm:flex hidden mr-10 relative">
          <Sidebar />
        </div>

        <div className="flex-1 w-full max-w-[1280px] mx-auto sm:pr-5">
          <Navbar />
          <div className="mt-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/create-campaign" element={<CreateCampaign />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/campaign-details/:id" element={<CampaignDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/verify" element={<RegisterVerify />} />
              <Route path="/creator/:identifier" element={<CreatorProfile />} />
              {/* 404 Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
