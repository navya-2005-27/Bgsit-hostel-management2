import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Warden from "./pages/Warden";
import Student from "./pages/Student";
import Admin from "./pages/Admin";
import StudentDetailsPage from "./pages/StudentDetailsPage";
import { ThemeProvider } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect } from "react";
import { startStorageSqlSync } from "@/lib/storageSqlSync";
import { hydrateAccessRequestsFromSql } from "@/lib/studentStore";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    void (async () => {
      await startStorageSqlSync();
      await hydrateAccessRequestsFromSql();
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ThemeToggle />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/student/:id" element={<StudentDetailsPage role="admin" />} />
              <Route path="/warden" element={<Warden />} />
              <Route path="/warden/student/:id" element={<StudentDetailsPage role="warden" />} />
              <Route path="/student" element={<Student />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
