import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { AuthContext } from './context/AuthContext';

const Home = lazy(() => import('./pages/home'));
const HelpAndPolicies = lazy(() => import('./pages/HelpAndPolicies'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const Categories = lazy(() => import('./pages/Categories'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const AddProduct = lazy(() => import('./admin/AddProduct'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminOrders = lazy(() => import('./admin/AdminOrders'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminEmployees = lazy(() => import('./admin/AdminEmployees'));
const AdminPickedForYou = lazy(() => import('./admin/AdminPickedForYou'));
const AdminProfile = lazy(() => import('./admin/AdminProfile'));
const AdminUsers = lazy(() => import('./admin/AdminUsers'));
const EditProduct = lazy(() => import('./admin/EditProduct'));
const StorefrontSettings = lazy(() => import('./admin/StorefrontSettings'));
const SeasonalDeals = lazy(() => import('./admin/SeasonalDeals'));
const HomepageSections = lazy(() => import('./admin/HomepageSections'));

const EmployeeAccessDenied = () => (
  <main className="admin-page">
    <h1>Access denied</h1>
    <p className="admin-alert" role="alert">Your employee account cannot access this administrative page.</p>
  </main>
);

function AppRoutes() {
  const { user } = useContext(AuthContext);
  const isEmployee = user?.role === 'employee';
  useEffect(() => {
    const theme = localStorage.getItem('shopnest-theme') === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
  }, []);

  return (
    <>
      <Navbar />
      <Suspense fallback={<main className="route-image-fallback"><img src="/logo.png" alt="ShopNest" /></main>}>
        {isEmployee ? <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/shop' element={<Home />} />
          <Route path='/categories' element={<Categories />} />
          <Route path='/search' element={<Home />} />
          <Route path='/value-365' element={<Home />} />
          <Route path='/category/:category' element={<Home />} />
          <Route path='/employee/workspace' element={<Home />} />
          <Route path='/faq' element={<HelpAndPolicies />} />
          <Route path='/policies' element={<HelpAndPolicies />} />
          <Route path='/social/:platform' element={<SocialPage />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/checkout' element={<Checkout />} />
          <Route path='/orders' element={<Orders />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/products/:id' element={<ProductDetail />} />
          <Route path='/admin/products/new' element={<AddProduct />} />
          <Route path='/admin/products/edit' element={<EditProduct />} />
          <Route path='/admin/products/:id/edit' element={<EditProduct />} />
          <Route path='/admin/users' element={<AdminUsers />} />
          <Route path='/admin/orders' element={<AdminOrders />} />
          <Route path='/admin/homepage-sections' element={<HomepageSections />} />
          <Route path='/admin/picked-for-you' element={<AdminPickedForYou />} />
          <Route path='*' element={<EmployeeAccessDenied />} />
        </Routes> : <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/shop' element={<Home />} />
          <Route path='/categories' element={<Categories />} />
          <Route path='/search' element={<Home />} />
          <Route path='/value-365' element={<Home />} />
          <Route path='/category/:category' element={<Home />} />
          <Route path='/faq' element={<HelpAndPolicies />} />
          <Route path='/policies' element={<HelpAndPolicies />} />
          <Route path='/social/:platform' element={<SocialPage />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/checkout' element={<Checkout />} />
          <Route path='/orders' element={<Orders />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/admin' element={<AdminDashboard />} />
          <Route path='/admin/profile' element={<AdminProfile />} />
          <Route path='/admin/products/new' element={<AddProduct />} />
          <Route path='/admin/products/edit' element={<EditProduct />} />
          <Route path='/admin/products/:id/edit' element={<EditProduct />} />
          <Route path='/admin/storefront' element={<StorefrontSettings />} />
          <Route path='/admin/seasonal-deals' element={<SeasonalDeals />} />
          <Route path='/admin/homepage-sections' element={<HomepageSections />} />
          <Route path='/admin/picked-for-you' element={<AdminPickedForYou />} />
          <Route path='/admin/users' element={<AdminUsers />} />
          <Route path='/admin/employees' element={<AdminEmployees />} />
          <Route path='/admin/orders' element={<AdminOrders />} />
          <Route path='/products/:id' element={<ProductDetail />} />
        </Routes>}
      </Suspense>
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
