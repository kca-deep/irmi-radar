import React from "react";
import { RouterProvider, createBrowserRouter } from "react-router";
import { Layout } from "./Layout";
import { Dashboard } from "./pages/Dashboard";
import { CustomAnalysis } from "./pages/CustomAnalysis";
import { NewsAnalysis } from "./pages/NewsAnalysis";
import { CrisisSignal } from "./pages/CrisisSignal";

import { ReportersPage } from "./pages/ReportersPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "analysis", Component: CustomAnalysis },
      { path: "news", Component: NewsAnalysis },
      { path: "signals", Component: CrisisSignal },
      { path: "reporters", Component: ReportersPage },
      { path: "*", Component: () => <div>Not Found</div> }
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
