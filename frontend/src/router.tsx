import { createBrowserRouter } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import DTSPlayground from './pages/dts/DTSPlayground'
import DTSValidate from './pages/dts/DTSValidate'
import DTSLearn from './pages/dts/DTSLearn'
import CMakeLearn from './pages/cmake/CMakeLearn'
import YAMLLearn from './pages/yaml/YAMLLearn'
import SearchPage from './pages/SearchPage'
import NotFound from './pages/NotFound'

export const router = createBrowserRouter([
  { path: '/',                 element: <AppShell><Dashboard /></AppShell> },
  { path: '/dts/learn',        element: <AppShell><DTSLearn /></AppShell> },
  { path: '/dts/playground',   element: <AppShell><DTSPlayground /></AppShell> },
  { path: '/dts/validate',     element: <AppShell><DTSValidate /></AppShell> },
  { path: '/dts/visualize',    element: <AppShell><DTSValidate /></AppShell> },
  { path: '/cmake/learn',      element: <AppShell><CMakeLearn /></AppShell> },
  { path: '/cmake/playground', element: <AppShell><CMakeLearn /></AppShell> },
  { path: '/yaml/learn',       element: <AppShell><YAMLLearn /></AppShell> },
  { path: '/yaml/playground',  element: <AppShell><YAMLLearn /></AppShell> },
  { path: '/search',           element: <AppShell><SearchPage /></AppShell> },
  { path: '*',                 element: <AppShell><NotFound /></AppShell> },
])
